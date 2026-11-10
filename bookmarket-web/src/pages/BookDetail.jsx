import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getBook, sendRequest } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
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
      <p className="text-sm text-emerald-700">
        ส่งคำขอซื้อแล้ว รอผู้ขายตอบ ติดตามได้ที่ <Link to="/me/requests" className="underline">คำขอซื้อของฉัน</Link>
      </p>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500}
                placeholder="ข้อความถึงผู้ขาย เช่น สะดวกรับที่ตึกวิทยาศาสตร์ช่วงบ่าย" className={inputClass} />
      <button type="submit" disabled={status === 'submitting'} className={btnPrimary}>
        {status === 'submitting' ? 'กำลังส่ง...' : 'ส่งคำขอซื้อ'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
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
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="aspect-[3/4] w-56 shrink-0 rounded-xl bg-slate-100" />
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
        <p className="text-lg text-slate-700">ไม่พบหนังสือเล่มนี้</p>
        <p className="text-sm text-slate-400">{error.message}</p>
        <Link to="/books" className="mt-6 inline-block text-sm text-emerald-600 hover:underline">กลับไปหน้าหนังสือ</Link>
      </div>
    );
  }

  const isOwner = member?.id === book.seller.id;

  // ส่วนท้าย: Guest ให้ไป login, เจ้าของไปแก้ไข, ขายไม่ได้แล้วบอกสถานะ, ที่เหลือแสดงฟอร์มส่งคำขอ
  let action;
  if (!isLoggedIn) {
    action = (
      <p className="text-sm text-slate-600">
        <Link to="/login" state={{ from: location.pathname }} className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
        {' '}หรือ <Link to="/register" className="text-emerald-600 hover:underline">สมัครสมาชิก</Link> เพื่อส่งคำขอซื้อ
      </p>
    );
  } else if (isOwner) {
    action = (
      <p className="text-sm text-slate-600">
        นี่คือประกาศของคุณ <Link to={`/me/books/${book.id}`} className="text-emerald-600 hover:underline">แก้ไขประกาศ</Link>
      </p>
    );
  } else if (book.status !== 'available') {
    action = <p className="text-sm text-slate-600">หนังสือเล่มนี้{book.status === 'sold' ? 'ขายไปแล้ว' : 'ติดจองอยู่'} ยังส่งคำขอซื้อไม่ได้</p>;
  } else {
    action = <RequestForm bookId={book.id} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <Link to="/books" className="text-sm text-slate-500 hover:text-emerald-600">กลับไปหน้าหนังสือ</Link>

      <div className="mt-4 flex flex-col gap-8 md:flex-row">
        {book.imageUrl ? (
          <img src={book.imageUrl} alt={`ปก ${book.title}`} className="w-56 shrink-0 self-start rounded-xl border border-slate-200" />
        ) : (
          <div className="grid aspect-[3/4] w-56 shrink-0 place-items-center rounded-xl bg-slate-100 text-5xl">📚</div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{book.title}</h1>
            <StatusBadge status={book.status} />
          </div>
          <p className="mt-1 text-slate-500">โดย {book.author}</p>
          <p className="mt-4 text-2xl font-semibold text-emerald-700">{formatPrice(book.price)}</p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
            <div><dt className="text-slate-400">หมวดหมู่</dt><dd className="text-slate-700">{book.category}</dd></div>
            <div><dt className="text-slate-400">สภาพ</dt><dd className="text-slate-700">{conditionLabel(book.condition)}</dd></div>
            <div><dt className="text-slate-400">ผู้ขาย</dt><dd className="text-slate-700">{book.seller.displayName}</dd></div>
            <div><dt className="text-slate-400">ลงประกาศเมื่อ</dt><dd className="text-slate-700">{dateTH(book.createdAt)}</dd></div>
          </dl>

          {book.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-700">{book.description}</p>}

          <div className="mt-8 rounded-xl border border-emerald-100 bg-white p-5">
            <h2 className="mb-3 font-semibold text-slate-900">สนใจซื้อเล่มนี้</h2>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetail;
