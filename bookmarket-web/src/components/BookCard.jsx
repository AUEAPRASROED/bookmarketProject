import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import StatusBadge from './StatusBadge';
import { conditionLabel, formatPrice } from '../data/labels';

// การ์ดหนังสือ 1 ใบ (แบบ MovieCard) รับ object จาก GET /api/books
function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
      <div className="relative">
        <BookCover book={book} className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
          {conditionLabel(book.condition)}
        </span>
        {book.status !== 'available' && (
          <span className="absolute right-2 top-2"><StatusBadge status={book.status} /></span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">{book.category}</p>
        <h3 className="mt-0.5 line-clamp-2 font-medium leading-snug text-slate-900" title={book.title}>{book.title}</h3>
        <p className="truncate text-sm text-slate-500">{book.author}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="text-lg font-semibold text-slate-900">{formatPrice(book.price)}</span>
          {book.seller?.rating != null && (
            <span className="text-xs text-slate-500"><span className="text-amber-400">★</span> {book.seller.rating}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default BookCard;
