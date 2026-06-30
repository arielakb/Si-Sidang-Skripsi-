import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

export default function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  padded = true
}: SectionCardProps) {
  return (
    <section
      className={[
        "section-card",
        padded ? "" : "section-card-flush",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title || description || action ? (
        <div className="section-card-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>

          {action ? <div className="section-card-action">{action}</div> : null}
        </div>
      ) : null}

      <div className="section-card-body">{children}</div>
    </section>
  );
}
