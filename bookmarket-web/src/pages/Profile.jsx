import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { updateMe, changePassword } from '../api/backend';
import { inputClass, btnPrimary } from '../components/admin/AdminStates';
import { dateTH } from '../data/labels';

// ส่วนแก้ข้อมูลส่วนตัว: ชื่อที่แสดง + ช่องติดต่อ (อีเมลและบทบาทแก้ไม่ได้)
function ProfileForm() {
  const { member, token, updateMember } = useAuth();
  const [form, setForm] = useState({ displayName: member.displayName, contact: member.contact ?? '' });
  const [status, setStatus] = useState('typing');     // 'typing' | 'saving' | 'saved'
  const [error, setError] = useState(null);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });   // state เป็น object เดียว (แบบ AdminMovieForm)
    setStatus('typing');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      const saved = await updateMe(form, token);
      updateMember(saved);                              // Navbar เปลี่ยนชื่อตามทันที
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('typing');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-emerald-100 bg-white p-5">
      <h2 className="font-semibold text-slate-900">ข้อมูลส่วนตัว</h2>
      <p className="text-sm text-slate-500">{member.email} | บทบาท {member.role}{member.createdAt && ` | สมัครเมื่อ ${dateTH(member.createdAt)}`}</p>
      <label className="block text-sm text-slate-600">ชื่อที่แสดง
        <input name="displayName" value={form.displayName} onChange={change} required maxLength={50} className={inputClass + ' mt-1'} />
      </label>
      <label className="block text-sm text-slate-600">ช่องทางติดต่อ (LINE ID / เบอร์โทร)
        <input name="contact" value={form.contact} onChange={change} maxLength={100} className={inputClass + ' mt-1'} />
      </label>
      <button type="submit" disabled={status === 'saving'} className={btnPrimary}>
        {status === 'saving' ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
      {status === 'saved' && <p className="text-sm text-emerald-700">บันทึกแล้ว</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

// ส่วนเปลี่ยนรหัสผ่าน: ต้องกรอกรหัสเดิม และรหัสใหม่สองครั้งให้ตรงกัน (เช็กในเครื่องก่อน Go เช็กซ้ำอีกชั้น)
function PasswordForm() {
  const { token } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState('typing');
  const [error, setError] = useState(null);

  const mismatch = form.confirm !== '' && form.next !== form.confirm;
  const tooShort = form.next !== '' && form.next.length < 8;

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setStatus('typing');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    try {
      await changePassword(form.current, form.next, token);      // 204 สำเร็จ
      setForm({ current: '', next: '', confirm: '' });
      setStatus('saved');
    } catch (err) {
      setError(err.message);                                     // "รหัสผ่านเดิมไม่ถูกต้อง" จาก Go
      setStatus('typing');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-emerald-100 bg-white p-5">
      <h2 className="font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
      <label className="block text-sm text-slate-600">รหัสผ่านเดิม
        <input type="password" name="current" value={form.current} onChange={change} required className={inputClass + ' mt-1'} />
      </label>
      <label className="block text-sm text-slate-600">รหัสผ่านใหม่ (8 ตัวขึ้นไป)
        <input type="password" name="next" value={form.next} onChange={change} required className={inputClass + ' mt-1'} />
      </label>
      <label className="block text-sm text-slate-600">ยืนยันรหัสผ่านใหม่
        <input type="password" name="confirm" value={form.confirm} onChange={change} required className={inputClass + ' mt-1'} />
      </label>
      {tooShort && <p className="text-sm text-amber-600">รหัสผ่านใหม่ต้องยาว 8 ตัวขึ้นไป</p>}
      {mismatch && <p className="text-sm text-amber-600">รหัสผ่านใหม่สองช่องไม่ตรงกัน</p>}
      <button type="submit" disabled={status === 'saving' || mismatch || tooShort || form.confirm === ''} className={btnPrimary}>
        {status === 'saving' ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
      </button>
      {status === 'saved' && <p className="text-sm text-emerald-700">เปลี่ยนรหัสผ่านแล้ว ครั้งหน้าให้เข้าสู่ระบบด้วยรหัสใหม่</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

function Profile() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">บัญชีของฉัน</h1>
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}

export default Profile;
