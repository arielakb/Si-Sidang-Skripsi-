import type { ReactNode } from "react";

type ActionGroupProps = {
  children: ReactNode;
  align?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  compact?: boolean;
  className?: string;
};

export default function ActionGroup({
  children,
  align = "start",
  wrap = true,
  compact = false,
  className = ""
}: ActionGroupProps) {
  return (
    <div
      className={[
        "action-group",
        `action-group-${align}`,
        wrap ? "action-group-wrap" : "",
        compact ? "action-group-compact" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
