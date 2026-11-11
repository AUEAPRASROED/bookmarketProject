import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { CartProvider } from '../cart/CartContext';
import Cart from './Cart';
import { getCart, sendRequest, removeFromCart } from '../api/backend';

jest.mock('../api/backend');

const seller = { id: 2, displayName: 'พี่เอ', rating: null, reviewCount: 0 };
const CART = [
  { id: 1, title: 'Calculus', author: 'Stewart', price: 300, condition: 'good', status: 'available', categoryId: 2, category: 'คณิตศาสตร์', imageUrl: null, seller },
  { id: 2, title: 'Statics', author: 'Hibbeler', price: 700, condition: 'new', status: 'sold', categoryId: 4, category: 'วิศวกรรมศาสตร์', imageUrl: null, seller },
];

function renderCart() {
  localStorage.setItem('bookmarket.token', 'tok.3');
  localStorage.setItem('bookmarket.member', JSON.stringify({ id: 3, displayName: 'น้องบี', role: 'member' }));
  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter><Cart /></MemoryRouter>
      </CartProvider>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());

test('โหลดตะกร้าด้วยตั๋วของคนที่ login และรวมราคาเฉพาะเล่มที่ยังขายอยู่', async () => {
  getCart.mockResolvedValue(CART);
  renderCart();

  expect(await screen.findByText('Calculus')).toBeInTheDocument();
  expect(getCart).toHaveBeenCalledWith('tok.3');
  expect(screen.getByText('Statics')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ส่งคำขอซื้อทั้งหมด (1)' })).toBeEnabled();
  // เล่มที่ขายแล้วไม่มีปุ่มส่งคำขอ แต่มีป้ายบอกสถานะ
  const sold = screen.getByTestId('cart-2');
  expect(within(sold).queryByRole('button', { name: 'ส่งคำขอซื้อ' })).not.toBeInTheDocument();
  expect(within(sold).getByText('ขายแล้ว')).toBeInTheDocument();
});

test('ส่งคำขอซื้อสำเร็จ ต้องเอาเล่มนั้นออกจากตะกร้าและบอกว่าส่งแล้ว', async () => {
  const user = userEvent.setup();
  getCart.mockResolvedValue(CART);
  sendRequest.mockResolvedValue({ id: 10, status: 'pending' });
  removeFromCart.mockResolvedValue(null);
  renderCart();
  const item = await screen.findByTestId('cart-1');

  await user.click(within(item).getByRole('button', { name: 'ส่งคำขอซื้อ' }));

  expect(sendRequest).toHaveBeenCalledWith(1, '', 'tok.3');
  expect(removeFromCart).toHaveBeenCalledWith(1, 'tok.3');
  expect(await screen.findByText(/ส่งคำขอซื้อแล้ว 1 เล่ม/)).toBeInTheDocument();
  expect(screen.queryByTestId('cart-1')).not.toBeInTheDocument();
});

test('Go ตอบ 409 ต้องโชว์เหตุผลที่เล่มนั้น และยังเก็บไว้ในตะกร้า', async () => {
  const user = userEvent.setup();
  getCart.mockResolvedValue(CART);
  sendRequest.mockRejectedValue(new Error('คุณส่งคำขอซื้อเล่มนี้ไว้แล้ว'));
  renderCart();
  const item = await screen.findByTestId('cart-1');

  await user.click(within(item).getByRole('button', { name: 'ส่งคำขอซื้อ' }));

  expect(await within(item).findByText('คุณส่งคำขอซื้อเล่มนี้ไว้แล้ว')).toBeInTheDocument();
  expect(removeFromCart).not.toHaveBeenCalled();
  expect(screen.getByTestId('cart-1')).toBeInTheDocument();
});

test('ตะกร้าว่าง ต้องเห็น Empty State', async () => {
  getCart.mockResolvedValue([]);
  renderCart();

  expect(await screen.findByText('ตะกร้ายังว่างอยู่')).toBeInTheDocument();
});
