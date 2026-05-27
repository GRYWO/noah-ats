import Image from "next/image";

type Size = "sm" | "md" | "lg";

const HOOGTE: Record<Size, number> = {
  sm: 28,
  md: 40,
  lg: 56,
};

// Verhouding van het echte logo-bestand
const BREEDTE_FACTOR = 200 / 52;

/**
 * GRYWO-wordmark — gebruikt het echte PNG-logo uit /public.
 * De witte variant wordt extra wit gemaakt via CSS filter, zodat hij
 * altijd zuiver wit oogt op de paarse huisstijl-achtergrond — ook als
 * de bron-PNG iets anti-aliased grijs heeft.
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
      style={{
        height: `${h}px`,
        width: "auto",
        // brightness(0) invert(1) maakt alle gekleurde pixels zuiver wit
        // zodat het logo écht wit oogt — ongeacht of de PNG zelf perfect wit is.
        filter: wit ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );
}
