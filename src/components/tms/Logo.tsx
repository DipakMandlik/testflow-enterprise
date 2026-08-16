/**
 * The Pibythree brand mark: a rounded blue tile with a serif "π" glyph and a
 * small circular "3" badge, matching the Pibythree product family's identity
 * used across sign-in and branded surfaces.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Pibythree"
      className={className}
    >
      <defs>
        <linearGradient
          id="pibythree-mark-bg"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="oklch(0.58 0.19 262)" />
          <stop offset="100%" stopColor="oklch(0.4 0.17 264)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#pibythree-mark-bg)" />
      <text
        x="16.5"
        y="27.5"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="22"
        fill="white"
        textAnchor="middle"
      >
        π
      </text>
      <circle cx="29.5" cy="29.5" r="7.5" fill="white" />
      <text
        x="29.5"
        y="32.6"
        fontFamily="var(--font-sans), sans-serif"
        fontWeight="700"
        fontSize="9"
        fill="oklch(0.5 0.19 262)"
        textAnchor="middle"
      >
        3
      </text>
    </svg>
  );
}
