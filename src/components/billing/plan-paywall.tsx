import { Link } from "wouter";
import { useGetTrialStatus } from "@/api/tenant";
import { PLANS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

type PlanPaywallProps = {
  feature: "whatsapp" | "campaigns" | "api";
  children: React.ReactNode;
};

export default function PlanPaywall({ feature, children }: PlanPaywallProps) {
  const { data: status } = useGetTrialStatus();
  const plan = PLANS.find((p) => p.id === status?.planId);

  const blocked =
    feature === "whatsapp"
      ? !plan?.whatsapp
      : feature === "api"
        ? !plan?.apiAccess
        : status?.planId === "trial";

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
