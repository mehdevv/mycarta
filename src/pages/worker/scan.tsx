import { useState, useEffect, useRef, useCallback } from "react";
import { usePurchaseScan, useConfirmPurchaseScan } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { scanResultVariants, vibrate } from "@/lib/motion";
import { extractQrToken } from "@/lib/supabase";
import { FRAUD_REASON_LABELS } from "@/api/fraud";
import { CheckCircle, XCircle, Gift, ArrowLeft, Minus, Plus, ScanLine, CalendarClock, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const SCANNER_ELEMENT_ID = "qr-scanner-region";

type ScanResult = {
  approved: boolean;
  reason: string | null;
  stampsAdded: number;
  currentStamps: number;
  stampThreshold: number;
  rewardTriggered: boolean;
  rewardDescription?: string | null;
  needsProducts: boolean;
  products?: { id: string; name: string; price: number; category: string }[];
  pendingScanId?: string | null;
  clientName?: string | null;
  maxScansPerDay?: number;
};

type ProductQty = Record<string, number>;

function normalizeScanResult(raw: Record<string, unknown>): ScanResult {
  return {
    approved: Boolean(raw.approved),
    reason: (raw.reason as string | null) ?? null,
    stampsAdded: Number(raw.stampsAdded ?? raw.stamps_added ?? 0),
    currentStamps: Number(raw.currentStamps ?? raw.current_stamps ?? 0),
    stampThreshold: Number(raw.stampThreshold ?? raw.stamp_threshold ?? 9),
    rewardTriggered: Boolean(raw.rewardTriggered ?? raw.reward_triggered),
    rewardDescription: (raw.rewardDescription ?? raw.reward_description) as string | null | undefined,
    needsProducts: Boolean(raw.needsProducts ?? raw.needs_products),
    products: Array.isArray(raw.products)
      ? (raw.products as ScanResult["products"])
      : [],
    pendingScanId: (raw.pendingScanId ?? raw.pending_scan_id) as string | null | undefined,
    clientName: (raw.clientName ?? raw.client_name) as string | null | undefined,
    maxScansPerDay: Number(raw.maxScansPerDay ?? raw.max_scans_per_day ?? 0) || undefined,
  };
}

function fraudLabel(reason: string | null) {
  if (!reason) return "Scan was blocked";
  return FRAUD_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export default function WorkerScan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const purchaseScan = usePurchaseScan();
  const confirmScan = useConfirmPurchaseScan();
  const [step, setStep] = useState<"scan" | "products" | "result">("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [productQtys, setProductQtys] = useState<ProductQty>({});
  const [cameraStarting, setCameraStarting] = useState(false);
  const html5QrcodeRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutateScanRef = useRef(purchaseScan.mutateAsync);
  const toastRef = useRef(toast);
  mutateScanRef.current = purchaseScan.mutateAsync;
  toastRef.current = toast;

  const stopScanner = useCallback(async () => {
    const scanner = html5QrcodeRef.current;
    html5QrcodeRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped.
    }
    try {
      scanner.clear();
    } catch {
      // clear() can fail if the element was unmounted.
    }
    const el = document.getElementById(SCANNER_ELEMENT_ID);
    if (el) el.innerHTML = "";
  }, []);

  const handleReset = useCallback(async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    processingRef.current = false;
    await stopScanner();
    setStep("scan");
    setResult(null);
    setProductQtys({});
    setCameraStarting(false);
  }, [stopScanner]);

  useEffect(() => {
    if (step !== "result" || !result) return;
    resetTimerRef.current = setTimeout(() => {
      void handleReset();
    }, 3000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [step, result, handleReset]);

  useEffect(() => {
    if (step !== "scan") {
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

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
              await stopScanner();

              const scanResult = await mutateScanRef.current({
                data: { clientQrToken: extractQrToken(decodedText) },
              });
              const r = normalizeScanResult(scanResult as Record<string, unknown>);
              setResult(r);

              if (r.approved) vibrate(50);
              else vibrate([100, 50, 100]);

              if (r.needsProducts && r.pendingScanId) {
                setProductQtys({});
                setStep("products");
              } else {
                setStep("result");
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Scan failed";
              toastRef.current({
                title: "Scan failed",
                description: message,
                variant: "destructive",
              });
              processingRef.current = false;
              setStep("scan");
            }
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
  }, [step, stopScanner]);

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
      setStep("result");
      vibrate(50);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Confirm failed";
      toast({ title: "Confirm failed", description: message, variant: "destructive" });
    }
  };

  if (step === "scan") {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to worker home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Scan Customer Card</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
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
          <p className="text-muted-foreground text-sm text-center">
            Point the camera at the customer&apos;s loyalty card QR code
          </p>
          <ScanLine className="h-5 w-5 text-primary animate-pulse" />
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
              <p className="mt-4 text-lg font-semibold">
                {result.currentStamps} / {result.stampThreshold} stamps
              </p>
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

  return (
    <div className="flex flex-col h-full p-4 items-center justify-center gap-4">
      <p className="text-muted-foreground text-center">Something went wrong after the scan.</p>
      <Button onClick={() => void handleReset()}>Back to scanner</Button>
    </div>
  );
}
