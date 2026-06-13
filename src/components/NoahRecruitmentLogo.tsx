// Noah recruitment wordmark in de stijl 'Noah.' + gouden punt + 'RECRUITMENT' descriptor.
// Gebruikt Noah ATS kleurpalet: paars #333399, geel #ffd84d.
export function NoahRecruitmentLogo({
  className = "",
  variant = "light",
  label = "RECRUITMENT",
  size = "md",
}: {
  className?: string;
  variant?: "light" | "dark";
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const word = variant === "dark" ? "text-white" : "text-gray-900";
  const sub = variant === "dark" ? "text-white/70" : "text-gray-500";
  const sizeClasses = {
    sm: { word: "text-lg", sub: "text-[10px]" },
    md: { word: "text-2xl", sub: "text-xs" },
    lg: { word: "text-4xl", sub: "text-sm" },
  }[size];
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={`${sizeClasses.word} font-extrabold tracking-tight ${word}`}>
        Noah<span style={{ color: "#ffd84d" }}>.</span>
      </span>
      {label && (
        <span className={`${sizeClasses.sub} font-semibold uppercase tracking-[0.25em] ${sub}`}>
          {label}
        </span>
      )}
    </span>
  );
}
