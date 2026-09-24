import React from 'react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'No records match your criteria.',
  onEmptyAction,
  emptyActionLabel,
  className = '',
}) => {
  return (
    <div className={`relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-xs ${className}`}>
      <div className="overflow-x-auto min-h-[160px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  className={`py-3.5 px-4 text-left ${col.headerClassName || ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner size="md" color="text-indigo-600" />
                    <span className="text-xs text-gray-400 font-medium">Fetching records...</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            )}

            {!isLoading &&
              data.length > 0 &&
              data.map((row, rowIdx) => (
                <tr
                  key={row._id || row.id || rowIdx}
                  className="hover:bg-gray-50/60 transition-colors duration-100"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 text-gray-700 align-middle ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
