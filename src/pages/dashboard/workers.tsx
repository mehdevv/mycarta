import { useState } from "react";
import {
  useListWorkers,
  useCreateWorker,
  useUpdateWorker,
  useUpdateWorkerPassword,
  useDeleteWorker,
} from "@/api";
import { useGetTrialStatus } from "@/api/tenant";
import { getBrandingLimits } from "@/lib/branding-limits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, QrCode, Power, PowerOff, Trash2, Copy, Check, KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListWorkersQueryKey } from "@/api";
import { QRCodeSVG } from "qrcode.react";
import { useCurrentTenant } from "@/lib/tenant-context";
import { tenantEmployeeLink } from "@/lib/links";
import { tenantEmployeeQrLoginLink } from "@/lib/worker-qr-login";

const workerSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export default function Workers() {
  const { data: workers, isLoading } = useListWorkers();
  const { data: trialStatus } = useGetTrialStatus();
  const { slug } = useCurrentTenant();
  const planId = trialStatus?.planId ?? "trial";
  const limits = getBrandingLimits(planId as "trial");
  const activeWorkers = workers?.filter((w) => w.isActive).length ?? 0;
  const atWorkerLimit = limits.workerLimit !== null && activeWorkers >= limits.workerLimit;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [qrWorkerId, setQrWorkerId] = useState<string | null>(null);
  const [passwordWorkerId, setPasswordWorkerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrWorker = workers?.find((w) => w.id === qrWorkerId);
  const passwordWorker = workers?.find((w) => w.id === passwordWorkerId);

  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const updateWorkerPassword = useUpdateWorkerPassword();
  const deleteWorker = useDeleteWorker();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const employeeLink = slug ? tenantEmployeeLink(slug) : "";

  const copyEmployeeLink = async () => {
    if (!employeeLink) return;
    await navigator.clipboard.writeText(employeeLink);
    setCopied(true);
    toast({ title: "Lien copié" });
    setTimeout(() => setCopied(false), 2000);
  };

  const form = useForm<z.infer<typeof workerSchema>>({
    resolver: zodResolver(workerSchema),
    defaultValues: { fullName: "", password: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (values: z.infer<typeof workerSchema>) => {
    try {
      await createWorker.mutateAsync({ data: values });
      toast({ title: "Employé créé avec succès" });
      setIsAddOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      const description = message.includes("Edge Function")
        ? "Déployez la fonction create-worker dans Supabase (Edge Functions)."
        : message;
      toast({ title: "Échec de la création", description, variant: "destructive" });
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!passwordWorkerId) return;
    try {
      await updateWorkerPassword.mutateAsync({
        workerId: passwordWorkerId,
        password: values.password,
      });
      toast({ title: "Mot de passe mis à jour" });
      setPasswordWorkerId(null);
      passwordForm.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      const description = message.includes("Edge Function")
        ? "Déployez la fonction update-worker-password dans Supabase (Edge Functions)."
        : message;
      toast({ title: "Échec de la mise à jour", description, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateWorker.mutateAsync({ id, data: { isActive: !currentStatus } });
      queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
      toast({ title: `Employé ${!currentStatus ? "activé" : "désactivé"}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast({ title: "Échec de la mise à jour", description: message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cet employé ?")) {
      try {
        await deleteWorker.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
        toast({ title: "Employé supprimé" });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Une erreur est survenue";
        toast({ title: "Échec de la suppression", description: message, variant: "destructive" });
      }
    }
  };

  const openPasswordDialog = (workerId: string) => {
    passwordForm.reset({ password: "" });
    setPasswordWorkerId(workerId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
          {limits.workerLimit !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeWorkers} / {limits.workerLimit} employés actifs (plan {limits.planLabel})
            </p>
          )}
        </div>
        <Button onClick={() => setIsAddOpen(true)} disabled={atWorkerLimit}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un employé
        </Button>
      </div>

      {employeeLink && (
        <Card>
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Lien de connexion employés</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les employés se connectent avec leur nom et mot de passe sur cette page.
              </p>
              <p className="font-mono text-xs text-muted-foreground break-all mt-1">{employeeLink}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void copyEmployeeLink()}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copier
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Scans</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : workers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun employé.
                  </TableCell>
                </TableRow>
              ) : (
                workers?.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.fullName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={worker.isActive ? "default" : "secondary"}
                        className={worker.isActive ? "bg-secondary hover:bg-secondary/90 text-white" : ""}
                      >
                        {worker.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{worker.scanCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modifier le mot de passe"
                          onClick={() => openPasswordDialog(worker.id)}
                        >
                          <KeyRound className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Voir le QR"
                          onClick={() => setQrWorkerId(worker.id)}
                        >
                          <QrCode className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Activer / désactiver"
                          onClick={() => handleToggleStatus(worker.id, worker.isActive)}
                        >
                          {worker.isActive ? (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Power className="h-4 w-4 text-secondary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(worker.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un employé</DialogTitle>
            <DialogDescription>
              Saisissez le nom et le mot de passe. L&apos;employé se connectera via le lien employé avec ces
              identifiants.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Ahmed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createWorker.isPending}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordWorkerId}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordWorkerId(null);
            passwordForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>
              Nouveau mot de passe pour {passwordWorker?.fullName ?? "cet employé"}.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button variant="outline" type="button" onClick={() => setPasswordWorkerId(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateWorkerPassword.isPending}>
                  Mettre à jour
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrWorkerId} onOpenChange={(open) => !open && setQrWorkerId(null)}>
        <DialogContent className="sm:max-w-md flex flex-col items-center p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center">QR de connexion</DialogTitle>
            <DialogDescription className="text-center">
              L&apos;employé peut scanner ce code pour se connecter sans saisir ses identifiants.
            </DialogDescription>
          </DialogHeader>
          {qrWorker && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <QRCodeSVG
                value={slug ? tenantEmployeeQrLoginLink(slug, qrWorker.workerQrToken) : qrWorker.workerQrToken}
                size={256}
                level="H"
              />
            </div>
          )}
          {qrWorker && slug && (
            <p className="text-xs text-muted-foreground mt-3 text-center break-all px-2">
              {tenantEmployeeQrLoginLink(slug, qrWorker.workerQrToken)}
            </p>
          )}
          <Button variant="outline" className="mt-4 w-full" onClick={() => setQrWorkerId(null)}>
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
