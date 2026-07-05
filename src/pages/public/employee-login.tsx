import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useRoute } from "wouter";
import { useLoginWorker, useGetTenantBySlug } from "@/api";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AuthShell from "@/components/auth/auth-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useShopBranding } from "@/hooks/use-branding";
import { rememberWorkerTenantSlug } from "@/lib/scoped-routes";
import { setActiveAuthSlot } from "@/lib/auth-slots";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  fullName: z.string().min(2, "Nom requis (au moins 2 caractères)."),
  password: z.string().min(1, "Mot de passe requis."),
});

export default function EmployeeLogin() {
  const [, slugParams] = useRoute("/:slug/employee");
  const tenantSlug = slugParams?.slug ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, logoutWorker, isWorkerAuthenticated, workerUser, isWorkerLoading } = useAuth();
  const loginMutation = useLoginWorker();
  const { data: tenantMeta, isLoading: tenantLoading } = useGetTenantBySlug(tenantSlug || undefined);
  const branding = useShopBranding(tenantSlug || undefined);

  const tenantId = (tenantMeta?.id as string) ?? undefined;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { fullName: "", password: "" },
  });

  useEffect(() => {
    setActiveAuthSlot("worker");
  }, []);

  useEffect(() => {
    if (tenantSlug) rememberWorkerTenantSlug(tenantSlug);
  }, [tenantSlug]);

  useEffect(() => {
    if (!isWorkerAuthenticated || !workerUser) return;
    if (workerUser.role === "worker") {
      if (tenantId && workerUser.tenantId && workerUser.tenantId !== tenantId) {
        void logoutWorker();
        toast({
          title: "Compte incorrect",
          description: "Ce compte appartient à une autre boutique.",
          variant: "destructive",
        });
        return;
      }
      setLocation("~/worker");
    }
  }, [isWorkerAuthenticated, workerUser, tenantId, logoutWorker, toast, setLocation]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    if (!tenantSlug || !tenantId) {
      toast({ title: "Boutique introuvable", variant: "destructive" });
      return;
    }
    try {
      await loginMutation.mutateAsync({
        data: {
          tenantSlug,
          fullName: values.fullName.trim(),
          password: values.password,
        },
      });
      setActiveAuthSlot("worker");
      login("worker");
      toast({ title: "Bon retour !" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nom ou mot de passe incorrect";
      toast({ title: "Connexion échouée", description: message, variant: "destructive" });
    }
  };

  if (tenantSlug && tenantLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tenantSlug && !tenantId) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Boutique introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez le lien de connexion fourni par votre employeur.
          </p>
        </div>
      </div>
    );
  }

  if (isWorkerAuthenticated) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <AuthShell
      role="employee"
      title="Connexion employé"
      description={
        branding.businessName
          ? `Accès équipe — ${branding.businessName}`
          : "Accès équipe pour scanner les cartes clients"
      }
      logoUrl={branding.logoUrl}
      primaryColor={branding.primaryColor}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Votre nom" autoComplete="username" {...field} />
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
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full mt-2" size="lg" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
