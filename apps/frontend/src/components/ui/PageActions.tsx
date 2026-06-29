import type { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
};

export default function PageActions({ children }: PageActionsProps) {
  return <div className="page-actions">{children}</div>;
}