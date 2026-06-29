import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  emptyMessage?: string;
};

export default function DataTable<T>({
  data,
  columns,
  emptyMessage = "Belum ada data"
}: DataTableProps<T>) {
  return (
    <div className="data-table-card">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-${column.align || "left"}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`text-${column.align || "left"}`}
                    >
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}