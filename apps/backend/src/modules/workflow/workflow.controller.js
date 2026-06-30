import { getUserRoles } from "../rbac/rbac.service.js";
import {
  getWorkflowActionsForUser,
  getWorkflowDetailForUser,
  getWorkflowListForUser
} from "./workflow.service.js";

export async function getWorkflowSkripsiList(req, res, next) {
  try {
    const roles = await getUserRoles(req.user.id);
    const {
      search = "",
      page = "1",
      limit = "20",
      stage = "",
      status = ""
    } = req.query;

    const result = await getWorkflowListForUser({
      userId: req.user.id,
      roles,
      search,
      page,
      limit,
      stage,
      status
    });

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
}

export async function getWorkflowSkripsiDetail(req, res, next) {
  try {
    const roles = await getUserRoles(req.user.id);
    const { skripsiId } = req.params;

    const data = await getWorkflowDetailForUser({
      userId: req.user.id,
      roles,
      skripsiId
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Workflow skripsi tidak ditemukan atau Anda tidak memiliki akses"
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function getWorkflowSkripsiActions(req, res, next) {
  try {
    const roles = await getUserRoles(req.user.id);
    const { skripsiId } = req.params;

    const data = await getWorkflowActionsForUser({
      userId: req.user.id,
      roles,
      skripsiId
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Workflow skripsi tidak ditemukan atau Anda tidak memiliki akses"
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}
