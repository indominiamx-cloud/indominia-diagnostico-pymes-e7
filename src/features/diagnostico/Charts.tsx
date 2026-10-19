import { AREAS, type Assessment } from "./model";

export function ScoreRing({
  score,
  label = "Indicador operativo",
  compact = false,
}: {
  score: number | null;
  label?: string;
  compact?: boolean;
}) {
  const r = 68;
  const circumference = 2 * Math.PI * r;
  return (
    <div className={`dx-score ${compact ? "dx-score-compact" : ""}`}>
      <svg viewBox="0 0 168 168" aria-hidden="true">
        <circle cx="84" cy="84" r={r} className="dx-ring-track" />
        <circle
          cx="84"
          cy="84"
          r={r}
          className="dx-ring-value"
          strokeDasharray={`${((score ?? 0) / 100) * circumference} ${circumference}`}
          transform="rotate(-90 84 84)"
        />
      </svg>
      <div className="dx-score-text">
        <strong>
          {score ?? "—"}
          <span>{score === null ? "" : "/100"}</span>
        </strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

export function AreaRadar({ assessment }: { assessment: Assessment }) {
  const c = 150;
  const radius = 96;
  const point = (index: number, scale: number) => {
    const angle = Math.PI * (index / 3 - 0.5);
    return [c + Math.cos(angle) * radius * scale, c + Math.sin(angle) * radius * scale];
  };
  const points = (scale: number) => AREAS.map((_, i) => point(i, scale).join(",")).join(" ");
  const knownAll = assessment.areas.every((a) => a.score !== null);
  return (
    <figure className="dx-radar">
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Perfil operativo por área. Los valores también se muestran en la tabla de áreas."
      >
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale} points={points(scale)} className="dx-radar-grid" />
        ))}
        {AREAS.map((a, i) => {
          const p = point(i, 1);
          const label = point(i, 1.32);
          return (
            <g key={a.id}>
              <line x1={c} y1={c} x2={p[0]} y2={p[1]} className="dx-radar-grid" />
              <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle">
                {a.short}
              </text>
            </g>
          );
        })}
        {knownAll && (
          <polygon
            points={assessment.areas.map((a, i) => point(i, a.score! / 100).join(",")).join(" ")}
            className="dx-radar-shape"
          />
        )}
        {!knownAll &&
          assessment.areas.map((a, i) => {
            const b = assessment.areas[(i + 1) % AREAS.length]!;
            if (a.score === null || b.score === null) return null;
            const p = point(i, a.score / 100);
            const q = point((i + 1) % AREAS.length, b.score / 100);
            return (
              <line
                key={a.id}
                x1={p[0]}
                y1={p[1]}
                x2={q[0]}
                y2={q[1]}
                className="dx-radar-segment"
              />
            );
          })}
        {assessment.areas.map((a, i) => {
          if (a.score === null) return null;
          const p = point(i, a.score / 100);
          return <circle key={a.id} cx={p[0]} cy={p[1]} r="4" className="dx-radar-dot" />;
        })}
      </svg>
      <figcaption>
        Prácticas declaradas por área. Escala de 0 a 100; sin punto cuando no hay información.
      </figcaption>
    </figure>
  );
}

export function AreaTable({ assessment }: { assessment: Assessment }) {
  return (
    <div className="dx-area-table" role="table" aria-label="Resultado por área">
      <div className="dx-sr" role="row">
        <span role="columnheader">Área</span>
        <span role="columnheader">Indicador</span>
        <span role="columnheader">Cobertura</span>
      </div>
      {assessment.areas.map((a) => {
        const area = AREAS.find((x) => x.id === a.id)!;
        return (
          <div className="dx-area-row" role="row" key={a.id}>
            <span role="cell">
              <i className={`dx-dot dx-color-${area.color}`} />
              {area.title}
            </span>
            <span role="cell" className="dx-area-result">
              <span className="dx-mini-track" aria-hidden="true">
                <span className={`dx-color-${area.color}`} style={{ width: `${a.score ?? 0}%` }} />
              </span>
              <strong>{a.score ?? "—"}</strong>
            </span>
            <small role="cell">
              {a.known}/{a.total} conocidas
            </small>
          </div>
        );
      })}
    </div>
  );
}
