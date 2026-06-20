import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLogin } from "@/api";
import { useRegisterTenant } from "@/api/tenant";
import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/pricing";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useLocale } from "@/lib/i18n/locale-context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
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

const loginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    password: z.string().min(1, t("auth.validation.passwordRequired")),
  });

const signupSchema = (t: (key: string) => string) =>
  z
    .object({
      businessName: z.string().min(2, t("auth.validation.nameRequired")),
      fullName: z.string().min(2, t("auth.validation.nameMin")),
      email: z.string().email(t("auth.validation.emailInvalid")),
      password: z.string().min(8, t("auth.validation.passwordMin")),
      slug: z.string().optional(),
    })
    .refine(
      (data) => {
        const slug = data.slug || slugify(data.businessName);
        return !slug || !isReservedSlug(slug);
      },
      { message: t("auth.validation.slugReserved"), path: ["slug"] },
    );

type AuthTab = "login" | "signup";

function promoSlides(t: (key: string) => string) {
  return [
    { icon: QrCode, text: t("auth.slide1") },
    { icon: BarChart3, text: t("auth.slide2") },
    { icon: ShieldCheck, text: t("auth.slide3") },
  ] as const;
}

function parseTab(search: string): AuthTab {
  return new URLSearchParams(search).get("tab") === "signup" ? "signup" : "login";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  name,
  autoComplete,
  placeholder,
  id,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  autoComplete: string;
  placeholder?: string;
  id: string;
  showLabel: string;
  hideLabel: string;
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
        aria-label={visible ? hideLabel : showLabel}
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
  const { t } = useLocale();
  const slides = useMemo(() => promoSlides(t), [t]);
  const [tab, setTab] = useState<AuthTab>(() => parseTab(search));
  const [showSlugEdit, setShowSlugEdit] = useState(false);
  const [slide, setSlide] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const businessRef = useRef<HTMLInputElement>(null);

  const selectedPlan = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("plan") ?? "trial";
  }, [search]);

  const planLabel = PLANS.find((p) => p.id === selectedPlan)?.name ?? t("plans.trial");
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [slides.length]);

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
      title: t("auth.toast.workerAccount"),
      description: t("auth.toast.workerAccountDesc"),
      variant: "destructive",
    });
    setLocation("~/client");
  }, [authLoading, isAuthenticated, user, setLocation, logout, toast]);

  const loginForm = useForm<z.infer<ReturnType<typeof loginSchema>>>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<ReturnType<typeof signupSchema>>>({
    resolver: zodResolver(signupSchema(t)),
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

  async function onLogin(values: z.infer<ReturnType<typeof loginSchema>>) {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      login(response.accessToken);
      toast({ title: t("auth.toast.loginWelcome") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.toast.wrongCredentials");
      toast({ title: t("auth.toast.loginFailed"), description: message, variant: "destructive" });
    }
  }

  async function onSignup(values: z.infer<ReturnType<typeof signupSchema>>) {
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
        title: t("auth.toast.signupCreated"),
        description: t("auth.toast.signupCreatedDesc", { plan: planLabel }),
      });
      setLocation("~/dashboard/onboarding");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.toast.signupErrorGeneric");
      toast({ title: t("auth.toast.signupFailed"), description: message, variant: "destructive" });
    }
  }

  async function handleForgotPassword() {
    const email = loginForm.getValues("email");
    if (!email || !z.string().email().safeParse(email).success) {
      toast({
        title: t("auth.toast.enterEmail"),
        description: t("auth.toast.enterEmailDesc"),
        variant: "destructive",
      });
      emailRef.current?.focus();
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/shop`,
      });
      if (error) throw error;
      toast({
        title: t("auth.toast.emailSent"),
        description: t("auth.toast.emailSentDesc"),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("auth.toast.resetError");
      toast({ title: t("auth.toast.error"), description: message, variant: "destructive" });
    }
  }

  function handleGoogle() {
    toast({
      title: t("common.comingSoon"),
      description: t("auth.googleSoon"),
    });
  }

  if (isAuthenticated) {
    return (
      <div className="auth-shell auth-shell--loading">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--landing-text-secondary)]" />
      </div>
    );
  }

  const SlideIcon = slides[slide].icon;

  return (
    <div className="auth-shell">
      <div className="auth-pane auth-pane--form">
        <header className="auth-topbar">
          <Link href="/" className="auth-brand">
            <img src={platform.logoUrl} alt={platform.name} className="auth-brand-logo" />
            <span className="auth-brand-name">{platform.name}</span>
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="auth-body">
          <div className="auth-card2">
            <div className="auth-seg" role="tablist" aria-label={t("auth.tabsAria")}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signup"}
                className={cn("auth-seg-btn", tab === "signup" && "is-active")}
                onClick={() => switchTab("signup")}
              >
                {t("auth.createAccount")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "login"}
                className={cn("auth-seg-btn", tab === "login" && "is-active")}
                onClick={() => switchTab("login")}
              >
                {t("auth.signIn")}
              </button>
            </div>

            <div key={tab} className="shop-auth-form-panel">
              {tab === "signup" && !isTrial && (
                <div className="shop-auth-plan-chip">
                  <Sparkles size={14} />
                  {t("auth.selectedPlan", { plan: planLabel })}
                </div>
              )}

              {tab === "login" ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="shop-auth-field">
                          <label htmlFor="login-email">{t("common.email")}</label>
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
                              placeholder={t("auth.emailPlaceholder")}
                              className="shop-auth-input email"
                              dir="ltr"
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
                          <label htmlFor="login-password">{t("common.password")}</label>
                          <FormControl>
                            <PasswordInput
                              id="login-password"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="current-password"
                              placeholder={t("auth.passwordPlaceholderLogin")}
                              showLabel={t("auth.showPassword")}
                              hideLabel={t("auth.hidePassword")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="auth-forgot-row">
                      <button type="button" className="auth-forgot" onClick={handleForgotPassword}>
                        {t("auth.forgotPassword")}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="auth-submit"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("auth.submitLogin")
                      )}
                    </button>
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
                          <label htmlFor="businessName">{t("auth.businessName")}</label>
                          <FormControl>
                            <input
                              ref={businessRef}
                              id="businessName"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              placeholder={t("auth.businessPlaceholderShort")}
                              autoComplete="organization"
                              className="shop-auth-input"
                            />
                          </FormControl>
                          {!showSlugEdit && businessName && (
                            <p className="shop-auth-slug-preview">
                              {t("auth.yourLink")}{" "}
                              <code dir="ltr" className="url">
                                {platform.name}/{previewSlug}
                              </code>
                              <button
                                type="button"
                                className="text-[var(--landing-text)] underline underline-offset-2 text-xs font-medium"
                                onClick={() => setShowSlugEdit(true)}
                              >
                                {t("auth.edit")}
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
                            <label htmlFor="slug">{t("auth.customUrl")}</label>
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
                                  placeholder={t("auth.slugPlaceholder")}
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
                            <label htmlFor="fullName">{t("auth.fullName")}</label>
                            <FormControl>
                              <TextInput
                                id="fullName"
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                autoComplete="name"
                                placeholder={t("auth.fullNamePlaceholderShort")}
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
                            <label htmlFor="signup-email">{t("common.email")}</label>
                            <FormControl>
                              <TextInput
                                id="signup-email"
                                name={field.name}
                                type="email"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                autoComplete="email"
                                placeholder={t("auth.emailExample")}
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
                          <label htmlFor="signup-password">{t("common.password")}</label>
                          <FormControl>
                            <PasswordInput
                              id="signup-password"
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="new-password"
                              placeholder={t("dashboard.settings.passwordMin")}
                              showLabel={t("auth.showPassword")}
                              hideLabel={t("auth.hidePassword")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      className="auth-submit"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("auth.signupSubmitLong")
                      )}
                    </button>
                  </form>
                </Form>
              )}

              <div className="auth-or">
                <span>{t("auth.orDivider")}</span>
              </div>

              <button type="button" className="auth-google" onClick={handleGoogle}>
                <GoogleIcon />
                {t("auth.continueGoogle")}
              </button>

              <p className="auth-legal">
                ©{platform.name}. {t("common.allRightsReserved")}{" "}
                <Link href="/legal/conditions">{t("auth.legalTerms")}</Link>
                {" · "}
                <Link href="/legal/confidentialite">{t("auth.legalPrivacy")}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: promo panel ─────────────────────────────── */}
      <aside className="auth-pane auth-pane--promo" aria-hidden>
        <div className="auth-promo-glow auth-promo-glow--1" />
        <div className="auth-promo-glow auth-promo-glow--2" />

        <div className="auth-promo-inner">
          <div className="auth-promo-logo">
            <img src={platform.logoDarkUrl} alt="" className="auth-promo-logo-img" />
            <span>{platform.name}</span>
          </div>

          <h2 className="auth-promo-title">{t("auth.promoTitleLong")}</h2>

          <div className="auth-promo-proof">
            <div className="auth-proof-avatars">
              {["#3f3f46", "#52525b", "#71717a", "#a1a1aa"].map((c, i) => (
                <span key={i} className="auth-proof-avatar" style={{ background: c }}>
                  {String.fromCharCode(65 + i)}
                </span>
              ))}
            </div>
            <p>{t("auth.promoProofLong")}</p>
          </div>

          <div className="auth-showcase">
            <div className="auth-chip auth-chip--a">{t("auth.chipQrShort")}</div>
            <div className="auth-chip auth-chip--b">{t("auth.chipAntiFraudShort")}</div>
            <div className="auth-chip auth-chip--c">{t("auth.chipClients")}</div>

            <div className="auth-card-mock">
              <div className="auth-card-mock-head">
                <span className="auth-card-mock-brand">{t("auth.mockBrand")}</span>
                <span className="auth-card-mock-badge">{t("auth.promoMockBadge")}</span>
              </div>
              <div className="auth-card-mock-stamps">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn("auth-stamp", i < 5 && "is-filled")}
                  >
                    {i < 5 ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                ))}
              </div>
              <div className="auth-card-mock-foot">
                <span>{t("auth.mockStamps")}</span>
                <span className="auth-card-mock-reward">{t("auth.mockReward")}</span>
              </div>
            </div>
          </div>

          <div className="auth-promo-caption">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                className="auth-promo-caption-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <span className="auth-promo-caption-icon">
                  <SlideIcon size={16} strokeWidth={2} />
                </span>
                {slides[slide].text}
              </motion.div>
            </AnimatePresence>

            <div className="auth-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn("auth-dot", slide === i && "is-active")}
                  onClick={() => setSlide(i)}
                  aria-label={`Diapositive ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
