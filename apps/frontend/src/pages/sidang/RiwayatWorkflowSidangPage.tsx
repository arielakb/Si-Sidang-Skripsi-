import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import DetailPanel from "../../components/ui/DetailPanel";
import FilterToolbar from "../../components/ui/FilterToolbar";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatusBadge from "../../components/ui/StatusBadge";
import MetricCard from "../../components/ui/MetricCard";
import { getSidangList, type SidangItem } from "../../services/sidang";
import EmptyState from "../../components/ui/EmptyState";

const workflowOrder = [
  "SEMINAR_PROPOSAL",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

const workflowLabels: Record<string, string> = {
  SEMINAR_PROPOSAL: "Seminar Proposal",
  SEMINAR_HASIL: "Seminar Hasil",
  SIDANG_KOMPRE: "Sidang Kompre",
  SIDANG_AKHIR: "Sidang Akhir"
};

const statusOptions = [
  "MENUNGGU_BERKAS",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_JADWAL",
  "DIJADWALKAN",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN",
  "MENUNGGU_REVISI",
  "SELESAI"
];

const finalOptions = ["LOLOS", "LULUS", "TIDAK_LULUS", "TIDAK_LOLOS", "REVISI", "ULANG"];

type WorkflowGroup = {
  skripsiId: string;
  skripsi: SidangItem["skripsi"];
  rows: SidangItem[];
  currentStage: string;
  currentStatus: string;
  progressPercent: number;
  finalStatus: string | null;
  latestUpdatedAt?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getWorkflowIndex(jenis?: string | null) {
  const index = workflowOrder.indexOf(String(jenis || ""));

  return index >= 0 ? index : 999;
}

function getLatestJadwal(item: SidangItem) {
  return item.jadwalSidang?.[0] ?? null;
}

function getJadwalLabel(item: SidangItem) {
  const jadwal = getLatestJadwal(item);

  if (!jadwal) return "-";

  const ruang = `${jadwal.ruang?.code || ""} ${jadwal.ruang?.name || ""}`.trim();

  return `${formatDateTime(jadwal.waktuMulai)} • ${ruang || "Tempat manual / online"
    }`;
}

function getPengujiLabels(item: SidangItem) {
  const rows = (item.dosen ?? []).filter((row) => row.isActive !== false);

  if (rows.length === 0) return "-";

  return rows
    .map((row) => `${row.peran}: ${row.dosen?.name || row.dosenId}`)
    .join(", ");
}

function getBerkasSummary(item: SidangItem) {
  const berkas = item.berkas ?? [];

  if (berkas.length === 0) return "Belum ada";

  const kategori = Array.from(
    new Set(berkas.map((row) => row.kategori).filter(Boolean))
  );

  return kategori.join(", ");
}

function getNilaiSummary(item: SidangItem) {
  const nilai = item.nilaiSidang ?? [];

  if (nilai.length === 0) return "-";

  const nilaiValid = nilai
    .map((row) => Number(row.nilai || 0))
    .filter((value) => Number.isFinite(value));

  if (nilaiValid.length === 0) return `${nilai.length} nilai`;

  const average = Math.round(
    nilaiValid.reduce((total, value) => total + value, 0) / nilaiValid.length
  );

  return `${nilai.length} nilai • rata-rata ${average}`;
}

function getFinalLabel(item: SidangItem) {
  if (item.jenis !== "SIDANG_AKHIR") return "-";

  if (item.hasil === "LULUS") return "LULUS SKRIPSI";
  if (item.hasil === "TIDAK_LULUS") return "TIDAK LULUS SKRIPSI";

  return "Menunggu keputusan";
}

function getProgressPercent(rows: SidangItem[]) {
  if (rows.some((item) => item.jenis === "SIDANG_AKHIR" && item.hasil)) {
    return 100;
  }

  const completedStages = new Set(
    rows
      .filter((item) => item.status === "SELESAI" || item.hasil)
      .map((item) => item.jenis)
  );

  return Math.round((completedStages.size / workflowOrder.length) * 100);
}

function getLatestStage(rows: SidangItem[]) {
  const sorted = [...rows].sort((a, b) => {
    const workflowDiff = getWorkflowIndex(b.jenis) - getWorkflowIndex(a.jenis);

    if (workflowDiff !== 0) return workflowDiff;

    const attemptDiff = Number(b.attemptNo || 0) - Number(a.attemptNo || 0);

    if (attemptDiff !== 0) return attemptDiff;

    return (
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  });

  return sorted[0] ?? null;
}

function groupRowsBySkripsi(rows: SidangItem[]): WorkflowGroup[] {
  const map = new Map<string, SidangItem[]>();

  for (const row of rows) {
    const key = row.skripsiId || row.skripsi?.id || "unknown";

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push(row);
  }

  return Array.from(map.entries()).map(([skripsiId, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      const workflowDiff = getWorkflowIndex(a.jenis) - getWorkflowIndex(b.jenis);

      if (workflowDiff !== 0) return workflowDiff;

      return Number(a.attemptNo || 0) - Number(b.attemptNo || 0);
    });

    const first = sortedItems[0];
    const latest = getLatestStage(sortedItems);
    const finalStatus =
      sortedItems.find((item) => item.jenis === "SIDANG_AKHIR" && item.hasil)
        ?.hasil || null;

    return {
      skripsiId,
      skripsi: first.skripsi,
      rows: sortedItems,
      currentStage: latest?.jenis || "-",
      currentStatus: finalStatus || latest?.status || "-",
      progressPercent: getProgressPercent(sortedItems),
      finalStatus,
      latestUpdatedAt: latest?.updatedAt || latest?.createdAt
    };
  });
}

export default function RiwayatWorkflowSidangPage() {
  const { hasPermission, hasRole } = useAuth();

  const isMahasiswa = hasRole("mahasiswa");
  const canReadSidang = hasPermission("sidang.read") || isMahasiswa;

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [finalFilter, setFinalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedGroup, setSelectedGroup] = useState<WorkflowGroup | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup) {
      setDetailActiveTab(selectedGroup.currentStage);
    }
  }, [selectedGroup]);

  const sidangQuery = useQuery({
    queryKey: ["sidang", "workflow-riwayat"],
    queryFn: () =>
      getSidangList({
        limit: 500
      }),
    enabled: canReadSidang
  });

  const rows = sidangQuery.data?.data ?? [];

  const groupedRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return groupRowsBySkripsi(rows)
      .filter((group) => {
        const searchable = `${group.skripsi?.title ?? ""} ${group.skripsi?.mahasiswa?.name ?? ""
          } ${group.skripsi?.mahasiswa?.identifier ?? ""} ${group.currentStage
          } ${group.currentStatus} ${group.finalStatus ?? ""}`.toLowerCase();

        if (keyword && !searchable.includes(keyword)) return false;

        if (
          stageFilter &&
          !group.rows.some((item) => item.jenis === stageFilter)
        ) {
          return false;
        }

        if (
          statusFilter &&
          !group.rows.some((item) => item.status === statusFilter)
        ) {
          return false;
        }

        if (
          finalFilter &&
          !group.rows.some((item) => item.hasil === finalFilter)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        return (
          new Date(b.latestUpdatedAt || 0).getTime() -
          new Date(a.latestUpdatedAt || 0).getTime()
        );
      });
  }, [rows, search, stageFilter, statusFilter, finalFilter]);

  const totalRows = groupedRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = groupedRows.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const metrics = {
    total: groupedRows.length,
    berjalan: groupedRows.filter((group) => !group.finalStatus).length,
    lulus: groupedRows.filter((group) => group.finalStatus === "LULUS").length,
    tidakLulus: groupedRows.filter((group) => group.finalStatus === "TIDAK_LULUS")
      .length
  };

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke riwayat workflow sidang.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Riwayat Akademik"
        title="Riwayat Workflow Sidang"
        description="Pantau perjalanan mahasiswa dari Seminar Proposal, Seminar Hasil, Sidang Kompre, hingga Sidang Akhir."
      />

      {!isMahasiswa && (
        <div className="workflow-tabs workflow-tabs-global">
          <button
            type="button"
            className={`workflow-tab ${stageFilter === "" ? "active" : ""}`}
            onClick={() => {
              setStageFilter("");
              setPage(1);
            }}
          >
            Semua Tahap
          </button>
          {workflowOrder.map((stage) => (
            <button
              key={stage}
              type="button"
              className={`workflow-tab ${stageFilter === stage ? "active" : ""}`}
              onClick={() => {
                setStageFilter(stage);
                setPage(1);
              }}
            >
              {workflowLabels[stage]}
            </button>
          ))}
        </div>
      )}

      <div className="metric-grid">
        <MetricCard
          label="Total Riwayat"
          value={metrics.total}
          description="Skripsi dalam riwayat workflow"
        />

        <MetricCard
          label="Masih Berjalan"
          value={metrics.berjalan}
          description="Belum punya keputusan akhir"
        />

        <MetricCard
          label="Lulus"
          value={metrics.lulus}
          description="Keputusan akhir LULUS"
        />

        <MetricCard
          label="Tidak Lulus"
          value={metrics.tidakLulus}
          description="Keputusan akhir TIDAK_LULUS"
        />
      </div>

      {isMahasiswa ? (
        <SectionCard
          title="Riwayat Sidang Anda"
          description="Daftar riwayat persidangan yang pernah Anda jalani."
        >
          {sidangQuery.isLoading ? (
            <EmptyState title="Memuat riwayat..." description="Mohon tunggu sebentar." />
          ) : paginatedRows.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              description="Anda belum memiliki riwayat sidang."
            />
          ) : (
            <div className="mhs-riwayat-list">
              {paginatedRows.map((group) => {
                const isExpanded = expandedCard === group.skripsiId;

                return (
                  <div
                    key={group.skripsiId}
                    className={`mhs-riwayat-card ${isExpanded ? 'mhs-riwayat-open' : ''}`}
                  >
                    <div
                      className="mhs-riwayat-card-header"
                      onClick={() => setExpandedCard(isExpanded ? null : group.skripsiId)}
                    >
                      <div className="mhs-riwayat-card-left">
                        <div className="mhs-riwayat-icon">
                          <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                          <h3>{group.skripsi?.title || "Tanpa Judul"}</h3>
                          <p>Tahap Terakhir: {workflowLabels[group.currentStage] || group.currentStage}</p>
                        </div>
                      </div>
                      <div className="mhs-riwayat-card-right">
                        <StatusBadge value={group.currentStatus} size="sm" />
                        <span className="material-symbols-outlined mhs-chevron">expand_more</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mhs-riwayat-card-body">
                        {group.rows.map((row, idx) => (
                          <div key={row.id || idx} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', paddingTop: idx > 0 ? '1rem' : '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                              <strong>{workflowLabels[row.jenis] || row.jenis} (Attempt {row.attemptNo || 1})</strong>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <StatusBadge value={row.status} size="sm" />
                                {row.hasil && <StatusBadge value={row.hasil} size="sm" />}
                              </div>
                            </div>

                            <div className="mhs-riwayat-detail-row">
                              <div className="mhs-riwayat-detail-item">
                                <label>Jadwal</label>
                                <span>{getJadwalLabel(row)}</span>
                              </div>
                              <div className="mhs-riwayat-detail-item">
                                <label>Penguji</label>
                                <span>{getPengujiLabels(row)}</span>
                              </div>
                              <div className="mhs-riwayat-detail-item">
                                <label>Nilai</label>
                                <span>{getNilaiSummary(row)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Daftar Riwayat Skripsi"
          description="Data disusun per skripsi dengan detail attempt tiap tahap."
        >
          <DataTable<WorkflowGroup>
            data={paginatedRows}
            isLoading={sidangQuery.isLoading}
            loadingMessage="Memuat riwayat workflow..."
            emptyMessage="Belum ada riwayat workflow"
            getRowKey={(item) => item.skripsiId}
            toolbar={
              <FilterToolbar
                searchValue={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                searchPlaceholder="Cari judul, mahasiswa, NPM, tahap..."
                meta={
                  <span>
                    Menampilkan <strong>{paginatedRows.length}</strong> dari{" "}
                    <strong>{totalRows}</strong> riwayat.
                  </span>
                }
              >
                <div className="filter-field">
                  <label>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua Status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Hasil</label>
                  <select
                    value={finalFilter}
                    onChange={(event) => {
                      setFinalFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua Hasil</option>
                    {finalOptions.map((hasil) => (
                      <option key={hasil} value={hasil}>
                        {hasil}
                      </option>
                    ))}
                  </select>
                </div>
              </FilterToolbar>
            }
            columns={[
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                mobilePriority: "title",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.mahasiswa?.name || "-"}</strong>
                    <span>{item.skripsi?.mahasiswa?.identifier || "-"}</span>
                  </div>
                )
              },
              {
                key: "judul",
                header: "Judul Skripsi",
                mobilePriority: "subtitle",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                    <span>{item.skripsi?.peminatan?.name || "-"}</span>
                  </div>
                )
              },
              {
                key: "tahap",
                header: "Tahap Terakhir",
                render: (item) => workflowLabels[item.currentStage] || item.currentStage
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                mobilePriority: "meta",
                render: (item) => <StatusBadge value={item.currentStatus} size="sm" />
              },
              {
                key: "progress",
                header: "Progress",
                align: "center",
                render: (item) => (
                  <div className="workflow-final-status">
                    <strong>{item.progressPercent}%</strong>
                  </div>
                )
              },
              {
                key: "jumlah",
                header: "Tahap",
                align: "center",
                render: (item) => `${item.rows.length} data`
              },
              {
                key: "detail",
                header: "Detail",
                align: "center",
                render: (item) => (
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => setSelectedGroup(item)}
                  >
                    Detail
                  </button>
                )
              }
            ]}
            pagination={{
              page: currentPage,
              pageSize: limit,
              total: totalRows,
              onPageChange: setPage,
              onPageSizeChange: (pageSize) => {
                setLimit(pageSize);
                setPage(1);
              },
              itemLabel: "riwayat"
            }}
            mobileTitle={(item) => item.skripsi?.mahasiswa?.name || "-"}
            mobileSubtitle={(item) => item.skripsi?.title || "Tanpa judul"}
            mobileMeta={(item) => (
              <StatusBadge value={item.currentStatus} size="sm" />
            )}
          />
        </SectionCard>
      )}

      {!isMahasiswa && (
        <DetailPanel
          open={Boolean(selectedGroup)}
          title="Detail Riwayat Workflow"
          subtitle={selectedGroup?.skripsi?.title || "Tanpa judul"}
          width="lg"
          onClose={() => setSelectedGroup(null)}
        >
          {selectedGroup ? (
            <div className="page-stack">
              <div className="workflow-history-head">
                <div>
                  <p className="eyebrow">
                    {selectedGroup.skripsi?.mahasiswa?.identifier || "-"}
                  </p>
                  <h2>{selectedGroup.skripsi?.mahasiswa?.name || "-"}</h2>
                  <p className="muted">
                    Progress akademik {selectedGroup.progressPercent}%
                  </p>
                </div>

                <div className="workflow-final-status">
                  <StatusBadge
                    value={selectedGroup.finalStatus || selectedGroup.currentStatus}
                    size="md"
                  />
                  <strong>{selectedGroup.progressPercent}%</strong>
                </div>
              </div>

              <div className="workflow-progress-track">
                <span style={{ width: `${selectedGroup.progressPercent}%` }} />
              </div>

              <div className="workflow-detail-tabs">
                {workflowOrder
                  .filter((stage) =>
                    selectedGroup.rows.some((r) => r.jenis === stage)
                  )
                  .map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      className={`workflow-detail-tab ${detailActiveTab === stage ? "active" : ""
                        }`}
                      onClick={() => setDetailActiveTab(stage)}
                    >
                      <span className="tab-label">{workflowLabels[stage]}</span>
                    </button>
                  ))}
              </div>

              <DataTable<SidangItem>
                data={selectedGroup.rows.filter(
                  (r) => r.jenis === detailActiveTab
                )}
                emptyMessage="Belum ada tahap"
                compact
                columns={[
                  {
                    key: "tahap",
                    header: "Tahap",
                    mobilePriority: "title",
                    render: (item) => (
                      <div className="table-title-cell">
                        <strong>{workflowLabels[item.jenis] || item.jenis}</strong>
                        <span>Attempt {item.attemptNo}</span>
                      </div>
                    )
                  },
                  {
                    key: "status",
                    header: "Status",
                    align: "center",
                    mobilePriority: "meta",
                    render: (item) => <StatusBadge value={item.status} size="sm" />
                  },
                  {
                    key: "hasil",
                    header: "Hasil",
                    align: "center",
                    render: (item) =>
                      item.hasil ? (
                        <StatusBadge value={item.hasil} size="sm" />
                      ) : (
                        <span className="muted">-</span>
                      )
                  },
                  {
                    key: "nilai",
                    header: "Nilai",
                    render: (item) => getNilaiSummary(item)
                  },
                  {
                    key: "jadwal",
                    header: "Jadwal",
                    render: (item) => getJadwalLabel(item)
                  },
                  {
                    key: "penguji",
                    header: "Penguji",
                    render: (item) => getPengujiLabels(item)
                  },
                  {
                    key: "berkas",
                    header: "Berkas",
                    render: (item) => getBerkasSummary(item)
                  },
                  {
                    key: "akhir",
                    header: "Status Akhir",
                    render: (item) => getFinalLabel(item)
                  }
                ]}
                mobileTitle={(item) => workflowLabels[item.jenis] || item.jenis}
                mobileSubtitle={(item) => `Attempt ${item.attemptNo}`}
                mobileMeta={(item) => <StatusBadge value={item.status} size="sm" />}
              />
            </div>
          ) : null}
        </DetailPanel>
      )}
    </section>
  );
}
