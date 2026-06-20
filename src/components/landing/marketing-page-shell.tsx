import { LandingNav } from "@/components/landing/Nav";
import { LandingFooter } from "@/components/landing/Footer";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function AuthMinimalFooter() {
  return (
    <footer className="shop-auth-footer">
      <p>
        Vous êtes client ?{" "}
        <Link href="/client">Trouver mon commerce</Link>
        {" · "}
        <Link href="/employee">Espace employé</Link>
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
