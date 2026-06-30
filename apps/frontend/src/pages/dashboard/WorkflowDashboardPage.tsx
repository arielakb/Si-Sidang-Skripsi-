import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
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
  type WorkflowActionKey,
  type WorkflowItem,
  type WorkflowListResponse,
  type WorkflowStage
} from "../../services/workflow";

type BottleneckRow = {
  key: string;
  label: string;
  count: number;
  description: string;
  status: string;
};

type ScheduleRow = {
  id: string;
  workflow: WorkflowItem;
  stage: WorkflowStage;
  waktuMulai?: string | null;
  ruangLabel: string;
};

const stageOptions = [
  { value: "SEMINAR_PROPOSAL", label: "Seminar Proposal" },
  { value: "BIMBINGAN", label: "Bimbingan" },
  { value: "SEMINAR_HASIL", label: "Seminar Hasil" },
  { value: "SIDANG_KOMPRE", label: "Sidang Kompre" },
  { value: "SIDANG_AKHIR", label: "Sidang Akhir" }
];

const statusOptions = [
  "MENUNGGU_BERKAS",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_JADWAL",
  "DIJADWALKAN",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN",
  "MENUNGGU_REVISI",
  "SELESAI",
  "LULUS_SKRIPSI",
  "TIDAK_LULUS_SKRIPSI"
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getAllStages(workflows: WorkflowItem[]) {
  return workflows.flatMap((workflow) => workflow.stages ?? []);
}

function getAllActions(workflows: WorkflowItem[]) {
  return workflows.flatMap((workflow) => workflow.actions ?? []);
}

function countAction(workflows: WorkflowItem[], actionKey: WorkflowActionKey) {
  return getAllActions(workflows).filter((action) => action.key === actionKey)
    .length;
}

function countStageStatus(workflows: WorkflowItem[], status: string) {
  return getAllStages(workflows).filter((stage) => stage.status === status).length;
}

function countFinal(workflows: WorkflowItem[], hasil: string) {
  return workflows.filter((workflow) => workflow.finalStatus === hasil).length;
}

function getRoomLabel(stage: WorkflowStage) {
  const jadwal = stage.jadwal;

  return (
    jadwal?.ruang?.name ||
    jadwal?.ruang?.code ||
    jadwal?.tempatManual ||
    jadwal?.linkVicon ||
    "-"
  );
}

function getUpcomingSchedules(workflows: WorkflowItem[]) {
  const rows: ScheduleRow[] = workflows.flatMap((workflow) =>
    workflow.stages
      .filter((stage) => stage.jadwal?.waktuMulai)
      .map((stage) => ({
        id: `${workflow.skripsi.id}-${stage.key}-${stage.jadwal?.id || ""}`,
        workflow,
        stage,
        waktuMulai: stage.jadwal?.waktuMulai,
        ruangLabel: getRoomLabel(stage)
      }))
  );

  return rows
    .filter((row) => {
      if (!row.waktuMulai) return false;
      if (["SELESAI", "DIBATALKAN"].includes(String(row.stage.status))) {
        return false;
      }

      return new Date(row.waktuMulai).getTime() >= Date.now();
    })
    .sort(
      (a, b) =>
        new Date(a.waktuMulai || 0).getTime() -
        new Date(b.waktuMulai || 0).getTime()
    );
}

function getBottlenecks(workflows: WorkflowItem[]): BottleneckRow[] {
  return [
    {
      key: "berkas",
      label: "Menunggu Berkas",
      count: countStageStatus(workflows, "MENUNGGU_BERKAS"),
      description: "Mahasiswa perlu upload dokumen",
      status: "MENUNGGU_BERKAS"
    },
    {
      key: "penguji",
      label: "Menunggu Penguji",
      count: countStageStatus(workflows, "MENUNGGU_PENGUJI"),
      description: "Perlu assign penguji",
      status: "MENUNGGU_PENGUJI"
    },
    {
      key: "jadwal",
      label: "Menunggu Jadwal",
      count: countStageStatus(workflows, "MENUNGGU_JADWAL"),
      description: "Perlu dibuat jadwal",
      status: "MENUNGGU_JADWAL"
    },
    {
      key: "nilai",
      label: "Menunggu Nilai",
      count: countStageStatus(workflows, "MENUNGGU_NILAI"),
      description: "Penguji perlu input nilai",
      status: "MENUNGGU_NILAI"
    },
    {
      key: "keputusan",
      label: "Menunggu Keputusan",
      count: countStageStatus(workflows, "MENUNGGU_KEPUTUSAN"),
      description: "Perlu input hasil/keputusan",
      status: "MENUNGGU_KEPUTUSAN"
    },
    {
      key: "revisi",
      label: "Menunggu Revisi",
      count: getAllStages(workflows).filter((stage) =>
        ["MENUNGGU_REVISI", "DIAJUKAN", "REVISI"].includes(
          String(stage.latestRevisi?.status || stage.status || "").toUpperCase()
        )
      ).length,
      description: "Revisi perlu diajukan/disetujui",
      status: "MENUNGGU_REVISI"
    }
  ].filter((item) => item.count > 0);
}

export default function WorkflowDashboardPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, stage, status, limit]);

  const workflowQuery = useQuery<WorkflowListResponse>({
    queryKey: ["workflow-dashboard", { search, stage, status, page, limit }],
    queryFn: () =>
      getWorkflowSkripsiList({
        search,
        stage,
        status,
        page,
        limit
      })
  });

  const workflows = workflowQuery.data?.data ?? [];
  const meta = workflowQuery.data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1
  };

  const allQuery = useQuery<WorkflowListResponse>({
    queryKey: ["workflow-dashboard", "summary"],
    queryFn: () =>
      getWorkflowSkripsiList({
        limit: 100
      })
  });

  const summaryRows = allQuery.data?.data ?? [];
  const bottlenecks = useMemo(() => getBottlenecks(summaryRows), [summaryRows]);
  const upcomingSchedules = useMemo(
    () => getUpcomingSchedules(summaryRows).slice(0, 6),
    [summaryRows]
  );

  const metrics = [
    {
      label: "Workflow Aktif",
      value: summaryRows.filter(
        (item) =>
          !["LULUS_SKRIPSI", "TIDAK_LULUS_SKRIPSI", "SELESAI"].includes(
            String(item.summaryStatus || "").toUpperCase()
          )
      ).length,
      description: "Belum selesai"
    },
    {
      label: "Menunggu Nilai",
      value: countStageStatus(summaryRows, "MENUNGGU_NILAI"),
      description: "Perlu input nilai"
    },
    {
      label: "Action Saya",
      value:
        countAction(summaryRows, "UPLOAD_BERKAS") +
        countAction(summaryRows, "ASSIGN_PENGUJI") +
        countAction(summaryRows, "BUAT_JADWAL") +
        countAction(summaryRows, "INPUT_NILAI_SIDANG") +
        countAction(summaryRows, "INPUT_HASIL_SIDANG") +
        countAction(summaryRows, "INPUT_KEPUTUSAN_AKHIR"),
      description: "Aksi sesuai role"
    },
    {
      label: "Lulus",
      value: countFinal(summaryRows, "LULUS"),
      description: "Keputusan akhir lulus"
    },
    {
      label: "Tidak Lulus",
      value: countFinal(summaryRows, "TIDAK_LULUS"),
      description: "Keputusan akhir tidak lulus"
    }
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Dashboard Workflow"
        title="Monitoring Workflow Skripsi"
        description={`Ringkasan akademik sesuai akses ${user?.name || "pengguna"}.`}
        action={
          <ActionGroup align="end" compact>
            <Link to="/app/workflow-sidang" className="primary-button">
              Kelola Workflow
            </Link>
            <Link to="/app/progress" className="secondary-button">
              Progress
            </Link>
          </ActionGroup>
        }
      />

      <div className="workflow-metric-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </div>

      <div className="dashboard-grid-2">
        <SectionCard
          title="Bottleneck Workflow"
          description="Tahap yang perlu ditindaklanjuti lebih dulu."
        >
          {allQuery.isLoading ? (
            <EmptyState title="Memuat bottleneck..." description="Mohon tunggu sebentar." />
          ) : bottlenecks.length === 0 ? (
            <EmptyState
              title="Belum ada bottleneck"
              description="Semua workflow yang bisa Anda lihat sedang aman."
            />
          ) : (
            <DataTable<BottleneckRow>
              data={bottlenecks}
              columns={[
                {
                  key: "label",
                  header: "Tahap",
                  mobilePriority: "title",
                  render: (item) => (
                    <div className="table-title-cell">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
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
                  key: "count",
                  header: "Jumlah",
                  align: "right",
                  mobilePriority: "meta",
                  render: (item) => <strong>{item.count}</strong>
                }
              ]}
              getRowKey={(item) => item.key}
              compact
              minWidth={640}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Agenda Terdekat"
          description="Jadwal sidang aktif yang sudah dibuat."
        >
          <DataTable<ScheduleRow>
            data={upcomingSchedules}
            columns={[
              {
                key: "jadwal",
                header: "Jadwal",
                mobilePriority: "title",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{formatDateTime(item.waktuMulai)}</strong>
                    <span>{item.stage.label}</span>
                  </div>
                )
              },
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                render: (item) => item.workflow.skripsi.mahasiswa?.name || "-"
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.stage.status} size="sm" />
              },
              {
                key: "ruang",
                header: "Ruang",
                render: (item) => item.ruangLabel
              }
            ]}
            getRowKey={(item) => item.id}
            emptyMessage="Belum ada jadwal terdekat"
            isLoading={allQuery.isLoading}
            compact
            minWidth={720}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Daftar Workflow"
        description="Gunakan filter untuk menemukan mahasiswa, tahap, atau status tertentu."
      >
        <DataTable<WorkflowItem>
          data={workflows}
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
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
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
              key: "progress",
              header: "Progress",
              align: "center",
              render: (item) => <strong>{item.progressPercent}%</strong>
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              mobilePriority: "meta",
              render: (item) => (
                <StatusBadge value={item.finalStatus || item.summaryStatus} size="sm" />
              )
            },
            {
              key: "next",
              header: "Next Step",
              render: (item) => item.nextStep || "-"
            },
            {
              key: "aksi",
              header: "Aksi",
              align: "right",
              render: () => (
                <Link to="/app/workflow-sidang" className="secondary-button">
                  Buka
                </Link>
              )
            }
          ]}
          getRowKey={(item) => item.skripsi.id}
          emptyMessage="Tidak ada workflow sesuai filter"
          isLoading={workflowQuery.isLoading}
          minWidth={1040}
          pagination={{
            page: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            onPageChange: setPage,
            onPageSizeChange: setLimit,
            itemLabel: "workflow"
          }}
        />
      </SectionCard>
    </section>
  );
}
