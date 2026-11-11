import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookGrid from '../components/BookGrid';
import { getBooks, getCategories } from '../api/backend';
import { useAuth } from '../auth/AuthContext';

// ไอคอนหมวด: เลือกตามลำดับ ไม่ได้ผูกกับชื่อ เพราะ admin เพิ่ม/แก้หมวดเองได้
const CATEGORY_ICONS = ['🔬', '📐', '💻', '⚙️', '📊', '🗣️', '🌏', '📦', '🎨', '🧪'];

const STEPS = [
  { icon: '🔎', title: 'ค้นหาเล่มที่ใช่', text: 'ค้นจากชื่อหนังสือ ผู้แต่ง หรือกรองตามหมวดวิชา' },
  { icon: '🛒', title: 'ใส่ตะกร้า ส่งคำขอซื้อ', text: 'เก็บเล่มที่สนใจไว้ในตะกร้า แล้วส่งคำขอถึงผู้ขาย' },
  { icon: '🤝', title: 'นัดรับในมหาวิทยาลัย', text: 'ผู้ขายยอมรับแล้วจะเห็นช่องทางติดต่อ นัดรับของกันเอง' },
  { icon: '⭐', title: 'รีวิวร้าน', text: 'ซื้อขายเสร็จแล้วให้คะแนนร้าน ช่วยเพื่อนเลือกผู้ขายที่ไว้ใจได้' },
];

function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;                            // ธงกันคำตอบเก่ามาทับคำตอบใหม่
    async function load() {
      setStatus('loading');
      try {
        const [list, cats] = await Promise.all([getBooks(), getCategories()]);
        if (!ignore) { setBooks(list); setCategories(cats); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey]);

  // ส่งคำค้น/หมวดไปหน้า Books ผ่าน state ของ navigate (แบบที่ ProtectedRoute ส่ง from ไปหน้า Login)
  function handleSearch(e) {
    e.preventDefault();
    navigate('/books', { state: { q: query } });
  }

  const available = books.filter(b => b.status === 'available').length;

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-teal-300/20" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.3fr_1fr] md:px-6 md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
              📚 ตลาดหนังสือเรียนมือสองของนักศึกษา
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              หนังสือเรียนเล่มที่ใช่<br />ในราคาที่นักศึกษาจ่ายไหว
            </h1>
            <p className="mt-4 max-w-xl text-emerald-50">
              ซื้อต่อจากรุ่นพี่ ขายต่อให้รุ่นน้อง ส่งคำขอซื้อแล้วนัดรับของกันเองในมหาวิทยาลัย
            </p>
            <form onSubmit={handleSearch} className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl">
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                     placeholder="ค้นหาชื่อหนังสือหรือผู้แต่ง เช่น Calculus"
                     className="min-w-0 flex-1 rounded-xl px-3 py-2 text-slate-800 focus:outline-none" />
              <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-2 font-medium text-white hover:bg-emerald-600">ค้นหา</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link to={isLoggedIn ? '/me/books/new' : '/register'}
                    className="rounded-full border border-white/40 px-4 py-2 font-medium hover:bg-white/10">
                {isLoggedIn ? '+ ลงประกาศขาย' : 'สมัครสมาชิกเพื่อลงขาย'}
              </Link>
              <Link to="/books" className="rounded-full px-4 py-2 hover:bg-white/10">ดูหนังสือทั้งหมด</Link>
            </div>
          </div>

          {/* ตัวเลขจริงจากฐานข้อมูล ไม่ได้ฝังค่าไว้ */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'เล่มที่ขายอยู่', value: status === 'success' ? available : '...' },
              { label: 'หมวดวิชา', value: status === 'success' ? categories.length : '...' },
              { label: 'จ่ายผ่านเว็บ', value: '0 บาท' },
              { label: 'นัดรับ', value: 'ในมอ.' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <p className="text-3xl font-semibold">{s.value}</p>
                <p className="mt-1 text-sm text-emerald-50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ---------- หมวดหมู่ ---------- */}
        {categories.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-slate-900">เลือกตามหมวดวิชา</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((c, i) => (
                <button key={c.id} onClick={() => navigate('/books', { state: { category: c.id } })}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-2xl">
                    {CATEGORY_ICONS[i % CATEGORY_ICONS.length]}
                  </span>
                  <span>
                    <span className="block font-medium text-slate-900">{c.name}</span>
                    <span className="text-xs text-slate-500">{books.filter(b => b.categoryId === c.id).length} เล่มที่ขายอยู่</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ---------- ลงประกาศล่าสุด ---------- */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-slate-900">ลงประกาศล่าสุด</h2>
            <Link to="/books" className="text-sm font-medium text-emerald-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <BookGrid books={books.slice(0, 8)} status={status} error={error} onRetry={() => setReloadKey(k => k + 1)}
                    emptyText="ยังไม่มีใครลงประกาศขาย เป็นคนแรกเลย" />
        </section>

        {/* ---------- วิธีใช้งาน ---------- */}
        <section className="mt-16 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="text-center text-xl font-semibold text-slate-900">ใช้งานง่าย 4 ขั้นตอน</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-3xl">{s.icon}</span>
                <p className="mt-3 text-xs font-semibold text-emerald-600">ขั้นที่ {i + 1}</p>
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
