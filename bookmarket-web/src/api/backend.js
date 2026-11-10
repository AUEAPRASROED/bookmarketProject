// ชั้นกลางสำหรับคุยกับ Go API ของทีม (แบบเดียวกับ src/api/backend.js ของ MovieHub)
// ทุกหน้าเรียกฟังก์ชันในไฟล์นี้ ไม่มีหน้าไหนเรียก fetch เอง

// ตั้ง REACT_APP_API_URL ใน .env.local (ในเครื่อง) และบน Vercel (ตอนขึ้นจริง) ห้ามฝัง URL ไว้ในโค้ด
const BASE = process.env.REACT_APP_API_URL || '';

// ฟังก์ชันเดียวที่ fetch จริง ทุกฟังก์ชันด้านล่างเรียกผ่านตัวนี้
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };   // 1) บอก server ว่า body เป็น JSON
  if (token) headers.Authorization = `Bearer ${token}`;      //    และแนบตั๋วถ้ามี

  const res = await fetch(BASE + path, {                     // 2) ยิงจริง
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,           //    object ต้องแปลงเป็นข้อความก่อนส่ง
  });

  if (res.status === 204) return null;                       // 3) ลบ/เปลี่ยนรหัสสำเร็จ ไม่มี body ให้อ่าน

  const data = await res.json()                              //    อ่านคำตอบเป็น JSON
    .catch(() => ({ error: 'server ไม่ได้ตอบเป็น JSON' }));
  if (!res.ok) {                                             // 4) 400 / 401 / 403 / 404 / 409 มาลงตรงนี้
    // Go ตอบ {"error":{"code","message"}} บรรทัดนี้อ่านได้ทั้งแบบนั้นและแบบข้อความแบน (Week 11 ข้อ 4.1)
    const err = new Error(data.error?.message ?? data.error ?? `server ตอบกลับ ${res.status}`);
    err.status = res.status;                                 //    แนบเลขไว้ให้หน้าเว็บใช้ต่อ
    throw err;
  }
  return data;
}

// ---------- สมาชิก ----------
export function register(email, password, displayName, contact) {
  return apiFetch('/api/auth/register', { method: 'POST', body: { email, password, displayName, contact } });
}
export function login(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });   // ได้ { token, member }
}
export function getMe(token) {
  return apiFetch('/api/me', { token });
}
export function updateMe(fields, token) {
  return apiFetch('/api/me', { method: 'PUT', body: fields, token });                  // { displayName, contact }
}
export function changePassword(currentPassword, newPassword, token) {
  return apiFetch('/api/me/password', { method: 'PUT', body: { currentPassword, newPassword }, token });  // 204 ได้ null
}

// ---------- หมวดหมู่ / หนังสือ (สาธารณะ) ----------
export async function getCategories() {
  const data = await apiFetch('/api/categories');
  return data.items;                                        // [{ id, name, bookCount }]
}
export async function getBooks() {
  const data = await apiFetch('/api/books');
  return data.items;
}
export function getBook(bookId) {
  return apiFetch(`/api/books/${bookId}`);
}

// ---------- ประกาศของฉัน ----------
export async function getMyBooks(token) {
  const data = await apiFetch('/api/me/books', { token });
  return data.items;
}
export function createBook(fields, token) {
  return apiFetch('/api/books', { method: 'POST', body: fields, token });
}
export function updateBook(bookId, fields, token) {
  return apiFetch(`/api/books/${bookId}`, { method: 'PUT', body: fields, token });
}
export function deleteBook(bookId, token) {
  return apiFetch(`/api/books/${bookId}`, { method: 'DELETE', token });               // 204 ได้ null
}

// ---------- คำขอซื้อ ----------
export function sendRequest(bookId, message, token) {
  return apiFetch(`/api/books/${bookId}/requests`, { method: 'POST', body: { message }, token });
}
export async function getMyRequests(token) {
  const data = await apiFetch('/api/me/requests', { token });
  return data.items;
}
export async function getIncomingRequests(token) {
  const data = await apiFetch('/api/me/incoming', { token });
  return data.items;
}
export function setRequestStatus(requestId, status, token) {
  return apiFetch(`/api/requests/${requestId}/status`, { method: 'PUT', body: { status }, token });
}

// ---------- หลังบ้าน (ทุกตัวต้องแนบตั๋วของ admin ถ้าเป็น member Go ตอบ 403) ----------
export function getAdminStats(token) {
  return apiFetch('/api/admin/stats', { token });
}
export async function getAdminBooks(token) {
  const data = await apiFetch('/api/admin/books', { token });
  return data.items;
}
export async function getAdminRequests(token) {
  const data = await apiFetch('/api/admin/requests', { token });
  return data.items;
}
export function createCategory(name, token) {
  return apiFetch('/api/admin/categories', { method: 'POST', body: { name }, token });
}
export function updateCategory(categoryId, name, token) {
  return apiFetch(`/api/admin/categories/${categoryId}`, { method: 'PUT', body: { name }, token });
}
export function deleteCategory(categoryId, token) {
  return apiFetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE', token });
}
export async function getAdminMembers(token) {
  const data = await apiFetch('/api/admin/members', { token });
  return data.items;
}
export function setMemberRole(memberId, role, token) {
  return apiFetch(`/api/admin/members/${memberId}/role`, { method: 'PUT', body: { role }, token });
}
export function deleteMember(memberId, token) {
  return apiFetch(`/api/admin/members/${memberId}`, { method: 'DELETE', token });
}
