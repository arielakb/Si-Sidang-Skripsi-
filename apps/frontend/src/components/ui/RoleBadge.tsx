import { getRoleLabel, getRoleTone } from "../../utils/ui";

export default function RoleBadge({
  role
}: {
  role?: string | null;
}) {
  return (
    <span className={`ui-badge ui-badge-${getRoleTone(role)} ui-badge-sm`}>
      {getRoleLabel(role)}
    </span>
  );
}