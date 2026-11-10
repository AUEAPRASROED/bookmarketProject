import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../auth/AuthContext';
import AdminMembers from './AdminMembers';
import { getAdminMembers, setMemberRole, deleteMember } from '../../api/backend';

// แบบ Week 12 หัวข้อ 7.4 + กรณีลบสมาชิก
jest.mock('../../api/backend');

const ME = { id: 2, displayName: 'Admin', role: 'admin' };
const MEMBERS = [
  { id: 1, email: 'b@x.com', displayName: 'บี', contact: null, role: 'member', createdAt: '2026-10-01T08:00:00Z' },
  { id: 2, email: 'admin@x.com', displayName: 'Admin', contact: null, role: 'admin', createdAt: '2026-10-02T08:00:00Z' },
];

function renderPage() {
  localStorage.setItem('bookmarket.token', 'tok.2');
  localStorage.setItem('bookmarket.member', JSON.stringify(ME));
  return render(
    <AuthProvider>
      <MemoryRouter><AdminMembers /></MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());

test('โหลดรายชื่อแล้วต้องเห็นทุกคน และปุ่มในแถวของตัวเองกดไม่ได้', async () => {
  getAdminMembers.mockResolvedValue(MEMBERS);
  renderPage();

  expect(await screen.findByText('b@x.com')).toBeInTheDocument();
  expect(getAdminMembers).toHaveBeenCalledWith('tok.2');
  const myRow = screen.getByText('admin@x.com').closest('tr');
  expect(within(myRow).getByRole('button', { name: 'ลดเป็น member' })).toBeDisabled();
  expect(within(myRow).getByRole('button', { name: 'ลบ' })).toBeDisabled();
});

test('เลื่อน member เป็น admin ต้องถามยืนยันก่อน แล้วอัปเดตแถวตามที่ server ตอบ', async () => {
  const user = userEvent.setup();
  getAdminMembers.mockResolvedValue(MEMBERS);
  setMemberRole.mockResolvedValue({ ...MEMBERS[0], role: 'admin' });
  renderPage();
  await screen.findByText('b@x.com');

  await user.click(screen.getByRole('button', { name: 'เลื่อนเป็น admin' }));
  expect(setMemberRole).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'ยืนยัน' }));

  expect(setMemberRole).toHaveBeenCalledWith(1, 'admin', 'tok.2');
  const row = (await screen.findByText('b@x.com')).closest('tr');
  expect(within(row).getByText('admin')).toBeInTheDocument();
});

test('ลบสมาชิก ต้องยืนยันก่อน แล้วแถวหายไป', async () => {
  const user = userEvent.setup();
  getAdminMembers.mockResolvedValue(MEMBERS);
  deleteMember.mockResolvedValue(null);
  renderPage();
  const row = (await screen.findByText('b@x.com')).closest('tr');

  await user.click(within(row).getByRole('button', { name: 'ลบ' }));
  expect(deleteMember).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'ลบสมาชิก' }));

  expect(deleteMember).toHaveBeenCalledWith(1, 'tok.2');
  expect(await screen.findByText('ทั้งหมด 1 คน (admin 1)')).toBeInTheDocument();
  expect(screen.queryByText('b@x.com')).not.toBeInTheDocument();
});
