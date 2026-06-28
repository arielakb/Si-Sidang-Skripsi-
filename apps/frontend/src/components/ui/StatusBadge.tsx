import { formatStatus, getStatusTone } from "../../utils/ui";

export default function StatusBadge({
  value,
  size = "md"
}: {
  value?: string | null;
  size?: "sm" | "md";
}) {
  return (
    <span className={`ui-badge ui-badge-${getStatusTone(value)} ui-badge-${size}`}>
      {formatStatus(value)}
    </span>
  );
}