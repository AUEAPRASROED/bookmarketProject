import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import SellerPage from './SellerPage';
import { getSeller, getMyRequests, addSellerReview } from '../api/backend';

jest.mock('../api/backend');

const SELLER_DATA = {
  seller: { id: 2, displayName: 'พี่เอ', createdAt: '2026-10-01T08:00:00Z', rating: 5, reviewCount: 1, booksSold: 2 },
  books: [],
  reviews: [
    { id: 1, rating: 5, text: 'สภาพดีตรงปก', createdAt: '2026-11-01T08:00:00Z', reviewer: { id: 4, displayName: 'นิดา' } },
  ],
};
const COMPLETED_WITH_SELLER = [{ id: 7, status: 'completed', seller: { id: 2, displayName: 'พี่เอ', contact: null } }];

function renderPage({ loggedIn = true } = {}) {
  if (loggedIn) {
    localStorage.setItem('bookmarket.token', 'tok.3');
    localStorage.setItem('bookmarket.member', JSON.stringify({ id: 3, displayName: 'น้องบี', role: 'member' }));
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/sellers/2']}>
        <Routes>
          <Route path="/sellers/:id" element={<SellerPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());

test('แสดงข้อมูลร้าน คะแนนเฉลี่ย และรีวิวที่มีอยู่', async () => {
  getSeller.mockResolvedValue(SELLER_DATA);
  getMyRequests.mockResolvedValue([]);
  renderPage();

  expect(await screen.findByRole('heading', { name: 'พี่เอ' })).toBeInTheDocument();
  expect(getSeller).toHaveBeenCalledWith('2');
  expect(screen.getByTestId('seller-rating')).toHaveTextContent('5');
  expect(screen.getByText('สภาพดีตรงปก')).toBeInTheDocument();
  expect(screen.getByText('ร้านนี้ยังไม่มีหนังสือที่ขายอยู่')).toBeInTheDocument();   // Empty State ของหนังสือ
});

test('ยังไม่เคยซื้อขายกับร้านนี้ ต้องไม่เห็นฟอร์มรีวิว', async () => {
  getSeller.mockResolvedValue(SELLER_DATA);
  getMyRequests.mockResolvedValue([]);
  renderPage();

  expect(await screen.findByText('รีวิวได้หลังซื้อขายกับร้านนี้เสร็จแล้ว')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'ส่งรีวิว' })).not.toBeInTheDocument();
});

test('ซื้อขายเสร็จแล้ว: ต้องเลือกดาวก่อนจึงส่งได้ ส่งแล้วคะแนนเฉลี่ยและจำนวนรีวิวอัปเดตทันที', async () => {
  const user = userEvent.setup();
  getSeller.mockResolvedValue(SELLER_DATA);
  getMyRequests.mockResolvedValue(COMPLETED_WITH_SELLER);
  addSellerReview.mockResolvedValue({
    id: 2, rating: 4, text: 'นัดรับตรงเวลา', createdAt: '2026-11-11T08:00:00Z', reviewer: { id: 3, displayName: 'น้องบี' },
  });
  renderPage();

  const submit = await screen.findByRole('button', { name: 'ส่งรีวิว' });
  expect(submit).toBeDisabled();                                       // ยังไม่ได้เลือกดาว

  await user.click(screen.getByRole('button', { name: '4 ดาว' }));
  await user.type(screen.getByPlaceholderText(/เล่าประสบการณ์ซื้อขาย/), 'นัดรับตรงเวลา');
  await user.click(submit);

  expect(addSellerReview).toHaveBeenCalledWith(2, 4, 'นัดรับตรงเวลา', 'tok.3');
  expect(await screen.findByText('นัดรับตรงเวลา')).toBeInTheDocument();
  expect(screen.getByTestId('seller-rating')).toHaveTextContent('4.5'); // (5 + 4) / 2
  expect(screen.getByText('คุณรีวิวร้านนี้แล้ว ขอบคุณที่ช่วยแบ่งปัน')).toBeInTheDocument();
});

test('Guest เห็นหน้าร้านได้ แต่ต้องเข้าสู่ระบบก่อนรีวิว และไม่ยิงขอคำขอซื้อ', async () => {
  getSeller.mockResolvedValue(SELLER_DATA);
  renderPage({ loggedIn: false });

  expect(await screen.findByText(/เพื่อรีวิวร้านนี้/)).toBeInTheDocument();
  expect(getMyRequests).not.toHaveBeenCalled();
});
