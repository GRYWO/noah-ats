type Size = "sm" | "md" | "lg";

const HOOGTE: Record<Size, number> = {
  sm: 28,
  md: 40,
  lg: 56,
};

/**
 * GRYWO-wordmark. Witte SVG voor op paarse / huisstijl-achtergrond,
 * paarse SVG voor op witte achtergrond. Spierwit, niet anti-aliased grijs
 * zoals de oude PNG.
 */
export function GrywoLogo({ size = "md", wit = true }: { size?: Size; wit?: boolean }) {
  const h = HOOGTE[size];
  // SVG-aspect = 240:60 = 4:1
  const w = h * 4;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={wit ? "/grywo-logo-wit.svg" : "/grywo-logo.png"}
      alt="GRYWO"
      width={w}
      height={h}
      className="inline-block"
      style={{ height: `${h}px`, width: "auto" }}
    />
  );
}
