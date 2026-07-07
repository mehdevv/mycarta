import { motion } from "framer-motion";
import BrandLogo from "@/components/brand/mascot";
import { fadeUp } from "@/lib/motion";
import { useClientI18n } from "@/hooks/use-client-i18n";

type ClientShellProps = {
  children: React.ReactNode;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
  lite?: boolean;
};

export default function ClientShell({
  children,
  primaryColor = "#1A56DB",
  secondaryColor = "#0E9F6E",
  className = "",
  lite = false,
}: ClientShellProps) {
  return (
    <div
      className={`min-h-[100dvh] relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(165deg, ${primaryColor}22 0%, #f8fafc 45%, ${secondaryColor}18 100%)`,
      }}
    >
      {lite ? (
        <>
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-40"
            style={{ backgroundColor: `${primaryColor}28` }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full opacity-30"
            style={{ backgroundColor: `${secondaryColor}22` }}
          />
        </>
      ) : (
        <>
          <motion.div
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-60"
            style={{ backgroundColor: `${primaryColor}40` }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full blur-3xl opacity-50"
            style={{ backgroundColor: `${secondaryColor}35` }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function ClientCard({
  children,
  className = "",
  lite = false,
}: {
  children: React.ReactNode;
  className?: string;
  lite?: boolean;
}) {
  if (lite) {
    return (
      <div
        className={`w-full max-w-md mx-auto rounded-3xl bg-white/95 shadow-xl shadow-black/8 border border-white/60 ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className={`w-full max-w-md mx-auto rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl shadow-black/8 border border-white/60 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function ClientLoading({
  label,
  logoUrl,
  businessName,
  primaryColor,
  lite = true,
}: {
  label?: string;
  logoUrl?: string | null;
  businessName?: string;
  primaryColor?: string;
  lite?: boolean;
}) {
  const { t } = useClientI18n();
  const text = label ?? t("loadingCard");
  return (
    <ClientShell primaryColor={primaryColor} lite={lite}>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 max-w-md mx-auto text-center">
        {logoUrl ? (
          <BrandLogo
            role="client"
            size="lg"
            float={!lite}
            logoUrl={logoUrl}
            alt={businessName}
            primaryColor={primaryColor}
            animate={!lite}
          />
        ) : (
          <div
            className="h-28 w-28 rounded-xl bg-white/50 border border-white/70 shadow-sm"
            aria-hidden
          />
        )}
        <p className="text-sm text-muted-foreground mt-6">{text}</p>
      </div>
    </ClientShell>
  );
}
