import { NavLink, Outlet } from 'react-router-dom';

const tabClass = ({ isActive }) =>
  'rounded-full px-4 py-1.5 text-sm transition ' +
  (isActive ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-emerald-50');

// เมนูร่วมของทุกหน้าหลังบ้าน หน้าลูกมาแสดงตรง <Outlet /> (Week 12 ข้อ 6.3)
function AdminLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-emerald-100 pb-4">
        <h1 className="mr-2 text-xl font-semibold text-slate-900">หลังบ้าน</h1>
        <nav className="flex flex-wrap gap-1">
          <NavLink to="/admin" end className={tabClass}>ภาพรวม</NavLink>
          <NavLink to="/admin/books" className={tabClass}>หนังสือ</NavLink>
          <NavLink to="/admin/categories" className={tabClass}>หมวดหมู่</NavLink>
          <NavLink to="/admin/requests" className={tabClass}>รายการซื้อขาย</NavLink>
          <NavLink to="/admin/members" className={tabClass}>สมาชิก</NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

export default AdminLayout;
