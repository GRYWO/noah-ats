import Image from "next/image";

type Size = "sm" | "md" | "lg";

const HOOGTE: Record<Size, number> = {
  sm: 24,
  md: 32,
  lg: 44,
};

// Verhouding van het logo-bestand (200x52 ≈ 3.85)
const BREEDTE_FACTOR = 200 / 52;

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
