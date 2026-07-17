interface Props {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 6 }: Props) {
  return (
    <table className="squad-table skeleton-table" aria-busy="true" aria-label="Loading data">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}>
                <div className="skeleton-bar" style={{ width: `${50 + ((r * 7 + c * 13) % 40)}%` }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
