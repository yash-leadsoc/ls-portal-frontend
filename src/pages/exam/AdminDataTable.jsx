export default function AdminDataTable({ columns = [], rows = [], loading = false, error = "", emptyTitle = "No records found", emptyMessage = "Records will appear here when available." }) {
  if (loading) return <div className="ea-table-card"><div className="ea-empty"><span className="ea-spinner" />Loading records…</div></div>;
  if (error) return <div className="ea-table-card"><div className="ea-empty ea-error"><strong>Unable to load data</strong>{error}</div></div>;
  if (!rows?.length) return <div className="ea-table-card"><div className="ea-empty"><span className="ea-empty-icon">⌁</span><strong>{emptyTitle}</strong><p>{emptyMessage}</p></div></div>;
  return <div className="ea-table-card"><div className="ea-table-scroll"><table className="ea-table"><thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row._id || row.id || i}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? "—")}</td>)}</tr>)}</tbody></table></div></div>;
}
