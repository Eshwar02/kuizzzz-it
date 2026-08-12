export default function Table({ columns, rows, empty = "No records." }) {
  return (
    <div className="overflow-x-auto border border-ink/15 rounded-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-ink/15 sticky top-0">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left font-semibold text-ink/70 px-3 py-2">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-ink/50">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-ink/10 hover:bg-surface/60">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-middle">{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
