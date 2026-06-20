import { useState } from "react";
import { useListClients, useUpdateClient, exportContactsCsv, getListClientsQueryKey } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Eye, Ban, CheckCircle, Download, Mail, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default function Clients() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListClients({
    page,
    limit: 20,
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });
  const updateClient = useUpdateClient();

  const handleToggleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await updateClient.mutateAsync({ id, data: { isBlocked: !isBlocked } });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      toast({ title: isBlocked ? "Client débloqué" : "Client bloqué" });
    } catch {
      toast({ title: "Action échouée", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportContactsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clients-mycarta.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export terminé", description: "Fichier CSV téléchargé." });
    } catch {
      toast({ title: "Échec de l'export", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Fidélité"
        title="Clients"
        description={`${data?.total ?? 0} client${(data?.total ?? 0) !== 1 ? "s" : ""} inscrit${(data?.total ?? 0) !== 1 ? "s" : ""} — contacts, tampons et export.`}
        action={
          <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Export…" : "Exporter CSV"}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, téléphone, email…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="blocked">Bloqués</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Tampons</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Dernier scan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : data?.clients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucun client trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                data?.clients?.map((c) => (
                  <TableRow key={c.id} className={c.isBlocked ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline max-w-[180px] truncate"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {c.currentCycleStamps}/{c.totalStamps}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.enrolledAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lastScanAt ? new Date(c.lastScanAt).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isBlocked ? "destructive" : "secondary"}
                        className={
                          c.isBlocked ? "" : "bg-secondary/20 text-secondary-foreground border-secondary/30"
                        }
                      >
                        {c.isBlocked ? "Bloqué" : "Actif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/clients/${c.id}`)}
                          aria-label={`Voir ${c.fullName}`}
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleToggleBlock(c.id, c.isBlocked)}
                          aria-label={c.isBlocked ? "Débloquer" : "Bloquer"}
                        >
                          {c.isBlocked ? (
                            <CheckCircle className="h-4 w-4 text-secondary" />
                          ) : (
                            <Ban className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground flex items-center px-2">
            Page {page} sur {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
