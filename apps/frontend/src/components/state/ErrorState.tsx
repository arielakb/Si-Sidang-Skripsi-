export default function ErrorState({
  title = "Terjadi kesalahan",
  message = "Data gagal dimuat. Silakan coba lagi."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="state-card error-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}