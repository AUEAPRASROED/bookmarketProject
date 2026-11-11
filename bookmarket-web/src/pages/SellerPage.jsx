import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getSeller, getMyRequests, addSellerReview, deleteSellerReview } from '../api/backend';
import BookGrid from '../components/BookGrid';
import { Stars, StarInput } from '../components/Stars';
import { ConfirmBox, btnPrimary, inputClass } from '../components/admin/AdminStates';
import { dateTH } from '../data/labels';

// ฟอร์มรีวิวร้าน (แบบ ReviewForm ของ MovieHub + ให้คะแนนแบบ votes)
function ReviewForm({ sellerId, onAdded }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('typing');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const review = await addSellerReview(sellerId, rating, text, token);
      onAdded(review);
    } catch (err) {
      setError(err.message);                 // 403 ยังไม่เคยซื้อขาย / 409 รีวิวไปแล้ว ข้อความมาจาก Go
      setStatus('typing');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">รีวิวร้านนี้</h3>
      <StarInput value={rating} onChange={setRating} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500}
                placeholder="เล่าประสบการณ์ซื้อขาย เช่น สภาพหนังสือตรงปก นัดรับตรงเวลา" className={inputClass} />
      <button type="submit" disabled={rating === 0 || status === 'submitting'} className={btnPrimary}>
        {status === 'submitting' ? 'กำลังส่ง...' : 'ส่งรีวิว'}
      </button>
      {rating === 0 && <p className="text-xs text-slate-400">กดเลือกดาวก่อนส่งรีวิว</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

// คำนวณคะแนนเฉลี่ยใหม่จากรายการรีวิวในหน้า (หลังเพิ่ม/ลบรีวิว ไม่ต้องโหลดหน้าใหม่)
function summarize(reviews) {
  if (reviews.length === 0) return { rating: null, reviewCount: 0 };
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length };
}

function SellerPage() {
  const { id } = useParams();
  const sellerId = Number(id);
  const location = useLocation();
  const { token, member, isLoggedIn, isAdmin } = useAuth();
  const [data, setData] = useState(null);              // { seller, books, reviews }
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [canReview, setCanReview] = useState(false);   // เคยซื้อขายกับร้านนี้จนเสร็จแล้วหรือยัง
  const [target, setTarget] = useState(null);          // รีวิวที่กำลังจะลบ
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const d = await getSeller(id);
        // ใช้ API เดิม (คำขอซื้อของฉัน) ดูว่าเคยซื้อจากร้านนี้จนเสร็จไหม Go ก็ตรวจซ้ำตอนส่งรีวิวอีกชั้น
        let eligible = false;
        if (token && member?.id !== sellerId) {
          const mine = await getMyRequests(token);
          eligible = mine.some(r => r.seller.id === sellerId && r.status === 'completed');
        }
        if (!ignore) { setData(d); setCanReview(eligible); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, sellerId, token, member?.id, reloadKey]);

  function handleAdded(review) {
    const reviews = [review, ...data.reviews];
    setData({ ...data, reviews, seller: { ...data.seller, ...summarize(reviews) } });
  }

  async function confirmDelete() {
    setBusy(true);
    setActionError(null);
    try {
      await deleteSellerReview(target.id, token);
      const reviews = data.reviews.filter(r => r.id !== target.id);
      setData({ ...data, reviews, seller: { ...data.seller, ...summarize(reviews) } });
      setTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 md:px-6"><div className="h-40 rounded-3xl bg-slate-100" /></div>;
  }
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl">🏪</p>
        <p className="mt-3 text-lg text-slate-700">ไม่พบร้านนี้</p>
        <p className="text-sm text-slate-400">{error.message}</p>
        <button onClick={() => setReloadKey(k => k + 1)} className="mt-4 text-sm text-emerald-600 hover:underline">ลองใหม่</button>
      </div>
    );
  }

  const { seller, books, reviews } = data;
  const isMe = member?.id === seller.id;
  const alreadyReviewed = reviews.some(r => r.reviewer.id === member?.id);

  let reviewArea;
  if (!isLoggedIn) {
    reviewArea = (
      <p className="text-sm text-slate-500">
        <Link to="/login" state={{ from: location.pathname }} className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link> เพื่อรีวิวร้านนี้
      </p>
    );
  } else if (isMe) {
    reviewArea = <p className="text-sm text-slate-500">นี่คือร้านของคุณ</p>;
  } else if (alreadyReviewed) {
    reviewArea = <p className="text-sm text-slate-500">คุณรีวิวร้านนี้แล้ว ขอบคุณที่ช่วยแบ่งปัน</p>;
  } else if (canReview) {
    reviewArea = <ReviewForm sellerId={seller.id} onAdded={handleAdded} />;
  } else {
    reviewArea = <p className="text-sm text-slate-500">รีวิวได้หลังซื้อขายกับร้านนี้เสร็จแล้ว</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      {/* ---------- หัวร้าน ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 p-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-3xl font-semibold text-emerald-600 shadow">
            {seller.displayName.charAt(0)}
          </span>
          <div>
            <p className="text-sm text-emerald-50">ร้านหนังสือของ</p>
            <h1 className="text-3xl font-semibold">{seller.displayName}</h1>
            <p className="mt-1 text-sm text-emerald-50">เป็นสมาชิกตั้งแต่ {dateTH(seller.createdAt)}</p>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-semibold" data-testid="seller-rating">{seller.rating ?? '-'}</p>
              <p className="text-xs text-emerald-50">คะแนนเฉลี่ย</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-semibold">{seller.reviewCount}</p>
              <p className="text-xs text-emerald-50">รีวิว</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-semibold">{seller.booksSold}</p>
              <p className="text-xs text-emerald-50">ขายแล้ว</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- หนังสือของร้าน ---------- */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">หนังสือที่ร้านนี้ขายอยู่</h2>
        <BookGrid books={books} status="success" emptyText="ร้านนี้ยังไม่มีหนังสือที่ขายอยู่" />
      </section>

      {/* ---------- รีวิวร้าน ---------- */}
      <section className="mt-12 grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-5xl font-semibold text-slate-900">{seller.rating ?? '-'}</p>
            <Stars value={seller.rating} className="text-2xl" />
            <p className="mt-1 text-sm text-slate-500">จาก {seller.reviewCount} รีวิว</p>
          </div>
          {reviewArea}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">รีวิวจากผู้ซื้อ</h2>
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          {reviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-400">ยังไม่มีรีวิว</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map(r => (
                <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 font-semibold text-slate-600">
                      {r.reviewer.displayName.charAt(0)}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{r.reviewer.displayName}</p>
                      <p className="text-xs text-slate-400">{dateTH(r.createdAt)}</p>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  {r.text && <p className="mt-3 text-slate-700">{r.text}</p>}
                  {/* ลบได้เมื่อเป็นคนเขียน หรือ admin (ตรวจรีวิวที่ไม่เหมาะสม) Go ตรวจซ้ำใน SQL */}
                  {(r.reviewer.id === member?.id || isAdmin) && (
                    <button onClick={() => setTarget(r)} className="mt-2 text-sm text-red-600 hover:underline">ลบรีวิว</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ลบรีวิวของ ${target?.reviewer.displayName} ?`}
                  confirmText="ลบรีวิว" onConfirm={confirmDelete} onCancel={() => setTarget(null)}>
        <p>ลบแล้วย้อนกลับไม่ได้ คะแนนเฉลี่ยของร้านจะคำนวณใหม่</p>
      </ConfirmBox>
    </div>
  );
}

export default SellerPage;
