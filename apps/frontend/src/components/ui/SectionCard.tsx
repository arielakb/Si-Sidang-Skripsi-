import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({
  title,
  description,
  action,
  children,
  className = ""
}: SectionCardProps) {
  return (
    <section className={`section-card ${className}`}>
      {(title || description || action) ? (
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