import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BookGrid from '../components/BookGrid';
import { getBooks } from '../api/backend';
import { useAuth } from '../auth/AuthContext';

function Home() {
  const { isLoggedIn } = useAuth();
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;                            // ธงกันคำตอบเก่ามาทับคำตอบใหม่
    async function load() {
      setStatus('loading');
      try {
        const list = await getBooks();
        if (!ignore) { setBooks(list.slice(0, 8)); setStatus('success'); }   // หน้าแรกโชว์ 8 เล่มล่าสุด
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <section className="rounded-2xl bg-emerald-50 px-6 py-10 md:px-10">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">ซื้อขายหนังสือเรียนมือสอง ในราคานักศึกษา</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          หาหนังสือเรียนเล่มที่ต้องใช้จากรุ่นพี่ หรือเอาเล่มที่ไม่ได้ใช้แล้วมาขายต่อ ส่งคำขอซื้อ แล้วนัดรับของกันเองในมหาวิทยาลัย
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/books" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">ดูหนังสือทั้งหมด</Link>
          <Link to={isLoggedIn ? '/me/books/new' : '/register'}
                className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50">
            {isLoggedIn ? 'ลงประกาศขาย' : 'สมัครสมาชิกเพื่อลงขาย'}
          </Link>
        </div>
      </section>

      <div className="mb-4 mt-10 flex items-end justify-between">
        <h2 className="text-xl font-semibold text-slate-900">ลงประกาศล่าสุด</h2>
        <Link to="/books" className="text-sm text-emerald-600 hover:underline">ดูทั้งหมด</Link>
      </div>
      <BookGrid books={books} status={status} error={error} onRetry={() => setReloadKey(k => k + 1)}
                emptyText="ยังไม่มีใครลงประกาศขาย เป็นคนแรกเลย" />
    </div>
  );
}

export default Home;
