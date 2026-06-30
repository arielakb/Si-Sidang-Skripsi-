export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  itemLabel?: string;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  itemLabel = "data"
}: PaginationProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = clampPage(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="pagination-bar smart-pagination">
      <div className="pagination-summary">
        Menampilkan <strong>{start}</strong> - <strong>{end}</strong> dari{" "}
        <strong>{total}</strong> {itemLabel}
      </div>

      <div className="pagination-actions">
        {onPageSizeChange ? (
          <label className="pagination-size-control">
            <span>Per halaman</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
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
          className="ghost-button"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          «
        </button>

        <button
          type="button"
          className="ghost-button"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Sebelumnya
        </button>

        <span>
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          className="ghost-button"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya
        </button>

        <button
          type="button"
          className="ghost-button"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          »
        </button>
      </div>
    </div>
  );
}
