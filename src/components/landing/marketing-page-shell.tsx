import { LandingNav } from "@/components/landing/Nav";
import { LandingFooter } from "@/components/landing/Footer";
import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

function AuthMinimalFooter() {
  const { t } = useLocale();

  return (
    <footer className="shop-auth-footer">
      <p>
        {t("landing.findShop.title")}{" "}
        <Link href="/client">{t("nav.findShop")}</Link>
        {" · "}
        <Link href="/legal/conditions">{t("auth.legalTerms")}</Link>
        {" · "}
        <Link href="/legal/confidentialite">{t("auth.legalPrivacy")}</Link>
      </p>
    </footer>
  );
}

export default function MarketingPageShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "auth";
}) {
  return (
    <main className={cn("landing-page min-h-screen", variant === "auth" && "shop-auth-page")}>
      <LandingNav />
      <div style={{ paddingTop: "var(--landing-nav-h)" }}>{children}</div>
      {variant === "auth" ? <AuthMinimalFooter /> : <LandingFooter />}
    </main>
  );
}
