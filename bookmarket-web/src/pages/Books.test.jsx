import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Books from './Books';
import { getBooks, getCategories } from '../api/backend';

// แทนทั้งไฟล์ backend.js ด้วยของปลอม (แบบ Movies.test.jsx ของ MovieHub)
jest.mock('../api/backend');

const seller = { id: 9, displayName: 'พี่เอ' };
const FAKE_BOOKS = [
  { id: 1, title: 'Calculus', author: 'Stewart', price: 300, condition: 'good', status: 'available', categoryId: 2, category: 'คณิตศาสตร์', imageUrl: null, seller },
  { id: 2, title: 'The Go Programming Language', author: 'Donovan', price: 450, condition: 'like_new', status: 'available', categoryId: 3, category: 'คอมพิวเตอร์', imageUrl: null, seller },
  { id: 3, title: 'Linear Algebra', author: 'Lay', price: 200, condition: 'fair', status: 'reserved', categoryId: 2, category: 'คณิตศาสตร์', imageUrl: null, seller },
];
const FAKE_CATEGORIES = [
  { id: 2, name: 'คณิตศาสตร์', bookCount: 2 },
  { id: 3, name: 'คอมพิวเตอร์', bookCount: 1 },
];

function renderBooks() {
  return render(<MemoryRouter><Books /></MemoryRouter>);   // การ์ดเป็น Link ต้องมี Router ครอบ
}

beforeEach(() => {
  getCategories.mockResolvedValue(FAKE_CATEGORIES);
});

test('โหลดสำเร็จ ต้องเห็นการ์ดครบ และปุ่มหมวดที่มาจาก backend', async () => {
  getBooks.mockResolvedValue(FAKE_BOOKS);
  renderBooks();

  expect(await screen.findByText('Calculus')).toBeInTheDocument();   // findBy = รอจน useEffect โหลดเสร็จ
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'คณิตศาสตร์' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'คอมพิวเตอร์' })).toBeInTheDocument();
  expect(screen.getByText('ติดจอง')).toBeInTheDocument();             // เล่มที่ถูกจองมีป้ายบอก
});

test('ค้นหาด้วยชื่อผู้แต่ง และกดหมวด ต้องกรองในเครื่องโดยไม่เรียก backend ซ้ำ', async () => {
  const user = userEvent.setup();
  getBooks.mockResolvedValue(FAKE_BOOKS);
  renderBooks();
  await screen.findByText('Calculus');

  await user.click(screen.getByRole('button', { name: 'คณิตศาสตร์' }));
  expect(screen.getAllByRole('link')).toHaveLength(2);

  await user.type(screen.getByPlaceholderText(/ค้นหาชื่อหนังสือหรือผู้แต่ง/), 'lay');
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
  expect(getBooks).toHaveBeenCalledTimes(1);                          // ยังเรียกแค่ตอนโหลดครั้งแรก
});

test('ค้นหาไม่เจอ ต้องเห็น Empty State', async () => {
  const user = userEvent.setup();
  getBooks.mockResolvedValue(FAKE_BOOKS);
  renderBooks();
  await screen.findByText('Calculus');

  await user.type(screen.getByPlaceholderText(/ค้นหาชื่อหนังสือหรือผู้แต่ง/), 'ไม่มีเล่มนี้แน่นอน');

  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(screen.getByText('ไม่พบหนังสือที่ตรงกับเงื่อนไข')).toBeInTheDocument();
});

test('backend ล่ม ต้องเห็นข้อความ error และปุ่มลองใหม่ที่โหลดอีกครั้งได้', async () => {
  const user = userEvent.setup();
  getBooks
    .mockRejectedValueOnce(new Error('server ไม่ได้ตอบเป็น JSON'))    // ครั้งแรกพัง
    .mockResolvedValueOnce(FAKE_BOOKS);                              // ครั้งที่สองสำเร็จ
  renderBooks();

  expect(await screen.findByText('โหลดข้อมูลไม่สำเร็จ')).toBeInTheDocument();
  expect(screen.getByText('server ไม่ได้ตอบเป็น JSON')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));

  expect(await screen.findByText('Calculus')).toBeInTheDocument();
  expect(getBooks).toHaveBeenCalledTimes(2);
});
