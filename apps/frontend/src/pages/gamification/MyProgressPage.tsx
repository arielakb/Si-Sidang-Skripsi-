import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ActionGroup from "../../components/ui/ActionGroup";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import FilterToolbar from "../../components/ui/FilterToolbar";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getWorkflowSkripsiList,
  type WorkflowItem,
  type WorkflowListResponse,
  type WorkflowStage
} from "../../services/workflow";

const stageOptions = [
  { value: "SEMINAR_PROPOSAL", label: "Seminar Proposal" },
  { value: "BIMBINGAN", label: "Bimbingan" },
  { value: "SEMINAR_HASIL", label: "Seminar Hasil" },
  { value: "SIDANG_KOMPRE", label: "Sidang Kompre" },
  { value: "SIDANG_AKHIR", label: "Sidang Akhir" }
];

const stageOrder = [
  "SEMINAR_PROPOSAL",
  "BIMBINGAN",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

function getStage(workflow: WorkflowItem, key: string) {
  return workflow.stages.find((stage) => stage.key === key) ?? null;
}

function getSortedStages(workflow: WorkflowItem) {
  return [...(workflow.stages ?? [])].sort((a, b) => {
    const indexA = stageOrder.indexOf(a.key);
    const indexB = stageOrder.indexOf(b.key);

    return (indexA >= 0 ? indexA : 999) - (indexB >= 0 ? indexB : 999);
  });
}

function getBimbinganLabel(workflow: WorkflowItem) {
  const bimbingan = getStage(workflow, "BIMBINGAN");
  const valid = bimbingan?.progress?.validCount ?? 0;
  const required = bimbingan?.progress?.requiredCount ?? 8;

  return `${valid}/${required}`;
}

function getFinalStatus(workflow: WorkflowItem) {
  if (workflow.finalStatus === "LULUS") return "LULUS";
  if (workflow.finalStatus === "TIDAK_LULUS") return "TIDAK_LULUS";
  if (workflow.skripsi.status === "LULUS_SKRIPSI") return "LULUS";
  if (workflow.skripsi.status === "TIDAK_LULUS_SKRIPSI") return "TIDAK_LULUS";

  return null;
}

function getStageDescription(stage: WorkflowStage) {
  if (stage.key === "BIMBINGAN") {
    const progress = stage.progress;

    return progress
      ? `${progress.validCount}/${progress.requiredCount} bimbingan valid • ${progress.totalCount} total log`
      : "Belum ada data bimbingan";
  }

  if (!stage.sidang) return "Belum dimulai";

  const pengujiCount = stage.penguji?.length ?? 0;
  const minPenguji = stage.minPenguji ?? 0;
  const nilaiCount = stage.nilaiCount ?? stage.nilai?.length ?? 0;
  const missingBerkas = stage.missingBerkas?.length ?? 0;

  return [
    `Attempt ${stage.attemptNo ?? stage.sidang.attemptNo ?? 1}`,
    minPenguji > 0 ? `${pengujiCount}/${minPenguji} penguji` : "Tanpa penguji",
    stage.requiresNilai ? `${nilaiCount} nilai` : null,
    missingBerkas > 0 ? `${missingBerkas} berkas kurang` : "Berkas lengkap"
  ]
    .filter(Boolean)
    .join(" • ");
}

function getMetrics(rows: WorkflowItem[]) {
  const total = rows.length;
  const lulus = rows.filter((item) => getFinalStatus(item) === "LULUS").length;
  const tidakLulus = rows.filter((item) => getFinalStatus(item) === "TIDAK_LULUS")
    .length;
  const active = total - lulus - tidakLulus;
  const readySemhas = rows.filter((item) => {
    const bimbingan = getStage(item, "BIMBINGAN");
    const valid = bimbingan?.progress?.validCount ?? 0;
    const required = bimbingan?.progress?.requiredCount ?? 8;

    return valid >= required && item.currentStage === "BIMBINGAN";
  }).length;

  return [
    {
      label: "Total Progress",
      value: total,
      description: "Data yang dapat Anda lihat"
    },
    {
      label: "Aktif",
      value: active,
      description: "Belum final"
    },
    {
      label: "Siap Semhas",
      value: readySemhas,
      description: "Bimbingan memenuhi syarat"
    },
    {
      label: "Lulus",
      value: lulus,
      description: "Keputusan akhir lulus"
    },
    {
      label: "Tidak Lulus",
      value: tidakLulus,
      description: "Keputusan akhir tidak lulus"
    }
  ];
}

export default function MyProgressPage() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, stage, status, limit]);

  const workflowQuery = useQuery<WorkflowListResponse>({
    queryKey: ["progress-akademik", { search, stage, status, page, limit }],
    queryFn: () =>
      getWorkflowSkripsiList({
        search,
        stage,
        status,
        page,
        limit
      })
  });

  const summaryQuery = useQuery<WorkflowListResponse>({
    queryKey: ["progress-akademik", "summary"],
    queryFn: () =>
      getWorkflowSkripsiList({
        limit: 100
      })
  });

  const rows = workflowQuery.data?.data ?? [];
  const summaryRows = summaryQuery.data?.data ?? [];
  const meta = workflowQuery.data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1
  };

  const metrics = useMemo(() => getMetrics(summaryRows), [summaryRows]);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Progress Akademik"
        title="Progress Skripsi dan Sidang"
        description="Pantau perkembangan dari Seminar Proposal, Bimbingan, Seminar Hasil, Kompre, sampai Sidang Akhir."
        action={
          <ActionGroup align="end" compact>
            <Link to="/app/workflow-sidang" className="primary-button">
              Workflow Sidang
            </Link>
            <Link to="/app/sidang/riwayat-workflow" className="secondary-button">
              Riwayat
            </Link>
          </ActionGroup>
        }
      />

      <div className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </div>

      <SectionCard
        title="Daftar Progress"
        description="Gunakan filter untuk memantau progress berdasarkan mahasiswa, tahap, atau status."
      >
        <DataTable<WorkflowItem>
          data={rows}
          toolbar={
            <FilterToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari mahasiswa, NPM, judul..."
            >
              <div className="filter-field">
                <label>Tahap</label>
                <select value={stage} onChange={(event) => setStage(event.target.value)}>
                  <option value="">Semua tahap</option>
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Semua status</option>
                  <option value="MENUNGGU_BERKAS">Menunggu Berkas</option>
                  <option value="MENUNGGU_PENGUJI">Menunggu Penguji</option>
                  <option value="MENUNGGU_JADWAL">Menunggu Jadwal</option>
                  <option value="MENUNGGU_NILAI">Menunggu Nilai</option>
                  <option value="MENUNGGU_KEPUTUSAN">Menunggu Keputusan</option>
                  <option value="MENUNGGU_REVISI">Menunggu Revisi</option>
                  <option value="LULUS_SKRIPSI">Lulus Skripsi</option>
                  <option value="TIDAK_LULUS_SKRIPSI">Tidak Lulus Skripsi</option>
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
                  <strong>{item.skripsi.mahasiswa?.name || "-"}</strong>
                  <span>{item.skripsi.mahasiswa?.identifier || "-"}</span>
                </div>
              )
            },
            {
              key: "judul",
              header: "Judul",
              render: (item) => item.skripsi.title || "Tanpa judul"
            },
            {
              key: "tahap",
              header: "Tahap",
              render: (item) => item.currentStageLabel
            },
            {
              key: "bimbingan",
              header: "Bimbingan",
              align: "center",
              render: (item) => getBimbinganLabel(item)
            },
            {
              key: "progress",
              header: "Progress",
              align: "center",
              render: (item) => (
                <div className="progress-table-cell">
                  <strong>{item.progressPercent}%</strong>
                  <div className="workflow-progress-track">
                    <span style={{ width: `${item.progressPercent}%` }} />
                  </div>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              mobilePriority: "meta",
              render: (item) => (
                <StatusBadge
                  value={getFinalStatus(item) || item.summaryStatus}
                  size="sm"
                />
              )
            },
            {
              key: "next",
              header: "Langkah Berikutnya",
              render: (item) => item.nextStep || "-"
            }
          ]}
          getRowKey={(item) => item.skripsi.id}
          emptyMessage="Belum ada progress sesuai filter"
          isLoading={workflowQuery.isLoading}
          minWidth={1080}
          pagination={{
            page: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            onPageChange: setPage,
            onPageSizeChange: setLimit,
            itemLabel: "progress"
          }}
          mobileSubtitle={(item) => item.skripsi.title || "Tanpa judul"}
          mobileMeta={(item) => (
            <StatusBadge value={getFinalStatus(item) || item.summaryStatus} size="sm" />
          )}
        />
      </SectionCard>

      <SectionCard
        title="Timeline Ringkas"
        description="Tahap setiap skripsi yang tampil di halaman ini."
      >
        {workflowQuery.isLoading ? (
          <EmptyState title="Memuat timeline..." description="Mohon tunggu sebentar." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada timeline"
            description="Timeline akan muncul setelah data workflow tersedia."
          />
        ) : (
          <div className="workflow-history-list">
            {rows.map((workflow) => (
              <article key={workflow.skripsi.id} className="workflow-history-card">
                <div className="workflow-history-head">
                  <div>
                    <p className="eyebrow">
                      {workflow.skripsi.mahasiswa?.identifier || "-"}
                    </p>
                    <h2>{workflow.skripsi.title || "Tanpa judul"}</h2>
                    <p className="muted">
                      {workflow.skripsi.mahasiswa?.name || "-"} •{" "}
                      {workflow.currentStageLabel}
                    </p>
                  </div>

                  <div className="workflow-final-status">
                    <StatusBadge
                      value={getFinalStatus(workflow) || workflow.summaryStatus}
                      size="md"
                    />
                    <strong>{workflow.progressPercent}%</strong>
                  </div>
                </div>

                <div className="workflow-progress-track">
                  <span style={{ width: `${workflow.progressPercent}%` }} />
                </div>

                <div className="workflow-stage-list">
                  {getSortedStages(workflow).map((stage) => (
                    <div key={stage.key} className="workflow-stage-row">
                      <div>
                        <strong>{stage.label}</strong>
                        <span>{getStageDescription(stage)}</span>
                      </div>

                      <StatusBadge
                        value={stage.isComplete ? stage.hasil || "SELESAI" : stage.status}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
