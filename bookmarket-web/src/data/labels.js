// ป้ายภาษาไทยของค่าที่เก็บในฐานข้อมูลเป็นภาษาอังกฤษ (ต้องตรงกับ CHECK ใน schema.sql)

export const CONDITIONS = [
  { value: 'new', label: 'ใหม่' },
  { value: 'like_new', label: 'เหมือนใหม่' },
  { value: 'good', label: 'ดี' },
  { value: 'fair', label: 'พอใช้' },
];

export const conditionLabel = (value) => CONDITIONS.find(c => c.value === value)?.label ?? value;

export const BOOK_STATUS = {
  available: { label: 'ขายอยู่', className: 'bg-emerald-100 text-emerald-700' },
  reserved: { label: 'ติดจอง', className: 'bg-amber-100 text-amber-700' },
  sold: { label: 'ขายแล้ว', className: 'bg-slate-200 text-slate-600' },
};

export const REQUEST_STATUS = {
  pending: { label: 'รอผู้ขายตอบ', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'ผู้ขายยอมรับแล้ว', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'ถูกปฏิเสธ', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ยกเลิกแล้ว', className: 'bg-slate-200 text-slate-600' },
  completed: { label: 'ซื้อขายเสร็จ', className: 'bg-sky-100 text-sky-700' },
};

export const formatPrice = (price) =>
  Number(price).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' บาท';

export const dateTH = (iso) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
