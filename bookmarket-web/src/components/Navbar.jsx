import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';

const linkClass = ({ isActive }) =>
  'rounded-full px-3 py-1.5 text-sm transition ' +
  (isActive ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');

function Navbar() {
  const { isLoggedIn, isAdmin, member, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">📚</span>
          Book<span className="-ml-2 text-emerald-600">Market</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1">
          <NavLink to="/" end className={linkClass}>หน้าแรก</NavLink>
          <NavLink to="/books" className={linkClass}>หนังสือ</NavLink>
          {/* เมนูสมาชิกโผล่เมื่อ login แล้วเท่านั้น แต่หน้าเหล่านี้ยังมี ProtectedRoute และ Go ตรวจตั๋วอีกชั้น */}
          {isLoggedIn && <NavLink to="/me/books" className={linkClass}>สินค้าของฉัน</NavLink>}
          {isLoggedIn && <NavLink to="/me/incoming" className={linkClass}>คำขอที่เข้ามา</NavLink>}
          {isLoggedIn && <NavLink to="/me/requests" className={linkClass}>คำขอซื้อของฉัน</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}>หลังบ้าน</NavLink>}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {isLoggedIn ? (
            <>
              <NavLink to="/me/cart" aria-label={`ตะกร้า ${count} เล่ม`}
                       className={({ isActive }) => 'relative rounded-full p-2 text-xl transition ' + (isActive ? 'bg-emerald-50' : 'hover:bg-slate-100')}>
                🛒
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </NavLink>
              <NavLink to="/me" className={linkClass}>
                <span className="mr-1 inline-grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                  {member?.displayName?.charAt(0)}
                </span>
                {member?.displayName}
              </NavLink>
              <button onClick={handleLogout} className="rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">ออกจากระบบ</button>
            </>
          ) : (
            <>
              <Link to="/register" className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100">สมัครสมาชิก</Link>
              <Link to="/login" className="rounded-full bg-emerald-500 px-4 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-600">
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
