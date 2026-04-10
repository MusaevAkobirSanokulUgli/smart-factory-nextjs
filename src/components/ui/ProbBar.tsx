"use client";

interface ProbBarProps {
  label: string;
  probability: number; // 0–1
  accent?: string;
}

export default function ProbBar({
  label,
  probability,
  accent,
}: ProbBarProps) {
  const pct = Math.max(0, Math.min(1, probability));
  const display = (pct * 100).toFixed(1);

  return (
    <div className="prob-bar">
      <div className="bar-header">
        <span>{label}</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {display}%
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${pct * 100}%`,
            background: accent ?? "var(--grad)",
          }}
        />
      </div>
    </div>
  );
}
