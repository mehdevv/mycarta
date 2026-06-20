export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-mockup-phone">
      <div className="landing-mockup-phone-bezel">
        <div className="landing-mockup-phone-notch" aria-hidden />
        <div className="landing-mockup-phone-screen">{children}</div>
        <div className="landing-mockup-phone-home" aria-hidden />
      </div>
    </div>
  );
}

export function PhoneStatusBar() {
  return (
    <div className="landing-mockup-phone-status">
      <span>9:41</span>
      <span className="landing-mockup-phone-signal" aria-hidden>
        <span /><span /><span />
      </span>
    </div>
  );
}

export function BrowserChrome({ url = "app.mycarta.dz/dashboard" }: { url?: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{ height: 40, background: "var(--landing-bg-secondary)", borderBottom: "1px solid var(--landing-border)" }}
    >
      <div className="flex gap-1.5">
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#d4d4d4" }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#d4d4d4" }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#d4d4d4" }} />
      </div>
      <div
        className="flex-1 flex items-center px-3 text-[10px]"
        style={{
          height: 22,
          background: "white",
          border: "1px solid var(--landing-border)",
          borderRadius: 8,
          color: "var(--landing-text-secondary)",
        }}
      >
        {url}
      </div>
    </div>
  );
}

export function MockupShell({ children, maxWidth = 480 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div className="landing-mockup w-full mx-auto" style={{ maxWidth }}>
      {children}
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="flex items-center justify-center text-[12px] font-medium shrink-0"
      style={{
        width: 32,
        height: 32,
        borderRadius: 99,
        background: "var(--landing-bg-secondary)",
        color: "var(--landing-text)",
      }}
    >
      {initials}
    </div>
  );
}

export function StampDots({ filled, total = 9 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: i < filled ? "var(--landing-text)" : "var(--landing-border)",
          }}
        />
      ))}
    </div>
  );
}
