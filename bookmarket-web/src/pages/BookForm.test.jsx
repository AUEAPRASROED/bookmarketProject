import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import BookForm from './BookForm';
import { getCategories, createBook } from '../api/backend';

jest.mock('../api/backend');

const CATEGORIES = [
  { id: 2, name: 'คณิตศาสตร์', bookCount: 0 },
  { id: 3, name: 'คอมพิวเตอร์', bookCount: 0 },
];

function renderNewForm() {
  localStorage.setItem('bookmarket.token', 'tok.1');
  localStorage.setItem('bookmarket.member', JSON.stringify({ id: 1, displayName: 'เอ', role: 'member' }));
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/me/books/new']}>
        <Routes>
          <Route path="/me/books/new" element={<BookForm />} />
          <Route path="/books/:id" element={<h1>หน้ารายละเอียดหนังสือ</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

async function fillValid(user) {
  await user.type(await screen.findByLabelText('ชื่อหนังสือ'), 'Go Programming');
  await user.type(screen.getByLabelText('ผู้แต่ง'), 'Donovan');
  await user.selectOptions(screen.getByLabelText('หมวดหมู่'), '3');
}

beforeEach(() => {
  localStorage.clear();
  getCategories.mockResolvedValue(CATEGORIES);
});

test('ยังไม่กรอกอะไร ปุ่มลงประกาศต้องกดไม่ได้ และบอกว่าขาดอะไร', async () => {
  renderNewForm();

  expect(await screen.findByRole('button', { name: 'ลงประกาศ' })).toBeDisabled();
  expect(screen.getByText('ต้องมีชื่อหนังสือ')).toBeInTheDocument();
  expect(screen.getByText('ต้องเลือกหมวดหมู่')).toBeInTheDocument();
});

test('ราคาติดลบ ต้องกดส่งไม่ได้ และไม่เรียก backend', async () => {
  const user = userEvent.setup();
  renderNewForm();
  await fillValid(user);

  await user.type(screen.getByLabelText('ราคา (บาท)'), '-5');

  expect(screen.getByText('ราคาต้องเป็นตัวเลข 0 ขึ้นไป')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ลงประกาศ' })).toBeDisabled();
  expect(createBook).not.toHaveBeenCalled();
});

test('กรอกครบแล้วกดส่ง ต้องเรียก createBook ด้วยข้อมูลที่แปลงชนิดแล้วและแนบตั๋ว จากนั้นไปหน้ารายละเอียด', async () => {
  const user = userEvent.setup();
  createBook.mockResolvedValue({ id: 42 });
  renderNewForm();
  await fillValid(user);
  await user.type(screen.getByLabelText('ราคา (บาท)'), '150');

  await user.click(screen.getByRole('button', { name: 'ลงประกาศ' }));

  expect(createBook).toHaveBeenCalledWith({
    title: 'Go Programming', author: 'Donovan', description: '', condition: 'good',
    price: 150, imageUrl: '', categoryId: 3,                // ราคาและหมวดเป็นตัวเลข ไม่ใช่ข้อความ
  }, 'tok.1');
  expect(await screen.findByRole('heading', { name: 'หน้ารายละเอียดหนังสือ' })).toBeInTheDocument();
});

test('Go ตอบ 400 ต้องโชว์ข้อความนั้น และฟอร์มยังอยู่ให้แก้ต่อ', async () => {
  const user = userEvent.setup();
  createBook.mockRejectedValue(new Error('ไม่มีหมวดหมู่นี้'));
  renderNewForm();
  await fillValid(user);
  await user.type(screen.getByLabelText('ราคา (บาท)'), '150');

  await user.click(screen.getByRole('button', { name: 'ลงประกาศ' }));

  expect(await screen.findByText('ไม่มีหมวดหมู่นี้')).toBeInTheDocument();
  expect(screen.getByLabelText('ชื่อหนังสือ')).toHaveValue('Go Programming');
});
