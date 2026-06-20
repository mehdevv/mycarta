import { BrowserChrome, MockupShell, Avatar, StampDots } from "./shared";
import { Search, Camera, CheckCircle, Gift, QrCode, Check } from "lucide-react";

export function FeatureMockup({ screen }: { screen: number }) {
  const screens = [<ClientList key="0" />, <Analytics key="1" />, <Campaign key="2" />, <WorkerScan key="3" />, <FidelityCard key="4" />];
  return (
    <MockupShell maxWidth={560}>
      <BrowserChrome />
      <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 3.2" }}>
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
    </MockupShell>
  );
}

function Pad({ children }: { children: React.ReactNode }) {
  return <div className="p-5 h-full flex flex-col">{children}</div>;
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
    <Pad>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[60%]" style={{ background: "#F9FAFB", borderRadius: 14, padding: 16 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium" style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "3px 9px", borderRadius: 99 }}>
              Ahmed · Counter 2
            </span>
            <span className="text-[10px] text-[#9CA3AF]">14 scans today</span>
          </div>
          <div
            className="relative mt-3 flex items-center justify-center"
            style={{ height: 140, border: "2px solid #000", borderRadius: 12, background: "white" }}
          >
            {/* corner brackets */}
            {[
              ["top-1 left-1", "border-t-2 border-l-2"],
              ["top-1 right-1", "border-t-2 border-r-2"],
              ["bottom-1 left-1", "border-b-2 border-l-2"],
              ["bottom-1 right-1", "border-b-2 border-r-2"],
            ].map(([pos, side], i) => (
              <span key={i} className={`absolute ${pos} ${side}`} style={{ width: 14, height: 14, borderColor: "#000" }} />
            ))}
            <div className="text-center">
              <Camera size={26} color="#93C5FD" className="mx-auto" />
              <div className="text-[12px] text-[#9CA3AF] mt-1.5">Scan client card</div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 bg-white" style={{ border: "1px solid #DCFCE7", borderRadius: 8, padding: 10 }}>
            <CheckCircle size={14} color="#16A34A" className="mt-[2px] shrink-0" />
            <div>
              <div className="text-[12px] font-medium text-[#0A1628]">Yasmine B. — Stamp 9/9 — Reward triggered!</div>
              <div className="text-[10px] text-[#9CA3AF] mt-0.5">12:34 PM</div>
            </div>
          </div>
        </div>
      </div>
    </Pad>
  );
}

function FidelityCard() {
  return (
    <Pad>
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-[65%]"
          style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(37,99,235,0.08)" }}
        >
          <div className="text-[15px] font-bold text-[#0A1628]">Le Café de la Place</div>
          <div className="text-[11px] text-[#9CA3AF]">Loyalty Card</div>
          <div className="my-3 h-px bg-[#F3F4F6]" />
          <div className="grid grid-cols-3 gap-2 max-w-[140px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 99, background: "#000" }}>
                <Check size={13} color="white" strokeWidth={3} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] font-medium" style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 8, padding: "8px 10px" }}>
            <Gift size={14} color="#15803D" />
            🎉 Your reward is ready! Show this card.
          </div>
          <div className="my-3 h-px bg-[#F3F4F6]" />
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, background: "#F3F4F6", borderRadius: 8, margin: "0 auto" }}>
            <QrCode size={28} color="#9CA3AF" />
          </div>
          <div className="text-[11px] text-[#9CA3AF] text-center mt-2">Yasmine Benali</div>
        </div>
      </div>
    </Pad>
  );
}
