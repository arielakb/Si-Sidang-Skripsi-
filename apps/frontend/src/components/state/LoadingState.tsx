export default function LoadingState({
  message = "Memuat data..."
}: {
  message?: string;
}) {
  return (
    <div className="state-card">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}