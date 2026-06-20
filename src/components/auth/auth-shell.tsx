import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/brand/mascot";
import type { BrandRole } from "@/lib/brand-icons";
import { usePlatformBranding } from "@/hooks/use-branding";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  role: BrandRole;
  logoUrl?: string | null;
  businessName?: string;
  primaryColor?: string;
}

export default function AuthShell({
  title,
  description,
  children,
  role,
  logoUrl,
  businessName,
  primaryColor,
}: AuthShellProps) {
  const platform = usePlatformBranding();
  const resolvedLogo = logoUrl ?? platform.logoUrl;
  const resolvedColor = primaryColor ?? platform.primaryColor;
  const alt = businessName ?? platform.name;

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border relative z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-4">
          <BrandLogo role={role} size="lg" className="mx-auto mb-2" float logoUrl={resolvedLogo} alt={alt} primaryColor={resolvedColor} />
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
