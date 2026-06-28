import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export default function MyProgressPage() {
  const progressQuery = useQuery({
    queryKey: ["my-gamification-dashboard"],
    queryFn: async () => {
      const response = await api.get("/gamification/my-dashboard");
      return response.data.data;
    }
  });

  if (progressQuery.isLoading) {
    return <div className="card">Memuat progress...</div>;
  }

  if (progressQuery.isError) {
    return <div className="alert-error">Gagal memuat progress.</div>;
  }

  const data = progressQuery.data;

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Progress Tracker</p>
        <h1>Progress Skripsi Saya</h1>
        <p className="muted">
          Total poin: <strong>{data.totalPoints}</strong> • Badge:{" "}
          <strong>{data.totalBadges}</strong>
        </p>
      </div>

      <div className="list-card">
        {data.skripsi.length === 0 ? (
          <p>Belum ada data skripsi.</p>
        ) : (
          data.skripsi.map((item: any) => (
            <article key={item.id} className="progress-card">
              <div className="page-header-row">
                <div>
                  <strong>{item.title || "Tanpa judul"}</strong>
                  <p className="muted">
                    {item.tahap} • {item.status}
                  </p>
                </div>
                <strong>{item.progressPercent}%</strong>
              </div>

              <div className="progress-bar">
                <span style={{ width: `${item.progressPercent}%` }} />
              </div>

              <div className="mini-grid">
                <span>Bimbingan valid: {item.validBimbinganCount}/8</span>
                <span>Poin: {item.points}</span>
                <span>
                  Maju sidang: {item.canRequestSidang ? "Siap" : "Belum"}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="list-card">
        <h2>Badge</h2>
        {data.badges.length === 0 ? (
          <p>Belum ada badge.</p>
        ) : (
          data.badges.map((item: any) => (
            <article key={item.id} className="list-item">
              <div>
                <strong>{item.badge.name}</strong>
                <p>{item.badge.description || "-"}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}