import { Link, useRoute } from "wouter";
import MarketingPageShell from "@/components/landing/marketing-page-shell";
import { useLocale } from "@/lib/i18n/locale-context";
import { usePlatformBranding } from "@/hooks/use-branding";
import { getLegalPage, isLegalSlug } from "@/lib/legal/pages";
import { LANDING_FOOTER_LEGAL_LINKS } from "@/components/landing/nav-links";
import NotFound from "@/pages/not-found";
import PageMeta from "@/components/seo/page-meta";
import { absoluteUrl } from "@/lib/seo";

export default function LegalPage() {
  const [, params] = useRoute("/legal/:slug");
  const slug = params?.slug ?? "";
  const { locale, t } = useLocale();
  const platform = usePlatformBranding();

  if (!isLegalSlug(slug)) {
    return <NotFound />;
  }

  const page = getLegalPage(slug, locale);
  if (!page) return <NotFound />;

  return (
    <MarketingPageShell>
      <PageMeta
        title={page.title}
        description={page.intro}
        url={absoluteUrl(`/legal/${slug}`)}
      />
      <article className="container-page py-14 lg:py-20 max-w-3xl">
        <p className="landing-eyebrow">{platform.name}</p>
        <h1 className="landing-h2 mt-3">{page.title}</h1>
        <p className="landing-body-sm mt-2">{page.updated}</p>
        <p className="landing-body mt-6">{page.intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="landing-h3">{section.heading}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="landing-body-sm text-[var(--landing-text)] leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--landing-border)]">
          <p className="landing-body-sm">
            {t("legal.questions")}{" "}
            <a href={`mailto:${platform.supportEmail}`} className="underline underline-offset-2 email" dir="ltr">
              {platform.supportEmail}
            </a>
          </p>
          <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2" aria-label={t("landing.footer.legal")}>
            {LANDING_FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.slug}
                href={`/legal/${link.slug}`}
                className={`text-[13px] hover:underline underline-offset-2 ${
                  link.slug === slug ? "text-[var(--landing-text)] font-medium" : "text-[var(--landing-text-secondary)]"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
          <Link href="/" className="inline-block mt-6 text-[14px] text-[var(--landing-text)] hover:underline underline-offset-2">
            {t("common.backToHome")}
          </Link>
        </div>
      </article>
    </MarketingPageShell>
  );
}
