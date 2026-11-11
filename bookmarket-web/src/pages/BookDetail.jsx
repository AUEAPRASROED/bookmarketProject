import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getBook, sendRequest } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import BookCover from '../components/BookCover';
import StatusBadge from '../components/StatusBadge';
import { Stars } from '../components/Stars';
import { conditionLabel, formatPrice, dateTH } from '../data/labels';
import { inputClass, btnPrimary } from '../components/admin/AdminStates';

// ฟอร์มส่งคำขอซื้อ แยกเป็น component เล็กเพราะมี state ของตัวเอง 3 ตัว (แบบ ReviewForm)
function RequestForm({ bookId }) {
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('typing');   // 'typing' | 'submitting' | 'sent'
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await sendRequest(bookId, message, token);
      setStatus('sent');
    } catch (err) {
      setError(err.message);                         // 409 ส่งซ้ำ / ถูกจองแล้ว ข้อความมาจาก Go
      setStatus('typing');
    }
  }

  if (status === 'sent') {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✅ ส่งคำขอซื้อแล้ว รอผู้ขายตอบ ติดตามได้ที่ <Link to="/me/requests" className="font-medium underline">คำขอซื้อของฉัน</Link>
      </p>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500}
                placeholder="ข้อความถึงผู้ขาย เช่น สะดวกรับที่ตึกวิทยาศาสตร์ช่วงบ่าย" className={inputClass} />
      <button type="submit" disabled={status === 'submitting'} className={btnPrimary + ' w-full py-2.5'}>
        {status === 'submitting' ? 'กำลังส่ง...' : 'ส่งคำขอซื้อ'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

// ปุ่มใส่ตะกร้า: ใช้ CartContext ร่วมกับ Navbar ตัวเลขบนไอคอนตะกร้าจึงเปลี่ยนตามทันที
function CartButton({ book }) {
  const { inCart, add } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (inCart(book.id)) {
    return (
      <Link to="/me/cart" className="block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700">
        ✓ อยู่ในตะกร้าแล้ว ดูตะกร้า
      </Link>
    );
  }
  async function handleAdd() {
    setBusy(true);
    setError(null);
    try {
      await add(book);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button onClick={handleAdd} disabled={busy}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50">
        {busy ? 'กำลังใส่...' : '🛒 ใส่ตะกร้า'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </>
  );
}

function BookDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { isLoggedIn, member } = useAuth();
  const [book, setBook] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const b = await getBook(id);
        if (!ignore) { setBook(b); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="aspect-[3/4] w-64 shrink-0 rounded-2xl bg-slate-100" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-1/3 rounded bg-slate-100" />
            <div className="h-24 w-full rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl">📕</p>
        <p className="mt-3 text-lg text-slate-700">ไม่พบหนังสือเล่มนี้</p>
        <p className="text-sm text-slate-400">{error.message}</p>
        <Link to="/books" className="mt-6 inline-block text-sm text-emerald-600 hover:underline">กลับไปหน้าหนังสือ</Link>
      </div>
    );
  }

  const isOwner = member?.id === book.seller.id;

  // ส่วนท้าย: Guest ให้ไป login, เจ้าของไปแก้ไข, ขายไม่ได้แล้วบอกสถานะ, ที่เหลือแสดงปุ่มตะกร้า + ฟอร์มส่งคำขอ
  let action;
  if (!isLoggedIn) {
    action = (
      <p className="text-sm text-slate-600">
        <Link to="/login" state={{ from: location.pathname }} className="font-medium text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
        {' '}หรือ <Link to="/register" className="font-medium text-emerald-600 hover:underline">สมัครสมาชิก</Link> เพื่อใส่ตะกร้าและส่งคำขอซื้อ
      </p>
    );
  } else if (isOwner) {
    action = (
      <p className="text-sm text-slate-600">
        นี่คือสินค้าของคุณ <Link to={`/me/books/${book.id}`} className="font-medium text-emerald-600 hover:underline">แก้ไขสินค้า</Link>
      </p>
    );
  } else if (book.status !== 'available') {
    action = <p className="text-sm text-slate-600">หนังสือเล่มนี้{book.status === 'sold' ? 'ขายไปแล้ว' : 'ติดจองอยู่'} ยังส่งคำขอซื้อไม่ได้</p>;
  } else {
    action = (
      <div className="space-y-4">
        <CartButton book={book} />
        <RequestForm bookId={book.id} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link to="/books" className="text-sm text-slate-500 hover:text-emerald-600">← กลับไปหน้าหนังสือ</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[16rem_1fr]">
        <BookCover book={book} className="aspect-[3/4] w-64 self-start rounded-2xl shadow-lg" />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{book.category}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">สภาพ{conditionLabel(book.condition)}</span>
            <StatusBadge status={book.status} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900">{book.title}</h1>
          <p className="mt-1 text-slate-500">โดย {book.author}</p>
          <p className="mt-5 text-3xl font-semibold text-emerald-600">{formatPrice(book.price)}</p>
          <p className="mt-1 text-xs text-slate-400">ลงประกาศเมื่อ {dateTH(book.createdAt)}</p>

          {book.description && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">รายละเอียด</h2>
              <p className="mt-1 whitespace-pre-line leading-relaxed text-slate-700">{book.description}</p>
            </div>
          )}

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {/* การ์ดร้าน: กดไปหน้าร้านเพื่อดูรีวิวและหนังสือเล่มอื่น */}
            <Link to={`/sellers/${book.seller.id}`}
                  className="flex items-center gap-4 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-semibold text-white">
                {book.seller.displayName.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-slate-400">ร้านของ</span>
                <span className="block truncate font-medium text-slate-900">{book.seller.displayName}</span>
                <span className="text-sm text-slate-500">
                  {book.seller.reviewCount > 0
                    ? <><Stars value={book.seller.rating} className="text-sm" /> {book.seller.rating} ({book.seller.reviewCount} รีวิว)</>
                    : 'ยังไม่มีรีวิว'}
                </span>
              </span>
            </Link>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">สนใจซื้อเล่มนี้</h2>
              {action}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetail;
