import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import IncomingRequests from './IncomingRequests';
import { getIncomingRequests, setRequestStatus } from '../api/backend';

jest.mock('../api/backend');

const book = { id: 1, title: 'Calculus', price: 300, imageUrl: null, status: 'available' };
const seller = { id: 1, displayName: 'เอ', contact: 'LINE: aaa' };
const REQUESTS = [
  { id: 10, status: 'pending', message: 'รับที่ตึกวิทย์', createdAt: '2026-11-01T08:00:00Z', updatedAt: '2026-11-01T08:00:00Z',
    book, seller, buyer: { id: 2, displayName: 'บี', contact: '081-000' } },
  { id: 11, status: 'pending', message: null, createdAt: '2026-11-02T08:00:00Z', updatedAt: '2026-11-02T08:00:00Z',
    book, seller, buyer: { id: 3, displayName: 'ซี', contact: null } },
];

function renderPage() {
  localStorage.setItem('bookmarket.token', 'tok.1');
  localStorage.setItem('bookmarket.member', JSON.stringify({ id: 1, displayName: 'เอ', role: 'member' }));
  return render(
    <AuthProvider>
      <MemoryRouter><IncomingRequests /></MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());

test('โหลดคำขอแล้วต้องเห็นชื่อและช่องติดต่อผู้ซื้อ พร้อมปุ่มยอมรับ/ปฏิเสธ', async () => {
  getIncomingRequests.mockResolvedValue(REQUESTS);
  renderPage();

  const first = await screen.findByTestId('request-10');
  expect(getIncomingRequests).toHaveBeenCalledWith('tok.1');
  expect(within(first).getByText(/081-000/)).toBeInTheDocument();
  expect(within(first).getByRole('button', { name: 'ยอมรับ' })).toBeInTheDocument();
  expect(within(first).getByRole('button', { name: 'ปฏิเสธ' })).toBeInTheDocument();
});

test('ยอมรับต้องถามยืนยันก่อน แล้วคำขออื่นของเล่มเดียวกันกลายเป็นถูกปฏิเสธ', async () => {
  const user = userEvent.setup();
  getIncomingRequests.mockResolvedValue(REQUESTS);
  setRequestStatus.mockResolvedValue({ id: 10, status: 'accepted' });
  renderPage();
  const first = await screen.findByTestId('request-10');

  await user.click(within(first).getByRole('button', { name: 'ยอมรับ' }));
  expect(setRequestStatus).not.toHaveBeenCalled();                   // กดปุ่มในรายการยังไม่ยิง (กฎสองคลิก)

  await user.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(setRequestStatus).toHaveBeenCalledWith(10, 'accepted', 'tok.1');

  expect(await within(first).findByText('ผู้ขายยอมรับแล้ว')).toBeInTheDocument();
  expect(within(first).getByRole('button', { name: 'ซื้อขายเสร็จ' })).toBeInTheDocument();   // ปุ่มขั้นถัดไปโผล่
  const second = screen.getByTestId('request-11');
  expect(within(second).getByText('ถูกปฏิเสธ')).toBeInTheDocument();
  expect(within(second).queryByRole('button', { name: 'ยอมรับ' })).not.toBeInTheDocument();
});

test('Go ตอบ 409 ต้องเห็นข้อความ error และสถานะไม่เปลี่ยน', async () => {
  const user = userEvent.setup();
  getIncomingRequests.mockResolvedValue(REQUESTS);
  setRequestStatus.mockRejectedValue(new Error('ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน'));
  renderPage();
  const first = await screen.findByTestId('request-10');

  await user.click(within(first).getByRole('button', { name: 'ปฏิเสธ' }));
  await user.click(screen.getByRole('button', { name: 'ยืนยัน' }));

  expect(await screen.findByText('ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน')).toBeInTheDocument();
  expect(within(first).getByText('รอผู้ขายตอบ')).toBeInTheDocument();
});

test('ไม่มีคำขอเข้ามา ต้องเห็น Empty State', async () => {
  getIncomingRequests.mockResolvedValue([]);
  renderPage();

  expect(await screen.findByText('ยังไม่มีคำขอซื้อเข้ามา')).toBeInTheDocument();
});
