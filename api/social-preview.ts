/**
 * Vercel Edge handler — returns OG-rich HTML for social crawlers (WhatsApp, iMessage, etc.).
 * Humans are routed here only when User-Agent matches bot patterns in vercel.json.
 */

export const config = { runtime: "edge" };

const SITE_NAME = "Carta";
const DEFAULT_TITLE = `${SITE_NAME} — Cartes fidélité digitales pour commerces`;
const DEFAULT_DESCRIPTION =
  "Cartes fidélité digitales et scans QR pour commerces. Tampons, récompenses — sans app pour vos clients.";

const BOT_AGENTS =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|slackbot|linkedinbot|discordbot|googlebot|bingbot|applebot|pinterest|embedly|quora link preview/i;

type OgMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
};

function siteOrigin(request: Request): string {
  const fromEnv = process.env.VITE_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "https://mycarta.online";
}

function absoluteUrl(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(meta: OgMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  const type = escapeHtml(meta.type ?? "website");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:locale" content="fr_DZ" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p><a href="${url}">${title}</a></p>
</body>
</html>`;
}

async function supabaseRpc<T>(rpc: string, body: Record<string, unknown>): Promise<T | null> {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  const res = await fetch(`${base.replace(/\/$/, "")}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

type TenantRow = {
  businessName?: string;
  name?: string;
  logoUrl?: string | null;
  slug?: string;
};

async function resolveMeta(pathname: string, origin: string): Promise<OgMeta> {
  const defaultImage = absoluteUrl(origin, "/og-image.png");
  const url = absoluteUrl(origin, pathname);

  const clientMatch = pathname.match(/^\/([^/]+)\/client\/?$/);
  if (clientMatch) {
    const slug = clientMatch[1];
    const tenant = await supabaseRpc<TenantRow>("get_tenant_by_slug", { p_slug: slug });
    const business = String(tenant?.businessName ?? tenant?.name ?? slug);
    const image = tenant?.logoUrl && /^https?:\/\//i.test(tenant.logoUrl) ? tenant.logoUrl : defaultImage;
    return {
      title: `Carte fidélité — ${business}`,
      description: `Rejoignez le programme fidélité de ${business}. Créez votre carte gratuite en quelques secondes.`,
      image,
      url,
    };
  }

  const cardMatch = pathname.match(/^\/([^/]+)\/card\/([^/]+)\/?$/);
  if (cardMatch) {
    const slug = cardMatch[1];
    const tenant = await supabaseRpc<TenantRow>("get_tenant_by_slug", { p_slug: slug });
    const business = String(tenant?.businessName ?? tenant?.name ?? slug);
    const image = tenant?.logoUrl && /^https?:\/\//i.test(tenant.logoUrl) ? tenant.logoUrl : defaultImage;
    return {
      title: `Ma carte — ${business}`,
      description: `Consultez votre carte de fidélité digitale chez ${business}.`,
      image,
      url,
    };
  }

  if (pathname === "/" || pathname === "/signup" || pathname === "/tarifs") {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      image: defaultImage,
      url: absoluteUrl(origin, pathname === "/" ? "/" : pathname),
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: defaultImage,
    url,
  };
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = siteOrigin(request);
  const pathname = url.searchParams.get("path") || "/";
  const ua = request.headers.get("user-agent") ?? "";

  if (!BOT_AGENTS.test(ua) && !url.searchParams.has("force")) {
    return Response.redirect(absoluteUrl(origin, pathname), 302);
  }

  const meta = await resolveMeta(pathname, origin);
  return new Response(renderHtml(meta), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
