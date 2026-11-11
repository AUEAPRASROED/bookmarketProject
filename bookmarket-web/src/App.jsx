import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { CartProvider } from './cart/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import MyBooks from './pages/MyBooks';
import BookForm from './pages/BookForm';
import MyRequests from './pages/MyRequests';
import IncomingRequests from './pages/IncomingRequests';
import Cart from './pages/Cart';
import SellerPage from './pages/SellerPage';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBooks from './pages/admin/AdminBooks';
import AdminCategories from './pages/admin/AdminCategories';
import AdminRequests from './pages/admin/AdminRequests';
import AdminMembers from './pages/admin/AdminMembers';

function App() {
  return (
    // AuthProvider ครอบทั้งแอป ทุกหน้าข้างในจึงเรียก useAuth() ได้
    // CartProvider อยู่ข้างใน เพราะต้องใช้ token จาก useAuth() ไปโหลดตะกร้า
    <AuthProvider>
      <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Guest เข้าได้ */}
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sellers/:id" element={<SellerPage />} />

            {/* Member: ต้อง login */}
            <Route path="/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/me/books" element={<ProtectedRoute><MyBooks /></ProtectedRoute>} />
            <Route path="/me/books/new" element={<ProtectedRoute><BookForm /></ProtectedRoute>} />
            <Route path="/me/books/:id" element={<ProtectedRoute><BookForm /></ProtectedRoute>} />
            <Route path="/me/requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
            <Route path="/me/incoming" element={<ProtectedRoute><IncomingRequests /></ProtectedRoute>} />
            <Route path="/me/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />

            {/* Admin: ครอบทั้งกิ่งด้วย RequireRole ครั้งเดียว หน้าลูกทุกหน้าได้รับการป้องกันหมด (Week 12 ข้อ 6.3) */}
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<AdminDashboard />} />
              <Route path="books" element={<AdminBooks />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="members" element={<AdminMembers />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
