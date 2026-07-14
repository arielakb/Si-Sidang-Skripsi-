import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ActionGroup from "../../components/ui/ActionGroup";
import DataTable from "../../components/ui/DataTable";
import DetailPanel from "../../components/ui/DetailPanel";
import EmptyState from "../../components/ui/EmptyState";
import FileDownloadButton from "../../components/FileDownloadButton";
import FilterToolbar from "../../components/ui/FilterToolbar";
import SectionCard from "../../components/ui/SectionCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getDosenPengujiOptions, type DosenOption } from "../../services/sidang";
import {
  getWorkflowSkripsiList,
  submitWorkflowAction,
  uploadWorkflowActionFile,
  type WorkflowAction,
  type WorkflowItem,
  type WorkflowStage
} from "../../services/workflow";
import { getRuang } from "../../services/masterData";

const WORKFLOW_TABS = [
  { label: "Semua", value: "ALL" },
  { label: "Seminar Proposal", value: "SEMINAR_PROPOSAL" },
  { label: "Bimbingan", value: "BIMBINGAN" },
  { label: "Seminar Hasil", value: "SEMINAR_HASIL" },
  { label: "Sidang Komprehensif", value: "SIDANG_KOMPRE" },
  { label: "Sidang Akhir", value: "SIDANG_AKHIR" },
  { label: "Selesai", value: "SELESAI" }
];

type ActionFormState = {
  hasil: string;
  catatanHasil: string;
  nilai: string;
  catatanNilai: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  tempatManual: string;
  ruangId: string;
  linkVicon: string;
  dosenIds: string[];
  file: File | null;
};

const emptyActionForm: ActionFormState = {
  hasil: "",
  catatanHasil: "",
  nilai: "",
  catatanNilai: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  tempatManual: "",
  ruangId: "",
  linkVicon: "",
  dosenIds: [],
  file: null
};

const managerActionKeys = new Set([
  "ASSIGN_PENGUJI",
  "BUAT_JADWAL",
  "ASSIGN_PEMBIMBING",
  "INPUT_KEPUTUSAN_AKHIR",
  "APPROVE_REVISI_SEMHAS"
]);

const pengujiActionKeys = new Set([
  "INPUT_NILAI_SIDANG",
  "INPUT_HASIL_SIDANG",
  "UPLOAD_SURAT_PERJANJIAN"
]);

const mahasiswaActionKeys = new Set([
  "UPLOAD_BERKAS",
  "UPLOAD_REVISI_SEMHAS",
  "DAFTAR_ULANG_SEMPRO",
  "UPLOAD_BERKAS_FINAL"
]);

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatStatus(value?: string | null) {
  if (!value) return "-";

  return value.replaceAll("_", " ");
}

function buildDateTimeValue(tanggal: string, waktu: string) {
  const cleanTanggal = String(tanggal || "").trim();
  const cleanWaktu = String(waktu || "").trim();

  if (!cleanTanggal || !cleanWaktu) return "";

  if (cleanWaktu.length === 5) {
    return `${cleanTanggal}T${cleanWaktu}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(cleanWaktu)) {
    return `${cleanTanggal}T${cleanWaktu}`;
  }

  if (cleanWaktu.includes("T")) {
    return cleanWaktu;
  }

  return `${cleanTanggal}T${cleanWaktu}`;
}

function getStageIcon(stage: WorkflowStage) {
  if (stage.isComplete) return "✓";
  if (stage.status && stage.status !== "BELUM_MULAI") return "●";
  return "○";
}

function getWorkflowSubtitle(workflow: WorkflowItem) {
  const mahasiswa = workflow.skripsi.mahasiswa;

  return `${mahasiswa?.identifier || "-"} • ${mahasiswa?.name || "-"}`;
}

function getWorkflowTitle(workflow: WorkflowItem) {
  return workflow.skripsi.title || "Tanpa judul";
}

function getLatestActionTarget(action: WorkflowAction) {
  if (action.jenis) return formatStatus(action.jenis);
  if (action.stageLabel) return action.stageLabel;
  return "Workflow";
}

function isPembimbingOption(option: DosenOption) {
  return option.userRoles?.some((item) =>
    ["dosen_pembimbing", "dosen_koordinator", "ketua_prodi"].includes(
      item.role.slug
    )
  );
}

function isPengujiOption(option: DosenOption) {
  return option.userRoles?.some((item) =>
    ["dosen_penguji", "dosen_pembimbing", "dosen_koordinator"].includes(
      item.role.slug
    )
  );
}

function getActionBucket(action: WorkflowAction) {
  if (managerActionKeys.has(action.key)) return "Koordinator / Kaprodi";
  if (pengujiActionKeys.has(action.key)) return "Dosen Penguji";
  if (mahasiswaActionKeys.has(action.key)) return "Mahasiswa";

  return "Workflow";
}

function getBerkasLabel(stage: WorkflowStage) {
  const totalRequired = stage.requiredBerkas?.length ?? 0;
  const missing = stage.missingBerkas?.length ?? 0;

  if (totalRequired === 0) return "Tidak ada berkas wajib";
  if (missing === 0) return "Lengkap";

  return `${totalRequired - missing}/${totalRequired} lengkap`;
}

function getPengujiLabel(stage: WorkflowStage) {
  const total = stage.penguji?.length ?? 0;
  const min = stage.minPenguji ?? 0;

  if (min === 0) return "Tidak membutuhkan penguji";
  return `${total}/${min} penguji`;
}

function getJadwalLabel(stage: WorkflowStage) {
  const jadwal = stage.jadwal;

  if (!jadwal) return "Belum dijadwalkan";

  const ruang = `${jadwal.ruang?.code || ""} ${jadwal.ruang?.name || ""
    }`.trim();

  return `${formatDateTime(jadwal.waktuMulai)} • ${ruang || jadwal.tempatManual || "Tempat manual / online"
    }`;
}

function getActionButtonLabel(action: WorkflowAction) {
  if (action.key === "UPLOAD_BERKAS") {
    return `Upload ${formatStatus(String(action.kategori || "Berkas"))}`;
  }

  if (action.key === "UPLOAD_REVISI_SEMHAS") {
    return "Upload Revisi Semhas";
  }

  if (action.key === "UPLOAD_BERKAS_FINAL") {
    return "Upload Berkas Final / Revisi Akhir";
  }

  if (action.key === "APPROVE_REVISI_SEMHAS") {
    return "Setujui Revisi Semhas";
  }

  return action.label || formatStatus(action.key);
}

export default function WorkflowSidangPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSkripsiId, setSelectedSkripsiId] = useState<string | null>(
    null
  );
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(
    null
  );
  const [detailActiveTab, setDetailActiveTab] = useState<string | null>(null);
  const [form, setForm] = useState<ActionFormState>(emptyActionForm);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const workflowQuery = useQuery({
    queryKey: [
      "workflow",
      "skripsi",
      search,
      page,
      limit,
      stageFilter,
      statusFilter
    ],
    queryFn: () =>
      getWorkflowSkripsiList({
        search,
        page,
        limit,
        stage: stageFilter === "ALL" ? undefined : stageFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter
      })
  });

  const dosenQuery = useQuery({
    queryKey: ["workflow", "dosen-options"],
    queryFn: getDosenPengujiOptions,
    enabled: Boolean(selectedAction?.key === "ASSIGN_PENGUJI" || selectedAction?.key === "ASSIGN_PEMBIMBING")
  });

  const ruangQuery = useQuery({
    queryKey: ["workflow", "ruang-options"],
    queryFn: () => getRuang({ includeInactive: false }),
    enabled: selectedAction?.key === "BUAT_JADWAL"
  });

  const workflows = workflowQuery.data?.data ?? [];
  const workflowMeta = workflowQuery.data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1
  };
  const selectedWorkflow = useMemo(() => {
    if (!workflows.length) return null;

    return (
      workflows.find((item) => item.skripsi.id === selectedSkripsiId) ??
      workflows[0]
    );
  }, [selectedSkripsiId, workflows]);

  const availableActions = selectedWorkflow?.actions ?? [];

  const dosenOptions = useMemo(() => {
    const options = dosenQuery.data ?? [];

    if (selectedAction?.key === "ASSIGN_PEMBIMBING") {
      return options.filter(isPembimbingOption);
    }

    if (selectedAction?.key === "ASSIGN_PENGUJI") {
      return options.filter(isPengujiOption);
    }

    return options;
  }, [dosenQuery.data, selectedAction?.key]);

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, statusFilter, limit]);

  useEffect(() => {
    if (workflows.length === 0) {
      setSelectedSkripsiId(null);
      setSelectedAction(null);
      return;
    }

    const selectedStillExists = workflows.some(
      (item) => item.skripsi.id === selectedSkripsiId
    );

    if (!selectedSkripsiId || !selectedStillExists) {
      setSelectedSkripsiId(workflows[0].skripsi.id);
      setSelectedAction(null);
    }
  }, [selectedSkripsiId, workflows]);

  useEffect(() => {
    if (selectedWorkflow) {
      if (stageFilter !== "ALL") {
        const hasStage = selectedWorkflow.stages.some(
          (s) => s.key === stageFilter
        );
        if (hasStage) {
          setDetailActiveTab(stageFilter);
          return;
        }
      }

      const current =
        selectedWorkflow.stages.find((s) => !s.isComplete) ||
        selectedWorkflow.stages[selectedWorkflow.stages.length - 1];
      if (current) {
        setDetailActiveTab(current.key);
      }
    }
  }, [selectedWorkflow?.skripsi.id, stageFilter, selectedWorkflow]);

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAction) {
        throw new Error("Action belum dipilih");
      }

      if (selectedAction.type === "UPLOAD") {
        if (!form.file) {
          throw new Error("File wajib dipilih");
        }

        return uploadWorkflowActionFile(selectedAction, form.file);
      }

      if (selectedAction.key === "ASSIGN_PENGUJI") {
        return submitWorkflowAction(selectedAction, {
          dosenIds: form.dosenIds
        });
      }

      if (selectedAction.key === "ASSIGN_PEMBIMBING") {
        return submitWorkflowAction(selectedAction, {
          dosenIds: form.dosenIds
        });
      }

      if (selectedAction.key === "BUAT_JADWAL") {
        return submitWorkflowAction(selectedAction, {
          tanggal: form.tanggal,
          waktuMulai: buildDateTimeValue(form.tanggal, form.waktuMulai),
          waktuSelesai: buildDateTimeValue(form.tanggal, form.waktuSelesai),
          tempatManual: form.tempatManual || null,
          linkVicon: form.linkVicon || null,
          ruangId: form.ruangId || null
        });
      }

      if (selectedAction.key === "INPUT_NILAI_SIDANG") {
        return submitWorkflowAction(selectedAction, {
          nilai: Number(form.nilai),
          catatan: form.catatanNilai
        });
      }

      if (
        selectedAction.key === "INPUT_HASIL_SIDANG" ||
        selectedAction.key === "INPUT_KEPUTUSAN_AKHIR"
      ) {
        return submitWorkflowAction(selectedAction, {
          hasil: form.hasil,
          catatanHasil: form.catatanHasil
        });
      }

      if (selectedAction.key === "DAFTAR_ULANG_SEMPRO") {
        return submitWorkflowAction(selectedAction, {
          skripsiId: selectedAction.skripsiId
        });
      }

      if (selectedAction.key === "APPROVE_REVISI_SEMHAS") {
        return submitWorkflowAction(selectedAction, {
          status: "DISETUJUI"
        });
      }

      return submitWorkflowAction(selectedAction, {});
    },
    onSuccess: () => {
      setFeedback({
        tone: "success",
        message: "Aksi workflow berhasil diproses."
      });
      setSelectedAction(null);
      setForm(emptyActionForm);

      queryClient.invalidateQueries({
        queryKey: ["workflow", "skripsi"]
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Aksi workflow gagal diproses.";

      setFeedback({
        tone: "error",
        message
      });
    }
  });

  function openAction(action: WorkflowAction) {
    setSelectedAction(action);
    setFeedback(null);
    setForm({
      ...emptyActionForm,
      hasil: String(action.options?.[0] || "")
    });
  }

  function toggleDosen(dosenId: string) {
    setForm((current) => {
      const exists = current.dosenIds.includes(dosenId);

      return {
        ...current,
        dosenIds: exists
          ? current.dosenIds.filter((id) => id !== dosenId)
          : [...current.dosenIds, dosenId]
      };
    });
  }

  function renderActionForm() {
    if (!selectedAction) {
      return (
        <EmptyState
          title="Pilih aksi workflow"
          description="Tombol action akan muncul otomatis sesuai role dan status tahap."
        />
      );
    }

    const isDosenPicker =
      selectedAction.key === "ASSIGN_PENGUJI" ||
      selectedAction.key === "ASSIGN_PEMBIMBING";

    return (
      <div className="workflow-action-form">
        <div className="workflow-action-form-head">
          <div>
            <p className="eyebrow">{getActionBucket(selectedAction)}</p>
            <h3>{selectedAction.label}</h3>
            <p className="muted">
              Target: {getLatestActionTarget(selectedAction)}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSelectedAction(null);
              setForm(emptyActionForm);
            }}
          >
            Batal
          </button>
        </div>

        {selectedAction.type === "UPLOAD" ? (
          <label className="form-field">
            <span>File PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null
                }))
              }
            />
          </label>
        ) : null}

        {isDosenPicker ? (
          <div className="workflow-dosen-picker">
            <div className="form-field">
              <span>
                Pilih Dosen{" "}
                {selectedAction.key === "ASSIGN_PEMBIMBING"
                  ? "Pembimbing"
                  : "Penguji"}
              </span>
              <small className="muted">
                Minimal:{" "}
                {selectedAction.key === "ASSIGN_PEMBIMBING"
                  ? selectedAction.minPembimbing || 1
                  : selectedAction.minPenguji || 1}
              </small>
            </div>

            {dosenQuery.isLoading ? (
              <p className="muted">Memuat dosen...</p>
            ) : dosenOptions.length === 0 ? (
              <p className="muted">Belum ada dosen yang dapat dipilih.</p>
            ) : (
              <div className="workflow-check-grid">
                {dosenOptions.map((dosen) => (
                  <label key={dosen.id} className="workflow-check-card">
                    <input
                      type="checkbox"
                      checked={form.dosenIds.includes(dosen.id)}
                      onChange={() => toggleDosen(dosen.id)}
                    />
                    <span>
                      <strong>{dosen.name}</strong>
                      <small>{dosen.identifier}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {selectedAction.key === "BUAT_JADWAL" ? (
          <div className="workflow-form-grid">
            <label className="form-field">
              <span>Tanggal</span>
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tanggal: event.target.value
                  }))
                }
              />
            </label>

            <label className="form-field">
              <span>Waktu Mulai</span>
              <input
                type="time"
                value={form.waktuMulai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    waktuMulai: event.target.value
                  }))
                }
              />
            </label>

            <label className="form-field">
              <span>Waktu Selesai</span>
              <input
                type="time"
                value={form.waktuSelesai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    waktuSelesai: event.target.value
                  }))
                }
              />
            </label>

            <label className="form-field">
              <span>Ruang Sidang</span>
              <select
                value={form.ruangId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruangId: event.target.value
                  }))
                }
              >
                <option value="">Pilih ruang (atau isi manual di bawah)</option>
                {ruangQuery.data?.map((ruang) => (
                  <option key={ruang.id} value={ruang.id}>
                    {ruang.code} - {ruang.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Tempat Manual</span>
              <input
                value={form.tempatManual}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tempatManual: event.target.value
                  }))
                }
                placeholder="Contoh: Ruang Sidang TI / Online"
              />
            </label>

            <label className="form-field workflow-form-wide">
              <span>Link Vicon</span>
              <input
                value={form.linkVicon}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    linkVicon: event.target.value
                  }))
                }
                placeholder="Opsional"
              />
            </label>
          </div>
        ) : null}

        {selectedAction.key === "INPUT_NILAI_SIDANG" ? (
          <div className="workflow-form-grid">
            <label className="form-field">
              <span>Nilai</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.nilai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nilai: event.target.value
                  }))
                }
                placeholder="0 - 100"
              />
            </label>

            <label className="form-field workflow-form-wide">
              <span>Catatan Nilai</span>
              <textarea
                value={form.catatanNilai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    catatanNilai: event.target.value
                  }))
                }
                placeholder="Catatan nilai sidang"
                rows={4}
              />
            </label>
          </div>
        ) : null}

        {selectedAction.key === "INPUT_HASIL_SIDANG" ||
          selectedAction.key === "INPUT_KEPUTUSAN_AKHIR" ? (
          <div className="workflow-form-grid">
            <label className="form-field">
              <span>Hasil</span>
              <select
                value={form.hasil}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    hasil: event.target.value
                  }))
                }
              >
                {(selectedAction.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {formatStatus(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field workflow-form-wide">
              <span>Catatan</span>
              <textarea
                value={form.catatanHasil}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    catatanHasil: event.target.value
                  }))
                }
                placeholder="Catatan hasil / keputusan"
                rows={4}
              />
            </label>
          </div>
        ) : null}

        {selectedAction.key === "DAFTAR_ULANG_SEMPRO" ? (
          <div className="alert-warning">
            Sistem akan membuat attempt Seminar Proposal baru untuk mahasiswa ini.
          </div>
        ) : null}

        {selectedAction.key === "APPROVE_MAJU_SEMHAS" ? (
          <div className="alert-warning">
            Sistem akan membuat tahap Seminar Hasil setelah jumlah bimbingan
            valid memenuhi syarat.
          </div>
        ) : null}

        <button
          type="button"
          className="primary-button"
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate()}
        >
          {actionMutation.isPending ? "Memproses..." : "Proses Aksi"}
        </button>
      </div>
    );
  }



  const currentPage = workflowMeta.page || page;
  const currentLimit = workflowMeta.limit || limit;
  const totalRows = workflowMeta.total || 0;
  const totalPages = Math.max(workflowMeta.totalPages || 1, 1);

  const workflowTableColumns = [
    {
      key: "mahasiswa",
      header: "Mahasiswa",
      mobilePriority: "title" as const,
      render: (workflow: WorkflowItem) => (
        <div className="table-title-cell workflow-table-title">
          <strong>{workflow.skripsi.mahasiswa?.name || "-"}</strong>
          <span>{workflow.skripsi.mahasiswa?.identifier || "-"}</span>
        </div>
      )
    },
    {
      key: "judul",
      header: "Judul / Next Step",
      mobilePriority: "subtitle" as const,
      render: (workflow: WorkflowItem) => (
        <div className="table-title-cell workflow-table-title">
          <strong>{getWorkflowTitle(workflow)}</strong>
          <span>{workflow.nextStep}</span>
        </div>
      )
    },
    {
      key: "tahap",
      header: "Tahap",
      align: "center" as const,
      mobilePriority: "body" as const,
      render: (workflow: WorkflowItem) => (
        <StatusBadge value={workflow.currentStageLabel} size="sm" />
      )
    },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      mobilePriority: "meta" as const,
      render: (workflow: WorkflowItem) => (
        <StatusBadge value={workflow.summaryStatus} size="sm" />
      )
    },
    {
      key: "progress",
      header: "Progress",
      align: "center" as const,
      render: (workflow: WorkflowItem) => (
        <div className="workflow-progress-cell">
          <strong>{workflow.progressPercent}%</strong>
          <div className="workflow-mini-progress">
            <span
              style={{
                width: `${workflow.progressPercent}%`
              }}
            />
          </div>
        </div>
      )
    },
    {
      key: "actions",
      header: "Action Cepat",
      render: (workflow: WorkflowItem) => {
        const primaryActions = workflow.actions.slice(0, 2);

        if (primaryActions.length === 0) {
          return <span className="muted">Tidak ada action</span>;
        }

        return (
          <ActionGroup compact>
            {primaryActions.map((action, index) => (
              <button
                key={`${workflow.skripsi.id}-${action.key}-${index}`}
                type="button"
                className="workflow-action-chip"
                onClick={() => {
                  setSelectedSkripsiId(workflow.skripsi.id);
                  openAction(action);
                }}
              >
                {getActionButtonLabel(action)}
              </button>
            ))}

            {workflow.actions.length > 2 ? (
              <span className="workflow-action-more">
                +{workflow.actions.length - 2}
              </span>
            ) : null}
          </ActionGroup>
        );
      }
    },
    {
      key: "detail",
      header: "Detail",
      align: "right" as const,
      mobilePriority: "body" as const,
      render: (workflow: WorkflowItem) => (
        <button
          type="button"
          className={
            selectedWorkflow?.skripsi.id === workflow.skripsi.id
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() => {
            setSelectedSkripsiId(workflow.skripsi.id);
            setSelectedAction(null);
          }}
        >
          Detail
        </button>
      )
    }
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow Akademik"
        title="Workflow Sidang"
        description="Kelola seluruh proses akademik dalam satu halaman: daftar workflow, action sesuai role, timeline tahap, dan detail sidang."
      />

      <div className="workflow-tabs workflow-tabs-global">
        {WORKFLOW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`workflow-tab ${stageFilter === tab.value ? "active" : ""}`}
            onClick={() => setStageFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback ? (
        <div
          className={
            feedback.tone === "success" ? "alert-success" : "alert-error"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <SectionCard
        title="Daftar Workflow"
        description="Data sudah difilter oleh backend sesuai role. Gunakan pencarian dan filter untuk menemukan mahasiswa, tahap, atau status tertentu."
        action={
          <div className="workflow-v2-count">
            <strong>{totalRows}</strong>
            <span>data</span>
          </div>
        }
        className="workflow-v2-card"
      >
        <FilterToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Judul, mahasiswa, NPM, email..."
          meta={
            <span>
              Halaman <strong>{currentPage}</strong> dari{" "}
              <strong>{totalPages}</strong>
            </span>
          }
        >
          <label className="filter-field">
            <span>Tahap</span>
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="ALL">Semua Tahap</option>
              <option value="SEMINAR_PROPOSAL">Seminar Proposal</option>
              <option value="BIMBINGAN">Bimbingan</option>
              <option value="SEMINAR_HASIL">Seminar Hasil</option>
              <option value="SIDANG_KOMPRE">Sidang Kompre</option>
              <option value="SIDANG_AKHIR">Sidang Akhir</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </label>

          <label className="filter-field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU_BERKAS">Menunggu Berkas</option>
              <option value="MENUNGGU_PENGUJI">Menunggu Penguji</option>
              <option value="MENUNGGU_JADWAL">Menunggu Jadwal</option>
              <option value="DIJADWALKAN">Dijadwalkan</option>
              <option value="MENUNGGU_NILAI">Menunggu Nilai</option>
              <option value="MENUNGGU_KEPUTUSAN">Menunggu Keputusan</option>
              <option value="MENUNGGU_REVISI">Menunggu Revisi</option>
              <option value="SELESAI">Selesai</option>
              <option value="LULUS_SKRIPSI">Lulus Skripsi</option>
              <option value="TIDAK_LULUS_SKRIPSI">Tidak Lulus Skripsi</option>
            </select>
          </label>
        </FilterToolbar>

        <DataTable
          data={workflows}
          columns={workflowTableColumns}
          emptyMessage="Belum ada workflow"
          getRowKey={(workflow) => workflow.skripsi.id}
          isLoading={workflowQuery.isLoading}
          loadingMessage="Memuat workflow..."
          minWidth={980}
          mobileTitle={(workflow) => workflow.skripsi.mahasiswa?.name || "-"}
          mobileSubtitle={(workflow) => getWorkflowTitle(workflow)}
          mobileMeta={(workflow) => (
            <StatusBadge value={workflow.summaryStatus} size="sm" />
          )}
          pagination={{
            page: currentPage,
            pageSize: currentLimit,
            total: totalRows,
            onPageChange: setPage,
            onPageSizeChange: (nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            },
            itemLabel: "workflow"
          }}
        />
      </SectionCard>

      {!selectedWorkflow ? (
        <SectionCard>
          <EmptyState
            title="Pilih workflow"
            description="Pilih salah satu data pada tabel untuk melihat detail timeline dan action."
          />
        </SectionCard>
      ) : (
        <div className="workflow-detail-grid-v2 workflow-detail-grid-polished">
          <div className="workflow-detail-main">
            <SectionCard className="workflow-summary-card">
              <div className="workflow-summary-head">
                <div>
                  <p className="eyebrow">{getWorkflowSubtitle(selectedWorkflow)}</p>
                  <h2>{getWorkflowTitle(selectedWorkflow)}</h2>
                  <p className="muted">{selectedWorkflow.nextStep}</p>
                </div>

                <div className="workflow-summary-status">
                  <StatusBadge value={selectedWorkflow.summaryStatus} />
                  <strong>{selectedWorkflow.progressPercent}%</strong>
                </div>
              </div>

              <div className="workflow-progress-track">
                <span
                  style={{
                    width: `${selectedWorkflow.progressPercent}%`
                  }}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Timeline Workflow"
              description="Tahap utama ditampilkan berurutan dari Seminar Proposal sampai Sidang Akhir."
              className="workflow-timeline-card"
            >
              <div className="workflow-detail-tabs">
                {selectedWorkflow.stages.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    className={`workflow-detail-tab ${detailActiveTab === stage.key ? "active" : ""
                      } ${stage.isComplete ? "completed" : ""}`}
                    onClick={() => setDetailActiveTab(stage.key)}
                  >
                    <span className="tab-icon">{getStageIcon(stage)}</span>
                    <span className="tab-label">{stage.label}</span>
                  </button>
                ))}
              </div>

              <div className="workflow-stage-list">
                {selectedWorkflow.stages
                  .filter((stage) => stage.key === detailActiveTab)
                  .map((stage) => (
                    <article key={stage.key} className="workflow-stage-card">
                      <div className="workflow-stage-icon">{getStageIcon(stage)}</div>

                      <div className="workflow-stage-body">
                        <div className="workflow-stage-head">
                          <div>
                            <h3>{stage.label}</h3>
                            <p className="muted">
                              {stage.attemptNo
                                ? `Attempt ${stage.attemptNo}`
                                : stage.kind === "BIMBINGAN"
                                  ? "Tahap bimbingan"
                                  : "Belum ada attempt"}
                            </p>
                          </div>

                          <div className="workflow-stage-badges">
                            <StatusBadge value={stage.status} size="sm" />
                            {stage.hasil ? (
                              <StatusBadge value={stage.hasil} size="sm" />
                            ) : null}
                          </div>
                        </div>

                        <div className="workflow-stage-meta">
                          {stage.kind === "SIDANG" ? (
                            <>
                              <span>Berkas: {getBerkasLabel(stage)}</span>
                              <span>Penguji: {getPengujiLabel(stage)}</span>
                              <span>Jadwal: {getJadwalLabel(stage)}</span>
                              {stage.requiresNilai ? (
                                <span>
                                  Nilai:{" "}
                                  {stage.nilaiCount ?? stage.nilai?.length ?? 0}{" "}
                                  input
                                </span>
                              ) : null}
                              {stage.key === "SEMINAR_HASIL" &&
                                stage.hasil === "REVISI" ? (
                                <span>
                                  Revisi:{" "}
                                  {formatStatus(
                                    stage.latestRevisi?.status ||
                                    "MENUNGGU_DIAJUKAN"
                                  )}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <span>
                                Bimbingan valid: {stage.progress?.validCount ?? 0}/
                                {stage.progress?.requiredCount ?? 0}
                              </span>
                              <span>
                                Total log: {stage.progress?.totalCount ?? 0}
                              </span>
                              <span>
                                Pembimbing: {stage.pembimbing?.length ?? 0}
                              </span>
                            </>
                          )}
                        </div>

                        {stage.missingBerkas?.length ? (
                          <div className="workflow-chip-row">
                            {stage.missingBerkas.map((kategori) => (
                              <span key={kategori} className="workflow-chip">
                                Kurang {formatStatus(kategori)}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {stage.berkas?.length ? (
                          <div className="workflow-mini-list">
                            {stage.berkas.map((berkas) => (
                              <div key={berkas.id} className="workflow-mini-row">
                                <div>
                                  <strong>{formatStatus(berkas.kategori)}</strong>
                                  <span>
                                    {berkas.originalName || berkas.fileName || "Berkas"}
                                  </span>
                                </div>
                                <FileDownloadButton
                                  berkasId={berkas.id}
                                  fileName={berkas.originalName || berkas.fileName || "berkas.pdf"}
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {stage.revisi?.length ? (
                          <div className="workflow-mini-list">
                            {stage.revisi.map((revisi) => (
                              <div key={revisi.id} className="workflow-mini-row">
                                <div>
                                  <strong>Revisi Seminar Hasil</strong>
                                  <span>
                                    {formatStatus(revisi.status || "-")}
                                    {revisi.berkas?.originalName
                                      ? ` • ${revisi.berkas.originalName}`
                                      : ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {stage.penguji?.length ? (
                          <div className="workflow-mini-list">
                            {stage.penguji.map((item) => (
                              <div key={item.id} className="workflow-mini-row">
                                <div>
                                  <strong>{item.dosen?.name || item.dosenId}</strong>
                                  <span>{formatStatus(item.peran)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {stage.actions?.length ? (
                          <ActionGroup compact>
                            {stage.actions.map((action, index) => (
                              <button
                                key={`${stage.key}-${action.key}-${index}`}
                                type="button"
                                className="secondary-button"
                                onClick={() => openAction(action)}
                              >
                                {getActionButtonLabel(action)}
                              </button>
                            ))}
                          </ActionGroup>
                        ) : null}
                      </div>
                    </article>
                  ))}
              </div>
            </SectionCard>
          </div>

          <aside className="workflow-action-sidebar">
            <SectionCard
              title="Action Sesuai Role"
              description="Action dikirim dari backend sesuai role dan status tahap."
              className="workflow-actions-card"
            >
              {availableActions.length === 0 ? (
                <EmptyState
                  title="Tidak ada action saat ini"
                  description="Tahap sedang menunggu role lain atau sudah selesai."
                />
              ) : (
                <div className="workflow-action-list">
                  {availableActions.map((action, index) => (
                    <button
                      key={`${action.key}-${action.sidangId || action.skripsiId}-${index}`}
                      type="button"
                      className={`workflow-action-button ${selectedAction === action ? "active" : ""
                        }`}
                      onClick={() => openAction(action)}
                    >
                      <span>{getActionBucket(action)}</span>
                      <strong>{getActionButtonLabel(action)}</strong>
                      <small>{getLatestActionTarget(action)}</small>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </aside>
        </div>
      )}

      <DetailPanel
        open={Boolean(selectedAction)}
        title={selectedAction?.label || "Form Action"}
        subtitle={
          selectedAction
            ? `${getActionBucket(selectedAction)} • ${getLatestActionTarget(
              selectedAction
            )}`
            : undefined
        }
        width="lg"
        onClose={() => {
          setSelectedAction(null);
          setForm(emptyActionForm);
        }}
      >
        {renderActionForm()}
      </DetailPanel>

      <style>{`
        .workflow-v2-card {
          display: grid;
          gap: 1rem;
        }

        .workflow-v2-head,
        .workflow-summary-head,
        .workflow-stage-head,
        .workflow-action-form-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }

        .workflow-v2-head h2,
        .workflow-summary-card h2,
        .workflow-stage-card h3,
        .workflow-action-form h3 {
          margin: 0.2rem 0;
        }

        .workflow-v2-count {
          display: grid;
          justify-items: end;
          gap: 0.15rem;
          color: var(--muted);
        }

        .workflow-v2-count strong {
          color: var(--primary);
          font-size: 1.8rem;
        }

        .workflow-filter-grid {
          display: grid;
          grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(160px, 0.7fr));
          gap: 0.75rem;
          align-items: end;
        }

        .workflow-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
        }

        .workflow-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 940px;
        }

        .workflow-table th,
        .workflow-table td {
          padding: 0.85rem;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
          text-align: left;
        }

        .workflow-table th {
          color: var(--muted);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: color-mix(in srgb, var(--primary) 5%, transparent);
        }

        .workflow-table tbody tr {
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .workflow-table tbody tr:hover,
        .workflow-table tbody tr.active {
          background: color-mix(in srgb, var(--primary) 7%, transparent);
        }

        .workflow-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .workflow-table-title {
          display: grid;
          gap: 0.2rem;
          min-width: 0;
        }

        .workflow-table-title strong {
          max-width: 360px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .workflow-table-title span,
        .workflow-stage-meta span,
        .workflow-mini-row span,
        .workflow-action-button span,
        .workflow-action-button small {
          color: var(--muted);
        }

        .workflow-progress-cell {
          display: grid;
          gap: 0.35rem;
          min-width: 120px;
        }

        .workflow-action-chip-list,
        .workflow-stage-badges,
        .workflow-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .workflow-action-chip {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.35rem 0.55rem;
          background: var(--surface);
          color: var(--primary);
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
        }

        .workflow-action-chip:hover {
          border-color: var(--primary);
        }

        .workflow-action-more,
        .workflow-chip {
          display: inline-flex;
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          color: var(--muted);
          background: color-mix(in srgb, var(--primary) 8%, transparent);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .workflow-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          color: var(--muted);
          flex-wrap: wrap;
        }

        .workflow-pagination-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .workflow-detail-grid-v2 {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.36fr);
          gap: 1rem;
          align-items: start;
        }

        .workflow-detail-main,
        .workflow-action-sidebar,
        .workflow-summary-card,
        .workflow-action-form,
        .workflow-dosen-picker,
        .workflow-stage-list,
        .workflow-action-list,
        .workflow-mini-list {
          display: grid;
          gap: 1rem;
        }

        .workflow-action-sidebar {
          position: sticky;
          top: 1rem;
        }

        .workflow-summary-card {
          min-width: 0;
        }

        .workflow-summary-status {
          display: grid;
          gap: 0.5rem;
          justify-items: end;
        }

        .workflow-summary-status strong {
          color: var(--primary);
          font-size: 1.4rem;
        }

        .workflow-mini-progress,
        .workflow-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary) 10%, var(--surface));
        }

        .workflow-mini-progress span,
        .workflow-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--primary), var(--accent));
        }

        .workflow-action-button,
        .workflow-stage-card,
        .workflow-check-card {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 16px;
        }

        .workflow-action-button {
          display: grid;
          gap: 0.35rem;
          width: 100%;
          padding: 0.85rem;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .workflow-action-button:hover,
        .workflow-action-button.active {
          border-color: var(--primary);
        }

        .workflow-form-grid,
        .workflow-check-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .workflow-form-wide {
          grid-column: 1 / -1;
        }

        .workflow-check-card {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.75rem;
          cursor: pointer;
        }

        .workflow-check-card span {
          display: grid;
          gap: 0.15rem;
        }

        .workflow-check-card small {
          color: var(--muted);
        }

        .workflow-stage-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 1rem;
          padding: 1rem;
        }

        .workflow-stage-icon {
          display: inline-flex;
          width: 2.1rem;
          height: 2.1rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          font-weight: 900;
        }

        .workflow-stage-body {
          display: grid;
          gap: 0.75rem;
          min-width: 0;
        }

        .workflow-stage-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .workflow-stage-badges {
          justify-content: flex-end;
        }

        .workflow-mini-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.65rem;
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .workflow-mini-row > div {
          display: grid;
          gap: 0.2rem;
        }

        @media (max-width: 1180px) {
          .workflow-filter-grid,
          .workflow-detail-grid-v2,
          .workflow-form-grid,
          .workflow-check-grid {
            grid-template-columns: 1fr;
          }

          .workflow-action-sidebar {
            position: static;
          }

          .workflow-v2-head,
          .workflow-summary-head,
          .workflow-stage-head,
          .workflow-action-form-head {
            flex-direction: column;
          }

          .workflow-summary-status,
          .workflow-v2-count {
            justify-items: start;
          }

          .workflow-stage-badges {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .workflow-table-wrap {
            border: 0;
            overflow: visible;
          }

          .workflow-table,
          .workflow-table thead,
          .workflow-table tbody,
          .workflow-table th,
          .workflow-table td,
          .workflow-table tr {
            display: block;
            min-width: 0;
          }

          .workflow-table thead {
            display: none;
          }

          .workflow-table tr {
            border: 1px solid var(--border);
            border-radius: 18px;
            margin-bottom: 0.75rem;
            background: var(--surface);
            overflow: hidden;
          }

          .workflow-table td {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            border-bottom: 1px solid var(--border);
          }

          .workflow-table td::before {
            content: attr(data-label);
            color: var(--muted);
            font-weight: 800;
            min-width: 94px;
          }

          .workflow-table td:last-child {
            border-bottom: 0;
          }

          .workflow-table-title strong {
            max-width: 190px;
            white-space: normal;
          }

          .workflow-pagination,
          .workflow-pagination-actions,
          .workflow-stage-card,
          .workflow-mini-row {
            align-items: stretch;
          }

          .workflow-pagination,
          .workflow-pagination-actions,
          .workflow-stage-card,
          .workflow-mini-row {
            flex-direction: column;
          }

          .workflow-stage-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </section>
  );
}
