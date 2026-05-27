import Image from "next/image";

type Size = "sm" | "md" | "lg";

const HOOGTE: Record<Size, number> = {
  sm: 28,
  md: 40,
  lg: 56,
};

// Verhouding van het echte logo-bestand (3282 × 856 ≈ 3.83 : 1)
const BREEDTE_FACTOR = 3282 / 856;

/**
 * GRYWO-wordmark uit /public.
 * - wit: het officiële witte logo (op paarse huisstijl-achtergrond)
 * - wit=false: het officiële paarse 'gryvo' logo (op witte achtergrond)
 */
export function GrywoLogo({ size = "md", wit = true }: { size?: Size; wit?: boolean }) {
  const h = HOOGTE[size];
  const w = Math.round(h * BREEDTE_FACTOR);
  return (
    <Image
      src={wit ? "/grywo-logo-wit.png" : "/grywo-logo.png"}
      alt="GRYWO"
      width={w}
      height={h}
      priority
      className="inline-block"
      style={{ height: `${h}px`, width: "auto" }}
    />
  );
}
