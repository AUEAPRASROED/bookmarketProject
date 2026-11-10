import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getIncomingRequests, setRequestStatus } from '../api/backend';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Loading, ConfirmBox } from '../components/admin/AdminStates';
import { formatPrice, dateTH } from '../data/labels';

// ปุ่มที่ผู้ขายกดได้ในแต่ละสถานะ (ต้องตรงกับกติกาใน store.UpdateRequestStatus ฝั่ง Go)
const ACTIONS = {
  pending: [
    { next: 'accepted', label: 'ยอมรับ', note: 'หนังสือจะเป็น "ติดจอง" และคำขออื่นที่รออยู่ของเล่มนี้จะถูกปฏิเสธอัตโนมัติ' },
    { next: 'rejected', label: 'ปฏิเสธ', note: 'ผู้ซื้อจะเห็นว่าคำขอถูกปฏิเสธ' },
  ],
  accepted: [
    { next: 'completed', label: 'ซื้อขายเสร็จ', note: 'หนังสือจะเปลี่ยนเป็น "ขายแล้ว" และหายจากหน้าหนังสือ' },
  ],
};

// ผลของแต่ละปุ่มต่อสถานะหนังสือ ใช้อัปเดตหน้าจอหลัง Go ยืนยันสำเร็จ
const BOOK_AFTER = { accepted: 'reserved', completed: 'sold' };

function IncomingRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);         // { request, action } ที่กำลังจะยืนยัน
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getIncomingRequests(token);
        if (!ignore) { setRequests(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function confirmAction() {
    const { request, action } = target;
    setBusy(true);
    setActionError(null);
    try {
      await setRequestStatus(request.id, action.next, token);
      setRequests(requests.map(r => {
        if (r.id === request.id) {
          const book = BOOK_AFTER[action.next] ? { ...r.book, status: BOOK_AFTER[action.next] } : r.book;
          return { ...r, status: action.next, book };
        }
        // ยอมรับคำขอหนึ่งแล้ว คำขอ pending อื่นของเล่มเดียวกันถูก Go ปฏิเสธให้ในคำขอเดียวกัน
        if (action.next === 'accepted' && r.book.id === request.book.id && r.status === 'pending') {
          return { ...r, status: 'rejected', book: { ...r.book, status: 'reserved' } };
        }
        return r;
      }));
      setTarget(null);
    } catch (err) {
      setActionError(err.message);                   // 409 สถานะเปลี่ยนไปแล้ว ฯลฯ
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">คำขอที่เข้ามา</h1>
      <p className="mb-6 text-sm text-slate-500">คำขอซื้อที่สมาชิกส่งมายังหนังสือของคุณ</p>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && requests.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">ยังไม่มีคำขอซื้อเข้ามา</p>
      )}
      {status === 'success' && requests.length > 0 && (
        <ul className="space-y-3">
          {requests.map(r => (
            <li key={r.id} className="rounded-xl border border-emerald-100 bg-white p-4" data-testid={`request-${r.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={`/books/${r.book.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{r.book.title}</Link>
                  <p className="text-sm text-slate-500">{formatPrice(r.book.price)} | ส่งเมื่อ {dateTH(r.createdAt)}</p>
                </div>
                <StatusBadge kind="request" status={r.status} />
              </div>
              <div className="mt-2 text-sm text-slate-600">
                <p>ผู้ซื้อ: <span className="font-medium">{r.buyer.displayName}</span>{r.buyer.contact && ` | ติดต่อ ${r.buyer.contact}`}</p>
                {r.message && <p>ข้อความ: {r.message}</p>}
              </div>
              {ACTIONS[r.status] && (
                <div className="mt-3 flex gap-4 text-sm">
                  {ACTIONS[r.status].map(a => (
                    <button key={a.next} onClick={() => setTarget({ request: r, action: a })}
                            className={a.next === 'rejected' ? 'text-red-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy}
                  title={target ? `${target.action.label}: "${target.request.book.title}" ของ ${target.request.buyer.displayName} ?` : ''}
                  confirmText="ยืนยัน" onConfirm={confirmAction} onCancel={() => setTarget(null)}>
        <p>{target?.action.note}</p>
      </ConfirmBox>
    </div>
  );
}

export default IncomingRequests;
