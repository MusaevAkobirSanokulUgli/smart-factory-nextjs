"use client";

interface VerdictBannerProps {
  verdict: "safe" | "danger";
  label: string;
  sublabel?: string;
}

export default function VerdictBanner({
  verdict,
  label,
  sublabel,
}: VerdictBannerProps) {
  const icon = verdict === "safe" ? "✓" : "✕";

  return (
    <div className={`verdict-banner ${verdict}`}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid currentColor",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.9rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div>
        <div>{label}</div>
        {sublabel && (
          <div style={{ fontSize: "0.8rem", opacity: 0.75, fontWeight: 400 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
