import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/backend';
import { ErrorBox, Loading, ConfirmBox, btnPrimary, btnGhost, inputClass } from '../../components/admin/AdminStates';

// หมวดหมู่: เพิ่ม แก้ชื่อในแถว และลบ (ลบหมวดที่ยังมีหนังสือ Go ตอบ 409 ข้อความโชว์ด้านบน)
function AdminCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);          // { id, name } แถวที่กำลังแก้ชื่อ
  const [target, setTarget] = useState(null);            // หมวดที่กำลังจะลบ
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getCategories();
        if (!ignore) { setCategories(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey]);

  // ตัวช่วยรวม: เปิด busy ล้าง error เดิม แล้วจับ error จาก Go มาโชว์
  async function run(work) {
    setBusy(true);
    setActionError(null);
    try {
      await work();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    run(async () => {
      const created = await createCategory(newName, token);
      setCategories([...categories, { ...created, bookCount: 0 }]);
      setNewName('');
    });
  }

  function handleRename(e) {
    e.preventDefault();
    run(async () => {
      const saved = await updateCategory(editing.id, editing.name, token);
      setCategories(categories.map(c => (c.id === saved.id ? saved : c)));
      setEditing(null);
    });
  }

  function confirmDelete() {
    run(async () => {
      try {
        await deleteCategory(target.id, token);
        setCategories(categories.filter(c => c.id !== target.id));
      } finally {
        setTarget(null);                                // ปิดกล่องเสมอ ถ้าลบไม่ได้ข้อความ 409 จะโชว์ด้านบน
      }
    });
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">หมวดหมู่หนังสือ</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อหมวดใหม่" maxLength={50} className={inputClass + ' md:w-72'} />
        <button type="submit" disabled={busy || newName.trim() === ''} className={btnPrimary + ' whitespace-nowrap'}>+ เพิ่มหมวด</button>
      </form>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ชื่อหมวด</th>
                <th className="px-4 py-3">จำนวนหนังสือ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-2">
                    {editing?.id === c.id ? (
                      <form onSubmit={handleRename} className="flex gap-2">
                        <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                               maxLength={50} aria-label="ชื่อหมวดใหม่" className={inputClass} />
                        <button type="submit" disabled={busy || editing.name.trim() === ''} className={btnPrimary}>บันทึก</button>
                        <button type="button" onClick={() => setEditing(null)} className={btnGhost}>ยกเลิก</button>
                      </form>
                    ) : c.name}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.bookCount}</td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                    <button onClick={() => setEditing({ id: c.id, name: c.name })} className="text-emerald-600 hover:underline">แก้ชื่อ</button>
                    <button onClick={() => setTarget(c)} className="text-red-600 hover:underline">ลบ</button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400">ยังไม่มีหมวดหมู่</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ลบหมวด "${target?.name}" ?`}
                  confirmText="ลบ" onConfirm={confirmDelete} onCancel={() => setTarget(null)}>
        <p>{target?.bookCount > 0 ? `หมวดนี้ยังมีหนังสือ ${target.bookCount} เล่ม ระบบจะไม่ยอมให้ลบ` : 'ลบแล้วย้อนกลับไม่ได้'}</p>
      </ConfirmBox>
    </div>
  );
}

export default AdminCategories;
