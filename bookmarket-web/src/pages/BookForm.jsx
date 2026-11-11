import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getBook, getCategories, createBook, updateBook } from '../api/backend';
import { ErrorBox, Loading, btnPrimary, btnGhost, inputClass } from '../components/admin/AdminStates';
import { CONDITIONS } from '../data/labels';

const EMPTY = { title: '', author: '', description: '', condition: 'good', price: '', imageUrl: '', categoryId: '' };

// ฟอร์มเดียวสองโหมด (แบบ AdminMovieForm): /me/books/new = ลงประกาศใหม่, /me/books/:id = แก้ไข
function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);             // state ทุกช่องอยู่ใน object เดียว
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');     // 'loading' | 'error' | 'ready' | 'saving'
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const cats = await getCategories();
        let next = EMPTY;
        if (isEdit) {
          const b = await getBook(id);
          next = {
            title: b.title, author: b.author, description: b.description ?? '', condition: b.condition,
            price: String(b.price), imageUrl: b.imageUrl ?? '', categoryId: String(b.categoryId),
          };
        }
        if (!ignore) { setCategories(cats); setForm(next); setStatus('ready'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, isEdit]);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // ตรวจในเครื่องก่อนกดส่ง Go ตรวจซ้ำอีกชั้นเสมอ (validateBook)
  const price = Number(form.price);
  const problems = [];
  if (form.title.trim() === '') problems.push('ต้องมีชื่อหนังสือ');
  if (form.author.trim() === '') problems.push('ต้องมีชื่อผู้แต่ง');
  if (form.categoryId === '') problems.push('ต้องเลือกหมวดหมู่');
  if (form.price === '' || Number.isNaN(price) || price < 0) problems.push('ราคาต้องเป็นตัวเลข 0 ขึ้นไป');
  const image = form.imageUrl.trim();
  const imageOk = image.startsWith('http') || image.startsWith('/');          // URL เต็ม หรือรูปในเว็บ เช่น /covers/book-01.svg
  if (image !== '' && !imageOk) problems.push('รูปต้องเป็น URL ที่ขึ้นต้นด้วย http หรือ /covers/');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    setSaveError(null);
    const fields = {
      title: form.title, author: form.author, description: form.description, condition: form.condition,
      price, imageUrl: form.imageUrl, categoryId: Number(form.categoryId),
    };
    try {
      const saved = isEdit ? await updateBook(id, fields, token) : await createBook(fields, token);
      navigate(`/books/${saved.id}`);
    } catch (err) {
      setSaveError(err.message);                   // 400 / 404 จาก Go
      setStatus('ready');
    }
  }

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorBox error={error} /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{isEdit ? 'แก้ไขประกาศ' : 'ลงประกาศขายหนังสือ'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-emerald-100 bg-white p-5">
        <label className="block text-sm text-slate-600">ชื่อหนังสือ
          <input name="title" value={form.title} onChange={change} maxLength={255} className={inputClass + ' mt-1'} />
        </label>
        <label className="block text-sm text-slate-600">ผู้แต่ง
          <input name="author" value={form.author} onChange={change} maxLength={255} className={inputClass + ' mt-1'} />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm text-slate-600">หมวดหมู่
            <select name="categoryId" value={form.categoryId} onChange={change} className={inputClass + ' mt-1'}>
              <option value="">เลือกหมวด</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-600">สภาพ
            <select name="condition" value={form.condition} onChange={change} className={inputClass + ' mt-1'}>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-600">ราคา (บาท)
            <input name="price" type="number" min="0" step="1" value={form.price} onChange={change} className={inputClass + ' mt-1'} />
          </label>
        </div>
        <label className="block text-sm text-slate-600">รายละเอียด (ไม่บังคับ)
          <textarea name="description" rows={4} value={form.description} onChange={change}
                    placeholder="เช่น มีไฮไลต์บางหน้า ใช้เรียนวิชา ..." className={inputClass + ' mt-1'} />
        </label>
        <label className="block text-sm text-slate-600">URL รูปปก (ไม่บังคับ)
          <input name="imageUrl" value={form.imageUrl} onChange={change} placeholder="https://..." className={inputClass + ' mt-1'} />
        </label>
        {image !== '' && imageOk && (
          <img src={form.imageUrl} alt="ตัวอย่างรูปปก" className="h-40 rounded-lg border border-slate-200 object-cover" />
        )}

        {problems.length > 0 && (
          <ul className="list-inside list-disc text-sm text-amber-600">
            {problems.map(p => <li key={p}>{p}</li>)}
          </ul>
        )}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={status === 'saving' || problems.length > 0} className={btnPrimary}>
            {status === 'saving' ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'ลงประกาศ'}
          </button>
          <Link to="/me/books" className={btnGhost}>ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}

export default BookForm;
