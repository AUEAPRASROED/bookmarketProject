import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getCart, addToCart, removeFromCart } from '../api/backend';

// ตะกร้าเป็น "กล่องกลาง" อีกใบแบบเดียวกับ AuthContext: Navbar ใช้นับจำนวน หน้า BookDetail ใช้ใส่ตะกร้า หน้า Cart ใช้แสดงรายการ
// ข้อมูลจริงอยู่ในตาราง cart_items ผ่าน Go ไม่ได้เก็บใน localStorage จึงเห็นตะกร้าเดิมแม้เปลี่ยนเครื่อง
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');       // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // โหลดใหม่ทุกครั้งที่ตั๋วเปลี่ยน (login / logout / สลับบัญชี)
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!token) {                                    // ยังไม่ login: ตะกร้าว่าง ไม่ต้องยิง
        setItems([]);
        setStatus('idle');
        return;
      }
      setStatus('loading');
      try {
        const list = await getCart(token);
        if (!ignore) { setItems(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function add(book) {
    await addToCart(book.id, token);                   // ถ้า Go ตอบ error จะ throw ให้หน้าที่เรียกจับเอง
    setItems(prev => (prev.some(b => b.id === book.id) ? prev : [book, ...prev]));
  }

  async function remove(bookId) {
    await removeFromCart(bookId, token);
    setItems(prev => prev.filter(b => b.id !== bookId));
  }

  const inCart = (bookId) => items.some(b => b.id === bookId);
  const reload = () => setReloadKey(k => k + 1);

  const value = { items, count: items.length, status, error, inCart, add, remove, reload };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
