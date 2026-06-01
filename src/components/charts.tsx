// Dependency-free SVG chart components. All server-renderable (pure markup).

export function Gauge({
  value,
  max = 100,
  size = 104,
  stroke = 9,
  color = "#46E5A0",
  display,
  sub,
  numColor,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  display?: string;
  sub?: string;
  numColor?: string;
}) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const off = c * (1 - pct);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#20262E" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text x={cx} y={cx + size * 0.04} textAnchor="middle" className="num" fill={numColor ?? color} fontSize={size * 0.3}>
        {display ?? Math.round(value)}
      </text>
      {sub && (
        <text x={cx} y={cx + size * 0.2} textAnchor="middle" fill="#6B7682" fontSize={size * 0.085} letterSpacing="1.2">
          {sub}
        </text>
      )}
    </svg>
  );
}

export function Sparkline({
  data,
  color = "#46E5A0",
  width = 268,
  height = 52,
  area = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  area?: boolean;
}) {
  if (data.length < 2) return <div className="h-[52px] text-xs text-muted">Not enough data yet.</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 8) - 4;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {area && <polyline points={`${line} ${width},${height} 0,${height}`} fill={color} opacity="0.1" stroke="none" />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

export function MiniBars({
  data,
  highlight = -1,
  color = "#2C343D",
  highlightColor = "#F5B544",
  width = 268,
  height = 50,
  gap = 4,
}: {
  data: number[];
  highlight?: number;
  color?: string;
  highlightColor?: string;
  width?: number;
  height?: number;
  gap?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const n = data.length;
  const bw = (width - gap * (n - 1)) / n;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        return <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx="2" fill={i === highlight ? highlightColor : color} />;
      })}
    </svg>
  );
}

export function ProgressBar({
  value,
  target,
  color = "#46E5A0",
  label,
  unit = "g",
}: {
  value: number;
  target: number;
  color?: string;
  label: string;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = value > target;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="mlab">{label}</span>
        <span className="num text-xs text-dim">
          {Math.round(value)} / {target}
          {unit}
        </span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-edge">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "#F5B544" : color }} />
      </div>
    </div>
  );
}

// Weight trend: actual weigh-ins (solid) vs a straight goal line (dashed).
export function WeightTrend({
  series,
  goalStart,
  goalEnd,
  width = 300,
  height = 120,
}: {
  series: { date: string; kg: number }[];
  goalStart: { date: string; kg: number };
  goalEnd: { date: string; kg: number };
  width?: number;
  height?: number;
}) {
  const pad = { l: 6, r: 6, t: 10, b: 10 };
  const t0 = new Date(goalStart.date).getTime();
  const t1 = new Date(goalEnd.date).getTime();
  const tSpan = t1 - t0 || 1;
  const kgs = [goalStart.kg, goalEnd.kg, ...series.map((s) => s.kg)];
  const kMin = Math.min(...kgs) - 0.6;
  const kMax = Math.max(...kgs) + 0.6;
  const kSpan = kMax - kMin || 1;
  const X = (d: string) => pad.l + ((new Date(d).getTime() - t0) / tSpan) * (width - pad.l - pad.r);
  const Y = (kg: number) => pad.t + (1 - (kg - kMin) / kSpan) * (height - pad.t - pad.b);

  const goalLine = `${X(goalStart.date)},${Y(goalStart.kg)} ${X(goalEnd.date)},${Y(goalEnd.kg)}`;
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const actual = sorted.map((s) => `${X(s.date)},${Y(s.kg)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <polyline points={goalLine} fill="none" stroke="#46E5A0" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
      {sorted.length > 1 && <polyline points={actual} fill="none" stroke="#E8EDF2" strokeWidth="2" strokeLinejoin="round" />}
      {sorted.map((s, i) => (
        <circle key={i} cx={X(s.date)} cy={Y(s.kg)} r="2.6" fill="#E8EDF2" />
      ))}
    </svg>
  );
}
