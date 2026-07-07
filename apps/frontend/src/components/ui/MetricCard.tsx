type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
};

export default function MetricCard({
  label,
  value,
  description,
  icon
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card-head">
        <div className="metric-card-content">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        {icon ? (
          <div className="metric-icon-box">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        ) : null}
      </div>
      {description ? <p>{description}</p> : null}
      <div className="metric-glow" aria-hidden="true"></div>
    </article>
  );
}