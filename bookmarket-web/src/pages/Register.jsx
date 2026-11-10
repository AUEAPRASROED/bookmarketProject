import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { inputClass } from '../components/admin/AdminStates';

// โครงเดียวกับหน้า Login ต่างกันแค่ช่องกรอกและฟังก์ชันที่เรียก
function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await register(email, password, displayName, contact);
      navigate('/');
    } catch (err) {
      setError(err.message);                       // 409 อีเมลซ้ำ หรือ 400 กรอกไม่ครบ ข้อความมาจาก Go
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ชื่อที่แสดง" required maxLength={50} className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" required className={inputClass} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน (8 ตัวขึ้นไป)" required minLength={8} className={inputClass} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ช่องทางติดต่อ เช่น LINE ID หรือเบอร์โทร (ไม่บังคับ)" maxLength={100} className={inputClass} />
        <p className="text-xs text-slate-400">ช่องทางติดต่อจะแสดงให้คู่ซื้อขายเห็นเมื่อมีการตกลงซื้อขายแล้วเท่านั้น</p>
        <button type="submit" disabled={status === 'submitting'}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:bg-slate-300">
          {status === 'submitting' ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="mt-6 text-sm text-slate-500">
        มีบัญชีแล้ว? <Link to="/login" className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
      </p>
    </div>
  );
}

export default Register;
