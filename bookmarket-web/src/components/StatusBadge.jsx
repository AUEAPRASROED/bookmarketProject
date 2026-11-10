import { BOOK_STATUS, REQUEST_STATUS } from '../data/labels';

// ป้ายสถานะ ใช้ได้ทั้งสถานะหนังสือ (kind="book") และสถานะคำขอซื้อ (kind="request")
function StatusBadge({ kind = 'book', status }) {
  const table = kind === 'book' ? BOOK_STATUS : REQUEST_STATUS;
  const s = table[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
  return <span className={'whitespace-nowrap rounded-full px-2 py-0.5 text-xs ' + s.className}>{s.label}</span>;
}

export default StatusBadge;
