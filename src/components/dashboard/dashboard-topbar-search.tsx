import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  CreditCard,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  QrCode,
  Search,
  Settings,
  ShieldAlert,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useListClients, useListProducts, useListWorkers } from "@/api";
import { INTEGRATIONS_LOCKED } from "@/lib/integration-tutorials";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type SearchPage = {
  id: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  locked?: boolean;
};

const SEARCH_PAGES: SearchPage[] = [
  { id: "overview", labelKey: "dashboard.nav.overview", path: "/", icon: LayoutDashboard },
  { id: "analytics", labelKey: "dashboard.nav.analytics", path: "/analytics", icon: BarChart3 },
  { id: "clients", labelKey: "dashboard.nav.clients", path: "/clients", icon: Users },
  { id: "scans", labelKey: "dashboard.nav.scans", path: "/scans", icon: QrCode },
  { id: "fraud", labelKey: "dashboard.nav.fraud", path: "/fraud", icon: ShieldAlert },
  { id: "rewards", labelKey: "dashboard.nav.rewards", path: "/rewards", icon: Gift },
  { id: "products", labelKey: "dashboard.nav.products", path: "/products", icon: Package },
  { id: "workers", labelKey: "dashboard.nav.workers", path: "/workers", icon: Users },
  { id: "ccard", labelKey: "dashboard.nav.loyaltyCard", path: "/ccard", icon: WalletCards },
  {
    id: "campaigns",
    labelKey: "dashboard.nav.campaigns",
    path: "/campaigns",
    icon: Megaphone,
    locked: INTEGRATIONS_LOCKED,
  },
  { id: "billing", labelKey: "dashboard.nav.billing", path: "/billing", icon: CreditCard },
  { id: "settings", labelKey: "dashboard.nav.settings", path: "/settings", icon: Settings },
];

type SearchResult = {
  id: string;
  label: string;
  hint?: string;
  path: string;
  icon: LucideIcon;
  group: string;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(...parts: (string | null | undefined)[]) {
  return (query: string) => {
    if (!query) return true;
    return parts.some((part) => part?.toLowerCase().includes(query));
  };
}

export default function DashboardTopbarSearch({ className }: { className?: string }) {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: clientsData, isFetching: clientsLoading } = useListClients(
    { search: debouncedQuery, limit: 6, page: 1 },
    { enabled: debouncedQuery.length >= 2 },
  );

  const { data: workers } = useListWorkers();
  const { data: products } = useListProducts();

  const q = normalizeQuery(debouncedQuery);

  const results = useMemo(() => {
    const items: SearchResult[] = [];
    const match = matchesQuery;

    for (const page of SEARCH_PAGES) {
      if (page.locked) continue;
      const label = t(page.labelKey);
      if (match(label)(q)) {
        items.push({
          id: `page-${page.id}`,
          label,
          path: page.path,
          icon: page.icon,
          group: t("dashboard.search.pages"),
        });
      }
    }

    if (q.length >= 2) {
      for (const client of clientsData?.clients ?? []) {
        items.push({
          id: `client-${client.id}`,
          label: client.fullName,
          hint: client.phone ?? client.email ?? client.cardCode,
          path: `/clients/${client.id}`,
          icon: Users,
          group: t("dashboard.search.clients"),
        });
      }

      for (const product of products ?? []) {
        if (match(product.name, product.sku, product.category)(q)) {
          items.push({
            id: `product-${product.id}`,
            label: product.name,
            hint: product.sku ?? product.category ?? undefined,
            path: "/products",
            icon: Package,
            group: t("dashboard.search.products"),
          });
        }
      }

      for (const worker of workers ?? []) {
        if (match(worker.fullName)(q)) {
          items.push({
            id: `worker-${worker.id}`,
            label: worker.fullName,
            hint: worker.isActive ? undefined : t("dashboard.search.inactive"),
            path: "/workers",
            icon: Users,
            group: t("dashboard.search.workers"),
          });
        }
      }
    }

    return items;
  }, [q, clientsData?.clients, products, workers, t]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const item of results) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [results]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const go = (path: string) => {
    setLocation(path);
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
  };

  const showDropdown = open && (query.length > 0 || results.length > 0);
  const showEmpty =
    open && debouncedQuery.length >= 2 && !clientsLoading && results.length === 0;

  return (
    <div ref={rootRef} className={cn("dash-topbar-search", className)}>
      <Search className="dash-topbar-search-icon" aria-hidden />
      <input
        type="search"
        className="dash-topbar-search-input"
        placeholder={t("dashboard.search.placeholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Enter" && results[0]) {
            e.preventDefault();
            go(results[0].path);
          }
        }}
        aria-label={t("dashboard.search.placeholder")}
        aria-expanded={showDropdown}
        aria-controls="dash-topbar-search-results"
        autoComplete="off"
      />

      {showDropdown && (
        <div id="dash-topbar-search-results" className="dash-topbar-search-dropdown" role="listbox">
          {grouped.size === 0 && !clientsLoading && (
            <p className="dash-topbar-search-empty">{t("dashboard.search.typeToSearch")}</p>
          )}
          {clientsLoading && debouncedQuery.length >= 2 && (
            <p className="dash-topbar-search-empty">{t("common.loading")}</p>
          )}
          {showEmpty && (
            <p className="dash-topbar-search-empty">{t("dashboard.search.noResults")}</p>
          )}
          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group} className="dash-topbar-search-group">
              <p className="dash-topbar-search-group-label">{group}</p>
              <ul>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="dash-topbar-search-item"
                        role="option"
                        onClick={() => go(item.path)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--dash-text-secondary)]" />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium text-[var(--dash-text)]">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="block truncate text-xs text-[var(--dash-text-secondary)]">
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
