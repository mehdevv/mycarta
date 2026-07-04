import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import MarketingPageShell from "@/components/landing/marketing-page-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useRegisterTenant } from "@/api/tenant";
import { supabaseBusiness } from "@/lib/supabase";
import { PLANS, getPlan } from "@/lib/pricing";
import { usePlatformBranding } from "@/hooks/use-branding";
import { Check } from "lucide-react";
import { captureAffiliateRefFromSearch } from "@/lib/affiliate-ref";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const trialPlan = getPlan("trial");
const perks = [
  "14 jours gratuits",
  `${trialPlan.clientLimitLabel} clients`,
  `${trialPlan.scansTotalLimitLabel ?? "25"} scans`,
  `${trialPlan.workerLimitLabel} workers`,
  "Sans carte bancaire",
];

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { login } = useAuth();
  const registerMutation = useRegisterTenant();
  const platform = usePlatformBranding();

  const selectedPlan = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("plan") ?? "trial";
  }, [search]);

  const planLabel = PLANS.find((p) => p.id === selectedPlan)?.name ?? "Essai gratuit";
  const affiliateRef = useMemo(() => captureAffiliateRefFromSearch(search), [search]);

const phoneSchema = z
  .string()
  .min(8, "Téléphone requis (min. 8 chiffres)")
  .refine((v) => v.replace(/\D/g, "").length >= 8, "Min. 8 chiffres");

  const schema = z.object({
    businessName: z.string().min(2, "Nom requis (min. 2 caractères)"),
    fullName: z.string().min(2, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: phoneSchema,
    password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
    slug: z.string().optional(),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { businessName: "", fullName: "", email: "", phone: "", password: "", slug: "" },
  });

  const businessName = form.watch("businessName");

  useEffect(() => {
    if (businessName && !form.getValues("slug")) {
      form.setValue("slug", slugify(businessName));
    }
  }, [businessName, form]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await registerMutation.mutateAsync({
        businessName: values.businessName,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone.replace(/\D/g, ""),
        password: values.password,
        slug: values.slug || slugify(values.businessName),
        selectedPlan,
        affiliateCode: affiliateRef ?? undefined,
      });

      const { data: authData, error } = await supabaseBusiness.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      login("business");
      toast({
        title: "Compte créé",
        description: `Essai gratuit 14 jours — plan ${planLabel}`,
      });
      setLocation("~/dashboard/onboarding");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'inscription";
      toast({ title: "Inscription échouée", description: message, variant: "destructive" });
    }
  };

  return (
    <MarketingPageShell>
      <section className="container-page py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start max-w-5xl mx-auto">
          <div className="lg:pt-6">
            <p className="landing-eyebrow">Inscription</p>
            <h1 className="landing-h2 mt-3">Créez votre espace {platform.name}</h1>
            <p className="landing-body mt-4">
              Plan <strong className="font-medium text-[var(--landing-text)]">{planLabel}</strong> — configurez votre
              programme fidélité en quelques minutes.
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 landing-body-sm text-[var(--landing-text)]">
                  <Check size={16} className="landing-check shrink-0" strokeWidth={2} />
                  {perk}
                </li>
              ))}
            </ul>

            <p className="landing-body-sm mt-10">
              Déjà inscrit ?{" "}
              <Link href="/shop" className="text-[var(--landing-text)] font-medium underline-offset-2 hover:underline">
                Connexion
              </Link>
            </p>
          </div>

          <div className="landing-form-card">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {affiliateRef && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-medium">
                      Offre partenaire <strong>{affiliateRef}</strong>
                    </p>
                    <p className="mt-1 text-emerald-800/80">
                      Tarifs réduits pendant 3 mois après abonnement.
                    </p>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du commerce</FormLabel>
                      <FormControl>
                        <Input placeholder="Ma Boutique" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL publique</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--landing-text-secondary)] shrink-0">
                            {platform.name}/
                          </span>
                          <Input placeholder="ma-boutique" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Votre nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom Nom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="05 55 12 34 56" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="vous@exemple.com" {...field} />
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
                        <Input type="password" placeholder="8 caractères minimum" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <button
                  type="submit"
                  className="btn-pill w-full lg justify-center mt-2"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Création…" : "Démarrer l'essai gratuit"}
                </button>
              </form>
            </Form>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
