import { apiFetch, login, createBook, setRequestStatus, deleteBook } from './backend';

// ตัวช่วยสร้าง "คำตอบปลอม" ของ fetch (แบบ backend.test.js ของ MovieHub)
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();       // แทน fetch ของเบราว์เซอร์ด้วยของปลอมที่จดทุกครั้งที่ถูกเรียก
});

test('GET ธรรมดา: ไม่มี body ไม่มี Authorization และคืน object ที่แปลงแล้ว', async () => {
  fetch.mockResolvedValue(fakeResponse(200, { items: [{ id: 1 }] }));

  const data = await apiFetch('/api/books');

  expect(data).toEqual({ items: [{ id: 1 }] });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/books');
  expect(options.method).toBe('GET');
  expect(options.body).toBeUndefined();
  expect(options.headers.Authorization).toBeUndefined();
});

test('ลงประกาศ: POST พร้อมตั๋วแบบ Bearer และ body เป็นข้อความ JSON', async () => {
  fetch.mockResolvedValue(fakeResponse(201, { id: 7 }));
  const fields = { title: 'Calculus', author: 'Stewart', price: 300, categoryId: 2, condition: 'good' };

  await createBook(fields, 'tok123');

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/books');
  expect(options.method).toBe('POST');
  expect(options.headers.Authorization).toBe('Bearer tok123');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(options.body).toBe(JSON.stringify(fields));
});

test('เปลี่ยนสถานะคำขอ: PUT ไปที่ /api/requests/{id}/status พร้อม status ใน body', async () => {
  fetch.mockResolvedValue(fakeResponse(200, { id: 5, status: 'accepted' }));

  await setRequestStatus(5, 'accepted', 'tok');

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/requests/5/status');
  expect(options.method).toBe('PUT');
  expect(options.body).toBe(JSON.stringify({ status: 'accepted' }));
});

test('204 คืน null โดยไม่เรียก res.json()', async () => {
  const res = fakeResponse(204, null);
  res.json = jest.fn();
  fetch.mockResolvedValue(res);

  const data = await deleteBook(3, 'tok');

  expect(data).toBeNull();
  expect(res.json).not.toHaveBeenCalled();
});

test('error แบบของ Go {"error":{"code","message"}} ต้องได้ข้อความภาษาไทย ไม่ใช่ [object Object]', async () => {
  fetch.mockResolvedValue(fakeResponse(401, { error: { code: 'BAD_CREDENTIALS', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } }));

  const err = await login('a@b.c', 'wrongpass').catch(e => e);

  expect(err.message).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  expect(err.status).toBe(401);
});

test('server ตอบมาไม่ใช่ JSON ต้องได้ข้อความที่เข้าใจได้ ไม่ใช่ SyntaxError', async () => {
  fetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });

  await expect(apiFetch('/api/books')).rejects.toThrow('server ไม่ได้ตอบเป็น JSON');
});
