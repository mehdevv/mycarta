import { useState, useEffect, useRef, useCallback } from "react";
import { usePurchaseScan, useConfirmPurchaseScan } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { scanResultVariants, vibrate } from "@/lib/motion";
import { extractQrToken } from "@/lib/supabase";
import { FRAUD_REASON_LABELS } from "@/api/fraud";
import { CheckCircle, XCircle, Gift, ArrowLeft, Minus, Plus, ScanLine, CalendarClock } from "lucide-react";
import { useLocation } from "wouter";

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
  const [productsOpen, setProductsOpen] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [scanning, setScanning] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setStep("scan");
    setResult(null);
    setProductQtys({});
    setProductsOpen(false);
    setScanning(false);
  }, []);

  useEffect(() => {
    if (step !== "result" || !result) return;
    resetTimerRef.current = setTimeout(handleReset, 3000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [step, result, handleReset]);

  useEffect(() => {
    if (step !== "scan" || !scannerRef.current) return;

    let cancelled = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-scanner-region");
      html5QrcodeRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (scanning) return;
            setScanning(true);
            try {
              await scanner.stop();
              html5QrcodeRef.current = null;
            } catch { /* ignore */ }
            try {
              const scanResult = await purchaseScan.mutateAsync({
                data: { clientQrToken: extractQrToken(decodedText) },
              });
              const r = normalizeScanResult(scanResult as Record<string, unknown>);
              setResult(r);
              setScanning(false);
              if (r.approved) vibrate(50);
              else vibrate([100, 50, 100]);

              if (r.needsProducts && r.pendingScanId) {
                setProductQtys({});
                setProductsOpen(true);
                setStep("products");
              } else {
                setStep("result");
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Scan failed";
              toast({ title: "Scan failed", description: message, variant: "destructive" });
              setScanning(false);
              setStep("scan");
            }
          },
          () => {},
        )
        .catch(() => {
          toast({
            title: "Camera access denied",
            description: "Allow camera access to scan QR codes.",
            variant: "destructive",
          });
        });
    });

    return () => {
      cancelled = true;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current = null;
      }
    };
  }, [step, scanning, purchaseScan, toast]);

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
      setProductsOpen(false);
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
            <div id="qr-scanner-region" ref={scannerRef} className="overflow-hidden rounded-2xl shadow-lg w-full aspect-square" />
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
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={handleReset} aria-label="Cancel">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Select Products</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Customer: <span className="font-medium text-foreground">{result.clientName ?? "Unknown"}</span>
        </p>

        <Sheet
          open={productsOpen}
          onOpenChange={(open) => {
            setProductsOpen(open);
            if (!open) handleReset();
          }}
        >
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Select products</SheetTitle>
              <SheetDescription>
                {products.length === 0
                  ? "No products in catalog — confirm to add the stamp anyway."
                  : "Choose what the customer bought."}
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[50vh] space-y-3 py-4">
              {products.map((p) => (
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
              ))}
            </div>
            <SheetFooter className="flex flex-col gap-2 sm:flex-col">
              <Button className="w-full h-12" onClick={handleConfirmProducts} disabled={confirmScan.isPending}>
                {confirmScan.isPending ? "Processing…" : "Confirm & Add Stamp"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleReset}>Cancel</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center text-white ${bgClass}`}
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
          <Button
            variant="secondary"
            className="mt-4"
            onClick={handleReset}
          >
            Scan Another
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center justify-center gap-4">
      <p className="text-muted-foreground text-center">Something went wrong after the scan.</p>
      <Button onClick={handleReset}>Back to scanner</Button>
    </div>
  );
}
