import { useState, useEffect, useRef, useCallback } from "react";
import { usePurchaseScan, useConfirmPurchaseScan, useRedeemRewardScan } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { scanResultVariants, vibrate } from "@/lib/motion";
import { parseScannedQr } from "@/lib/supabase";
import { normalizeCardCode, isCardCode } from "@/lib/card-code";
import { FRAUD_REASON_LABELS } from "@/api/fraud";
import { getWorkerScannerMode, setWorkerScannerMode } from "@/lib/worker-scanner-mode";
import { CheckCircle, XCircle, Gift, ArrowLeft, Minus, Plus, ScanLine, CalendarClock, Loader2, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";

const SCANNER_ELEMENT_ID = "qr-scanner-region";

type ScanResult = {
  approved: boolean;
  reason: string | null;
  stampsAdded: number;
  spendAddedDzd: number;
  currentStamps: number;
  currentCycleSpendDzd: number;
  stampThreshold: number;
  spendThresholdDzd: number;
  rewardMode: "stamps" | "spend" | "both";
  stampsEnabled: boolean;
  spendEnabled: boolean;
  currency: string;
  rewardTriggered: boolean;
  rewardDescription?: string | null;
  needsProducts: boolean;
  needsAmount: boolean;
  products?: { id: string; name: string; price: number; category: string }[];
  pendingScanId?: string | null;
  clientName?: string | null;
  maxScansPerDay?: number;
};

type ProductQty = Record<string, number>;

type RedeemResult = {
  approved: boolean;
  reason: string | null;
  clientName: string | null;
  rewardDescription: string;
};

function resolveRewardMode(raw: Record<string, unknown>): ScanResult["rewardMode"] {
  if (raw.rewardMode === "both" || raw.reward_mode === "both") return "both";
  if (raw.rewardMode === "spend" || raw.reward_mode === "spend") return "spend";
  if (raw.stampsEnabled === true && raw.spendEnabled === true) return "both";
  if (raw.spendEnabled === true || raw.spend_enabled === true) return "spend";
  return "stamps";
}

function normalizeScanResult(raw: Record<string, unknown> | null | undefined): ScanResult {
  const payload = raw ?? {};
  const rewardMode = resolveRewardMode(payload);
  const stampsEnabled = payload.stampsEnabled !== undefined
    ? payload.stampsEnabled !== false
    : rewardMode === "stamps" || rewardMode === "both";
  const spendEnabled = payload.spendEnabled !== undefined
    ? payload.spendEnabled === true
    : rewardMode === "spend" || rewardMode === "both";

  return {
    approved: Boolean(payload.approved),
    reason: (payload.reason as string | null) ?? null,
    stampsAdded: Number(payload.stampsAdded ?? payload.stamps_added ?? 0),
    spendAddedDzd: Number(payload.spendAddedDzd ?? payload.spend_added_dzd ?? 0),
    currentStamps: Number(payload.currentStamps ?? payload.current_stamps ?? 0),
    currentCycleSpendDzd: Number(payload.currentCycleSpendDzd ?? payload.current_cycle_spend_dzd ?? 0),
    stampThreshold: Number(payload.stampThreshold ?? payload.stamp_threshold ?? 9),
    spendThresholdDzd: Number(payload.spendThresholdDzd ?? payload.spend_threshold_dzd ?? 10000),
    rewardMode,
    stampsEnabled,
    spendEnabled,
    currency: String(payload.currency ?? "DZD"),
    rewardTriggered: Boolean(payload.rewardTriggered ?? payload.reward_triggered),
    rewardDescription: (payload.rewardDescription ?? payload.reward_description) as string | null | undefined,
    needsProducts: Boolean(payload.needsProducts ?? payload.needs_products),
    needsAmount: Boolean(payload.needsAmount ?? payload.needs_amount),
    products: Array.isArray(payload.products)
      ? (payload.products as ScanResult["products"])
      : [],
    pendingScanId: (payload.pendingScanId ?? payload.pending_scan_id) as string | null | undefined,
    clientName: (payload.clientName ?? payload.client_name) as string | null | undefined,
    maxScansPerDay: Number(payload.maxScansPerDay ?? payload.max_scans_per_day ?? 0) || undefined,
  };
}

function fraudLabel(reason: string | null) {
  if (!reason) return "Scan was blocked";
  return FRAUD_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

function shouldShowFullscreenPurchaseResult(result: ScanResult): boolean {
  if (!result.approved) return true;
  return false;
}

function purchaseSuccessMessage(result: ScanResult): string {
  if (result.rewardTriggered) {
    return `${result.clientName ?? "Customer"} — ${result.rewardDescription ?? "Reward unlocked"}`;
  }
  const parts: string[] = [];
  if (result.clientName) parts.push(result.clientName);
  if (result.spendEnabled && result.spendAddedDzd > 0) {
    parts.push(`+${result.spendAddedDzd.toLocaleString("fr-DZ")} ${result.currency}`);
  }
  if (result.stampsEnabled) {
    parts.push(`${result.currentStamps}/${result.stampThreshold} stamps`);
  }
  return parts.join(" · ") || "Scan approved";
}

export default function WorkerScan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const purchaseScan = usePurchaseScan();
  const confirmScan = useConfirmPurchaseScan();
  const redeemRewardScan = useRedeemRewardScan();
  const [step, setStep] = useState<"scan" | "products" | "amount" | "result" | "redeem-result">("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const [productQtys, setProductQtys] = useState<ProductQty>({});
  const [amountDzd, setAmountDzd] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [scannerMode, setScannerMode] = useState(getWorkerScannerMode);
  const html5QrcodeRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const mutateScanRef = useRef(purchaseScan.mutateAsync);
  const mutateRedeemRef = useRef(redeemRewardScan.mutateAsync);
  const toastRef = useRef(toast);
  const scannerModeRef = useRef(scannerMode);
  mutateScanRef.current = purchaseScan.mutateAsync;
  mutateRedeemRef.current = redeemRewardScan.mutateAsync;
  toastRef.current = toast;
  scannerModeRef.current = scannerMode;

  const stopScanner = useCallback(async () => {
    const scanner = html5QrcodeRef.current;
    html5QrcodeRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped or the video element was removed.
    }
    try {
      scanner.clear();
    } catch {
      // clear() can fail if the element was unmounted.
    }
  }, []);

  const resumeScanning = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (fastResetTimerRef.current) clearTimeout(fastResetTimerRef.current);
    processingRef.current = false;
    setStep("scan");
    setResult(null);
    setRedeemResult(null);
    setProductQtys({});
    setAmountDzd("");
    setManualCode("");
  }, []);

  const handleReset = useCallback(async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (fastResetTimerRef.current) clearTimeout(fastResetTimerRef.current);
    processingRef.current = false;
    if (!scannerModeRef.current) {
      await stopScanner();
      setCameraStarting(false);
    }
    setStep("scan");
    setResult(null);
    setRedeemResult(null);
    setProductQtys({});
    setAmountDzd("");
    setManualCode("");
  }, [stopScanner]);

  const scheduleFastReset = useCallback(() => {
    if (fastResetTimerRef.current) clearTimeout(fastResetTimerRef.current);
    fastResetTimerRef.current = setTimeout(() => {
      void handleReset();
    }, 900);
  }, [handleReset]);

  const finishPurchaseResult = useCallback(
    (r: ScanResult) => {
      if (scannerModeRef.current) {
        if (!r.approved) {
          const title =
            r.reason === "daily_limit" ? "Daily limit reached" : "Scan blocked";
          const description =
            r.reason === "daily_limit"
              ? `${r.clientName ?? "Customer"} — max ${r.maxScansPerDay ?? 2} orders today`
              : `${r.clientName ?? "Customer"} — ${fraudLabel(r.reason)}`;
          toastRef.current({ title, description, variant: "destructive" });
          vibrate([100, 50, 100]);
        } else {
          const title = r.rewardTriggered ? "Reward unlocked!" : "Approved";
          toastRef.current({ title, description: purchaseSuccessMessage(r) });
          vibrate(50);
        }
        scheduleFastReset();
        return;
      }
      if (!shouldShowFullscreenPurchaseResult(r)) {
        const title = r.rewardTriggered ? "Reward unlocked!" : "Approved";
        toastRef.current({ title, description: purchaseSuccessMessage(r) });
        scheduleFastReset();
        return;
      }
      setResult(r);
      setStep("result");
    },
    [scheduleFastReset],
  );

  const finishRedeemResult = useCallback(
    (redeem: RedeemResult) => {
      if (scannerModeRef.current) {
        if (redeem.approved) {
          toastRef.current({
            title: "Reward redeemed",
            description: `${redeem.clientName ?? "Customer"} — ${redeem.rewardDescription}`,
          });
          vibrate([50, 30, 50]);
        } else {
          const title =
            redeem.reason === "already_redeemed" ? "Already redeemed" : "Redeem failed";
          toastRef.current({
            title,
            description: `${redeem.clientName ?? "Customer"} — ${redeem.rewardDescription}`,
            variant: "destructive",
          });
          vibrate([100, 50, 100]);
        }
        scheduleFastReset();
        return;
      }
      if (redeem.approved) {
        toastRef.current({
          title: "Reward redeemed",
          description: `${redeem.clientName ?? "Customer"} — ${redeem.rewardDescription}`,
        });
        scheduleFastReset();
        return;
      }
      setRedeemResult(redeem);
      setStep("redeem-result");
    },
    [scheduleFastReset],
  );

  const toggleScannerMode = useCallback((enabled: boolean) => {
    setScannerMode(enabled);
    setWorkerScannerMode(enabled);
  }, []);

  useEffect(() => {
    if (scannerMode) return;
    if (step !== "result" && step !== "redeem-result") return;
    if (step === "result" && !result) return;
    if (step === "redeem-result" && !redeemResult) return;
    resetTimerRef.current = setTimeout(() => {
      void handleReset();
    }, 3000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [step, result, redeemResult, handleReset, scannerMode]);

  const processScanPayload = useCallback(
    async (raw: string, options?: { stopCamera?: boolean }) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        if (options?.stopCamera) {
          try {
            await stopScanner();
          } catch {
            // Keep processing even if camera teardown fails.
          }
        }

        const parsed = parseScannedQr(raw);

        if (parsed.type === "reward") {
          const redeemRes = await mutateRedeemRef.current({
            data: { rewardQrToken: `reward:${parsed.rewardId}` },
          });
          if (!redeemRes || typeof redeemRes !== "object") {
            throw new Error("Invalid response from server");
          }
          const redeemPayload: RedeemResult = {
            approved: Boolean(redeemRes.approved),
            reason: (redeemRes.reason as string | null) ?? null,
            clientName: (redeemRes.clientName as string | null) ?? null,
            rewardDescription: String(redeemRes.rewardDescription ?? "Reward"),
          };
          setManualCode("");
          finishRedeemResult(redeemPayload);
          return;
        }

        const scanResult = await mutateScanRef.current({
          data: { clientQrToken: parsed.token },
        });
        if (!scanResult || typeof scanResult !== "object") {
          throw new Error("Invalid response from server");
        }
        const r = normalizeScanResult(scanResult as Record<string, unknown>);
        setResult(r);
        setManualCode("");

        const awaitingWorkerInput = Boolean(
          (scanResult as Record<string, unknown>).pendingWorkerInput
          ?? ((r.needsProducts || r.needsAmount) && r.pendingScanId),
        );

        if (r.needsProducts && r.pendingScanId) {
          setProductQtys({});
          setStep("products");
          processingRef.current = false;
          return;
        }
        if (r.needsAmount && r.pendingScanId) {
          setAmountDzd("");
          setStep("amount");
          processingRef.current = false;
          return;
        }

        if (r.approved && !awaitingWorkerInput) vibrate(50);
        else if (!r.approved && !awaitingWorkerInput) vibrate([100, 50, 100]);
        finishPurchaseResult(r);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Scan failed";
        toastRef.current({
          title: "Scan failed",
          description: message,
          variant: "destructive",
        });
        processingRef.current = false;
        if (!scannerModeRef.current) setStep("scan");
      } finally {
        processingRef.current = false;
      }
    },
    [stopScanner, finishRedeemResult, finishPurchaseResult],
  );

  const handleManualSubmit = async () => {
    const trimmed = manualCode.trim();
    if (!trimmed) {
      toast({
        title: "Card number required",
        description: "Enter the 6-digit number from the customer's loyalty card.",
        variant: "destructive",
      });
      return;
    }

    if (trimmed.toLowerCase().startsWith("reward:")) {
      await processScanPayload(trimmed, { stopCamera: true });
      return;
    }

    const code = normalizeCardCode(trimmed);
    if (!isCardCode(code)) {
      toast({
        title: "Invalid card number",
        description: "Enter the 6-digit number shown on the loyalty card.",
        variant: "destructive",
      });
      return;
    }

    await processScanPayload(code, { stopCamera: true });
  };

  const cameraEnabled = scannerMode || step === "scan";

  useEffect(() => {
    if (!cameraEnabled) {
      void stopScanner();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setCameraStarting(true);
      try {
        await stopScanner();
        if (cancelled) return;

        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !document.getElementById(SCANNER_ELEMENT_ID)) return;

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        html5QrcodeRef.current = scanner;

        const qrbox = scannerMode
          ? (viewfinderWidth: number, viewfinderHeight: number) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
              return { width: size, height: size };
            }
          : { width: 250, height: 250 };

        await scanner.start(
          { facingMode: "environment" },
          { fps: scannerMode ? 15 : 10, qrbox },
          async (decodedText: string) => {
            await processScanPayload(decodedText, { stopCamera: !scannerModeRef.current });
          },
          () => {},
        );
      } catch {
        if (!cancelled) {
          toastRef.current({
            title: "Camera access denied",
            description: "Allow camera access to scan QR codes.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    };

    const timer = window.setTimeout(() => {
      void startCamera();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      void stopScanner();
    };
  }, [cameraEnabled, scannerMode, stopScanner, processScanPayload]);

  useEffect(() => {
    if (scannerMode && step === "amount") {
      const t = window.setTimeout(() => amountInputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [scannerMode, step]);

  const handleConfirmAmount = async () => {
    if (!result?.pendingScanId) return;
    const parsed = Math.floor(Number(amountDzd.replace(/\s/g, "")));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({ title: "Montant invalide", description: "Saisissez un montant supérieur à 0.", variant: "destructive" });
      return;
    }
    try {
      const confirmed = await confirmScan.mutateAsync({
        data: { pendingScanId: result.pendingScanId, amountDzd: parsed },
      });
      const merged = { ...result, ...normalizeScanResult(confirmed as Record<string, unknown>) };
      setResult(merged);
      const stillPending = Boolean(
        (confirmed as Record<string, unknown>).pendingWorkerInput
        ?? (merged.needsAmount && merged.pendingScanId),
      );
      if (merged.needsAmount && merged.pendingScanId) {
        setAmountDzd("");
        setStep("amount");
      } else {
        if (!stillPending) vibrate(50);
        finishPurchaseResult(merged);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Confirm failed";
      toast({ title: "Échec", description: message, variant: "destructive" });
    }
  };

  const handleConfirmProducts = async () => {
    if (!result?.pendingScanId) return;
    const products = Object.entries(productQtys)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    try {
      const confirmed = await confirmScan.mutateAsync({
        data: { pendingScanId: result.pendingScanId, products },
      });
      const merged = { ...result, ...normalizeScanResult(confirmed as Record<string, unknown>) };
      setResult(merged);
      const stillPending = Boolean(
        (confirmed as Record<string, unknown>).pendingWorkerInput
        ?? (merged.needsAmount && merged.pendingScanId),
      );
      if (merged.needsAmount && merged.pendingScanId) {
        setAmountDzd("");
        setStep("amount");
      } else {
        if (!stillPending) vibrate(50);
        finishPurchaseResult(merged);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Confirm failed";
      toast({ title: "Confirm failed", description: message, variant: "destructive" });
    }
  };

  if (scannerMode) {
    const products = result?.products ?? [];
    const showInputSheet = (step === "products" || step === "amount") && result;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <div
          id={SCANNER_ELEMENT_ID}
          className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&>div]:!border-none"
        />

        {cameraStarting && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/80">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {!showInputSheet && (
          <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
            <div className="w-[72vw] max-w-md aspect-square rounded-2xl border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <motion.div
                className="absolute left-3 right-3 h-0.5 bg-white/70"
                animate={{ top: ["12%", "88%", "12%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/75 to-transparent">
          <Button
            type="button"
            variant="ghost"
            className="h-11 gap-2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
            onClick={() => {
              toggleScannerMode(false);
              if (step !== "scan") resumeScanning();
            }}
          >
            <ChevronDown className="h-5 w-5" />
            Exit scanner mode
          </Button>
        </div>

        {showInputSheet && (
          <div className="relative z-10 mt-auto flex max-h-[58dvh] flex-col rounded-t-3xl bg-background shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {step === "products" ? "Products" : "Purchase amount"}
                </p>
                <p className="truncate text-lg font-bold">{result.clientName ?? "Customer"}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => resumeScanning()}>
                Skip
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {step === "amount" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Current:{" "}
                    <span className="font-semibold text-foreground">
                      {result.currentCycleSpendDzd.toLocaleString("fr-DZ")} /{" "}
                      {result.spendThresholdDzd.toLocaleString("fr-DZ")} {result.currency}
                    </span>
                  </p>
                  <input
                    ref={amountInputRef}
                    type="number"
                    min={1}
                    step={50}
                    inputMode="numeric"
                    placeholder={`Amount (${result.currency})`}
                    value={amountDzd}
                    onChange={(e) => setAmountDzd(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleConfirmAmount();
                    }}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-xl font-semibold"
                  />
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products in catalog — confirm to add the stamp.
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(p.price).toLocaleString("fr-DZ")} DZD
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            setProductQtys((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center font-mono text-sm font-semibold">
                          {productQtys[p.id] ?? 0}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            setProductQtys((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                className="h-12 w-full text-base"
                disabled={confirmScan.isPending}
                onClick={() =>
                  void (step === "amount" ? handleConfirmAmount() : handleConfirmProducts())
                }
              >
                {confirmScan.isPending
                  ? "Saving…"
                  : step === "amount"
                    ? "Validate & next customer"
                    : "Confirm & next customer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to worker home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold flex-1">Scan QR Code</h2>
          {scannerMode && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Scanner
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-4 px-1 py-2 rounded-xl border border-border/60 bg-muted/30">
          <div className="min-w-0">
            <Label htmlFor="scanner-mode" className="text-sm font-medium">
              Scanner mode
            </Label>
            <p className="text-xs text-muted-foreground">Scan → amount → next customer</p>
          </div>
          <Switch
            id="scanner-mode"
            checked={scannerMode}
            onCheckedChange={toggleScannerMode}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 pb-4">
          <div className="relative w-full max-w-sm">
            <div
              id={SCANNER_ELEMENT_ID}
              className="overflow-hidden rounded-2xl shadow-lg w-full aspect-square bg-muted"
            />
            {cameraStarting && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/90">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border-4 border-primary/60">
              <motion.div
                className="absolute left-4 right-4 h-0.5 bg-primary/80"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-sm text-center px-2">
            Point the camera at a loyalty card or reward QR code
          </p>
          <ScanLine className="h-5 w-5 text-primary animate-pulse" />

          <div className="w-full max-w-sm pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <label className="text-sm font-medium" htmlFor="manual-card-code">
              Enter card number
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="manual-card-code"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000 000"
                maxLength={7}
                value={manualCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setManualCode(
                    digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits,
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleManualSubmit();
                }}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-lg font-semibold tracking-widest text-center"
              />
              <Button
                type="button"
                className="h-auto px-5"
                onClick={() => void handleManualSubmit()}
                disabled={purchaseScan.isPending || redeemRewardScan.isPending || manualCode.replace(/\D/g, "").length < 1}
              >
                {purchaseScan.isPending || redeemRewardScan.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Go"
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              6-digit number on the customer&apos;s loyalty card
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "amount" && result) {
    return (
      <div className="flex flex-col h-full p-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => void handleReset()} aria-label="Cancel">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Montant dépensé</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-2">
          Client : <span className="font-medium text-foreground">{result.clientName ?? "Inconnu"}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Progression actuelle :{" "}
          <span className="font-semibold text-foreground">
            {result.currentCycleSpendDzd.toLocaleString("fr-DZ")} / {result.spendThresholdDzd.toLocaleString("fr-DZ")} {result.currency}
          </span>
        </p>

        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium" htmlFor="purchase-amount">
              Montant de cet achat ({result.currency})
            </label>
            <input
              id="purchase-amount"
              type="number"
              min={1}
              step={50}
              inputMode="numeric"
              placeholder="Ex. 2500"
              value={amountDzd}
              onChange={(e) => setAmountDzd(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-semibold"
            />
          </CardContent>
        </Card>

        <div className="pt-4 space-y-2 mt-auto shrink-0">
          <Button className="w-full h-12" onClick={() => void handleConfirmAmount()} disabled={confirmScan.isPending}>
            {confirmScan.isPending ? "Enregistrement…" : "Valider l'achat"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void handleReset()}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  if (step === "products" && result) {
    const products = result.products ?? [];

    return (
      <div className="flex flex-col h-full p-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => void handleReset()} aria-label="Cancel">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Select Products</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Customer: <span className="font-medium text-foreground">{result.clientName ?? "Unknown"}</span>
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No products in catalog — confirm to add the stamp anyway.
              </CardContent>
            </Card>
          ) : (
            products.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{Number(p.price).toLocaleString()} DZD</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setProductQtys((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-mono font-semibold">{productQtys[p.id] ?? 0}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setProductQtys((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="pt-4 space-y-2 shrink-0">
          <Button className="w-full h-12" onClick={handleConfirmProducts} disabled={confirmScan.isPending}>
            {confirmScan.isPending ? "Processing…" : "Confirm & Add Stamp"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void handleReset()}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const isReward = result.rewardTriggered;
    const isApproved = result.approved;
    const isDailyLimit = !isApproved && result.reason === "daily_limit";
    const bgClass = isReward
      ? "bg-amber-500"
      : isApproved
        ? "bg-[#0E9F6E]"
        : isDailyLimit
          ? "bg-orange-600"
          : "bg-destructive";
    const dailyMax = result.maxScansPerDay ?? 2;

    return (
      <AnimatePresence>
        <motion.div
          className={`fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-center text-white ${bgClass}`}
          variants={scanResultVariants}
          initial="initial"
          animate="animate"
        >
          {isReward ? (
            <>
              <Gift className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Reward Unlocked!</p>
              <p className="text-xl font-semibold">{result.clientName}</p>
              <p className="mt-2 opacity-90">{result.rewardDescription}</p>
            </>
          ) : isApproved ? (
            <>
              <CheckCircle className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Approved</p>
              <p className="text-xl">{result.clientName}</p>
              {result.spendEnabled ? (
                <p className="mt-4 text-lg font-semibold">
                  +{result.spendAddedDzd.toLocaleString("fr-DZ")} {result.currency}
                  <span className="block text-base font-medium mt-1 opacity-90">
                    {result.currentCycleSpendDzd.toLocaleString("fr-DZ")} / {result.spendThresholdDzd.toLocaleString("fr-DZ")} {result.currency}
                  </span>
                </p>
              ) : null}
              {result.stampsEnabled ? (
                <p className={`text-lg font-semibold${result.spendEnabled ? " mt-2" : " mt-4"}`}>
                  {result.currentStamps} / {result.stampThreshold} stamps
                </p>
              ) : null}
            </>
          ) : isDailyLimit ? (
            <>
              <CalendarClock className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Max Daily Limit Reached</p>
              <p className="text-xl font-semibold">{result.clientName}</p>
              <p className="mt-4 text-lg font-medium px-4 max-w-sm">
                This customer has already reached the maximum of{" "}
                <span className="font-bold">{dailyMax}</span>{" "}
                {dailyMax === 1 ? "order" : "orders"} for today.
              </p>
              <p className="mt-3 text-sm opacity-90 px-4">
                They can scan again tomorrow. No stamp was added.
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Blocked</p>
              <p className="text-xl">{result.clientName}</p>
              <p className="mt-4 text-lg font-medium px-4">{fraudLabel(result.reason)}</p>
            </>
          )}
          <p className="mt-8 text-sm opacity-75">Returning to scanner…</p>
          <Button variant="secondary" className="mt-4" onClick={() => void handleReset()}>
            Scan Another
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (step === "redeem-result" && redeemResult) {
    const isApproved = redeemResult.approved;
    const isAlreadyRedeemed = !isApproved && redeemResult.reason === "already_redeemed";
    const bgClass = isApproved ? "bg-emerald-600" : isAlreadyRedeemed ? "bg-orange-600" : "bg-destructive";

    return (
      <AnimatePresence>
        <motion.div
          className={`fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-center text-white ${bgClass}`}
          variants={scanResultVariants}
          initial="initial"
          animate="animate"
        >
          {isApproved ? (
            <>
              <Gift className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Reward Redeemed!</p>
              <p className="text-xl font-semibold">{redeemResult.clientName}</p>
              <p className="mt-2 opacity-90 text-lg">{redeemResult.rewardDescription}</p>
            </>
          ) : isAlreadyRedeemed ? (
            <>
              <Gift className="h-20 w-20 mb-4 opacity-80" />
              <p className="text-3xl font-bold mb-2">Already Redeemed</p>
              <p className="text-xl font-semibold">{redeemResult.clientName}</p>
              <p className="mt-2 opacity-90">{redeemResult.rewardDescription}</p>
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 mb-4" />
              <p className="text-3xl font-bold mb-2">Redeem Failed</p>
              <p className="text-lg opacity-90">{redeemResult.reason?.replace(/_/g, " ") ?? "Unknown error"}</p>
            </>
          )}
          <p className="mt-8 text-sm opacity-75">Returning to scanner…</p>
          <Button variant="secondary" className="mt-4" onClick={() => void handleReset()}>
            Scan Another
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center justify-center gap-4">
      <p className="text-muted-foreground text-center">Something went wrong after the scan.</p>
      <Button onClick={() => void handleReset()}>Back to scanner</Button>
    </div>
  );
}
