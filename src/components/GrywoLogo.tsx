type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { text: string; dot: string; gap: string }> = {
  sm: { text: "text-2xl", dot: "w-2 h-2", gap: "ml-1" },
  md: { text: "text-3xl", dot: "w-2.5 h-2.5", gap: "ml-1.5" },
  lg: { text: "text-4xl", dot: "w-3 h-3", gap: "ml-1.5" },
};

export function GrywoLogo({ size = "md", wit = true }: { size?: Size; wit?: boolean }) {
  const s = SIZES[size];
  return (
    <div className="inline-flex items-baseline">
      <span className={`${s.text} font-black tracking-tighter ${wit ? "text-white" : "text-[#333399]"}`}>
        GRYWO
      </span>
      <span className={`${s.gap} ${s.dot} rounded-full inline-block bg-[#ffd84d]`} />
    </div>
  );
}
