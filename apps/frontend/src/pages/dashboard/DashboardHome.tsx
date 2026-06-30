import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import ActionGroup from "../../components/ui/ActionGroup";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
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

type ScheduleRow = {
  id: string;
  workflow: WorkflowItem;
  stage: WorkflowStage;
  waktuMulai?: string | null;
  ruangLabel: string;
};

const finishedStatuses = [
  "SELESAI",
  "DIBATALKAN",
  "LULUS_SKRIPSI",
  "TIDAK_LULUS_SKRIPSI"
];

const roleLabels: Record<string, string> = {
  admin: "Dashboard Admin",
  ketua_prodi: "Dashboard Ketua Prodi",
  dosen_koordinator: "Dashboard Koordinator",
  staf_prodi: "Dashboard Staf Prodi",
  dosen_pembimbing: "Dashboard Pembimbing",
  dosen_penguji: "Dashboard Penguji",
  mahasiswa: "Dashboard Mahasiswa",
  user: "Dashboard"
};

function hasRole(roles: string[], role: string) {
  return roles.includes(role);
}

function getPrimaryRole(roles: string[]) {
  if (hasRole(roles, "admin")) return "admin";
  if (hasRole(roles, "ketua_prodi")) return "ketua_prodi";
  if (hasRole(roles, "dosen_koordinator")) return "dosen_koordinator";
  if (hasRole(roles, "staf_prodi")) return "staf_prodi";
  if (hasRole(roles, "dosen_pembimbing")) return "dosen_pembimbing";
  if (hasRole(roles, "dosen_penguji")) return "dosen_penguji";
  if (hasRole(roles, "mahasiswa")) return "mahasiswa";

  return "user";
}

function getDashboardDescription(primaryRole: string) {
  if (primaryRole === "mahasiswa") {
    return "Pantau tahap skripsi, jadwal, bimbingan valid, dan langkah berikutnya.";
  }

  if (primaryRole === "dosen_pembimbing") {
    return "Pantau mahasiswa bimbingan, bimbingan yang perlu ditindaklanjuti, dan kesiapan Seminar Hasil.";
  }

  if (primaryRole === "dosen_penguji") {
    return "Pantau sidang yang Anda uji, jadwal terdekat, nilai, hasil, dan revisi.";
  }

  if (primaryRole === "staf_prodi") {
    return "Monitoring jadwal, status workflow, dan kebutuhan administrasi prodi.";
  }

  return "Pantau workflow skripsi dari Seminar Proposal sampai Sidang Akhir secara ringkas.";
}

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

function countStatus(workflows: WorkflowItem[], status: string) {
  return getAllStages(workflows).filter((stage) => stage.status === status).length;
}

function countActive(workflows: WorkflowItem[]) {
  return workflows.filter(
    (workflow) =>
      !finishedStatuses.includes(String(workflow.summaryStatus || "").toUpperCase())
  ).length;
}

function getStage(workflow: WorkflowItem, key: string) {
  return workflow.stages.find((stage) => stage.key === key) ?? null;
}

function getBimbinganLabel(workflow: WorkflowItem) {
  const bimbingan = getStage(workflow, "BIMBINGAN");
  const valid = bimbingan?.progress?.validCount ?? 0;
  const required = bimbingan?.progress?.requiredCount ?? 8;

  return `${valid}/${required}`;
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

function getCurrentStage(workflow: WorkflowItem) {
  return (
    workflow.stages.find((stage) => stage.key === workflow.currentStage) ??
    workflow.stages.find((stage) => !stage.isComplete) ??
    workflow.stages[0] ??
    null
  );
}

function getMetrics(workflows: WorkflowItem[], primaryRole: string) {
  const total = workflows.length;
  const active = countActive(workflows);

  if (primaryRole === "mahasiswa") {
    const workflow = workflows[0] ?? null;

    return [
      {
        label: "Progress Saya",
        value: workflow ? `${workflow.progressPercent}%` : "0%",
        description: workflow?.currentStageLabel || "Belum ada skripsi"
      },
      {
        label: "Bimbingan Valid",
        value: workflow ? getBimbinganLabel(workflow) : "0/8",
        description: "Target minimal bimbingan"
      },
      {
        label: "Action Saya",
        value: workflow?.actions?.length ?? 0,
        description: "Langkah yang perlu dilakukan"
      },
      {
        label: "Status Akhir",
        value: workflow?.finalStatus || "-",
        description: workflow?.nextStep || "Belum ada keputusan final"
      }
    ];
  }

  if (primaryRole === "dosen_pembimbing") {
    return [
      {
        label: "Mahasiswa Bimbingan",
        value: total,
        description: "Data bimbingan yang bisa Anda lihat"
      },
      {
        label: "Menunggu Konfirmasi",
        value: countStatus(workflows, "DIAJUKAN"),
        description: "Bimbingan perlu dikonfirmasi"
      },
      {
        label: "Siap Seminar Hasil",
        value: countAction(workflows, "APPROVE_MAJU_SEMHAS"),
        description: "Memenuhi syarat bimbingan"
      },
      {
        label: "Workflow Aktif",
        value: active,
        description: "Belum selesai"
      }
    ];
  }

  if (primaryRole === "dosen_penguji") {
    return [
      {
        label: "Sidang Saya",
        value: total,
        description: "Workflow yang melibatkan Anda"
      },
      {
        label: "Perlu Nilai",
        value: countAction(workflows, "INPUT_NILAI_SIDANG"),
        description: "Menunggu input nilai"
      },
      {
        label: "Perlu Hasil",
        value:
          countAction(workflows, "INPUT_HASIL_SIDANG") +
          countAction(workflows, "INPUT_KEPUTUSAN_AKHIR"),
        description: "Menunggu keputusan/hasil"
      },
      {
        label: "Revisi Review",
        value: countAction(workflows, "APPROVE_REVISI_SEMHAS"),
        description: "Revisi perlu ditinjau"
      }
    ];
  }

  if (primaryRole === "staf_prodi") {
    return [
      {
        label: "Workflow Dipantau",
        value: total,
        description: "Data monitoring akademik"
      },
      {
        label: "Menunggu Berkas",
        value: countStatus(workflows, "MENUNGGU_BERKAS"),
        description: "Butuh dokumen mahasiswa"
      },
      {
        label: "Menunggu Jadwal",
        value: countStatus(workflows, "MENUNGGU_JADWAL"),
        description: "Belum dijadwalkan"
      },
      {
        label: "Jadwal Terdekat",
        value: getUpcomingSchedules(workflows).length,
        description: "Agenda mendatang"
      }
    ];
  }

  return [
    {
      label: "Workflow Aktif",
      value: active,
      description: "Belum selesai"
    },
    {
      label: "Menunggu Penguji",
      value: countStatus(workflows, "MENUNGGU_PENGUJI"),
      description: "Perlu assign penguji"
    },
    {
      label: "Menunggu Jadwal",
      value: countStatus(workflows, "MENUNGGU_JADWAL"),
      description: "Perlu dibuat jadwal"
    },
    {
      label: "Menunggu Nilai",
      value: countStatus(workflows, "MENUNGGU_NILAI"),
      description: "Perlu input nilai"
    }
  ];
}

export default function DashboardHome() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const primaryRole = getPrimaryRole(roles);

  const workflowQuery = useQuery<WorkflowListResponse>({
    queryKey: ["dashboard-home", "workflow", primaryRole],
    queryFn: () =>
      getWorkflowSkripsiList({
        limit: 100
      })
  });

  const workflows = workflowQuery.data?.data ?? [];
  const metrics = useMemo(
    () => getMetrics(workflows, primaryRole),
    [workflows, primaryRole]
  );
  const upcomingSchedules = useMemo(
    () => getUpcomingSchedules(workflows).slice(0, 5),
    [workflows]
  );

  const primaryWorkflow = workflows[0] ?? null;
  const currentStage = primaryWorkflow ? getCurrentStage(primaryWorkflow) : null;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={roleLabels[primaryRole] || "Dashboard"}
        title="Ringkasan Akademik"
        description={getDashboardDescription(primaryRole)}
        action={
          <ActionGroup align="end" compact>
            <Link to="/app/workflow-sidang" className="primary-button">
              Workflow Sidang
            </Link>
            <Link to="/app/progress" className="secondary-button">
              Progress
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

      <div className="dashboard-grid-2">
        <SectionCard
          title="Posisi Workflow"
          description="Tahap terakhir dan langkah berikutnya berdasarkan data workflow."
          action={
            <Link to="/app/workflow-sidang" className="secondary-button">
              Lihat Detail
            </Link>
          }
        >
          {workflowQuery.isLoading ? (
            <EmptyState title="Memuat workflow..." description="Mohon tunggu sebentar." />
          ) : primaryWorkflow ? (
            <div className="workflow-progress-card">
              <div className="workflow-progress-head">
                <div>
                  <p className="eyebrow">
                    {primaryWorkflow.skripsi.mahasiswa?.identifier || "-"}
                  </p>
                  <h2>{primaryWorkflow.skripsi.title || "Tanpa judul"}</h2>
                  <p className="muted">
                    {primaryWorkflow.skripsi.mahasiswa?.name || "-"}
                  </p>
                </div>

                <StatusBadge
                  value={primaryWorkflow.finalStatus || primaryWorkflow.summaryStatus}
                  size="md"
                />
              </div>

              <div className="workflow-progress-track">
                <span style={{ width: `${primaryWorkflow.progressPercent}%` }} />
              </div>

              <div className="workflow-mini-row">
                <div>
                  <strong>{currentStage?.label || primaryWorkflow.currentStageLabel}</strong>
                  <span>{primaryWorkflow.nextStep}</span>
                </div>
                <strong>{primaryWorkflow.progressPercent}%</strong>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Belum ada workflow"
              description="Data akan muncul setelah pengajuan skripsi dibuat."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Agenda Terdekat"
          description="Jadwal sidang yang relevan dengan role Anda."
          action={
            <Link to="/app/workflow-dashboard" className="secondary-button">
              Dashboard Workflow
            </Link>
          }
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
                mobilePriority: "meta",
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
            isLoading={workflowQuery.isLoading}
            compact
            minWidth={720}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Workflow Terbaru"
        description="Daftar ringkas data yang sesuai dengan akses role Anda."
      >
        <DataTable<WorkflowItem>
          data={workflows.slice(0, 8)}
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
          emptyMessage="Belum ada data workflow"
          isLoading={workflowQuery.isLoading}
          minWidth={920}
        />
      </SectionCard>
    </section>
  );
}
