type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const alignClass =
    align === "center" ? "text-center mx-auto" : "text-left mr-auto";

  return (
    <header className={`landing-section-header ${alignClass} ${className}`}>
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 className="landing-h2 mt-3">{title}</h2>
      {description && (
        <p className={`landing-body mt-4 max-w-[34rem] ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </header>
  );
}
