// ปกหนังสือ: มี URL รูปก็ใช้รูป ไม่มีก็วาด "ปกจำลอง" สีไล่ระดับ เลือกสีจากเลขหนังสือ เล่มเดิมได้สีเดิมเสมอ
// เขียน class เต็ม ๆ ไว้ในอาร์เรย์ Tailwind จึงหาเจอตอน build (ห้ามต่อชื่อ class เองแบบ `from-${color}`)
const PALETTES = [
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-amber-300 to-orange-500',
  'from-rose-400 to-fuchsia-600',
  'from-lime-400 to-emerald-600',
  'from-violet-400 to-purple-700',
  'from-cyan-400 to-blue-600',
  'from-orange-300 to-rose-500',
];

function BookCover({ book, className = '' }) {
  if (book.imageUrl) {
    return <img src={book.imageUrl} alt={`ปก ${book.title}`} loading="lazy" className={'object-cover ' + className} />;
  }
  const palette = PALETTES[book.id % PALETTES.length];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${palette} ${className}`} aria-hidden="true">
      <div className="absolute inset-y-0 left-3 w-1.5 bg-white/25" />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
      <div className="absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-black/10" />
      <div className="relative grid h-full w-full place-items-center">
        <span className="text-6xl font-semibold text-white/90 drop-shadow">{book.title.charAt(0)}</span>
      </div>
      <span className="absolute bottom-3 right-3 text-2xl">📖</span>
    </div>
  );
}

export default BookCover;
