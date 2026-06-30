import type { ReactNode } from "react";

type FilterToolbarProps = {
  title?: string;
  description?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export default function FilterToolbar({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  children,
  action,
  meta,
  className = ""
}: FilterToolbarProps) {
  return (
    <div className={`filter-toolbar ${className}`.trim()}>
      {(title || description || action) ? (
        <div className="filter-toolbar-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>

          {action ? <div className="filter-toolbar-action">{action}</div> : null}
        </div>
      ) : null}

      <div className="filter-toolbar-controls">
        {onSearchChange ? (
          <div className="filter-field filter-field-search">
            <label>Pencarian</label>
            <input
              value={searchValue || ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        ) : null}

        {children}
      </div>

      {meta ? <div className="filter-toolbar-meta">{meta}</div> : null}
    </div>
  );
}
