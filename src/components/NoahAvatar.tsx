/**
 * Vierkante Noah recruitment-avatar voor profielen zonder persoonlijke foto.
 * Gerenderd als CSS-tile met "N." wordmark + goud puntje. Geen externe afbeelding,
 * werkt overal direct (ook in mailclients en bij offline assets).
 *
 * Privacy-bonus: opdrachtgevers zien geen initialen of naam-info, alleen
 * de Noah recruitment-branding.
 */
export function NoahAvatar({
  size = 96,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const radius = Math.round(size * 0.16);
  const fontSize = Math.round(size * 0.42);
  return (
    <span
      aria-label="Noah recruitment"
      role="img"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        background: "linear-gradient(135deg, #333399 0%, #4a4ab8 100%)",
        color: "#ffffff",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontWeight: 900,
        fontSize: `${fontSize}px`,
        letterSpacing: "-1px",
        lineHeight: 1,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        N<span style={{ color: "#ffd84d" }}>.</span>
      </span>
    </span>
  );
}
