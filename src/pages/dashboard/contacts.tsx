import { useListClients, exportContactsCsv } from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Download, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const { data, isLoading } = useListClients({ limit: 100, page: 1 });
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const blob = await exportContactsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "contacts-iceking-card.csv";
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
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.total ?? 0} registered clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Stamps</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : data?.clients?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contacts yet.</TableCell></TableRow>
              ) : data?.clients?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                        <Mail className="h-3 w-3" /> {c.email}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">{c.totalStamps}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.enrolledAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={c.isBlocked ? "destructive" : "outline"} className={!c.isBlocked ? "bg-secondary/10 text-secondary-foreground border-secondary/30 text-xs" : "text-xs"}>
                      {c.isBlocked ? "Blocked" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
