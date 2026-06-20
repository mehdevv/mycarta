import { Link } from "wouter";
import { useGetTrialStatus } from "@/api/tenant";
import { getPlan } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

type PlanPaywallProps = {
  feature: "whatsapp" | "campaigns" | "api";
  children: React.ReactNode;
};

export default function PlanPaywall({ feature, children }: PlanPaywallProps) {
  const { data: status } = useGetTrialStatus();
  const caps = getPlan(status?.planId ?? "trial").capabilities;

  const blocked =
    feature === "whatsapp"
      ? !caps.whatsapp
      : feature === "api"
        ? !caps.apiAccess
        : false;

  if (!blocked) return <>{children}</>;
  return (
    <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        Cette fonctionnalité nécessite un plan supérieur.
      </p>
      <Link href="/billing">
        <Button size="sm" className="bg-amber-600 hover:bg-amber-500">
          Mettre à niveau
        </Button>
      </Link>
    </div>
  );
}
