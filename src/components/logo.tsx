/**
 * Oreum logo.
 *
 * The SVG is inlined on purpose: `currentColor` only resolves when the markup
 * is in the DOM. Rendering the .svg file through <img> or next/image would
 * lock the logo to one colour and break dark mode.
 *
 * Colour is inherited from the parent, so set it with a text colour class.
 */

type LogoProps = {
  className?: string;
};

type LogoMarkProps = LogoProps & {
  /**
   * Inside <Logo /> the mark is decorative — the wrapper carries the name, so
   * labelling the mark too would announce "Oreum" twice.
   */
  decorative?: boolean;
};

export function LogoMark({ className, decorative = false }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "Oreum" })}
    >
      <path d="M3 34 Q9 25 14 30 Q20 18 26 26 Q34 7 45 32" />
    </svg>
  );
}

export function Logo({ className }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Oreum"
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
    >
      <LogoMark decorative />
      <span className="text-[19px] font-medium tracking-[0.02em]">oreum</span>
    </span>
  );
}
