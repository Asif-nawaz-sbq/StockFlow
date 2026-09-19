interface Point {
  date: string;
  netCents: number;
}

/**
 * Server-rendered SVG area chart with gridlines and a hover column per point.
 *
 * No charting library: this is one series of fourteen points, and pulling in a
 * chart runtime would add several hundred kilobytes to the landing page for a
 * shape that is twelve lines of path maths. Tooltips are native <title>
 * elements, so they work without any client JavaScript at all.
 */
export function AreaChart({
  points,
  formatValue,
  formatLabel,
  height = 200,
}: {
  points: Point[];
  formatValue: (cents: number) => string;
  formatLabel: (date: string) => string;
  height?: number;
}) {
  if (points.length === 0) return null;

  const width = 800;
  const padTop = 12;
  const padBottom = 26;
  const padLeft = 56;
  const padRight = 8;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const rawMax = Math.max(...points.map((p) => p.netCents), 1);
  // Round the axis up to something human before dividing it into gridlines.
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const max = Math.ceil(rawMax / magnitude) * magnitude;

  const stepX = plotW / Math.max(points.length - 1, 1);
  const x = (i: number) => padLeft + i * stepX;
  const y = (v: number) => padTop + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.netCents).toFixed(1)}`).join(' ');
  const area = `${padLeft},${padTop + plotH} ${line} ${padLeft + plotW},${padTop + plotH}`;

  const gridlines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(points.length / 7);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Nettoumsatz der letzten 14 Tage"
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridlines.map((fraction) => {
        const gy = padTop + plotH - fraction * plotH;
        return (
          <g key={fraction}>
            <line
              x1={padLeft}
              y1={gy}
              x2={width - padRight}
              y2={gy}
              stroke="rgb(var(--border))"
              strokeWidth={1}
              strokeDasharray={fraction === 0 ? undefined : '3 3'}
            />
            <text
              x={padLeft - 10}
              y={gy + 3.5}
              textAnchor="end"
              className="fill-[rgb(var(--fg-subtle))] text-[10px] tabular"
            >
              {formatValue(max * fraction)}
            </text>
          </g>
        );
      })}

      <polygon points={area} fill="url(#areaFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {points.map((point, index) => (
        <g key={point.date} className="group">
          <rect
            x={x(index) - stepX / 2}
            y={padTop}
            width={stepX}
            height={plotH}
            fill="transparent"
            className="hover:fill-[rgb(var(--fg))]/[0.04]"
          >
            <title>{`${formatLabel(point.date)}: ${formatValue(point.netCents)}`}</title>
          </rect>
          <circle
            cx={x(index)}
            cy={y(point.netCents)}
            r={3}
            fill="rgb(var(--surface))"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          />
          {index % labelEvery === 0 ? (
            <text
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-[rgb(var(--fg-subtle))] text-[10px]"
            >
              {formatLabel(point.date)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/** Horizontal bars for a small ranked list, e.g. best-selling products. */
export function BarList({
  items,
}: {
  items: Array<{
    key: string;
    label: string;
    sublabel: string;
    value: number;
    display: string;
  }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[13px] text-fg">{item.label}</p>
            <p className="shrink-0 text-[13px] font-medium tabular text-fg">{item.display}</p>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="w-24 shrink-0 truncate text-right font-mono text-2xs text-fg-subtle">
              {item.sublabel}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
