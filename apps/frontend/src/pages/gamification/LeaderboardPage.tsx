import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export default function LeaderboardPage() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const response = await api.get("/gamification/leaderboard");
      return response.data.data;
    }
  });

  const rows = leaderboardQuery.data ?? [];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Gamification</p>
        <h1>Leaderboard</h1>
        <p className="muted">Peringkat berdasarkan poin progress skripsi.</p>
      </div>

      <div className="list-card">
        {leaderboardQuery.isLoading ? (
          <p>Memuat leaderboard...</p>
        ) : rows.length === 0 ? (
          <p>Belum ada leaderboard.</p>
        ) : (
          rows.map((item: any) => (
            <article key={item.skripsi.id} className="list-item">
              <div>
                <strong>
                  #{item.rank} — {item.mahasiswa.name}
                </strong>
                <p>{item.skripsi.title || "-"}</p>
                <small>
                  {item.skripsi.status} • Progress {item.progressPercent}%
                </small>
              </div>
              <strong>{item.points} poin</strong>
            </article>
          ))
        )}
      </div>
    </section>
  );
}