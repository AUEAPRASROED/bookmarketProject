import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { conditionLabel, formatPrice } from '../data/labels';

// การ์ดหนังสือ 1 ใบ (แบบ MovieCard) รับ object จาก GET /api/books
function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`}
          className="group block overflow-hidden rounded-xl border border-emerald-100 bg-white transition hover:border-emerald-300 hover:shadow-md">
      {book.imageUrl ? (
        <img src={book.imageUrl} alt={`ปก ${book.title}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center bg-slate-100 text-4xl">📚</div>
      )}
      <div className="p-3">
        <h3 className="truncate font-medium text-slate-900" title={book.title}>{book.title}</h3>
        <p className="truncate text-sm text-slate-500">{book.author}</p>
        <p className="mt-1 font-semibold text-emerald-700">{formatPrice(book.price)}</p>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span className="truncate">{book.category} | {conditionLabel(book.condition)}</span>
          {book.status !== 'available' && <StatusBadge status={book.status} />}
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
