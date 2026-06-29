import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";

type ProgressSkripsi = {
  id: string;
  title?: string | null;
  tahap?: string | null;
  status?: string | null;
  progressPercent?: number | null;
  validBimbinganCount?: number | null;
  points?: number | null;
  canRequestSidang?: boolean | null;
};

type ProgressBadge = {
  id: string;
  badge: {
    name: string;
    description?: string | null;
  };
};

type MyProgressDashboard = {
  totalPoints: number;
  totalBadges: number;
  skripsi: ProgressSkripsi[];
  badges: ProgressBadge[];
};

function normalizePercent(value?: number | null) {
  return Math.min(Math.max(Number(value ?? 0), 0), 100);
}

function getProgressStatus(item: ProgressSkripsi) {
  if (item.status === "SELESAI") return "SELESAI";
  if (item.canRequestSidang) return "SIAP_MAJU_SIDANG";
  if (normalizePercent(item.progressPercent) >= 100) return "LENGKAP";
  return "BERJALAN";
}

export default function MyProgressPage() {
  const [search, setSearch] = useState("");

  const progressQuery = useQuery({
    queryKey: ["my-gamification-dashboard"],
    queryFn: async () => {
      const response = await api.get<{ data: MyProgressDashboard }>(
        "/gamification/my-dashboard"
      );

      return response.data.data;
    }
  });

  const data = progressQuery.data;

  const skripsiRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return (data?.skripsi ?? []).filter((item) =>
      `${item.title ?? ""} ${item.tahap ?? ""} ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [data?.skripsi, search]);

  if (progressQuery.isLoading) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Progress Tracker"
          title="Progress Skripsi Saya"
          description="Memuat data progress skripsi dan badge."
        />

        <EmptyState
          title="Memuat progress..."
          description="Mohon tunggu sebentar."
        />
      </section>
    );
  }

  if (progressQuery.isError || !data) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Progress Tracker"
          title="Progress Skripsi Saya"
          description="Pantau poin, badge, dan progress skripsi."
        />

        <div className="alert-error">Gagal memuat progress.</div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Progress Tracker"
        title="Progress Skripsi Saya"
        description="Pantau poin, badge, progress bimbingan, dan kesiapan maju sidang."
      />

      <div className="metric-grid progress-overview-grid">
        <MetricCard
          label="Total Poin"
          value={data.totalPoints}
          description="Akumulasi poin aktivitas skripsi"
        />

        <MetricCard
          label="Total Badge"
          value={data.totalBadges}
          description="Badge yang sudah diperoleh"
        />

        <MetricCard
          label="Skripsi"
          value={data.skripsi.length}
          description="Jumlah data skripsi yang tercatat"
        />

        <MetricCard
          label="Siap Sidang"
          value={data.skripsi.filter((item) => item.canRequestSidang).length}
          description="Skripsi dengan syarat bimbingan terpenuhi"
        />
      </div>

      <section className="list-card progress-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Progress Skripsi</h2>
            <p className="muted">
              List progress skripsi berdasarkan bimbingan valid, poin, dan status.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, tahap, atau status..."
            />
          </div>
        </div>

        <DataTable
          data={skripsiRows}
          emptyMessage="Belum ada data skripsi"
          columns={[
            {
              key: "no",
              header: "No",
              align: "center",
              render: (_item, index) => index + 1
            },
            {
              key: "title",
              header: "Judul",
              render: (item) => (
                <div className="table-title-cell">
                  <strong>{item.title || "Tanpa judul"}</strong>
                  <span>{item.tahap || "-"}</span>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              render: (item) => <StatusBadge value={item.status} size="sm" />
            },
            {
              key: "progress",
              header: "Progress",
              render: (item) => {
                const percent = normalizePercent(item.progressPercent);

                return (
                  <div className="table-progress-cell">
                    <div className="progress-summary-head">
                      <strong>{percent}%</strong>
                      <span>{item.validBimbinganCount ?? 0}/8 bimbingan</span>
                    </div>

                    <div className="progress-bar-shell">
                      <div
                        className="progress-bar-value"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              }
            },
            {
              key: "points",
              header: "Poin",
              align: "center",
              render: (item) => <strong>{item.points ?? 0}</strong>
            },
            {
              key: "sidang",
              header: "Maju Sidang",
              align: "center",
              render: (item) => (
                <StatusBadge
                  value={item.canRequestSidang ? "SIAP" : "BELUM_SIAP"}
                  size="sm"
                />
              )
            },
            {
              key: "progressStatus",
              header: "Kondisi",
              align: "center",
              render: (item) => (
                <StatusBadge value={getProgressStatus(item)} size="sm" />
              )
            }
          ]}
        />
      </section>

      <section className="list-card progress-table-card">
        <div className="table-toolbar">
          <div>
            <h2>Badge</h2>
            <p className="muted">
              Daftar badge yang didapat dari aktivitas skripsi dan bimbingan.
            </p>
          </div>
        </div>

        <DataTable
          data={data.badges}
          emptyMessage="Belum ada badge"
          columns={[
            {
              key: "no",
              header: "No",
              align: "center",
              render: (_item, index) => index + 1
            },
            {
              key: "name",
              header: "Nama Badge",
              render: (item) => (
                <div className="table-title-cell">
                  <strong>{item.badge.name}</strong>
                  <span>{item.badge.description || "-"}</span>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              render: () => <StatusBadge value="DIPEROLEH" size="sm" />
            }
          ]}
        />
      </section>
    </section>
  );
}