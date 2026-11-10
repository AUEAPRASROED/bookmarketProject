import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getAdminBooks, deleteBook } from '../../api/backend';
import StatusBadge from '../../components/StatusBadge';
import { ErrorBox, Loading, ConfirmBox, inputClass } from '../../components/admin/AdminStates';
import { formatPrice } from '../../data/labels';

// หนังสือทั้งหมดทุกสถานะ: admin ตรวจประกาศที่ไม่เหมาะสม แล้วแก้ไขหรือลบได้
// ลบใช้ DELETE /api/books/{id} ตัวเดียวกับเจ้าของ Go อนุญาตเพราะตั๋วเป็น admin
function AdminBooks() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getAdminBooks(token);
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
      setBooks(books.filter(b => b.id !== target.id));
      setTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = books.filter(b =>
    q === '' || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) ||
    b.seller.displayName.toLowerCase().includes(q)
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">หนังสือทั้งหมด</h2>
          {status === 'success' && <p className="text-sm text-slate-500">แสดง {shown.length} จาก {books.length} เล่ม</p>}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นชื่อหนังสือ ผู้แต่ง หรือผู้ขาย" className={inputClass + ' md:w-72'} />
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">หนังสือ</th>
                <th className="px-4 py-3">ผู้ขาย</th>
                <th className="px-4 py-3">ราคา</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(b => (
                <tr key={b.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2">
                    <Link to={`/books/${b.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{b.title}</Link>
                    <p className="text-xs text-slate-500">{b.author} | {b.category}</p>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{b.seller.displayName}</td>
                  <td className="px-4 py-2 text-slate-600">{formatPrice(b.price)}</td>
                  <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                    <Link to={`/me/books/${b.id}`} className="text-emerald-600 hover:underline">แก้ไข</Link>
                    <button onClick={() => setTarget(b)} className="text-red-600 hover:underline">ลบ</button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">ไม่พบหนังสือ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ลบประกาศ "${target?.title}" ของ ${target?.seller.displayName} ?`}
                  confirmText="ลบ" onConfirm={confirmDelete} onCancel={() => setTarget(null)}>
        <p>ลบแล้วย้อนกลับไม่ได้ คำขอซื้อทั้งหมดของเล่มนี้จะหายไปด้วย</p>
      </ConfirmBox>
    </div>
  );
}

export default AdminBooks;
