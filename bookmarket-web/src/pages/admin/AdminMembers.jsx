import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getAdminMembers, setMemberRole, deleteMember } from '../../api/backend';
import { ErrorBox, Loading, ConfirmBox, inputClass } from '../../components/admin/AdminStates';
import { dateTH } from '../../data/labels';

// รายชื่อสมาชิก + เลื่อน/ลดบทบาท + ลบสมาชิก (แถวของตัวเองกดไม่ได้ Go ก็ไม่ยอมเช่นกัน)
function AdminMembers() {
  const { token, member: me } = useAuth();
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(null);      // { member, action: 'role' | 'delete' } เปิดกล่องยืนยัน
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getAdminMembers(token);
        if (!ignore) { setMembers(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function confirmAction() {
    const m = target.member;
    setBusy(true);
    setActionError(null);
    try {
      if (target.action === 'role') {
        const updated = await setMemberRole(m.id, m.role === 'admin' ? 'member' : 'admin', token);
        setMembers(members.map(x => (x.id === updated.id ? updated : x)));   // แทนที่ด้วยข้อมูลที่ server ยืนยัน
      } else {
        await deleteMember(m.id, token);
        setMembers(members.filter(x => x.id !== m.id));
      }
      setTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = members.filter(m =>
    q === '' || m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  );

  let confirmTitle = '';
  let confirmNote = '';
  if (target?.action === 'role') {
    confirmTitle = target.member.role === 'admin'
      ? `ลด ${target.member.displayName} เป็น member ?` : `เลื่อน ${target.member.displayName} เป็น admin ?`;
    confirmNote = target.member.role === 'admin'
      ? 'คนนี้จะเข้าหลังบ้านไม่ได้อีกเมื่อ login ใหม่ (ตั๋วใบที่ถืออยู่ยังใช้ได้จนหมดอายุภายใน 1 ชั่วโมง)'
      : 'คนนี้จะจัดการหนังสือ หมวดหมู่ และสมาชิกคนอื่นได้ มีผลเมื่อเขา login ใหม่';
  } else if (target?.action === 'delete') {
    confirmTitle = `ลบบัญชี ${target.member.displayName} ?`;
    confirmNote = 'ประกาศขายและคำขอซื้อทั้งหมดของคนนี้จะถูกลบไปด้วย ย้อนกลับไม่ได้';
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">สมาชิก</h2>
          {status === 'success' && <p className="text-sm text-slate-500">ทั้งหมด {members.length} คน (admin {members.filter(m => m.role === 'admin').length})</p>}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นชื่อหรืออีเมล" className={inputClass + ' md:w-64'} />
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">สมาชิก</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">สมัครเมื่อ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map(m => {
                const isMe = m.id === me?.id;
                return (
                  <tr key={m.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{m.displayName} {isMe && <span className="text-xs text-slate-400">(คุณ)</span>}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={'rounded-full px-2 py-0.5 text-xs ' + (m.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{m.createdAt ? dateTH(m.createdAt) : '-'}</td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                      <button onClick={() => setTarget({ member: m, action: 'role' })} disabled={isMe}
                              className="text-emerald-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300">
                        {m.role === 'admin' ? 'ลดเป็น member' : 'เลื่อนเป็น admin'}
                      </button>
                      <button onClick={() => setTarget({ member: m, action: 'delete' })} disabled={isMe}
                              className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300">
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">ไม่พบสมาชิก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={confirmTitle}
                  confirmText={target?.action === 'delete' ? 'ลบสมาชิก' : 'ยืนยัน'}
                  onConfirm={confirmAction} onCancel={() => setTarget(null)}>
        <p>{confirmNote}</p>
      </ConfirmBox>
    </div>
  );
}

export default AdminMembers;
