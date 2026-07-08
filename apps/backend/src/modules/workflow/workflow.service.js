import { prisma } from "../../config/prisma.js";

const SIDANG_JENIS_ORDER = [
  "SEMINAR_PROPOSAL",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

const WORKFLOW_STAGE_ORDER = [
  "SEMINAR_PROPOSAL",
  "BIMBINGAN",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

const STAGE_LABELS = {
  SEMINAR_PROPOSAL: "Seminar Proposal",
  BIMBINGAN: "Bimbingan",
  SEMINAR_HASIL: "Seminar Hasil",
  SIDANG_KOMPRE: "Sidang Kompre",
  SIDANG_AKHIR: "Sidang Akhir"
};

const DEFAULT_REQUIRED_BERKAS = {
  SEMINAR_PROPOSAL: ["PROPOSAL", "PRESENTASI"],
  SEMINAR_HASIL: ["SIDANG_SOFTCOPY", "SIDANG_PRESENTASI"],
  SIDANG_KOMPRE: [],
  SIDANG_AKHIR: ["FINAL_SKRIPSI"]
};

const FINISHED_SIDANG_STATUSES = ["SELESAI", "DIBATALKAN"];

const ACTIVE_SIDANG_STATUSES = [
  "DRAFT",
  "MENUNGGU_BERKAS",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_JADWAL",
  "DIJADWALKAN",
  "BERLANGSUNG",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN"
];

const JADWAL_READY_STATUSES = [
  "DIJADWALKAN",
  "BERLANGSUNG",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN"
];

function hasAnyRole(roles, candidates) {
  return roles.some((role) => candidates.includes(role));
}

function isReadAllRole(roles) {
  return hasAnyRole(roles, [
    "admin",
    "ketua_prodi",
    "dosen_koordinator",
    "staf_prodi"
  ]);
}

function isAcademicManager(roles) {
  return hasAnyRole(roles, ["admin", "ketua_prodi", "dosen_koordinator"]);
}

function canInputAsManager(roles) {
  return hasAnyRole(roles, ["admin", "ketua_prodi", "dosen_koordinator"]);
}

function userSelect() {
  return {
    id: true,
    identifier: true,
    name: true,
    email: true,
    status: true
  };
}

function workflowInclude() {
  return {
    mahasiswa: {
      select: userSelect()
    },
    peminatan: true,
    jenisSkripsi: true,
    dosenSkripsi: {
      where: {
        isActive: true
      },
      include: {
        dosen: {
          select: userSelect()
        }
      },
      orderBy: {
        assignedAt: "desc"
      }
    },
    sidang: {
      include: {
        createdBy: {
          select: userSelect()
        },
        decidedBy: {
          select: userSelect()
        },
        dosen: {
          where: {
            isActive: true
          },
          include: {
            dosen: {
              select: userSelect()
            },
            assignedBy: {
              select: userSelect()
            }
          },
          orderBy: {
            assignedAt: "asc"
          }
        },
        jadwalSidang: {
          include: {
            ruang: true,
            dibuatOleh: {
              select: userSelect()
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        berkas: {
          include: {
            uploadedBy: {
              select: userSelect()
            },
            reviewedBy: {
              select: userSelect()
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        nilaiSidang: {
          include: {
            dosen: {
              select: userSelect()
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        revisi: {
          include: {
            dibuatOleh: {
              select: userSelect()
            },
            approvedBy: {
              select: userSelect()
            },
            berkas: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [
        {
          jenis: "asc"
        },
        {
          attemptNo: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    },
    bimbinganLogs: {
      include: {
        mahasiswa: {
          select: userSelect()
        },
        dosen: {
          select: userSelect()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    },
    berkas: {
      include: {
        uploadedBy: {
          select: userSelect()
        },
        reviewedBy: {
          select: userSelect()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    },
    suratPerjanjian: {
      include: {
        berkas: true,
        uploadedBy: {
          select: userSelect()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }
  };
}

export async function getWorkflowRulesMap() {
  const rules = await prisma.workflowRule.findMany({
    where: {
      isActive: true
    }
  });

  const map = new Map();

  for (const rule of rules) {
    map.set(`${rule.stageCode}:${rule.ruleKey}`, rule.ruleValue);
  }

  return map;
}

function getRuleString(rulesMap, stageCode, ruleKey, fallbackValue = "") {
  return rulesMap.get(`${stageCode}:${ruleKey}`) ?? fallbackValue;
}

function getRuleInt(rulesMap, stageCode, ruleKey, fallbackValue) {
  const value = Number(getRuleString(rulesMap, stageCode, ruleKey, fallbackValue));

  if (Number.isNaN(value)) return fallbackValue;

  return value;
}

function getRuleStringList(rulesMap, stageCode, ruleKey, fallbackValue = []) {
  if (!rulesMap.has(`${stageCode}:${ruleKey}`)) {
    return fallbackValue;
  }

  const value = getRuleString(rulesMap, stageCode, ruleKey, "");

  if (!String(value).trim()) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAccessWhere(userId, roles) {
  if (isReadAllRole(roles)) {
    return {};
  }

  return {
    OR: [
      {
        mahasiswaId: userId
      },
      {
        dosenSkripsi: {
          some: {
            dosenId: userId,
            isActive: true
          }
        }
      },
      {
        sidang: {
          some: {
            dosen: {
              some: {
                dosenId: userId,
                isActive: true
              }
            }
          }
        }
      }
    ]
  };
}

function buildSearchWhere(search) {
  const keyword = String(search ?? "").trim();

  if (!keyword) return {};

  return {
    OR: [
      {
        title: {
          contains: keyword,
          mode: "insensitive"
        }
      },
      {
        mahasiswa: {
          name: {
            contains: keyword,
            mode: "insensitive"
          }
        }
      },
      {
        mahasiswa: {
          identifier: {
            contains: keyword,
            mode: "insensitive"
          }
        }
      },
      {
        mahasiswa: {
          email: {
            contains: keyword,
            mode: "insensitive"
          }
        }
      }
    ]
  };
}

function getLatestSidangByJenis(sidangRows, jenis) {
  return [...(sidangRows ?? [])]
    .filter((item) => item.jenis === jenis)
    .sort((a, b) => {
      const attemptDiff = Number(b.attemptNo ?? 0) - Number(a.attemptNo ?? 0);

      if (attemptDiff !== 0) return attemptDiff;

      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    })[0] ?? null;
}

function getLatestJadwal(sidang) {
  return sidang?.jadwalSidang?.[0] ?? null;
}

function getActivePembimbing(skripsi) {
  return (skripsi.dosenSkripsi ?? []).filter(
    (item) => item.peran === "PEMBIMBING" && item.isActive
  );
}

function getValidBimbinganCount(skripsi) {
  return (skripsi.bimbinganLogs ?? []).filter(
    (item) => item.status === "DIVALIDASI"
  ).length;
}

function getBimbinganSummary(skripsi, rulesMap) {
  const requiredCount = getRuleInt(
    rulesMap,
    "BIMBINGAN",
    "MIN_BIMBINGAN_VALID",
    8
  );

  const validCount = getValidBimbinganCount(skripsi);
  const totalCount = (skripsi.bimbinganLogs ?? []).length;
  const pembimbing = getActivePembimbing(skripsi);

  return {
    requiredCount,
    validCount,
    totalCount,
    canRequestSeminarHasil: validCount >= requiredCount,
    pembimbing
  };
}

function getRequiredBerkasForSidang(jenis, rulesMap) {
  return getRuleStringList(
    rulesMap,
    jenis,
    "REQUIRED_BERKAS",
    DEFAULT_REQUIRED_BERKAS[jenis] ?? []
  );
}

function getUploadedKategori(sidang) {
  return new Set(
    (sidang?.berkas ?? [])
      .filter((berkas) => berkas.status !== "DITOLAK")
      .map((berkas) => berkas.kategori)
  );
}

function getMissingBerkas(sidang, requiredBerkas) {
  const uploadedKategori = getUploadedKategori(sidang);

  return requiredBerkas.filter((kategori) => !uploadedKategori.has(kategori));
}

function getAssignedPenguji(sidang) {
  return (sidang?.dosen ?? []).filter(
    (item) =>
      item.isActive &&
      ["PENGUJI", "KETUA_PENGUJI"].includes(item.peran)
  );
}

function hasActiveSidang(skripsi, jenis) {
  return (skripsi.sidang ?? []).some(
    (item) => item.jenis === jenis && ACTIVE_SIDANG_STATUSES.includes(item.status)
  );
}

function isSidangPengujiForUser(sidang, userId) {
  return getAssignedPenguji(sidang).some((item) => item.dosenId === userId);
}

function action(key, label, payload = {}) {
  return {
    key,
    label,
    ...payload
  };
}

function isMahasiswaOwner(skripsi, userId) {
  return skripsi.mahasiswaId === userId;
}

function isActivePembimbingForUser(skripsi, userId) {
  return getActivePembimbing(skripsi).some((item) => item.dosenId === userId);
}

function canManageSidangForRole(roles) {
  return isAcademicManager(roles);
}

function canInputSidangForUser(sidang, userId, roles) {
  if (!sidang) return false;

  if (canInputAsManager(roles)) return true;

  if (!hasAnyRole(roles, ["dosen_penguji"])) return false;

  return isSidangPengujiForUser(sidang, userId);
}

function sidangRequiresNilai(jenis) {
  return ["SEMINAR_HASIL", "SIDANG_KOMPRE"].includes(jenis);
}

function getNilaiRows(sidang) {
  return sidang?.nilaiSidang ?? [];
}

function hasAnyNilai(sidang) {
  return getNilaiRows(sidang).length > 0;
}

function hasNilaiFromUser(sidang, userId) {
  return getNilaiRows(sidang).some((item) => item.dosenId === userId);
}

function getRevisiRows(sidang) {
  return sidang?.revisi ?? [];
}

function getLatestRevisi(sidang) {
  return getRevisiRows(sidang)[0] ?? null;
}

function hasApprovedRevisi(sidang) {
  return getRevisiRows(sidang).some((revisi) => revisi.status === "DISETUJUI");
}

function hasPendingRevisiReview(sidang) {
  return getRevisiRows(sidang).some((revisi) => revisi.status === "DIAJUKAN");
}

function canUploadRevisiSemhas(sidang, mahasiswaOwner) {
  if (!mahasiswaOwner) return false;
  if (sidang?.jenis !== "SEMINAR_HASIL") return false;
  if (sidang?.hasil !== "REVISI") return false;
  if (hasApprovedRevisi(sidang)) return false;
  if (hasPendingRevisiReview(sidang)) return false;

  return true;
}

function canApproveRevisiSemhas(sidang, userId, roles) {
  if (sidang?.jenis !== "SEMINAR_HASIL") return false;
  if (sidang?.hasil !== "REVISI") return false;
  if (hasApprovedRevisi(sidang)) return false;
  if (!hasPendingRevisiReview(sidang)) return false;

  return canInputSidangForUser(sidang, userId, roles);
}

function buildSidangActions({
  skripsi,
  sidang,
  jenis,
  userId,
  roles,
  rulesMap,
  maxAttempt
}) {
  const actions = [];

  if (!sidang) {
    return actions;
  }

  const isFinished = FINISHED_SIDANG_STATUSES.includes(sidang.status);
  const requiredBerkas = getRequiredBerkasForSidang(jenis, rulesMap);
  const missingBerkas = getMissingBerkas(sidang, requiredBerkas);
  const assignedPenguji = getAssignedPenguji(sidang);
  const minPenguji = getRuleInt(
    rulesMap,
    jenis,
    "MIN_PENGUJI",
    jenis === "SIDANG_AKHIR" ? 2 : 2
  );
  const hasJadwal = Boolean(getLatestJadwal(sidang));
  const mahasiswaOwner = isMahasiswaOwner(skripsi, userId);
  const requiresNilai = sidangRequiresNilai(jenis);
  const nilaiCount = getNilaiRows(sidang).length;
  const hasNilai = nilaiCount > 0;
  const userHasInputNilai = hasNilaiFromUser(sidang, userId);

  if (
    mahasiswaOwner &&
    !isFinished &&
    missingBerkas.length > 0
  ) {
    for (const kategori of missingBerkas) {
      actions.push(
        action("UPLOAD_BERKAS", `Upload ${kategori.replaceAll("_", " ")}`, {
          type: "UPLOAD",
          endpoint: `/sidang/${sidang.id}/berkas/${kategori}`,
          method: "POST",
          sidangId: sidang.id,
          skripsiId: skripsi.id,
          jenis,
          kategori
        })
      );
    }
  }

  if (
    canManageSidangForRole(roles) &&
    !isFinished &&
    missingBerkas.length === 0 &&
    assignedPenguji.length < minPenguji
  ) {
    actions.push(
      action("ASSIGN_PENGUJI", `Assign Penguji ${STAGE_LABELS[jenis]}`, {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/assign-penguji`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        minPenguji
      })
    );
  }

  if (
    canManageSidangForRole(roles) &&
    !isFinished &&
    missingBerkas.length === 0 &&
    assignedPenguji.length >= minPenguji &&
    !hasJadwal
  ) {
    actions.push(
      action("BUAT_JADWAL", `Buat Jadwal ${STAGE_LABELS[jenis]}`, {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/jadwal`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis
      })
    );
  }

  if (
    requiresNilai &&
    !sidang.hasil &&
    JADWAL_READY_STATUSES.includes(sidang.status) &&
    isSidangPengujiForUser(sidang, userId) &&
    !userHasInputNilai
  ) {
    actions.push(
      action("INPUT_NILAI_SIDANG", `Input Nilai ${STAGE_LABELS[jenis]}`, {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/nilai`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis
      })
    );
  }

  if (
    jenis !== "SIDANG_AKHIR" &&
    !sidang.hasil &&
    JADWAL_READY_STATUSES.includes(sidang.status) &&
    canInputSidangForUser(sidang, userId, roles) &&
    (!requiresNilai || hasNilai)
  ) {
    actions.push(
      action("INPUT_HASIL_SIDANG", `Input Hasil ${STAGE_LABELS[jenis]}`, {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/hasil`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        options: ["LOLOS", "TIDAK_LOLOS", "REVISI", "ULANG"]
      })
    );
  }

  if (
    jenis === "SIDANG_AKHIR" &&
    !sidang.hasil &&
    JADWAL_READY_STATUSES.includes(sidang.status) &&
    canInputSidangForUser(sidang, userId, roles)
  ) {
    actions.push(
      action("INPUT_KEPUTUSAN_AKHIR", "Input Keputusan Akhir", {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/hasil`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        options: ["LULUS", "TIDAK_LULUS"]
      })
    );
  }

  if (
    jenis === "SIDANG_AKHIR" &&
    sidang.hasil === "LULUS" &&
    mahasiswaOwner
  ) {
    const hasFinalBerkas = skripsi.berkas?.some(
      (b) => b.kategori === "BERKAS_FINAL" || b.kategori === "REVISI_AKHIR"
    );

    if (!hasFinalBerkas) {
      actions.push(
        action("UPLOAD_BERKAS_FINAL", "Upload Berkas Final", {
          type: "UPLOAD",
          endpoint: `/sidang/${sidang.id}/upload-berkas-final`,
          method: "POST",
          sidangId: sidang.id,
          skripsiId: skripsi.id,
          jenis,
          kategori: "BERKAS_FINAL"
        })
      );
    }
  }

  if (
    jenis === "SEMINAR_PROPOSAL" &&
    sidang.hasil === "LOLOS" &&
    (isSidangPengujiForUser(sidang, userId) || canManageSidangForRole(roles)) &&
    !(skripsi.suratPerjanjian ?? []).length
  ) {
    actions.push(
      action("UPLOAD_SURAT_PERJANJIAN", "Upload Surat Perjanjian Skripsi", {
        type: "UPLOAD",
        endpoint: `/sidang/${sidang.id}/upload-surat-perjanjian`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        kategori: "SURAT_PERJANJIAN"
      })
    );
  }

  if (canUploadRevisiSemhas(sidang, mahasiswaOwner)) {
    actions.push(
      action("UPLOAD_REVISI_SEMHAS", "Upload Revisi Seminar Hasil", {
        type: "UPLOAD",
        endpoint: `/sidang/${sidang.id}/revisi/upload`,
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        kategori: "REVISI_SIDANG"
      })
    );
  }

  if (canApproveRevisiSemhas(sidang, userId, roles)) {
    const latestRevisi = getLatestRevisi(sidang);

    actions.push(
      action("APPROVE_REVISI_SEMHAS", "Setujui Revisi Seminar Hasil", {
        type: "FORM",
        endpoint: `/sidang/${sidang.id}/revisi/${latestRevisi.id}/approve`,
        method: "PATCH",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        revisiId: latestRevisi.id
      })
    );
  }

  if (
    jenis === "SEMINAR_PROPOSAL" &&
    mahasiswaOwner &&
    ["TIDAK_LOLOS", "ULANG", "REVISI"].includes(String(sidang.hasil ?? "")) &&
    Number(sidang.attemptNo ?? 0) < maxAttempt &&
    !hasActiveSidang(skripsi, "SEMINAR_PROPOSAL")
  ) {
    actions.push(
      action("DAFTAR_ULANG_SEMPRO", "Daftar Ulang Seminar Proposal", {
        type: "FORM",
        endpoint: "/sidang/seminar-proposal/register",
        method: "POST",
        sidangId: sidang.id,
        skripsiId: skripsi.id,
        jenis,
        nextAttemptNo: Number(sidang.attemptNo ?? 0) + 1
      })
    );
  }

  return actions;
}

function buildBimbinganActions({
  skripsi,
  latestSempro,
  latestSemhas,
  userId,
  roles,
  bimbinganSummary,
  minPembimbing
}) {
  const actions = [];

  const semproLolos = latestSempro?.hasil === "LOLOS";
  const hasPembimbingEnough = bimbinganSummary.pembimbing.length >= minPembimbing;

  if (
    semproLolos &&
    isAcademicManager(roles) &&
    !["LULUS_SKRIPSI", "TIDAK_LULUS_SKRIPSI", "SELESAI"].includes(skripsi.status) &&
    !hasPembimbingEnough
  ) {
    actions.push(
      action("ASSIGN_PEMBIMBING", "Assign Pembimbing", {
        type: "FORM",
        endpoint: `/skripsi/${skripsi.id}/assign-pembimbing`,
        method: "POST",
        skripsiId: skripsi.id,
        minPembimbing
      })
    );
  }

  if (
    semproLolos &&
    hasPembimbingEnough &&
    bimbinganSummary.canRequestSeminarHasil &&
    isActivePembimbingForUser(skripsi, userId) &&
    !latestSemhas &&
    !hasActiveSidang(skripsi, "SEMINAR_HASIL")
  ) {
    actions.push(
      action("APPROVE_MAJU_SEMHAS", "Approve Maju Seminar Hasil", {
        type: "FORM",
        endpoint: `/bimbingan/skripsi/${skripsi.id}/approve-maju-sidang`,
        method: "PATCH",
        skripsiId: skripsi.id
      })
    );
  }

  return actions;
}

function buildSidangStage({
  skripsi,
  jenis,
  sidang,
  rulesMap,
  userId,
  roles,
  maxAttempt
}) {
  const requiredBerkas = getRequiredBerkasForSidang(jenis, rulesMap);
  const missingBerkas = sidang ? getMissingBerkas(sidang, requiredBerkas) : requiredBerkas;
  const assignedPenguji = getAssignedPenguji(sidang);
  const minPenguji = getRuleInt(
    rulesMap,
    jenis,
    "MIN_PENGUJI",
    jenis === "SIDANG_AKHIR" ? 2 : 2
  );

  return {
    key: jenis,
    label: STAGE_LABELS[jenis],
    kind: "SIDANG",
    status: sidang?.status ?? "BELUM_MULAI",
    hasil: sidang?.hasil ?? null,
    attemptNo: sidang?.attemptNo ?? null,
    sidang,
    jadwal: getLatestJadwal(sidang),
    requiredBerkas,
    missingBerkas,
    berkas: sidang?.berkas ?? [],
    penguji: assignedPenguji,
    minPenguji,
    nilai: sidang?.nilaiSidang ?? [],
    nilaiCount: sidang?.nilaiSidang?.length ?? 0,
    revisi: sidang?.revisi ?? [],
    revisiCount: sidang?.revisi?.length ?? 0,
    latestRevisi: getLatestRevisi(sidang),
    requiresNilai: sidangRequiresNilai(jenis),
    hasNilai: hasAnyNilai(sidang),
    hasApprovedRevisi: hasApprovedRevisi(sidang),
    isComplete:
      jenis === "SIDANG_AKHIR"
        ? Boolean(sidang?.hasil)
        : jenis === "SEMINAR_HASIL"
          ? sidang?.hasil === "LOLOS" || hasApprovedRevisi(sidang)
          : sidang?.hasil === "LOLOS",
    actions: buildSidangActions({
      skripsi,
      sidang,
      jenis,
      userId,
      roles,
      rulesMap,
      maxAttempt
    })
  };
}

function buildBimbinganStage({
  skripsi,
  latestSempro,
  latestSemhas,
  rulesMap,
  userId,
  roles
}) {
  const bimbinganSummary = getBimbinganSummary(skripsi, rulesMap);
  const minPembimbing = getRuleInt(rulesMap, "BIMBINGAN", "MIN_PEMBIMBING", 2);
  const semproLolos = latestSempro?.hasil === "LOLOS";

  let status = "BELUM_MULAI";

  if (semproLolos) {
    if (latestSemhas || bimbinganSummary.canRequestSeminarHasil) {
      status = "SIAP_MAJU_SEMHAS";
    } else {
      status = "BIMBINGAN";
    }
  }

  if (latestSemhas) {
    status = "SELESAI";
  }

  const actions = buildBimbinganActions({
    skripsi,
    latestSempro,
    latestSemhas,
    userId,
    roles,
    bimbinganSummary,
    minPembimbing
  });

  return {
    key: "BIMBINGAN",
    label: STAGE_LABELS.BIMBINGAN,
    kind: "BIMBINGAN",
    status,
    hasil: null,
    isComplete: Boolean(latestSemhas) || bimbinganSummary.canRequestSeminarHasil,
    progress: {
      validCount: bimbinganSummary.validCount,
      requiredCount: bimbinganSummary.requiredCount,
      totalCount: bimbinganSummary.totalCount,
      percent: Math.min(
        Math.round(
          (bimbinganSummary.validCount / Math.max(bimbinganSummary.requiredCount, 1)) * 100
        ),
        100
      )
    },
    pembimbing: bimbinganSummary.pembimbing,
    bimbinganLogs: skripsi.bimbinganLogs ?? [],
    actions
  };
}

function computeCurrentStage(stages) {
  const finalStage = stages.find((stage) => stage.key === "SIDANG_AKHIR");

  if (finalStage?.hasil) {
    return "SELESAI";
  }

  for (const stage of stages) {
    if (!stage.isComplete) {
      return stage.key;
    }
  }

  return "SELESAI";
}

function computeProgressPercent(stages) {
  const completed = stages.filter((stage) => stage.isComplete).length;

  return Math.round((completed / Math.max(stages.length, 1)) * 100);
}

function getNextStep(stages, currentStage) {
  const actionableStage = stages.find((stage) => stage.actions?.length > 0);

  if (actionableStage) {
    return actionableStage.actions[0].label;
  }

  if (currentStage === "SELESAI") {
    const finalStage = stages.find((stage) => stage.key === "SIDANG_AKHIR");

    if (finalStage?.hasil === "LULUS") return "Mahasiswa lulus skripsi";
    if (finalStage?.hasil === "TIDAK_LULUS") return "Mahasiswa tidak lulus skripsi";

    return "Workflow selesai";
  }

  const stage = stages.find((item) => item.key === currentStage);

  if (!stage) return "Menunggu proses berikutnya";

  if (stage.status === "MENUNGGU_BERKAS") return "Menunggu upload berkas";
  if (stage.status === "MENUNGGU_PENGUJI") return "Menunggu assign penguji";
  if (stage.status === "MENUNGGU_JADWAL") return "Menunggu jadwal";
  if (stage.status === "MENUNGGU_NILAI") return "Menunggu input nilai sidang";
  if (stage.status === "MENUNGGU_KEPUTUSAN") return "Menunggu input hasil sidang";
  if (stage.key === "SEMINAR_HASIL" && stage.hasil === "REVISI") {
    const latestRevisi = stage.latestRevisi;

    if (!latestRevisi || ["MENUNGGU_DIAJUKAN", "DITOLAK"].includes(String(latestRevisi.status || ""))) {
      return "Menunggu upload revisi Seminar Hasil";
    }

    if (latestRevisi.status === "DIAJUKAN") {
      return "Menunggu review revisi Seminar Hasil";
    }

    if (latestRevisi.status === "DISETUJUI") {
      return "Revisi disetujui, lanjut Sidang Kompre";
    }
  }
  if (stage.status === "DIJADWALKAN") {
    if (stage.requiresNilai && !stage.hasNilai) {
      return "Menunggu input nilai sidang";
    }

    return "Menunggu hasil sidang";
  }
  if (stage.status === "BIMBINGAN") return "Menunggu bimbingan valid";

  return "Menunggu proses berikutnya";
}

function getFinalStatus(stages) {
  const finalStage = stages.find((stage) => stage.key === "SIDANG_AKHIR");

  if (finalStage?.hasil === "LULUS") return "LULUS_SKRIPSI";
  if (finalStage?.hasil === "TIDAK_LULUS") return "TIDAK_LULUS_SKRIPSI";

  return null;
}

export function buildWorkflowPayload(skripsi, rulesMap, userId, roles) {
  const latestSempro = getLatestSidangByJenis(skripsi.sidang, "SEMINAR_PROPOSAL");
  const latestSemhas = getLatestSidangByJenis(skripsi.sidang, "SEMINAR_HASIL");
  const latestKompre = getLatestSidangByJenis(skripsi.sidang, "SIDANG_KOMPRE");
  const latestAkhir = getLatestSidangByJenis(skripsi.sidang, "SIDANG_AKHIR");

  const maxSemproAttempt = getRuleInt(
    rulesMap,
    "SEMINAR_PROPOSAL",
    "MAX_ATTEMPT",
    3
  );
  const maxKompreAttempt = getRuleInt(
    rulesMap,
    "SIDANG_KOMPRE",
    "MAX_ATTEMPT",
    3
  );

  const stages = [
    buildSidangStage({
      skripsi,
      jenis: "SEMINAR_PROPOSAL",
      sidang: latestSempro,
      rulesMap,
      userId,
      roles,
      maxAttempt: maxSemproAttempt
    }),
    buildBimbinganStage({
      skripsi,
      latestSempro,
      latestSemhas,
      rulesMap,
      userId,
      roles
    }),
    buildSidangStage({
      skripsi,
      jenis: "SEMINAR_HASIL",
      sidang: latestSemhas,
      rulesMap,
      userId,
      roles,
      maxAttempt: 1
    }),
    buildSidangStage({
      skripsi,
      jenis: "SIDANG_KOMPRE",
      sidang: latestKompre,
      rulesMap,
      userId,
      roles,
      maxAttempt: maxKompreAttempt
    }),
    buildSidangStage({
      skripsi,
      jenis: "SIDANG_AKHIR",
      sidang: latestAkhir,
      rulesMap,
      userId,
      roles,
      maxAttempt: 1
    })
  ];

  const currentStage = computeCurrentStage(stages);
  const progressPercent = computeProgressPercent(stages);
  const actions = stages.flatMap((stage) =>
    (stage.actions ?? []).map((stageAction) => ({
      ...stageAction,
      stageKey: stage.key,
      stageLabel: stage.label
    }))
  );

  return {
    skripsi,
    currentStage,
    currentStageLabel:
      currentStage === "SELESAI"
        ? "Selesai"
        : STAGE_LABELS[currentStage] ?? currentStage,
    summaryStatus: getFinalStatus(stages) ?? skripsi.status,
    progressPercent,
    nextStep: getNextStep(stages, currentStage),
    finalStatus: getFinalStatus(stages),
    stages,
    actions,
    meta: {
      stageOrder: WORKFLOW_STAGE_ORDER,
      sidangJenisOrder: SIDANG_JENIS_ORDER,
      rules: {
        maxSemproAttempt,
        maxKompreAttempt,
        minBimbinganValid: getRuleInt(
          rulesMap,
          "BIMBINGAN",
          "MIN_BIMBINGAN_VALID",
          8
        ),
        minPembimbing: getRuleInt(
          rulesMap,
          "BIMBINGAN",
          "MIN_PEMBIMBING",
          2
        )
      }
    }
  };
}


function matchesWorkflowFilters(workflow, { stage, status }) {
  const stageValue = String(stage ?? "").trim();
  const statusValue = String(status ?? "").trim();

  const stageOk =
    !stageValue ||
    stageValue === "ALL" ||
    workflow.currentStage === stageValue ||
    workflow.stages?.some(
      (item) =>
        item.key === stageValue &&
        (item.status !== "BELUM_MULAI" ||
          item.sidang ||
          item.progress?.totalCount > 0 ||
          item.progress?.validCount > 0)
    );

  const statusOk =
    !statusValue ||
    statusValue === "ALL" ||
    workflow.summaryStatus === statusValue ||
    workflow.finalStatus === statusValue ||
    workflow.skripsi?.status === statusValue ||
    workflow.stages?.some(
      (item) => item.status === statusValue || item.hasil === statusValue
    );

  return stageOk && statusOk;
}

export async function getWorkflowListForUser({
  userId,
  roles,
  search = "",
  page = 1,
  limit = 20,
  stage = "",
  status = ""
}) {
  const currentPage = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const accessWhere = buildAccessWhere(userId, roles);
  const searchWhere = buildSearchWhere(search);
  const where = {
    AND: [accessWhere, searchWhere].filter((item) => Object.keys(item).length > 0)
  };

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const rulesMap = await getWorkflowRulesMap();

  const skripsiRows = await prisma.skripsi.findMany({
    where,
    include: workflowInclude(),
    orderBy: {
      updatedAt: "desc"
    }
  });

  const filteredData = skripsiRows
    .map((skripsi) => buildWorkflowPayload(skripsi, rulesMap, userId, roles))
    .filter((workflow) =>
      matchesWorkflowFilters(workflow, {
        stage,
        status
      })
    );

  const total = filteredData.length;
  const data = filteredData.slice(skip, skip + pageSize);

  return {
    data,
    meta: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1)
    }
  };
}

export async function getWorkflowDetailForUser({
  userId,
  roles,
  skripsiId
}) {
  const accessWhere = buildAccessWhere(userId, roles);

  const skripsi = await prisma.skripsi.findFirst({
    where: {
      id: skripsiId,
      ...accessWhere
    },
    include: workflowInclude()
  });

  if (!skripsi) {
    return null;
  }

  const rulesMap = await getWorkflowRulesMap();

  return buildWorkflowPayload(skripsi, rulesMap, userId, roles);
}

export async function getWorkflowActionsForUser({
  userId,
  roles,
  skripsiId
}) {
  const detail = await getWorkflowDetailForUser({
    userId,
    roles,
    skripsiId
  });

  if (!detail) return null;

  return {
    skripsiId,
    currentStage: detail.currentStage,
    currentStageLabel: detail.currentStageLabel,
    summaryStatus: detail.summaryStatus,
    progressPercent: detail.progressPercent,
    nextStep: detail.nextStep,
    actions: detail.actions
  };
}
