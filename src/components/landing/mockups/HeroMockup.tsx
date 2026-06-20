import { BrowserChrome, MockupShell, Avatar } from "./shared";

export function HeroMockup() {
  return (
    <MockupShell maxWidth={520}>
      <BrowserChrome />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-medium text-[var(--landing-text)]">Vue d&apos;ensemble</div>
          <div
            className="text-[11px] font-medium rounded-full px-2.5 py-1"
            style={{ background: "var(--landing-bg-secondary)", color: "var(--landing-text-secondary)" }}
          >
            Aujourd&apos;hui
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {[
            { label: "Clients", value: "1 248", trend: "↑ 12 cette semaine" },
            { label: "Scans", value: "87", trend: "↑ 4 vs hier" },
            { label: "Récompenses", value: "14", trend: "en attente" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-[var(--landing-radius-sm)] p-3"
              style={{ background: "var(--landing-bg-secondary)", border: "1px solid var(--landing-border)" }}
            >
              <div className="text-[10px] text-[var(--landing-text-secondary)]">{k.label}</div>
              <div className="text-[var(--landing-text)] font-medium leading-none mt-1 text-lg">{k.value}</div>
              <div className="text-[10px] mt-1.5 text-[var(--landing-text-secondary)]">{k.trend}</div>
            </div>
          ))}
        </div>

        <hr className="my-5 border-[var(--landing-border)]" />

        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--landing-text-secondary)]">
          Activité récente
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {[
            { i: "YB", name: "Yasmine B.", sub: "9 tampons · récompense", badge: "Récompense ✓" },
            { i: "KL", name: "Karim L.", sub: "4 tampons · actif", time: "2 min" },
            { i: "SE", name: "Sofia E.", sub: "7 tampons · 2 restants", time: "8 min" },
          ].map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              <Avatar initials={r.i} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--landing-text)] truncate">{r.name}</div>
                <div className="text-[11px] text-[var(--landing-text-secondary)] truncate">{r.sub}</div>
              </div>
              {r.badge ? (
                <span
                  className="text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0"
                  style={{ background: "var(--landing-bg-secondary)", color: "var(--landing-text)" }}
                >
                  {r.badge}
                </span>
              ) : (
                <span className="text-[11px] text-[var(--landing-text-secondary)] shrink-0">{r.time}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}
