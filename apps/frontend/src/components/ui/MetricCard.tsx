type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
};

export default function MetricCard({
  label,
  value,
  description
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {description ? <p>{description}</p> : null}
    </article>
  );
}