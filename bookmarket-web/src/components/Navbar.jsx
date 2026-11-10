import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }) =>
  'text-sm transition ' + (isActive ? 'font-medium text-emerald-600' : 'text-slate-500 hover:text-emerald-600');

function Navbar() {
  const { isLoggedIn, isAdmin, member, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="border-b border-emerald-100 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 md:px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight text-emerald-600">📚 BookMarket</Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={linkClass}>หน้าแรก</NavLink>
          <NavLink to="/books" className={linkClass}>หนังสือ</NavLink>
          {/* เมนูสมาชิกโผล่เมื่อ login แล้วเท่านั้น แต่หน้าเหล่านี้ยังมี ProtectedRoute และ Go ตรวจตั๋วอีกชั้น */}
          {isLoggedIn && <NavLink to="/me/books" className={linkClass}>ประกาศของฉัน</NavLink>}
          {isLoggedIn && <NavLink to="/me/incoming" className={linkClass}>คำขอที่เข้ามา</NavLink>}
          {isLoggedIn && <NavLink to="/me/requests" className={linkClass}>คำขอซื้อของฉัน</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}>หลังบ้าน</NavLink>}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <>
              <NavLink to="/me" className={linkClass}>สวัสดี {member?.displayName}</NavLink>
              <button onClick={handleLogout} className="text-slate-500 hover:text-emerald-600">ออกจากระบบ</button>
            </>
          ) : (
            <>
              <Link to="/register" className="text-slate-500 hover:text-emerald-600">สมัครสมาชิก</Link>
              <Link to="/login" className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">
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
