import { BrowserChrome, MockupShell, PhoneShell, PhoneStatusBar, Avatar, StampDots } from "./shared";
import { Search, Camera, CheckCircle, Gift, QrCode, Check, Home, History, Share2, Bookmark } from "lucide-react";

export function FeatureMockup({ screen }: { screen: number }) {
  const screens = [
    <ClientList key="0" />,
    <Analytics key="1" />,
    <Campaign key="2" />,
    <WorkerScan key="3" />,
    <FidelityCard key="4" />,
  ];
  const isPhone = screen >= 3;

  const slide = (
    <div
      className="relative overflow-hidden flex-1"
      style={{ aspectRatio: isPhone ? undefined : "4 / 3.2", minHeight: isPhone ? 0 : undefined }}
    >
      {screens.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            opacity: screen === i ? 1 : 0,
            transform: screen === i ? "scale(1)" : "scale(0.985)",
            transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
            pointerEvents: screen === i ? "auto" : "none",
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );

  if (isPhone) {
    return (
      <div className="w-full mx-auto flex justify-center" style={{ maxWidth: 300 }}>
        <PhoneShell>
          <div className="relative flex-1 min-h-[420px]">{screens[screen]}</div>
        </PhoneShell>
      </div>
    );
  }

  return (
    <MockupShell maxWidth={560}>
      <BrowserChrome />
      {slide}
    </MockupShell>
  );
}

function Pad({ children }: { children: React.ReactNode }) {
  return <div className="p-5 h-full flex flex-col">{children}</div>;
}

function MobilePad({ children }: { children: React.ReactNode }) {
  return <div className="h-full flex flex-col">{children}</div>;
}

function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "muted" | "strong" }) {
  const p =
    tone === "strong"
      ? { bg: "#000", c: "#fff" }
      : tone === "muted"
        ? { bg: "var(--landing-bg-secondary)", c: "var(--landing-text-secondary)" }
        : { bg: "var(--landing-bg-secondary)", c: "var(--landing-text)" };
  return (
    <span className="text-[11px] font-medium" style={{ background: p.bg, color: p.c, padding: "3px 8px", borderRadius: 99 }}>
      {children}
    </span>
  );
}

function ClientList() {
  const rows = [
    { i: "YB", name: "Yasmine Benali", phone: "+213 661 ···", stamps: 9, last: "Today", badge: <Chip tone="strong">Reward!</Chip> },
    { i: "KL", name: "Karim Larbi", phone: "+33 6 ···", stamps: 4, last: "3 days ago", badge: <Chip>Active</Chip> },
    { i: "SE", name: "Sofia El-Amrani", phone: "+44 7 ···", stamps: 7, last: "Yesterday", badge: <Chip>Active</Chip> },
    { i: "HO", name: "Hamza Ouali", phone: "+1 917 ···", stamps: 2, last: "2 weeks ago", badge: <Chip tone="muted">Inactive</Chip> },
  ];
  return (
    <Pad>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <div className="text-[15px] font-semibold text-[#0A1628]">Clients</div>
          <div className="text-[12px] text-[#9CA3AF]">248 total</div>
        </div>
        <button className="text-[11px] font-medium" style={{ color: "#2563EB", border: "1px solid #BFDBFE", padding: "4px 10px", borderRadius: 6 }}>
          Export CSV
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 px-3 py-2" style={{ border: "1px solid #F3F4F6", borderRadius: 8 }}>
        <Search size={13} color="#9CA3AF" />
        <span className="text-[12px] text-[#9CA3AF]">Search name, phone, email...</span>
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] grid grid-cols-12 gap-2 px-1">
        <div className="col-span-4">Client</div>
        <div className="col-span-3">Stamps</div>
        <div className="col-span-3">Last visit</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      <div className="mt-1 flex-1 flex flex-col">
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-12 gap-2 items-center py-2.5" style={{ borderTop: "1px solid #F3F4F6" }}>
            <div className="col-span-4 flex items-center gap-2 min-w-0">
              <Avatar initials={r.i} />
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[#0A1628] truncate">{r.name}</div>
                <div className="text-[10px] text-[#9CA3AF] truncate">{r.phone}</div>
              </div>
            </div>
            <div className="col-span-3"><StampDots filled={r.stamps} /></div>
            <div className="col-span-3 text-[11px] text-[#6B7280]">{r.last}</div>
            <div className="col-span-2 text-right">{r.badge}</div>
          </div>
        ))}
      </div>
    </Pad>
  );
}

function Analytics() {
  const bars = [12, 18, 14, 22, 28, 24, 32, 38, 34, 42, 48, 64];
  const max = Math.max(...bars);
  return (
    <Pad>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-semibold text-[#0A1628]">Analytics</div>
        <div className="text-[11px] px-2.5 py-1 rounded" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", color: "#4B5563" }}>
          Last 30 days ▾
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { l: "New Clients", v: "64", t: "↑ 18%", g: true },
          { l: "Total Scans", v: "1,847", t: "↑ 9%", g: true },
          { l: "Rewards Given", v: "32", t: "↑ 6%", g: true },
          { l: "Fraud Blocked", v: "3", t: "↓ from 8", g: true },
        ].map((k) => (
          <div key={k.l} style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 8, padding: 10 }}>
            <div className="text-[10px] text-[#9CA3AF]">{k.l}</div>
            <div className="text-[16px] font-bold text-[#0A1628] leading-tight">{k.v}</div>
            <div className="text-[10px]" style={{ color: k.g ? "#16A34A" : "#9CA3AF" }}>{k.t}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex-1" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 8, padding: 12 }}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          New clients enrolled
        </div>
        <div className="mt-3 flex items-end gap-1.5 h-[100px]">
          {bars.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${(b / max) * 100}%`,
                background: i === bars.length - 1 ? "#000" : "var(--landing-accent)",
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-[#9CA3AF] mt-1.5">
          <span>Jan</span><span>Feb</span><span>Mar</span>
        </div>
      </div>
    </Pad>
  );
}

function Campaign() {
  return (
    <Pad>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-semibold text-[#0A1628]">New Campaign</div>
        <div className="flex gap-4 text-[12px]">
          <span className="text-[var(--landing-text)] font-medium pb-1" style={{ borderBottom: "2px solid #000" }}>WhatsApp</span>
          <span className="text-[#9CA3AF]">Email</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] text-[#6B7280]">Send to:</span>
        <span className="text-[11px] font-medium" style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", padding: "3px 10px", borderRadius: 99 }}>
          All clients (248) ▾
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {["+ Stamp count > 5", "+ Active last 30 days", "+ Add filter"].map((c) => (
          <span key={c} className="text-[11px]" style={{ border: "1px dashed #BFDBFE", color: "#2563EB", padding: "3px 10px", borderRadius: 99 }}>
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 flex-1 flex flex-col" style={{ border: "1px solid #F3F4F6", borderRadius: 8, padding: 10 }}>
        <div className="text-[10px] font-medium text-[#9CA3AF]">Message</div>
        <div className="mt-1 text-[12px] text-[#0A1628] leading-relaxed flex-1">
          Bonjour {"{first_name}"} 👋 We have something special for you this week...
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3" style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px" }}>
        <div>
          <div className="text-[10px] font-medium" style={{ color: "#2563EB" }}>Preview — 248 recipients</div>
          <div className="mt-1.5 inline-block bg-white text-[10px] text-[#0A1628]" style={{ padding: "5px 9px", borderRadius: 8 }}>
            Bonjour Yasmine 👋 We have something special...
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="text-[11px]" style={{ border: "1px solid #BFDBFE", color: "#2563EB", padding: "6px 10px", borderRadius: 6 }}>Schedule ▾</button>
          <button className="text-[11px] font-medium" style={{ background: "#2563EB", color: "white", padding: "6px 10px", borderRadius: 6 }}>Send Now →</button>
        </div>
      </div>
    </Pad>
  );
}

function WorkerScan() {
  return (
    <MobilePad>
      <PhoneStatusBar />
      <div className="px-4 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#0A1628]">Scan</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">Ahmed · Counter 2</div>
        </div>
        <span className="text-[10px] font-medium" style={{ background: "#F3F4F6", color: "#4B5563", padding: "4px 10px", borderRadius: 99 }}>
          14 today
        </span>
      </div>

      <div className="flex-1 px-4 pb-3 flex flex-col min-h-0">
        <div
          className="relative flex-1 flex flex-col items-center justify-center"
          style={{ background: "#0A1628", borderRadius: 20, minHeight: 220 }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: "72%", aspectRatio: "1", border: "2px solid rgba(255,255,255,0.9)", borderRadius: 16 }}
          >
            {[
              ["top-0 left-0", "border-t-2 border-l-2"],
              ["top-0 right-0", "border-t-2 border-r-2"],
              ["bottom-0 left-0", "border-b-2 border-l-2"],
              ["bottom-0 right-0", "border-b-2 border-r-2"],
            ].map(([pos, side], i) => (
              <span key={i} className={`absolute ${pos} ${side}`} style={{ width: 18, height: 18, borderColor: "#fff" }} />
            ))}
            <Camera size={32} color="rgba(255,255,255,0.5)" />
          </div>
          <p className="text-[11px] text-white/70 mt-4 text-center px-4">Point camera at client QR code</p>
        </div>

        <div className="mt-3 flex items-start gap-2" style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 12, padding: 10 }}>
          <CheckCircle size={16} color="#16A34A" className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[#0A1628] leading-snug">Yasmine B. — 9/9 stamps</div>
            <div className="text-[10px] font-medium" style={{ color: "#16A34A" }}>Reward triggered!</div>
            <div className="text-[9px] text-[#9CA3AF] mt-0.5">12:34 PM</div>
          </div>
        </div>
      </div>

      <nav className="landing-mockup-phone-nav" aria-hidden>
        <span className="landing-mockup-phone-nav-item">
          <Home size={16} />
          Home
        </span>
        <span className="landing-mockup-phone-nav-item is-active">
          <QrCode size={16} />
          Scan
        </span>
        <span className="landing-mockup-phone-nav-item">
          <History size={16} />
          History
        </span>
      </nav>
    </MobilePad>
  );
}

function FidelityCard() {
  return (
    <MobilePad>
      <PhoneStatusBar />
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#0A1628] truncate">Le Café de la Place</div>
          <div className="text-[10px] text-[#9CA3AF]">Loyalty card</div>
        </div>
        <div
          className="shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{ width: 32, height: 32, borderRadius: 8, background: "#0A1628", color: "#fff" }}
        >
          LC
        </div>
      </div>

      <div className="flex-1 px-4 pb-3 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col"
          style={{
            background: "linear-gradient(165deg, #0A1628 0%, #1e3a5f 100%)",
            borderRadius: 20,
            padding: 16,
            color: "#fff",
            minHeight: 280,
          }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">My card</div>
          <div className="text-[13px] font-semibold mt-1">Yasmine Benali</div>

          <div className="mt-4 grid grid-cols-5 gap-2 max-w-[200px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: i < 7 ? "#fff" : "rgba(255,255,255,0.15)",
                  border: i >= 7 ? "1.5px dashed rgba(255,255,255,0.35)" : "none",
                }}
              >
                {i < 7 ? <Check size={12} color="#0A1628" strokeWidth={3} /> : null}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-white/60 mt-3">7 / 10 stamps</div>

          <div
            className="mt-auto flex items-center gap-2 text-[11px] font-medium"
            style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 10px" }}
          >
            <Gift size={14} />
            3 more for a free coffee
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 14, padding: 14 }}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center" style={{ width: 72, height: 72, background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB" }}>
              <QrCode size={40} color="#0A1628" />
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-2">Show at checkout</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="flex items-center justify-center gap-1.5 text-[11px] font-medium" style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 8px", color: "#0A1628" }}>
            <Share2 size={14} />
            Share
          </button>
          <button type="button" className="flex items-center justify-center gap-1.5 text-[11px] font-medium" style={{ background: "#0A1628", borderRadius: 10, padding: "10px 8px", color: "#fff" }}>
            <Bookmark size={14} />
            Save
          </button>
        </div>
      </div>
    </MobilePad>
  );
}
