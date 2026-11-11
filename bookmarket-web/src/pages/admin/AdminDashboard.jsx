import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getAdminStats } from '../../api/backend';
import { ErrorBox, Loading } from '../../components/admin/AdminStates';

// การ์ดตัวเลข 1 ใบ
function StatCard({ label, value, to }) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    </>
  );
  const cls = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
  return to ? <Link to={to} className={cls + ' block hover:border-emerald-300'}>{body}</Link> : <div className={cls}>{body}</div>;
}

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const data = await getAdminStats(token);           // ยิงครั้งเดียว ได้ทุกตัวเลขของหน้านี้
        if (!ignore) { setStats(data); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">สมาชิก</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="สมาชิกทั้งหมด" value={stats.members} to="/admin/members" />
          <StatCard label="admin" value={stats.admins} />
          <StatCard label="หมวดหมู่" value={stats.categories} to="/admin/categories" />
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">หนังสือที่ลงประกาศ</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="ทั้งหมด" value={stats.books} to="/admin/books" />
          <StatCard label="ขายอยู่" value={stats.booksAvailable} />
          <StatCard label="ติดจอง" value={stats.booksReserved} />
          <StatCard label="ขายแล้ว" value={stats.booksSold} />
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">รายการซื้อขาย</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="คำขอทั้งหมด" value={stats.requests} to="/admin/requests" />
          <StatCard label="รอผู้ขายตอบ" value={stats.requestsPending} />
          <StatCard label="ซื้อขายเสร็จ" value={stats.requestsCompleted} />
          <StatCard label="รีวิวร้าน" value={stats.reviews ?? 0} />
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
