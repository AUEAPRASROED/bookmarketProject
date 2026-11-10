import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getAdminRequests } from '../../api/backend';
import StatusBadge from '../../components/StatusBadge';
import { ErrorBox, Loading } from '../../components/admin/AdminStates';
import { REQUEST_STATUS, formatPrice, dateTH } from '../../data/labels';

// รายการซื้อขายทั้งหมด (ดูอย่างเดียว) กรองตามสถานะในเครื่อง
function AdminRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getAdminRequests(token);
        if (!ignore) { setRequests(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  const shown = requests.filter(r => filter === 'all' || r.status === filter);
  const chipClass = (active) =>
    'rounded-full border px-3 py-1 text-sm transition ' +
    (active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-200 bg-white text-slate-600 hover:bg-emerald-50');

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">รายการซื้อขาย</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={chipClass(filter === 'all')}>ทั้งหมด</button>
        {Object.entries(REQUEST_STATUS).map(([key, s]) => (
          <button key={key} onClick={() => setFilter(key)} className={chipClass(filter === key)}>{s.label}</button>
        ))}
      </div>

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">หนังสือ</th>
                <th className="px-4 py-3">ผู้ขาย</th>
                <th className="px-4 py-3">ผู้ซื้อ</th>
                <th className="px-4 py-3">ส่งเมื่อ</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(r => (
                <tr key={r.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2">
                    <Link to={`/books/${r.book.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{r.book.title}</Link>
                    <p className="text-xs text-slate-500">{formatPrice(r.book.price)}</p>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.seller.displayName}</td>
                  <td className="px-4 py-2 text-slate-600">{r.buyer.displayName}</td>
                  <td className="px-4 py-2 text-slate-600">{dateTH(r.createdAt)}</td>
                  <td className="px-4 py-2"><StatusBadge kind="request" status={r.status} /></td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">ไม่มีรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminRequests;
