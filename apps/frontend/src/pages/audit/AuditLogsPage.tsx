import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import FilterToolbar from "../../components/ui/FilterToolbar";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getAuditLogs, type AuditLogItem } from "../../services/auditLogs";

type DrawerMode = "detail" | null;

const methodOptions = ["POST", "PATCH", "PUT", "DELETE"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function getStatusLabel(statusCode?: number | null) {
  if (!statusCode) return "-";
  if (statusCode >= 200 && statusCode < 300) return "SUCCESS";
  if (statusCode >= 400 && statusCode < 500) return "CLIENT_ERROR";
  if (statusCode >= 500) return "SERVER_ERROR";

  return String(statusCode);
}

export default function AuditLogsPage() {
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const auditQuery = useQuery({
    queryKey: ["audit-logs", method, search],
    queryFn: () =>
      getAuditLogs({
        limit: 50,
        method: method || undefined,
        search: search || undefined
      })
  });

  const rows = auditQuery.data?.data ?? [];

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (!statusFilter) return true;

      const statusCode = item.statusCode ?? 0;

      if (statusFilter === "SUCCESS") {
        return statusCode >= 200 && statusCode < 300;
      }

      if (statusFilter === "ERROR") {
        return statusCode >= 400;
      }

      return true;
    });
  }, [rows, statusFilter]);

  function openDetailDrawer(item: AuditLogItem) {
    setSelectedLog(item);
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setSelectedLog(null);
    setDrawerMode(null);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Security"
        title="Audit Log"
        description="Riwayat aktivitas mutasi data seperti create, update, delete, upload, approval, dan finalisasi."
      />

      <section className="list-card audit-table-card">
        <DataTable
          data={filteredRows}
          isLoading={auditQuery.isLoading}
          emptyMessage="Belum ada audit log"
          toolbar={
            <FilterToolbar
              title="Audit Log"
              description="Monitor seluruh aktivitas penting yang terjadi di sistem Sisidang."
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari path/action, contoh: /api/finalisasi"
            >
              <div className="filter-field">
                <label>Method</label>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="">Semua Method</option>
                  {methodOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
            </FilterToolbar>
          }
          columns={[
            {
              key: "no",
              header: "No",
              align: "center",
              render: (_item, index) => index + 1
            },
            {
              key: "time",
              header: "Waktu",
              render: (item) => (
                <div className="table-title-cell">
                  <strong>{formatDate(item.createdAt)}</strong>
                  <span>{item.ip || "-"}</span>
                </div>
              )
            },
            {
              key: "method",
              header: "Method",
              align: "center",
              render: (item) => <StatusBadge value={item.method} size="sm" />
            },
            {
              key: "path",
              header: "Path",
              render: (item) => (
                <div className="table-title-cell">
                  <strong>{item.path}</strong>
                  <span>{item.action || "-"}</span>
                </div>
              )
            },
            {
              key: "user",
              header: "User",
              render: (item) => (
                <div className="table-title-cell">
                  <strong>{item.user?.name || "-"}</strong>
                  <span>{item.user?.identifier || item.user?.email || "-"}</span>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              render: (item) => (
                <div className="table-title-cell table-center-cell">
                  <StatusBadge value={getStatusLabel(item.statusCode)} size="sm" />
                  <span>{item.statusCode || "-"}</span>
                </div>
              )
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
      </section>

      {drawerMode === "detail" && selectedLog ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer audit-drawer" aria-label="Detail audit log">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Audit Detail</p>
                <h2>Detail Aktivitas</h2>
              </div>

              <button type="button" className="secondary-button" onClick={closeDrawer}>
                Tutup
              </button>
            </div>

            <div className="audit-detail-stack">
              <div className="skripsi-detail-title">
                <strong>
                  {selectedLog.method} {selectedLog.path}
                </strong>
                <StatusBadge value={getStatusLabel(selectedLog.statusCode)} />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Waktu</span>
                  <strong>{formatDate(selectedLog.createdAt)}</strong>
                </div>

                <div className="info-row">
                  <span>User</span>
                  <strong>{selectedLog.user?.name || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Identifier</span>
                  <strong>{selectedLog.user?.identifier || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Status Code</span>
                  <strong>{selectedLog.statusCode || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>IP Address</span>
                  <strong>{selectedLog.ip || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>User Agent</span>
                  <p>{selectedLog.userAgent || "-"}</p>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Request Body</h3>
                <pre className="debug-panel">{safeJson(selectedLog.requestBody)}</pre>
              </div>

              <div className="drawer-section">
                <h3>Params</h3>
                <pre className="debug-panel">{safeJson(selectedLog.params)}</pre>
              </div>

              <div className="drawer-section">
                <h3>Query</h3>
                <pre className="debug-panel">{safeJson(selectedLog.query)}</pre>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}