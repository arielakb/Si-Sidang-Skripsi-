import type { ReactNode } from "react";

type DetailPanelProps = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: "sm" | "md" | "lg";
};

export default function DetailPanel({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  width = "md"
}: DetailPanelProps) {
  if (!open) return null;

  return (
    <div className="detail-panel-overlay" role="presentation">
      <aside
        className={`detail-panel detail-panel-${width}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="detail-panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <button type="button" className="ghost-button" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="detail-panel-body">{children}</div>

        {footer ? <div className="detail-panel-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
