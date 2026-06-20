import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import MarketingPageShell from "@/components/landing/marketing-page-shell";
import BrandLogo from "@/components/brand/mascot";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLogin } from "@/api";
import { useRegisterTenant } from "@/api/tenant";
import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/pricing";
import { usePlatformBranding } from "@/hooks/use-branding";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { cn } from "@/lib/utils";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const signupSchema = z.object({
  businessName: z.string().min(2, "Nom requis (min. 2 caractères)"),
  fullName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  slug: z.string().optional(),
}).refine((data) => {
  const slug = data.slug || slugify(data.businessName);
  return !slug || !isReservedSlug(slug);
}, { message: "Ce nom d'URL est réservé", path: ["slug"] });

type AuthTab = "login" | "signup";

const SIGNUP_PERKS = ["14 jours gratuits", "100 clients", "50 scans/jour", "Sans carte bancaire"] as const;

const LOGIN_PERKS = [
  "Tableau de bord en temps réel",
  "Gestion clients et récompenses",
  "QR code pour votre commerce",
] as const;

const SIGNUP_STEPS = [
  { num: "1", label: "Créer votre compte" },
  { num: "2", label: "Personnaliser votre carte" },
  { num: "3", label: "Accueillir vos clients" },
] as const;

function parseTab(search: string): AuthTab {
  return new URLSearchParams(search).get("tab") === "signup" ? "signup" : "login";
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  name,
  autoComplete,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  autoComplete: string;
  placeholder?: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="shop-auth-input-wrap">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="shop-auth-input"
      />
      <button
        type="button"
        className="shop-auth-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function TextInput({
  id,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="shop-auth-input"
    />
  );
}

export default function ShopAuthPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { login, logout, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const loginMutation = useLogin();
  const registerMutation = useRegisterTenant();
  const platform = usePlatformBranding();
  const [tab, setTab] = useState<AuthTab>(() => parseTab(search));
  const [showSlugEdit, setShowSlugEdit] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const businessRef = useRef<HTMLInputElement>(null);

  const selectedPlan = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("plan") ?? "trial";
  }, [search]);

  const planLabel = PLANS.find((p) => p.id === selectedPlan)?.name ?? "Essai gratuit";
  const isTrial = selectedPlan === "trial";

  useEffect(() => {
    setTab(parseTab(search));
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (tab === "login") emailRef.current?.focus();
      else businessRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, [tab]);

  function switchTab(next: AuthTab) {
    setTab(next);
    setShowSlugEdit(false);
    const params = new URLSearchParams(search);
    if (next === "signup") params.set("tab", "signup");
    else params.delete("tab");
    const qs = params.toString();
    setLocation(qs ? `/shop?${qs}` : "/shop");
  }

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    if (user.role === "super_admin") {
      setLocation("~/platform");
      return;
    }
    if (user.role === "owner") {
      setLocation("~/dashboard");
      return;
    }
    logout();
    toast({
      title: "Compte employé détecté",
      description: "Connectez-vous via l'espace employé.",
      variant: "destructive",
    });
    setLocation("~/client");
  }, [authLoading, isAuthenticated, user, setLocation, logout, toast]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { businessName: "", fullName: "", email: "", password: "", slug: "" },
  });

  const businessName = signupForm.watch("businessName");
  const slugValue = signupForm.watch("slug");
  const previewSlug = slugValue || (businessName ? slugify(businessName) : "ma-boutique");

  useEffect(() => {
    if (businessName && !showSlugEdit) {
      signupForm.setValue("slug", slugify(businessName));
    }
  }, [businessName, showSlugEdit, signupForm]);

  async function onLogin(values: z.infer<typeof loginSchema>) {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      login(response.accessToken);
      toast({ title: "Bon retour !" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Identifiants incorrects";
      toast({ title: "Connexion échouée", description: message, variant: "destructive" });
    }
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    try {
      await registerMutation.mutateAsync({
        businessName: values.businessName,
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        slug: values.slug || slugify(values.businessName),
        selectedPlan,
      });

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      login(authData.session?.access_token ?? "");
      toast({
        title: "Compte créé",
        description: `Essai gratuit 14 jours — plan ${planLabel}`,
      });
      setLocation("~/dashboard/onboarding");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'inscription";
      toast({ title: "Inscription échouée", description: message, variant: "destructive" });
    }
  }

  if (isAuthenticated) {
    return (
      <div className="landing-page min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--landing-text-secondary)]" />
      </div>
    );
  }

  const perks = tab === "signup" ? SIGNUP_PERKS : LOGIN_PERKS;

  return (
    <MarketingPageShell variant="auth">
      <section className="container-page shop-auth-wrap">
        <div className="shop-auth-grid">
          {/* Desktop aside */}
          <aside className="shop-auth-aside">
            <BrandLogo
              role="admin"
              size="sm"
              animate={false}
              logoUrl={platform.logoUrl}
              alt={platform.name}
              primaryColor="#888888"
            />
            <p className="landing-eyebrow mt-8">
              {tab === "signup" ? "Essai gratuit · 2 min" : "Espace commerçant"}
            </p>
            <h1 className="landing-h2 mt-3">
              {tab === "signup"
                ? `Lancez ${platform.name} pour votre commerce`
                : `Content de vous revoir`}
            </h1>
            <p className="landing-body mt-4">
              {tab === "signup"
                ? "Créez votre compte, personnalisez votre carte fidélité et commencez à scanner dès aujourd'hui."
                : "Connectez-vous pour gérer vos clients, vos récompenses et votre programme en un seul endroit."}
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-sm text-[var(--landing-text)]">
                  <Check size={16} className="landing-check shrink-0" strokeWidth={2.5} />
                  {perk}
                </li>
              ))}
            </ul>

            {tab === "signup" && (
              <div className="shop-auth-steps">
                {SIGNUP_STEPS.map((step) => (
                  <div key={step.num} className="shop-auth-step">
                    <p className="shop-auth-step-num">Étape {step.num}</p>
                    <p className="shop-auth-step-label">{step.label}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Form card */}
          <div className="shop-auth-card">
            {/* Mobile headline */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-xl font-medium tracking-tight text-[var(--landing-text)]">
                {tab === "signup" ? "Créer un compte" : "Connexion"}
              </h1>
              <p className="text-sm text-[var(--landing-text-secondary)] mt-1">
                {tab === "signup" ? "Essai gratuit 14 jours" : `Accédez à ${platform.name}`}
              </p>
            </div>

            <div className="landing-toggle" role="tablist" aria-label="Connexion ou inscription">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "login"}
                className={cn("landing-toggle-btn", tab === "login" && "is-active")}
                onClick={() => switchTab("login")}
              >
                Connexion
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signup"}
                className={cn("landing-toggle-btn", tab === "signup" && "is-active")}
                onClick={() => switchTab("signup")}
              >
                Créer un compte
              </button>
            </div>

            <div key={tab} className="shop-auth-form-panel">
              {tab === "signup" && !isTrial && (
                <div className="shop-auth-plan-chip">
                  <Sparkles size={14} />
                  Plan sélectionné : {planLabel}
                </div>
              )}

              <h2 className="shop-auth-form-title">
                {tab === "login" ? "Connectez-vous" : "Démarrez gratuitement"}
              </h2>
              <p className="shop-auth-form-sub">
                {tab === "login"
                  ? "Entrez vos identifiants propriétaire."
                  : "Quelques informations suffisent — aucune carte bancaire."}
              </p>

              {tab === "login" ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="shop-auth-field">
                          <label htmlFor="login-email">Email</label>
                          <FormControl>
                            <input
                              ref={emailRef}
                              id="login-email"
                              name={field.name}
                              type="email"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="email"
                              placeholder="vous@commerce.dz"
                              className="shop-auth-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="shop-auth-field">
                          <label htmlFor="login-password">Mot de passe</label>
                          <FormControl>
                            <PasswordInput
                              id="login-password"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <button
                      type="submit"
                      className="btn-pill w-full justify-center mt-6"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Se connecter"
                      )}
                    </button>
                    <div className="shop-auth-trust">
                      <span>Sécurisé</span>
                      <span>·</span>
                      <span>Données chiffrées</span>
                    </div>
                  </form>
                </Form>
              ) : (
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem className="shop-auth-field">
                          <label htmlFor="businessName">Nom du commerce</label>
                          <FormControl>
                            <input
                              ref={businessRef}
                              id="businessName"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              placeholder="Ma Boutique"
                              autoComplete="organization"
                              className="shop-auth-input"
                            />
                          </FormControl>
                          {!showSlugEdit && businessName && (
                            <p className="shop-auth-slug-preview">
                              Votre lien : <code>{platform.name}/{previewSlug}</code>
                              <button
                                type="button"
                                className="text-[var(--landing-text)] underline underline-offset-2 text-xs font-medium"
                                onClick={() => setShowSlugEdit(true)}
                              >
                                Modifier
                              </button>
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {showSlugEdit && (
                      <FormField
                        control={signupForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem className="shop-auth-field">
                            <label htmlFor="slug">URL personnalisée</label>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[var(--landing-text-secondary)] shrink-0">
                                  {platform.name}/
                                </span>
                                <input
                                  id="slug"
                                  name={field.name}
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  placeholder="ma-boutique"
                                  className="shop-auth-input flex-1"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="shop-auth-field">
                            <label htmlFor="fullName">Votre nom</label>
                            <FormControl>
                              <TextInput
                                id="fullName"
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                autoComplete="name"
                                placeholder="Prénom Nom"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="shop-auth-field">
                            <label htmlFor="signup-email">Email</label>
                            <FormControl>
                              <TextInput
                                id="signup-email"
                                name={field.name}
                                type="email"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                autoComplete="email"
                                placeholder="vous@exemple.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="shop-auth-field">
                          <label htmlFor="signup-password">Mot de passe</label>
                          <FormControl>
                            <PasswordInput
                              id="signup-password"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="new-password"
                              placeholder="8 caractères minimum"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      className="btn-pill w-full justify-center mt-6"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Créer mon commerce — c'est gratuit"
                      )}
                    </button>
                    <div className="shop-auth-trust">
                      <span>14 jours gratuits</span>
                      <span>·</span>
                      <span>Sans carte bancaire</span>
                      <span>·</span>
                      <span>Annulation libre</span>
                    </div>
                  </form>
                </Form>
              )}

              <div className="shop-auth-switch">
                {tab === "login" ? (
                  <>
                    Pas encore de compte ?{" "}
                    <button type="button" onClick={() => switchTab("signup")}>
                      Créer un essai gratuit
                    </button>
                  </>
                ) : (
                  <>
                    Déjà inscrit ?{" "}
                    <button type="button" onClick={() => switchTab("login")}>
                      Se connecter
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
