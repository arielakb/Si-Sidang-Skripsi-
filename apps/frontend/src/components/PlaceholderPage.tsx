export default function PlaceholderPage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Sisidang</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>

      <div className="card">
        UI detail modul ini akan dilengkapi pada fase frontend berikutnya.
        API backend untuk modul ini sudah tersedia.
      </div>
    </section>
  );
}