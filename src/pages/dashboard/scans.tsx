import { useState } from "react";
import { useListScans, exportScansCsv } from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  blocked_fraud: "bg-destructive/20 text-destructive border-destructive/30",
  blocked_limit: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function Scans() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListScans({ page, limit: 50 });
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const blob = await exportScansCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scan-log-iceking-card.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Log</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.total ?? 0} total scans · <span className="text-destructive font-medium">{data?.fraudCount ?? 0} fraud alerts</span></p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Stamps</TableHead>
                <TableHead>Reward</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : data?.scans?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No scans yet.</TableCell></TableRow>
              ) : data?.scans?.map(s => (
                <TableRow key={s.id} className={s.status === "blocked_fraud" ? "bg-destructive/5" : s.status === "blocked_limit" ? "bg-amber-50" : ""}>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(s.scannedAt).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{s.clientName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.workerName ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.scanType}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[s.status] ?? ""}`}>
                      {s.status === "blocked_fraud" && <ShieldAlert className="h-3 w-3 mr-1" />}
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">+{s.stampsAdded}</TableCell>
                  <TableCell>{s.rewardTriggered ? <Badge className="bg-amber-500 text-white text-xs">Reward</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground flex items-center px-2">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
