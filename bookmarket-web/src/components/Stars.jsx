// ดาวแสดงคะแนนร้าน 1-5 (ปัดเป็นดาวเต็ม) และตัวเลือกดาวสำหรับฟอร์มรีวิว

export function Stars({ value, className = 'text-base' }) {
  const full = Math.round(value ?? 0);
  return (
    <span className={'tracking-tight ' + className} aria-label={value == null ? 'ยังไม่มีคะแนน' : `${value} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= full ? 'text-amber-400' : 'text-slate-300'}>★</span>
      ))}
    </span>
  );
}

// ปุ่มดาว 5 ปุ่ม กดดาวที่ n = ให้ n คะแนน
export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="group" aria-label="ให้คะแนนร้าน">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} ดาว`}
                className={'text-3xl transition hover:scale-110 ' + (n <= value ? 'text-amber-400' : 'text-slate-300')}>
          ★
        </button>
      ))}
    </div>
  );
}
