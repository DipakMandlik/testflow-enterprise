/**
 * The real Pibythree brand mark ("π by 3"), served from /pibythree-mark.png.
 * It already renders the wordmark, so callers should not repeat "Pibythree"
 * in adjacent text — pair it with the product line ("Quality Hub") only.
 */
export function Logo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/pibythree-mark.png"
      alt="Pibythree"
      height={height}
      style={{ height, width: "auto" }}
      className={className}
    />
  );
}
