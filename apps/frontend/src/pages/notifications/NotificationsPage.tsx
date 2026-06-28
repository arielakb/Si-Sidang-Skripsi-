import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  status: "UNREAD" | "READ";
  createdAt: string;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("/notifications?limit=20");
      return response.data;
    }
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const notifications: NotificationItem[] = notificationsQuery.data?.data ?? [];
  const unreadCount = notificationsQuery.data?.meta?.unreadCount ?? 0;

  return (
    <section className="page-stack">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">Notifikasi</p>
          <h1>Notifikasi Saya</h1>
          <p className="muted">Unread: {unreadCount}</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => readAllMutation.mutate()}
        >
          Tandai semua dibaca
        </button>
      </div>

      <div className="list-card">
        {notificationsQuery.isLoading ? (
          <p>Memuat notifikasi...</p>
        ) : notifications.length === 0 ? (
          <p>Belum ada notifikasi.</p>
        ) : (
          notifications.map((item) => (
            <article
              key={item.id}
              className={item.status === "UNREAD" ? "list-item unread" : "list-item"}
            >
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>
                  {item.type || "-"} •{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(new Date(item.createdAt))}
                </small>
              </div>

              {item.status === "UNREAD" ? (
                <button
                  className="small-button"
                  onClick={() => readMutation.mutate(item.id)}
                >
                  Dibaca
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}