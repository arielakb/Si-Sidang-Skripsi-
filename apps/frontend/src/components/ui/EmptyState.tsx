type EmptyStateProps = {
  title?: string;
  description?: string;
};

export default function EmptyState({
  title = "Belum ada data",
  description = "Data akan tampil di sini setelah tersedia."
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}