import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { sendRequest } from '../api/backend';
import BookCover from '../components/BookCover';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Loading, btnPrimary, inputClass } from '../components/admin/AdminStates';
import { formatPrice, conditionLabel } from '../data/labels';

// ตะกร้าหนังสือ: ส่งคำขอซื้อทีละเล่ม หรือทุกเล่มที่ยังขายอยู่ในครั้งเดียว
// ส่งสำเร็จแล้วเอาเล่มนั้นออกจากตะกร้า (ไปติดตามต่อที่หน้า "คำขอซื้อของฉัน")
function Cart() {
  const { token } = useAuth();
  const { items, status, error, remove, reload } = useCart();
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);          // เล่มที่กำลังส่ง ('all' = กำลังส่งทั้งหมด)
  const [results, setResults] = useState({});           // bookId -> ข้อความ error ของเล่มนั้น
  const [sent, setSent] = useState([]);                 // ชื่อเล่มที่ส่งคำขอสำเร็จในรอบนี้

  async function requestOne(book) {
    try {
      await sendRequest(book.id, message, token);
      await remove(book.id);
      setSent(prev => [...prev, book.title]);
      setResults(prev => ({ ...prev, [book.id]: undefined }));
    } catch (err) {
      setResults(prev => ({ ...prev, [book.id]: err.message }));   // เช่น 409 ส่งคำขอไว้แล้ว
    }
  }

  async function handleOne(book) {
    setBusyId(book.id);
    await requestOne(book);
    setBusyId(null);
  }

  // ส่งทีละเล่มตามลำดับ (รอเล่มก่อนเสร็จก่อนค่อยส่งเล่มถัดไป) เล่มที่พลาดยังอยู่ในตะกร้าพร้อมข้อความบอกเหตุผล
  async function handleAll() {
    setBusyId('all');
    for (const book of items.filter(b => b.status === 'available')) {
      await requestOne(book);
    }
    setBusyId(null);
  }

  async function handleRemove(bookId) {
    setBusyId(bookId);
    try {
      await remove(bookId);
    } catch (err) {
      setResults(prev => ({ ...prev, [bookId]: err.message }));
    } finally {
      setBusyId(null);
    }
  }

  const available = items.filter(b => b.status === 'available');
  const total = available.reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">🛒 ตะกร้าหนังสือ</h1>
      <p className="text-sm text-slate-500">เก็บเล่มที่สนใจไว้ แล้วส่งคำขอซื้อถึงผู้ขายพร้อมกันได้</p>

      {sent.length > 0 && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ ส่งคำขอซื้อแล้ว {sent.length} เล่ม ติดตามได้ที่ <Link to="/me/requests" className="font-medium underline">คำขอซื้อของฉัน</Link>
        </p>
      )}

      {status === 'loading' && <Loading />}
      {status === 'error' && <div className="mt-6"><ErrorBox error={error} onRetry={reload} /></div>}
      {status === 'success' && items.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-3 text-slate-500">ตะกร้ายังว่างอยู่</p>
          <Link to="/books" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">ไปเลือกหนังสือ</Link>
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <ul className="space-y-3">
            {items.map(b => (
              <li key={b.id} data-testid={`cart-${b.id}`} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <Link to={`/books/${b.id}`} className="shrink-0">
                  <BookCover book={b} className="h-28 w-20 rounded-lg" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/books/${b.id}`} className="line-clamp-2 font-medium text-slate-900 hover:text-emerald-600">{b.title}</Link>
                    <span className="shrink-0 font-semibold text-slate-900">{formatPrice(b.price)}</span>
                  </div>
                  <p className="text-sm text-slate-500">{b.author} | สภาพ{conditionLabel(b.condition)} | ร้าน {b.seller.displayName}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-sm">
                    {b.status === 'available' ? (
                      <button onClick={() => handleOne(b)} disabled={busyId !== null}
                              className="font-medium text-emerald-600 hover:underline disabled:text-slate-300">
                        {busyId === b.id ? 'กำลังส่ง...' : 'ส่งคำขอซื้อ'}
                      </button>
                    ) : (
                      <StatusBadge status={b.status} />
                    )}
                    <button onClick={() => handleRemove(b.id)} disabled={busyId !== null}
                            className="text-slate-400 hover:text-red-600 disabled:text-slate-200">
                      เอาออก
                    </button>
                  </div>
                  {results[b.id] && <p className="mt-1 text-sm text-red-600">{results[b.id]}</p>}
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <div className="flex justify-between text-sm text-slate-600">
              <span>เล่มที่ยังขายอยู่</span><span>{available.length} เล่ม</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-slate-900">
              <span>รวม</span><span>{formatPrice(total)}</span>
            </div>
            <label className="block text-sm text-slate-600">ข้อความถึงผู้ขาย (ใช้กับทุกคำขอ)
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500}
                        placeholder="เช่น สะดวกรับที่ตึกวิทยาศาสตร์ช่วงบ่าย" className={inputClass + ' mt-1'} />
            </label>
            <button onClick={handleAll} disabled={busyId !== null || available.length === 0} className={btnPrimary + ' w-full py-2.5'}>
              {busyId === 'all' ? 'กำลังส่งคำขอ...' : `ส่งคำขอซื้อทั้งหมด (${available.length})`}
            </button>
            <p className="text-xs text-slate-400">ยังไม่มีการจ่ายเงินผ่านเว็บ ผู้ขายยอมรับแล้วจะเห็นช่องทางติดต่อเพื่อนัดรับ</p>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Cart;
