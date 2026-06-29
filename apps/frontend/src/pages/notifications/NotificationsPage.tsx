import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  isRead?: boolean | null;
  readAt?: string | null;
  actionUrl?: string | null;
  data?: unknown;
  createdAt?: string | null;
};

type DrawerMode = "detail" | null;

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getMessage(item: NotificationItem) {
  return item.message || item.body || "-";
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<{
        data: NotificationItem[];
        meta?: {
          unreadCount?: number;
          total?: number;
        };
      }>("/notifications", {
        params: {
          limit: 50
        }
      });

      return response.data;
    }
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const unreadCount =
    notificationsQuery.data?.meta?.unreadCount ??
    notifications.filter((item) => !item.isRead).length;

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(
        notifications
          .map((item) => item.type)
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [notifications]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch = `${item.title ?? ""} ${getMessage(item)} ${
        item.type ?? ""
      }`
        .toLowerCase()
        .includes(keyword);

      const matchesRead =
        readFilter === "READ"
          ? Boolean(item.isRead)
          : readFilter === "UNREAD"
            ? !item.isRead
            : true;

      const matchesType = typeFilter ? item.type === typeFilter : true;

      return matchesSearch && matchesRead && matchesType;
    });
  }, [notifications, search, readFilter, typeFilter]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications"]
      });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadRows = notifications.filter((item) => !item.isRead);

      await Promise.all(
        unreadRows.map((item) => api.patch(`/notifications/${item.id}/read`))
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notifications"]
      });
    }
  });

  function openDetailDrawer(item: NotificationItem) {
    setSelectedNotification(item);
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setSelectedNotification(null);
    setDrawerMode(null);
  }

  const totalNotifications = notifications.length;
  const readCount = totalNotifications - unreadCount;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Notifikasi"
        title="Notifikasi Saya"
        description="Pantau pemberitahuan sistem terkait seminar, bimbingan, revisi, jadwal, dan finalisasi."
      />

      <div className="metric-grid notifications-overview-grid">
        <MetricCard
          label="Total Notifikasi"
          value={totalNotifications}
          description="Jumlah notifikasi terbaru"
        />

        <MetricCard
          label="Belum Dibaca"
          value={unreadCount}
          description="Perlu diperiksa"
        />

        <MetricCard
          label="Sudah Dibaca"
          value={readCount}
          description="Notifikasi selesai dibaca"
        />

        <MetricCard
          label="Jenis"
          value={typeOptions.length}
          description="Kategori notifikasi"
        />
      </div>

      <section className="list-card notifications-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Notifikasi</h2>
            <p className="muted">
              List notifikasi berdasarkan waktu, jenis, status baca, dan pesan.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul atau pesan..."
            />

            <select
              value={readFilter}
              onChange={(event) => setReadFilter(event.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="UNREAD">Belum Dibaca</option>
              <option value="READ">Sudah Dibaca</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Semua Jenis</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="secondary-button"
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              onClick={() => markAllReadMutation.mutate()}
            >
              Tandai Semua Dibaca
            </button>
          </div>
        </div>

        {notificationsQuery.isLoading ? (
          <EmptyState
            title="Memuat notifikasi..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada notifikasi"
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
                    <span>{item.type || "-"}</span>
                  </div>
                )
              },
              {
                key: "title",
                header: "Judul",
                render: (item) => (
                  <div className="table-title-cell notification-title-cell">
                    <strong>{item.title || "Tanpa judul"}</strong>
                    <span>{getMessage(item)}</span>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => (
                  <StatusBadge
                    value={item.isRead ? "DIBACA" : "BELUM_DIBACA"}
                    size="sm"
                  />
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

                    {!item.isRead ? (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={markReadMutation.isPending}
                        onClick={() => markReadMutation.mutate(item.id)}
                      >
                        Tandai Dibaca
                      </button>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode === "detail" && selectedNotification ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer notifications-drawer"
            aria-label="Detail notifikasi"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Detail Notifikasi</p>
                <h2>Notifikasi</h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Tutup
              </button>
            </div>

            <div className="notifications-detail-stack">
              <div className="skripsi-detail-title">
                <strong>{selectedNotification.title || "Tanpa judul"}</strong>
                <StatusBadge
                  value={
                    selectedNotification.isRead ? "DIBACA" : "BELUM_DIBACA"
                  }
                />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Jenis</span>
                  <strong>{selectedNotification.type || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Waktu</span>
                  <strong>{formatDate(selectedNotification.createdAt)}</strong>
                </div>

                <div className="info-row">
                  <span>Status Baca</span>
                  <strong>
                    {selectedNotification.isRead
                      ? "Sudah dibaca"
                      : "Belum dibaca"}
                  </strong>
                </div>

                <div className="info-row">
                  <span>Read At</span>
                  <strong>{formatDate(selectedNotification.readAt)}</strong>
                </div>

                <div className="info-row">
                  <span>Pesan</span>
                  <p>{getMessage(selectedNotification)}</p>
                </div>

                <div className="info-row">
                  <span>Action URL</span>
                  <p>{selectedNotification.actionUrl || "-"}</p>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Payload Data</h3>
                <pre className="debug-panel">
                  {safeJson(selectedNotification.data)}
                </pre>
              </div>

              {!selectedNotification.isRead ? (
                <button
                  type="button"
                  className="primary-button"
                  disabled={markReadMutation.isPending}
                  onClick={() =>
                    markReadMutation.mutate(selectedNotification.id)
                  }
                >
                  Tandai Dibaca
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}