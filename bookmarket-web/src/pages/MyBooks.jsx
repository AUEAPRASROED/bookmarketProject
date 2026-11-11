import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMyBooks, deleteBook } from '../api/backend';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Loading, ConfirmBox, btnPrimary } from '../components/admin/AdminStates';
import { formatPrice, conditionLabel } from '../data/labels';

// สินค้าของฉัน: ทุกสถานะ พร้อมปุ่มแก้ไข / ลบ (ลบต้องผ่านกล่องยืนยันก่อน)
function MyBooks() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);        // เล่มที่กำลังจะลบ (เปิดกล่องยืนยัน)
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getMyBooks(token);
        if (!ignore) { setBooks(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function confirmDelete() {
    setBusy(true);
    setActionError(null);
    try {
      await deleteBook(target.id, token);
      setBooks(books.filter(b => b.id !== target.id));   // เอาออกจากตารางหลัง server ยืนยันแล้วเท่านั้น
      setTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">สินค้าของฉัน</h1>
          {status === 'success' && <p className="text-sm text-slate-500">ทั้งหมด {books.length} เล่ม</p>}
        </div>
        <Link to="/me/books/new" className={btnPrimary}>+ ลงประกาศขาย</Link>
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && books.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          ยังไม่มีประกาศ กด "ลงประกาศขาย" เพื่อเริ่มขายเล่มแรก
        </p>
      )}
      {status === 'success' && books.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">หนังสือ</th>
                <th className="px-4 py-3">หมวด / สภาพ</th>
                <th className="px-4 py-3">ราคา</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.map(b => (
                <tr key={b.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2">
                    <Link to={`/books/${b.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{b.title}</Link>
                    <p className="text-xs text-slate-500">{b.author}</p>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{b.category} / {conditionLabel(b.condition)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatPrice(b.price)}</td>
                  <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                    <Link to={`/me/books/${b.id}`} className="text-emerald-600 hover:underline">แก้ไข</Link>
                    <button onClick={() => setTarget(b)} className="text-red-600 hover:underline">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ลบประกาศ "${target?.title}" ?`}
                  confirmText="ลบ" onConfirm={confirmDelete} onCancel={() => setTarget(null)}>
        <p>ลบแล้วย้อนกลับไม่ได้ คำขอซื้อทั้งหมดของเล่มนี้จะหายไปด้วย</p>
      </ConfirmBox>
    </div>
  );
}

export default MyBooks;
