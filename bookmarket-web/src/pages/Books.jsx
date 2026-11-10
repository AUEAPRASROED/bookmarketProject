import { useEffect, useState } from 'react';
import BookGrid from '../components/BookGrid';
import { getBooks, getCategories } from '../api/backend';

// โครงเดียวกับหน้า Movies ของ MovieHub: โหลดครั้งเดียว แล้วค้นหา/กรองหมวดในเครื่อง ไม่ยิง API ซ้ำทุกครั้งที่พิมพ์
function Books() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');     // 'all' = ทุกหมวด
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');     // 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);       // ตัวนับสำหรับปุ่ม "ลองใหม่"

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const [list, cats] = await Promise.all([getBooks(), getCategories()]);   // สองคำขอพร้อมกัน
        if (!ignore) {
          setBooks(list);
          setCategories(cats);
          setStatus('success');
        }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey]);

  // ค่าที่คำนวณจาก state ไม่ต้องเป็น state เอง
  const q = query.trim().toLowerCase();
  const shown = books.filter(b =>
    (category === 'all' || b.categoryId === category) &&
    (q === '' || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
  );

  const chipClass = (active) =>
    'rounded-full border px-3 py-1 text-sm transition ' +
    (active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-200 bg-white text-slate-600 hover:bg-emerald-50');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">หนังสือมือสอง</h1>
          {status === 'success' && <p className="text-sm text-slate-500">พบ {shown.length} จาก {books.length} เล่ม</p>}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="ค้นหาชื่อหนังสือหรือผู้แต่ง..."
               className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 md:w-72" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory('all')} className={chipClass(category === 'all')}>ทุกหมวด</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={chipClass(category === c.id)}>{c.name}</button>
        ))}
      </div>

      <BookGrid books={shown} status={status} error={error} onRetry={() => setReloadKey(k => k + 1)} />
    </div>
  );
}

export default Books;
