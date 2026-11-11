import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMyRequests, setRequestStatus } from '../api/backend';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Loading, ConfirmBox } from '../components/admin/AdminStates';
import { formatPrice, dateTH } from '../data/labels';

// คำขอซื้อของฉัน (ฝั่งผู้ซื้อ): ติดตามสถานะ เห็นช่องติดต่อผู้ขายเมื่อผู้ขายยอมรับแล้ว ยกเลิกได้ถ้ายังไม่ซื้อขายเสร็จ
function MyRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);         // คำขอที่กำลังจะยกเลิก
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getMyRequests(token);
        if (!ignore) { setRequests(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function confirmCancel() {
    setBusy(true);
    setActionError(null);
    try {
      await setRequestStatus(target.id, 'cancelled', token);
      // ยกเลิกแล้วช่องติดต่อของผู้ขายต้องหายด้วย (Go ก็จะไม่ส่งมาอีกในครั้งหน้า)
      setRequests(requests.map(r => (r.id === target.id
        ? { ...r, status: 'cancelled', seller: { ...r.seller, contact: null } }
        : r)));
      setTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">คำขอซื้อของฉัน</h1>
      <p className="mb-6 text-sm text-slate-500">เมื่อผู้ขายยอมรับ จะเห็นช่องทางติดต่อเพื่อนัดรับหนังสือ</p>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && requests.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          ยังไม่เคยส่งคำขอซื้อ <Link to="/books" className="text-emerald-600 hover:underline">ไปดูหนังสือ</Link>
        </p>
      )}
      {status === 'success' && requests.length > 0 && (
        <ul className="space-y-3">
          {requests.map(r => (
            <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={`/books/${r.book.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{r.book.title}</Link>
                  <p className="text-sm text-slate-500">
                    {formatPrice(r.book.price)} | ผู้ขาย <Link to={`/sellers/${r.seller.id}`} className="hover:text-emerald-600 hover:underline">{r.seller.displayName}</Link> | ส่งเมื่อ {dateTH(r.createdAt)}
                  </p>
                </div>
                <StatusBadge kind="request" status={r.status} />
              </div>
              {r.message && <p className="mt-2 text-sm text-slate-600">ข้อความของฉัน: {r.message}</p>}
              {r.seller.contact && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">ติดต่อผู้ขาย: {r.seller.contact}</p>
              )}
              {r.status === 'completed' && (
                <Link to={`/sellers/${r.seller.id}`} className="mt-3 inline-block text-sm font-medium text-amber-600 hover:underline">
                  ⭐ รีวิวร้านของ {r.seller.displayName}
                </Link>
              )}
              {(r.status === 'pending' || r.status === 'accepted') && (
                <button onClick={() => setTarget(r)} className="mt-3 text-sm text-red-600 hover:underline">ยกเลิกคำขอ</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ยกเลิกคำขอซื้อ "${target?.book.title}" ?`}
                  confirmText="ยืนยันยกเลิก" onConfirm={confirmCancel} onCancel={() => setTarget(null)}>
        <p>{target?.status === 'accepted'
          ? 'ผู้ขายยอมรับคำขอนี้แล้ว ถ้ายกเลิก หนังสือจะกลับไปเปิดขายให้คนอื่น'
          : 'ยกเลิกแล้วส่งคำขอใหม่ได้ ถ้าหนังสือยังขายอยู่'}</p>
      </ConfirmBox>
    </div>
  );
}

export default MyRequests;
