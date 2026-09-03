/** Inline SVG bar-chart sparkline of monthly net inflow — positive bars teal, negative red. */
export function Sparkline({ monthly }: { monthly: number[] }) {
  const w = 560;
  const h = 140;
  const pad = 18;
  const max = Math.max(...monthly.map((v) => Math.abs(v)), 1);
  const bw = (w - pad * 2) / Math.max(monthly.length, 1);
  const zero = h / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Monthly net inflow over the last 12 months">
      <line x1={pad} y1={zero} x2={w - pad} y2={zero} stroke="var(--rule)" strokeWidth={1} />
      {monthly.map((v, i) => {
        const bh = (Math.abs(v) / max) * (h / 2 - 14);
        const x = pad + i * bw + bw * 0.18;
        const y = v >= 0 ? zero - bh : zero;
        const barW = bw * 0.64;
        const col = v >= 0 ? "var(--teal)" : "var(--red)";
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={barW.toFixed(1)}
            height={Math.max(1, bh).toFixed(1)}
            fill={col}
            rx={1.5}
          />
        );
      })}
      <text x={pad} y={h - 4} fontFamily="IBM Plex Mono, monospace" fontSize={9} fill="var(--ink-faint)">
        month 1
      </text>
      <text
        x={w - pad}
        y={h - 4}
        textAnchor="end"
        fontFamily="IBM Plex Mono, monospace"
        fontSize={9}
        fill="var(--ink-faint)"
      >
        month 12
      </text>
    </svg>
  );
}
