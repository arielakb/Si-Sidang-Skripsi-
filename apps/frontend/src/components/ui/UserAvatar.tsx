import { getInitials } from "../../utils/ui";

export default function UserAvatar({
  name,
  size = "md"
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={`user-avatar user-avatar-${size}`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}