export default function EmptyState({
  title = "Belum ada data",
  message = "Data akan muncul di sini setelah tersedia."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="state-card empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}