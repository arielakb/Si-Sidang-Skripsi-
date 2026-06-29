import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";

type LeaderboardItem = {
  rank?: number | null;
  points?: number | null;
  totalPoints?: number | null;
  badgeCount?: number | null;
  totalBadges?: number | null;
  progressPercent?: number | null;
  validBimbinganCount?: number | null;
  user?: {
    id?: string;
    name?: string | null;
    identifier?: string | null;
    email?: string | null;
  } | null;
  mahasiswa?: {
    id?: string;
    name?: string | null;
    identifier?: string | null;
    email?: string | null;
  } | null;
  skripsi?: {
    id?: string;
    title?: string | null;
    status?: string | null;
    tahap?: string | null;
    mahasiswa?: {
      name?: string | null;
      identifier?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type DrawerMode = "detail" | null;

function normalizePercent(value?: number | null) {
  return Math.min(Math.max(Number(value ?? 0), 0), 100);
}

function getName(item: LeaderboardItem) {
  return (
    item.user?.name ||
    item.mahasiswa?.name ||
    item.skripsi?.mahasiswa?.name ||
    "-"
  );
}

function getIdentifier(item: LeaderboardItem) {
  return (
    item.user?.identifier ||
    item.mahasiswa?.identifier ||
    item.skripsi?.mahasiswa?.identifier ||
    "-"
  );
}

function getEmail(item: LeaderboardItem) {
  return (
    item.user?.email ||
    item.mahasiswa?.email ||
    item.skripsi?.mahasiswa?.email ||
    "-"
  );
}

function getPoints(item: LeaderboardItem) {
  return Number(item.points ?? item.totalPoints ?? 0);
}

function getBadgeCount(item: LeaderboardItem) {
  return Number(item.badgeCount ?? item.totalBadges ?? 0);
}

function getStatus(item: LeaderboardItem) {
  return item.skripsi?.status || "-";
}

function getTahap(item: LeaderboardItem) {
  return item.skripsi?.tahap || "-";
}

function getProgressStatus(item: LeaderboardItem) {
  const progress = normalizePercent(item.progressPercent);

  if (getStatus(item) === "SELESAI") return "SELESAI";
  if (progress >= 100) return "LENGKAP";
  if (progress >= 75) return "HAMPIR_SELESAI";
  return "BERJALAN";
}

export default function LeaderboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedRow, setSelectedRow] = useState<LeaderboardItem | null>(null);

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const response = await api.get<{
        data: LeaderboardItem[];
      }>("/gamification/leaderboard");

      return response.data.data ?? [];
    }
  });

  const rows = leaderboardQuery.data ?? [];

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((item) => item.skripsi?.status)
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return rows.filter((item) => {
      const matchesSearch = `${getName(item)} ${getIdentifier(item)} ${
        item.skripsi?.title ?? ""
      } ${getStatus(item)}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter
        ? item.skripsi?.status === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const topPoint = rows.reduce(
    (max, item) => Math.max(max, getPoints(item)),
    0
  );

  const averageProgress =
    rows.length === 0
      ? 0
      : Math.round(
          rows.reduce(
            (total, item) => total + normalizePercent(item.progressPercent),
            0
          ) / rows.length
        );

  const readyCount = rows.filter(
    (item) => normalizePercent(item.progressPercent) >= 100
  ).length;

  function openDetailDrawer(item: LeaderboardItem) {
    setSelectedRow(item);
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setSelectedRow(null);
    setDrawerMode(null);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Gamification"
        title="Leaderboard"
        description="Peringkat mahasiswa berdasarkan poin, badge, dan progress skripsi."
      />

      <div className="metric-grid leaderboard-overview-grid">
        <MetricCard
          label="Peserta"
          value={rows.length}
          description="Mahasiswa dalam leaderboard"
        />

        <MetricCard
          label="Poin Tertinggi"
          value={topPoint}
          description="Poin tertinggi saat ini"
        />

        <MetricCard
          label="Rata-rata Progress"
          value={`${averageProgress}%`}
          description="Rata-rata progress skripsi"
        />

        <MetricCard
          label="Progress 100%"
          value={readyCount}
          description="Mahasiswa dengan progress penuh"
        />
      </div>

      <section className="list-card leaderboard-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Peringkat Mahasiswa</h2>
            <p className="muted">
              List peringkat berdasarkan poin progress skripsi dan capaian badge.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari mahasiswa, NPM, judul..."
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {leaderboardQuery.isLoading ? (
          <EmptyState
            title="Memuat leaderboard..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada leaderboard"
            columns={[
              {
                key: "rank",
                header: "Rank",
                align: "center",
                render: (item, index) => (
                  <div className="leaderboard-rank">
                    #{item.rank ?? index + 1}
                  </div>
                )
              },
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{getName(item)}</strong>
                    <span>{getIdentifier(item)}</span>
                  </div>
                )
              },
              {
                key: "skripsi",
                header: "Skripsi",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                    <span>{getTahap(item)}</span>
                  </div>
                )
              },
              {
                key: "points",
                header: "Poin",
                align: "center",
                render: (item) => <strong>{getPoints(item)}</strong>
              },
              {
                key: "badges",
                header: "Badge",
                align: "center",
                render: (item) => <strong>{getBadgeCount(item)}</strong>
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
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={getStatus(item)} size="sm" />
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openDetailDrawer(item)}
                    >
                      Detail
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode === "detail" && selectedRow ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer leaderboard-drawer"
            aria-label="Detail leaderboard"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Detail Peringkat</p>
                <h2>Leaderboard</h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Tutup
              </button>
            </div>

            <div className="leaderboard-detail-stack">
              <div className="skripsi-detail-title">
                <strong>{getName(selectedRow)}</strong>
                <StatusBadge value={getProgressStatus(selectedRow)} />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Identifier</span>
                  <strong>{getIdentifier(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Email</span>
                  <strong>{getEmail(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Judul Skripsi</span>
                  <p>{selectedRow.skripsi?.title || "Tanpa judul"}</p>
                </div>

                <div className="info-row">
                  <span>Tahap</span>
                  <strong>{getTahap(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Status</span>
                  <strong>{getStatus(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Poin</span>
                  <strong>{getPoints(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Badge</span>
                  <strong>{getBadgeCount(selectedRow)}</strong>
                </div>

                <div className="info-row">
                  <span>Bimbingan Valid</span>
                  <strong>{selectedRow.validBimbinganCount ?? 0}/8</strong>
                </div>

                <div className="info-row">
                  <span>Progress</span>
                  <strong>{normalizePercent(selectedRow.progressPercent)}%</strong>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Progress Skripsi</h3>

                <div className="table-progress-cell leaderboard-detail-progress">
                  <div className="progress-summary-head">
                    <strong>{normalizePercent(selectedRow.progressPercent)}%</strong>
                    <span>{getProgressStatus(selectedRow)}</span>
                  </div>

                  <div className="progress-bar-shell">
                    <div
                      className="progress-bar-value"
                      style={{
                        width: `${normalizePercent(
                          selectedRow.progressPercent
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}