import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-slate-500 md:grid-cols-3 md:px-6">
        <div>
          <p className="flex items-center gap-2 font-semibold text-slate-900">📚 BookMarket</p>
          <p className="mt-2">ระบบซื้อขายหนังสือมือสองสำหรับนักศึกษา ส่งต่อหนังสือเรียนให้รุ่นน้องในราคาที่เป็นมิตร</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">เมนู</p>
          <ul className="mt-2 space-y-1">
            <li><Link to="/books" className="hover:text-emerald-600">หนังสือทั้งหมด</Link></li>
            <li><Link to="/me/books/new" className="hover:text-emerald-600">ลงประกาศขาย</Link></li>
            <li><Link to="/me/cart" className="hover:text-emerald-600">ตะกร้าของฉัน</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-slate-900">หมายเหตุ</p>
          <p className="mt-2">ระบบนี้เป็นตัวกลางนัดซื้อขาย ไม่มีการชำระเงินผ่านเว็บ ผู้ซื้อและผู้ขายนัดรับของกันเองในมหาวิทยาลัย</p>
          <p className="mt-2 text-xs">Term Project วิชา BE-FE</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
