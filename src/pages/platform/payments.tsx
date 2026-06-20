import { useMemo, useState } from "react";
import { usePlatformReceipts, useReviewPaymentReceipt } from "@/api/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformCardBody,
  StatusBadge,
  PlatformButton,
  PlatformSkeleton,
  PlatformTabs,
} from "@/components/platform/platform-ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDzd } from "@/lib/pricing";
import { downloadCsv } from "@/lib/platform-export";
import { Download } from "lucide-react";

export default function PlatformPaymentsPage() {
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const { data: receipts = [], isLoading, refetch } = usePlatformReceipts(status);
  const reviewReceipt = useReviewPaymentReceipt();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const avgReviewHours = useMemo(() => {
    const reviewed = receipts.filter((r) => r.reviewed_at && r.status !== "pending");
    if (!reviewed.length) return null;
    const total = reviewed.reduce((s, r) => s + (new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()), 0);
    return Math.round(total / reviewed.length / 3600000);
  }, [receipts]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (receiptId: string) => {
    try {
      await reviewReceipt.mutateAsync({ receiptId, action: "approve" });
      toast({ title: "Reçu approuvé" });
      refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectNotes.trim()) {
      toast({ title: "Motif requis", variant: "destructive" });
      return;
    }
    try {
      await reviewReceipt.mutateAsync({ receiptId: rejectId, action: "reject", notes: rejectNotes.trim() });
      toast({ title: "Reçu rejeté" });
      setRejectId(null);
      setRejectNotes("");
      refetch();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    }
  };

  const bulkApprove = async () => {
    const ids = [...selected].filter((id) => receipts.find((r) => r.id === id)?.status === "pending");
    for (const id of ids) {
      await reviewReceipt.mutateAsync({ receiptId: id, action: "approve" });
    }
    setSelected(new Set());
    toast({ title: `${ids.length} reçu(s) approuvé(s)` });
    refetch();
  };

  const exportCsv = () => {
    downloadCsv(`mycarta-recus-${status}.csv`, [
      ["Commerce", "Montant", "Plan", "Période", "Méthode", "Statut", "Notes", "Créé le"],
      ...receipts.map((r) => [
        r.tenants?.name ?? "",
        r.amount_dzd,
        r.plan_id,
        r.billing_period,
        r.payment_method,
        r.status,
        r.reviewer_notes ?? "",
        r.created_at,
      ]),
    ]);
  };

  return (
    <div className="plat-stack">
      <PlatformPageHeader
        title="Paiements"
        description={avgReviewHours != null ? `Délai moyen de validation : ${avgReviewHours}h` : "Validation des reçus BaridiMob."}
        action={
          <PlatformButton variant="secondary" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />Export CSV
          </PlatformButton>
        }
      />

      <PlatformTabs
        value={status}
        onChange={setStatus}
        items={[
          { value: "pending", label: "En attente" },
          { value: "approved", label: "Approuvés" },
          { value: "rejected", label: "Rejetés" },
          { value: "all", label: "Tous" },
        ]}
      />

      {status === "pending" && selected.size > 0 && (
        <PlatformButton variant="success" size="sm" onClick={bulkApprove} disabled={reviewReceipt.isPending}>
          Approuver {selected.size} sélectionné(s)
        </PlatformButton>
      )}

      <PlatformCard>
        <PlatformCardBody flush>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <PlatformSkeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : receipts.length === 0 ? (
            <p className="plat-empty">Aucun reçu.</p>
          ) : (
            <div className="plat-list">
              {receipts.map((r) => (
                <div key={r.id} className="plat-list-item items-start">
                  {r.status === "pending" && (
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="mt-1" />
                  )}
                  <div className="flex-1 text-sm space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="plat-cell-primary">{r.tenants?.name ?? "Commerce"}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p>{formatDzd(r.amount_dzd)} · {r.plan_id} · {r.payment_method}</p>
                    <p className="plat-cell-muted">{new Date(r.created_at).toLocaleString("fr-DZ")}</p>
                    {r.reviewer_notes && <p className="text-xs" style={{ color: "var(--plat-warning)" }}>Note : {r.reviewer_notes}</p>}
                    <div className="flex gap-3 pt-1">
                      <button type="button" className="plat-link text-xs" onClick={() => setPreviewUrl(r.receipt_url)}>Aperçu</button>
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" className="plat-link text-xs">Ouvrir</a>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="plat-toolbar shrink-0">
                      <PlatformButton variant="success" size="sm" onClick={() => handleApprove(r.id)} disabled={reviewReceipt.isPending}>Approuver</PlatformButton>
                      <PlatformButton variant="secondary" size="sm" onClick={() => { setRejectId(r.id); setRejectNotes(""); }}>Rejeter</PlatformButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PlatformCardBody>
      </PlatformCard>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="plat-dialog">
          <DialogHeader><DialogTitle>Motif de rejet</DialogTitle></DialogHeader>
          <textarea
            className="plat-input plat-textarea"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Expliquez pourquoi le reçu est rejeté…"
            rows={4}
          />
          <DialogFooter>
            <PlatformButton variant="secondary" onClick={() => setRejectId(null)}>Annuler</PlatformButton>
            <PlatformButton variant="danger" onClick={handleReject} disabled={!rejectNotes.trim()}>Rejeter</PlatformButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="plat-dialog max-w-2xl">
          <DialogHeader><DialogTitle>Aperçu du reçu</DialogTitle></DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Reçu"
              className="w-full rounded-xl max-h-[70vh] object-contain"
              style={{ border: "1px solid var(--plat-border)", background: "var(--plat-bg-secondary)" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
