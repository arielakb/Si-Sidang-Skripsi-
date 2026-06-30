import { api } from "./api";

export type WorkflowStageKey =
  | "SEMINAR_PROPOSAL"
  | "BIMBINGAN"
  | "SEMINAR_HASIL"
  | "SIDANG_KOMPRE"
  | "SIDANG_AKHIR"
  | "SELESAI";

export type WorkflowSidangJenis =
  | "SEMINAR_PROPOSAL"
  | "SEMINAR_HASIL"
  | "SIDANG_KOMPRE"
  | "SIDANG_AKHIR";

export type WorkflowStageKind = "SIDANG" | "BIMBINGAN";

export type WorkflowActionKey =
  | "UPLOAD_BERKAS"
  | "ASSIGN_PENGUJI"
  | "BUAT_JADWAL"
  | "INPUT_NILAI_SIDANG"
  | "INPUT_HASIL_SIDANG"
  | "INPUT_KEPUTUSAN_AKHIR"
  | "UPLOAD_SURAT_PERJANJIAN"
  | "UPLOAD_REVISI_SEMHAS"
  | "APPROVE_REVISI_SEMHAS"
  | "DAFTAR_ULANG_SEMPRO"
  | "ASSIGN_PEMBIMBING"
  | "APPROVE_MAJU_SEMHAS";

export type WorkflowActionType = "FORM" | "UPLOAD" | "LINK";

export type WorkflowHttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type WorkflowUser = {
  id: string;
  identifier?: string | null;
  name?: string | null;
  email?: string | null;
  status?: string | null;
};

export type WorkflowBerkas = {
  id: string;
  skripsiId?: string | null;
  sidangId?: string | null;
  kategori: string;
  status?: string | null;
  originalName?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  path?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  uploadedById?: string | null;
  uploadedBy?: WorkflowUser | null;
  reviewedBy?: WorkflowUser | null;
};

export type WorkflowRuang = {
  id?: string;
  code?: string | null;
  name?: string | null;
  capacity?: number | null;
  location?: string | null;
  status?: string | null;
};

export type WorkflowJadwal = {
  id: string;
  sidangId?: string | null;
  ruangId?: string | null;
  tanggal?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  tempatManual?: string | null;
  linkVicon?: string | null;
  status?: string | null;
  ruang?: WorkflowRuang | null;
  dibuatOleh?: WorkflowUser | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WorkflowSidangDosen = {
  id: string;
  sidangId: string;
  dosenId: string;
  peran: string;
  isActive: boolean;
  assignedAt?: string | null;
  dosen?: WorkflowUser | null;
  assignedBy?: WorkflowUser | null;
};

export type WorkflowNilai = {
  id: string;
  sidangId?: string | null;
  skripsiId?: string | null;
  dosenId?: string | null;
  komponen?: string | null;
  nilai?: number | string | null;
  catatan?: string | null;
  dosen?: WorkflowUser | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WorkflowRevisi = {
  id: string;
  sidangId?: string | null;
  skripsiId?: string | null;
  status?: string | null;
  catatan?: string | null;
  deadline?: string | null;
  dibuatOleh?: WorkflowUser | null;
  approvedBy?: WorkflowUser | null;
  berkas?: WorkflowBerkas | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WorkflowSidang = {
  id: string;
  skripsiId: string;
  jenis: WorkflowSidangJenis;
  attemptNo: number;
  status: string;
  hasil?: string | null;
  catatanHasil?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  decidedAt?: string | null;
  createdBy?: WorkflowUser | null;
  decidedBy?: WorkflowUser | null;
  dosen?: WorkflowSidangDosen[];
  jadwalSidang?: WorkflowJadwal[];
  berkas?: WorkflowBerkas[];
  nilaiSidang?: WorkflowNilai[];
  revisi?: WorkflowRevisi[];
};

export type WorkflowPembimbing = {
  id: string;
  skripsiId: string;
  dosenId: string;
  peran?: string | null;
  isActive: boolean;
  assignedAt?: string | null;
  dosen?: WorkflowUser | null;
};

export type WorkflowBimbinganLog = {
  id: string;
  skripsiId: string;
  mahasiswaId?: string | null;
  dosenId?: string | null;
  status?: string | null;
  topik?: string | null;
  catatanMahasiswa?: string | null;
  catatanDosen?: string | null;
  tanggal?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  mahasiswa?: WorkflowUser | null;
  dosen?: WorkflowUser | null;
};

export type WorkflowSkripsi = {
  id: string;
  mahasiswaId: string;
  title?: string | null;
  tahap?: string | null;
  status?: string | null;
  selesaiAt?: string | null;
  seminarApprovedAt?: string | null;
  finalApprovedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  mahasiswa?: WorkflowUser | null;
  peminatan?: {
    id?: string;
    name?: string | null;
    code?: string | null;
  } | null;
  jenisSkripsi?: {
    id?: string;
    name?: string | null;
    code?: string | null;
  } | null;
  dosenSkripsi?: WorkflowPembimbing[];
  sidang?: WorkflowSidang[];
  bimbinganLogs?: WorkflowBimbinganLog[];
  berkas?: WorkflowBerkas[];
  suratPerjanjian?: Array<{
    id: string;
    skripsiId?: string | null;
    berkasId?: string | null;
    uploadedById?: string | null;
    createdAt?: string | null;
    berkas?: WorkflowBerkas | null;
    uploadedBy?: WorkflowUser | null;
  }>;
};

export type WorkflowAction = {
  key: WorkflowActionKey;
  label: string;
  type?: WorkflowActionType;
  endpoint?: string;
  method?: WorkflowHttpMethod;
  stageKey?: WorkflowStageKey;
  stageLabel?: string;
  sidangId?: string;
  skripsiId?: string;
  jenis?: WorkflowSidangJenis;
  kategori?: string;
  minPenguji?: number;
  minPembimbing?: number;
  nextAttemptNo?: number;
  options?: string[];
  [key: string]: unknown;
};

export type WorkflowStage = {
  key: WorkflowStageKey;
  label: string;
  kind: WorkflowStageKind;
  status: string;
  hasil?: string | null;
  attemptNo?: number | null;
  sidang?: WorkflowSidang | null;
  jadwal?: WorkflowJadwal | null;
  requiredBerkas?: string[];
  missingBerkas?: string[];
  berkas?: WorkflowBerkas[];
  penguji?: WorkflowSidangDosen[];
  minPenguji?: number;
  nilai?: WorkflowNilai[];
  nilaiCount?: number;
  revisi?: WorkflowRevisi[];
  revisiCount?: number;
  latestRevisi?: WorkflowRevisi | null;
  hasApprovedRevisi?: boolean;
  requiresNilai?: boolean;
  hasNilai?: boolean;
  isComplete: boolean;
  progress?: {
    validCount: number;
    requiredCount: number;
    totalCount: number;
    percent: number;
  };
  pembimbing?: WorkflowPembimbing[];
  bimbinganLogs?: WorkflowBimbinganLog[];
  actions: WorkflowAction[];
};

export type WorkflowItem = {
  skripsi: WorkflowSkripsi;
  currentStage: WorkflowStageKey;
  currentStageLabel: string;
  summaryStatus: string;
  progressPercent: number;
  nextStep: string;
  finalStatus?: string | null;
  stages: WorkflowStage[];
  actions: WorkflowAction[];
  meta?: {
    stageOrder?: WorkflowStageKey[];
    sidangJenisOrder?: WorkflowSidangJenis[];
    rules?: {
      maxSemproAttempt?: number;
      maxKompreAttempt?: number;
      minBimbinganValid?: number;
      minPembimbing?: number;
      [key: string]: unknown;
    };
  };
};

export type GetWorkflowListParams = {
  search?: string;
  page?: number;
  limit?: number;
  stage?: string;
  status?: string;
};

export type WorkflowListResponse = {
  success: boolean;
  data: WorkflowItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WorkflowDetailResponse = {
  success: boolean;
  data: WorkflowItem;
};

export type WorkflowActionsResponse = {
  success: boolean;
  data: {
    skripsiId: string;
    currentStage: WorkflowStageKey;
    currentStageLabel: string;
    summaryStatus: string;
    progressPercent: number;
    nextStep: string;
    actions: WorkflowAction[];
  };
};

export type SubmitWorkflowActionPayload = Record<string, unknown>;

export async function getWorkflowSkripsiList(
  params: GetWorkflowListParams = {}
) {
  const response = await api.get<WorkflowListResponse>("/workflow/skripsi", {
    params
  });

  return response.data;
}

export async function getWorkflowSkripsiDetail(skripsiId: string) {
  const response = await api.get<WorkflowDetailResponse>(
    `/workflow/skripsi/${skripsiId}`
  );

  return response.data.data;
}

export async function getWorkflowSkripsiActions(skripsiId: string) {
  const response = await api.get<WorkflowActionsResponse>(
    `/workflow/skripsi/${skripsiId}/actions`
  );

  return response.data.data;
}

export async function submitWorkflowAction(
  action: WorkflowAction,
  payload: SubmitWorkflowActionPayload = {}
) {
  if (!action.endpoint) {
    throw new Error("Workflow action endpoint tidak tersedia");
  }

  const method = String(action.method || "POST").toLowerCase();

  if (method === "post") {
    const response = await api.post(action.endpoint, payload);
    return response.data;
  }

  if (method === "patch") {
    const response = await api.patch(action.endpoint, payload);
    return response.data;
  }

  if (method === "put") {
    const response = await api.put(action.endpoint, payload);
    return response.data;
  }

  if (method === "delete") {
    const response = await api.delete(action.endpoint, {
      data: payload
    });
    return response.data;
  }

  const response = await api.get(action.endpoint, {
    params: payload
  });

  return response.data;
}

export async function uploadWorkflowActionFile(
  action: WorkflowAction,
  file: File
) {
  if (!action.endpoint) {
    throw new Error("Workflow upload endpoint tidak tersedia");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(action.endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
}

export function findWorkflowStage(
  workflow: WorkflowItem | null | undefined,
  key: WorkflowStageKey
) {
  return workflow?.stages?.find((stage) => stage.key === key) ?? null;
}

export function findWorkflowAction(
  workflow: WorkflowItem | null | undefined,
  key: WorkflowActionKey
) {
  return workflow?.actions?.find((action) => action.key === key) ?? null;
}

export function stageHasAction(
  stage: WorkflowStage | null | undefined,
  key: WorkflowActionKey
) {
  return Boolean(stage?.actions?.some((action) => action.key === key));
}

export function getWorkflowStudentLabel(workflow: WorkflowItem) {
  const mahasiswa = workflow.skripsi?.mahasiswa;

  return `${mahasiswa?.identifier || "-"} • ${mahasiswa?.name || "-"}`;
}

export function getWorkflowTitle(workflow: WorkflowItem) {
  return workflow.skripsi?.title || "Tanpa judul";
}
