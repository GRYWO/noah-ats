/**
 * Vierkante GRYWO-avatar (blauwe gradient + witte 'g') voor profielen
 * zonder persoonlijke foto. Wordt overal gebruikt waar voorheen de
 * eerste letter / initialen in een paarse cirkel stond.
 *
 * Privacy-bonus: opdrachtgevers zien geen initialen of naam-info, alleen
 * de GRYWO-branding.
 */
export function GrywoAvatar({
  size = 96,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/grywo-icoon.jpg"
      alt="GRYWO"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: `${Math.round(size * 0.16)}px`, objectFit: "cover" }}
    />
  );
}
