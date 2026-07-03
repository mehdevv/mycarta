import { Helmet } from "react-helmet-async";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  pageTitle,
  resolveOgImage,
  SITE_NAME,
  SITE_URL,
  THEME_COLOR,
  TWITTER_HANDLE,
  type PageMetaInput,
} from "@/lib/seo";

type PageMetaProps = PageMetaInput & {
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export default function PageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  type = "website",
  locale = "fr_DZ",
  noIndex = false,
  jsonLd,
}: PageMetaProps) {
  const resolvedTitle = title ? pageTitle(title) : DEFAULT_TITLE;
  const ogImage = resolveOgImage(image);
  const canonical = url ?? (typeof window !== "undefined" ? window.location.href : SITE_URL);

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={resolvedTitle} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <meta name="theme-color" content={THEME_COLOR} />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="format-detection" content="telephone=no" />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
