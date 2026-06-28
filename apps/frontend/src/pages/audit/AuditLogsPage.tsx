import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../../services/auditLogs";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AuditLogsPage() {
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");

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

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Security</p>
        <h1>Audit Log</h1>
        <p className="muted">
          Riwayat aktivitas mutasi data seperti create, update, delete, upload,
          approval, dan finalisasi.
        </p>
      </div>

      <section className="card form-grid">
        <label>
          <span>Method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">Semua</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>

        <label>
          <span>Search path/action</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="/api/finalisasi"
          />
        </label>
      </section>

      <section className="list-card">
        {auditQuery.isLoading ? (
          <p>Memuat audit log...</p>
        ) : rows.length === 0 ? (
          <p>Belum ada audit log.</p>
        ) : (
          rows.map((item) => (
            <article key={item.id} className="academic-card">
              <div className="page-header-row">
                <div>
                  <strong>
                    {item.method} {item.path}
                  </strong>
                  <p className="muted">
                    User: {item.user?.name || "-"} • Status:{" "}
                    {item.statusCode || "-"} • {formatDate(item.createdAt)}
                  </p>
                  <small>{item.ip || "-"} • {item.userAgent || "-"}</small>
                </div>

                <span className={`status-pill status-${item.method}`}>
                  {item.method}
                </span>
              </div>

              <pre className="debug-panel">
                {JSON.stringify(
                  {
                    requestBody: item.requestBody,
                    params: item.params,
                    query: item.query
                  },
                  null,
                  2
                )}
              </pre>
            </article>
          ))
        )}
      </section>
    </section>
  );
}