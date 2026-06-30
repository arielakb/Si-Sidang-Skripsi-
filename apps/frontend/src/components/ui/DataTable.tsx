import type { ReactNode } from "react";

type ColumnAlign = "left" | "center" | "right";
type MobilePriority = "title" | "subtitle" | "meta" | "body" | "hidden" | "none";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: ColumnAlign;
  width?: string | number;
  className?: string;
  render?: (item: T, index: number) => ReactNode;
  accessor?: keyof T | ((item: T, index: number) => ReactNode);

  /**
   * Optional mobile hint used by newer workflow/dashboard pages.
   * It is ignored by the desktop table, so legacy pages such as Master Data
   * keep the same compact table layout.
   */
  mobilePriority?: MobilePriority;
};

export type DataTablePagination = {
  page: number;
  totalPages?: number;
  totalItems?: number;
  /** Alias used by newer pages. */
  total?: number;
  pageSize?: number;
  limit?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  label?: string;
  itemLabel?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  className?: string;
  tableClassName?: string;
  toolbar?: ReactNode;
  getRowKey?: (item: T, index: number) => string | number;
  rowKey?: keyof T | ((item: T, index: number) => string | number);
  onRowClick?: (item: T, index: number) => void;

  /**
   * Newer table options. These are optional and intentionally do not affect
   * the legacy desktop markup when they are not provided.
   */
  minWidth?: string | number;
  mobileTitle?: (item: T, index: number) => ReactNode;
  mobileSubtitle?: (item: T, index: number) => ReactNode;
  mobileMeta?: (item: T, index: number) => ReactNode;
  mobileActions?: (item: T, index: number) => ReactNode;
  pagination?: DataTablePagination;
  compact?: boolean;
};

function getValue<T>(item: T, column: DataTableColumn<T>, index: number) {
  if (column.render) {
    return column.render(item, index);
  }

  if (typeof column.accessor === "function") {
    return column.accessor(item, index);
  }

  if (column.accessor) {
    return item[column.accessor] as ReactNode;
  }

  const record = item as Record<string, ReactNode>;
  return record[column.key] ?? "-";
}

function getKey<T>(
  item: T,
  index: number,
  getRowKey?: (item: T, index: number) => string | number,
  rowKey?: keyof T | ((item: T, index: number) => string | number)
) {
  if (getRowKey) return getRowKey(item, index);

  if (typeof rowKey === "function") return rowKey(item, index);

  if (rowKey) {
    const value = item[rowKey];
    if (typeof value === "string" || typeof value === "number") return value;
  }

  const record = item as Record<string, unknown>;
  if (typeof record.id === "string" || typeof record.id === "number") {
    return record.id;
  }

  return index;
}

function getColumnClass<T>(column: DataTableColumn<T>) {
  return [
    column.align ? `text-${column.align}` : "",
    column.className || ""
  ]
    .filter(Boolean)
    .join(" ");
}

function getFallbackMobileColumn<T>(
  columns: DataTableColumn<T>[],
  priority: MobilePriority
) {
  return columns.find((column) => column.mobilePriority === priority);
}

function formatRange(
  page: number,
  pageSize: number,
  totalItems: number,
  itemLabel = "data"
) {
  if (totalItems <= 0) return `0 ${itemLabel}`;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return `${start}-${end} dari ${totalItems} ${itemLabel}`;
}

function DataTablePaginationFooter({
  pagination
}: {
  pagination: DataTablePagination;
}) {
  const pageSize = pagination.pageSize ?? pagination.limit ?? 10;
  const totalItems = pagination.totalItems ?? pagination.total ?? 0;
  const totalPages =
    pagination.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, pagination.page), totalPages);
  const pageSizeOptions = pagination.pageSizeOptions ?? [10, 20, 50];

  return (
    <div className="smart-table-footer data-table-footer">
      <div className="pagination-bar smart-pagination">
        <div className="pagination-summary">
          {pagination.label || (
            <>
              Menampilkan{" "}
              <strong>{formatRange(currentPage, pageSize, totalItems, pagination.itemLabel)}</strong>
            </>
          )}
        </div>

        <div className="pagination-actions">
          {pagination.onPageSizeChange ? (
            <label className="pagination-size-control">
              <span>Per halaman</span>
              <select
                value={pageSize}
                onChange={(event) =>
                  pagination.onPageSizeChange?.(Number(event.target.value))
                }
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            className="secondary-button small-button"
            disabled={currentPage <= 1 || !pagination.onPageChange}
            onClick={() => pagination.onPageChange?.(currentPage - 1)}
          >
            Sebelumnya
          </button>

          <span className="pagination-summary">
            <strong>{currentPage}</strong> / {totalPages}
          </span>

          <button
            type="button"
            className="secondary-button small-button"
            disabled={currentPage >= totalPages || !pagination.onPageChange}
            onClick={() => pagination.onPageChange?.(currentPage + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataTable<T>({
  data,
  columns,
  emptyMessage = "Belum ada data.",
  isLoading = false,
  loadingMessage = "Memuat data...",
  className = "",
  tableClassName = "",
  toolbar,
  getRowKey,
  rowKey,
  onRowClick,
  minWidth,
  mobileTitle,
  mobileSubtitle,
  mobileMeta,
  mobileActions,
  pagination,
  compact = false
}: DataTableProps<T>) {
  const hasModernOptions = Boolean(
    toolbar ||
      minWidth ||
      mobileTitle ||
      mobileSubtitle ||
      mobileMeta ||
      mobileActions ||
      pagination ||
      columns.some((column) => column.mobilePriority)
  );

  const titleColumn = getFallbackMobileColumn(columns, "title") ?? columns[0];
  const subtitleColumn = getFallbackMobileColumn(columns, "subtitle");
  const metaColumn = getFallbackMobileColumn(columns, "meta");

  const wrapperClassName = [
    "data-table-wrapper",
    hasModernOptions ? "smart-table-card" : "",
    compact ? "data-table-wrapper-compact smart-table-card-compact" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const scrollClassName = hasModernOptions
    ? "data-table-scroll smart-table-scroll"
    : "";

  const tableClassNames = [
    "data-table",
    hasModernOptions ? "smart-table" : "",
    compact ? "data-table-compact smart-table-compact" : "",
    tableClassName
  ]
    .filter(Boolean)
    .join(" ");

  const tableElement = (
    <table
      className={tableClassNames}
      style={{ minWidth: minWidth ?? undefined }}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{ width: column.width }}
              className={getColumnClass(column)}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan={columns.length} className="table-empty-cell data-table-empty">
              {loadingMessage}
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="table-empty-cell data-table-empty">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((item, index) => (
            <tr
              key={getKey(item, index, getRowKey, rowKey)}
              onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              className={onRowClick ? "clickable-row" : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={getColumnClass(column)}>
                  {getValue(item, column, index)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className={wrapperClassName}>
      {toolbar ? <div className="smart-table-toolbar data-table-toolbar">{toolbar}</div> : null}

      {hasModernOptions ? <div className={scrollClassName}>{tableElement}</div> : tableElement}

      {hasModernOptions ? (
        <div className="smart-table-mobile-list">
          {isLoading ? (
            <div className="smart-table-mobile-empty">{loadingMessage}</div>
          ) : data.length === 0 ? (
            <div className="smart-table-mobile-empty">{emptyMessage}</div>
          ) : (
            data.map((item, index) => (
              <article
                key={getKey(item, index, getRowKey, rowKey)}
                className={`smart-table-mobile-card ${
                  onRowClick ? "clickable-row" : ""
                }`.trim()}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              >
                <div className="smart-table-mobile-head">
                  <div>
                    <strong>
                      {mobileTitle
                        ? mobileTitle(item, index)
                        : getValue(item, titleColumn, index)}
                    </strong>

                    {mobileSubtitle || subtitleColumn ? (
                      <span>
                        {mobileSubtitle
                          ? mobileSubtitle(item, index)
                          : subtitleColumn
                            ? getValue(item, subtitleColumn, index)
                            : null}
                      </span>
                    ) : null}
                  </div>

                  {mobileMeta || metaColumn ? (
                    <div className="smart-table-mobile-meta">
                      {mobileMeta
                        ? mobileMeta(item, index)
                        : metaColumn
                          ? getValue(item, metaColumn, index)
                          : null}
                    </div>
                  ) : null}
                </div>

                <dl className="smart-table-mobile-grid">
                  {columns
                    .filter((column) => column.mobilePriority !== "hidden")
                    .slice(0, 6)
                    .map((column) => (
                      <div key={column.key}>
                        <dt>{column.header}</dt>
                        <dd>{getValue(item, column, index)}</dd>
                      </div>
                    ))}
                </dl>

                {mobileActions ? (
                  <div className="smart-table-mobile-actions">
                    {mobileActions(item, index)}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}

      {pagination ? <DataTablePaginationFooter pagination={pagination} /> : null}
    </div>
  );
}
