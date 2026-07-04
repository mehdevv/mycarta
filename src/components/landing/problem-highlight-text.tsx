import type { ReactNode } from "react";

const INLINE_ICON = "{icon}";

/** Renders translation copy with *highlighted* segments and optional {icon} inline image. */
export function ProblemHighlightText({
  text,
  inlineIcon,
}: {
  text: string;
  inlineIcon?: string;
}): ReactNode {
  const parts = text.split(/(\*[^*]+\*|\{icon\})/g).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        if (part === INLINE_ICON && inlineIcon) {
          return (
            <img
              key={i}
              src={inlineIcon}
              alt=""
              className="landing-problem-title-icon"
              aria-hidden
              decoding="async"
            />
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <span key={i} className="landing-problem-em">
              {part.slice(1, -1)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
