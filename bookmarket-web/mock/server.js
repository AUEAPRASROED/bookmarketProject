// Backend จำลองของ Book Marketplace (แบบ mock/server.js ของ MovieHub Week 9)
// ทำตัวเหมือน Go API ทุกประการ: path, JSON, status code และรูปแบบ error {"error":{"code","message"}}
// แต่เก็บข้อมูลในหน่วยความจำ ปิดแล้วหาย ใช้ดูหน้าเว็บโดยไม่ต้องมี Supabase / Go
// รัน: npm run mock (พอร์ต 4000) แล้ว npm start โดยปล่อย REACT_APP_API_URL ว่าง

const express = require('express');
const cors = require('cors');
const demo = require('./demo-data.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

// ---------- "ฐานข้อมูล" ในหน่วยความจำ ----------
const now = () => new Date().toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

const db = {
  categories: ['วิทยาศาสตร์', 'คณิตศาสตร์', 'คอมพิวเตอร์', 'วิศวกรรมศาสตร์', 'บริหารธุรกิจ', 'ภาษา', 'ศึกษาทั่วไป', 'อื่น ๆ']
    .map((name, i) => ({ id: i + 1, name })),
  members: [
    { id: 1, email: 'admin@test.com', password: 'password1', displayName: 'ผู้ดูแลระบบ', contact: null, role: 'admin', createdAt: daysAgo(30) },
    { id: 2, email: 'seller@test.com', password: 'password1', displayName: 'พี่เอ', contact: 'LINE: pa_books', role: 'member', createdAt: daysAgo(20) },
    { id: 3, email: 'buyer@test.com', password: 'password1', displayName: 'น้องบี', contact: '081-234-5678', role: 'member', createdAt: daysAgo(10) },
    { id: 4, email: 'nida@test.com', password: 'password1', displayName: 'นิดา', contact: 'IG: nida.reads', role: 'member', createdAt: daysAgo(15) },
    { id: 5, email: 'ton@test.com', password: 'password1', displayName: 'ต้น', contact: 'LINE: ton.eng', role: 'member', createdAt: daysAgo(14) },
  ],
  tokens: new Map(),        // token -> memberId
  // หนังสือ 43 เล่ม คำขอซื้อ ตะกร้า และรีวิว ชุดเดียวกับ bookmarket-api/seed-demo.sql (daysAgo = กี่วันก่อน)
  books: demo.books.map(({ daysAgo: d, ...b }) => ({ ...b, createdAt: daysAgo(d) })),
  requests: demo.requests.map(({ daysAgo: d, ...r }) => ({ ...r, createdAt: daysAgo(d) })),
  cart: demo.cart.map(({ daysAgo: d, ...c }) => ({ ...c, addedAt: daysAgo(d) })),
  reviews: demo.reviews.map(({ daysAgo: d, ...r }) => ({ ...r, createdAt: daysAgo(d) })),
};
const maxId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
let nextId = { member: 6, book: maxId(db.books), request: maxId(db.requests), category: 9, review: maxId(db.reviews) };

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const member = (id) => db.members.find(m => m.id === id);
const publicMember = (m) => ({ id: m.id, email: m.email, displayName: m.displayName, contact: m.contact, role: m.role, createdAt: m.createdAt });
// คะแนนร้านเฉลี่ย ปัดทศนิยม 1 ตำแหน่ง แบบ round(avg(rating), 1) ใน Go
function sellerRating(sellerId) {
  const list = db.reviews.filter(r => r.sellerId === sellerId);
  if (list.length === 0) return { rating: null, reviewCount: 0 };
  return { rating: Math.round(list.reduce((s, r) => s + r.rating, 0) / list.length * 10) / 10, reviewCount: list.length };
}
const bookJSON = (b) => ({
  ...b, updatedAt: b.updatedAt || b.createdAt,
  category: db.categories.find(c => c.id === b.categoryId)?.name ?? '-',
  seller: { id: b.sellerId, displayName: member(b.sellerId)?.displayName, ...sellerRating(b.sellerId) },
});

// กติกาช่องติดต่อเหมือน Go: ผู้ซื้อเห็นของผู้ขายเมื่อ accepted/completed, ผู้ขายเห็นของผู้ซื้อ, admin ไม่เห็นของใคร
function requestJSON(r, view) {
  const b = db.books.find(x => x.id === r.bookId);
  const buyer = member(r.buyerId);
  const seller = member(b.sellerId);
  const showSeller = view === 'seller' || (view === 'buyer' && ['accepted', 'completed'].includes(r.status));
  return {
    id: r.id, status: r.status, message: r.message, createdAt: r.createdAt, updatedAt: r.updatedAt || r.createdAt,
    book: { id: b.id, title: b.title, price: b.price, imageUrl: b.imageUrl, status: b.status },
    buyer: { id: buyer.id, displayName: buyer.displayName, contact: view === 'admin' ? null : buyer.contact },
    seller: { id: seller.id, displayName: seller.displayName, contact: showSeller ? seller.contact : null },
  };
}
const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id;

// ---------- middleware: login / admin ----------
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const id = db.tokens.get(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!id || !member(id)) return fail(res, 401, 'NO_TOKEN', 'กรุณาเข้าสู่ระบบก่อน');
  req.me = member(id);
  next();
}
function requireAdmin(req, res, next) {
  if (req.me.role !== 'admin') return fail(res, 403, 'FORBIDDEN', 'ต้องเป็น admin เท่านั้น');
  next();
}
const admin = [requireLogin, requireAdmin];

// ---------- สมาชิก ----------
app.post('/api/auth/register', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const displayName = String(req.body?.displayName || '').trim();
  if (!email.includes('@')) return fail(res, 400, 'BAD_EMAIL', 'รูปแบบอีเมลไม่ถูกต้อง');
  if (password.length < 8) return fail(res, 400, 'BAD_PASSWORD', 'รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์');
  if (!displayName) return fail(res, 400, 'BAD_NAME', 'ต้องมีชื่อที่แสดง และยาวไม่เกิน 50 ตัวอักษร');
  if (db.members.some(m => m.email === email)) return fail(res, 409, 'EMAIL_TAKEN', 'อีเมลนี้มีบัญชีอยู่แล้ว');
  const m = { id: nextId.member++, email, password, displayName, contact: req.body?.contact?.trim() || null, role: 'member', createdAt: now() };
  db.members.push(m);
  res.status(201).json(publicMember(m));
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const m = db.members.find(x => x.email === email);
  if (!m || m.password !== req.body?.password) return fail(res, 401, 'BAD_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  const token = `mock.${m.id}.${Math.random().toString(36).slice(2)}`;
  db.tokens.set(token, m.id);
  res.json({ token, member: publicMember(m) });
});

app.get('/api/me', requireLogin, (req, res) => res.json(publicMember(req.me)));

app.put('/api/me', requireLogin, (req, res) => {
  const name = String(req.body?.displayName || '').trim();
  if (!name) return fail(res, 400, 'BAD_NAME', 'ต้องมีชื่อที่แสดง และยาวไม่เกิน 50 ตัวอักษร');
  req.me.displayName = name;
  req.me.contact = req.body?.contact?.trim() || null;
  res.json(publicMember(req.me));
});

app.put('/api/me/password', requireLogin, (req, res) => {
  if (String(req.body?.newPassword || '').length < 8) return fail(res, 400, 'BAD_PASSWORD', 'รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์');
  if (req.body?.currentPassword !== req.me.password) return fail(res, 400, 'WRONG_PASSWORD', 'รหัสผ่านเดิมไม่ถูกต้อง');
  req.me.password = req.body.newPassword;
  res.status(204).end();
});

// ---------- หมวดหมู่ / หนังสือ ----------
app.get('/api/categories', (req, res) => {
  res.json({ items: db.categories.map(c => ({ ...c, bookCount: db.books.filter(b => b.categoryId === c.id).length })) });
});

app.get('/api/books', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const items = db.books
    .filter(b => b.status !== 'sold' && (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)))
    .sort(byNewest).map(bookJSON);
  res.json({ items });
});

app.get('/api/books/:id', (req, res) => {
  const b = db.books.find(x => x.id === Number(req.params.id));
  if (!b) return fail(res, 404, 'BOOK_NOT_FOUND', 'ไม่พบหนังสือเล่มนี้');
  res.json(bookJSON(b));
});

function validateBook(body) {
  const f = {
    title: String(body?.title || '').trim(), author: String(body?.author || '').trim(),
    description: body?.description?.trim() || null, condition: body?.condition, price: Number(body?.price),
    imageUrl: body?.imageUrl?.trim() || null, categoryId: Number(body?.categoryId),
  };
  if (!f.title) return [null, 'BAD_TITLE', 'ต้องมีชื่อหนังสือ และยาวไม่เกิน 255 ตัวอักษร'];
  if (!f.author) return [null, 'BAD_AUTHOR', 'ต้องมีชื่อผู้แต่ง และยาวไม่เกิน 255 ตัวอักษร'];
  if (!db.categories.some(c => c.id === f.categoryId)) return [null, 'BAD_CATEGORY', 'ไม่มีหมวดหมู่นี้'];
  if (!(f.price >= 0)) return [null, 'BAD_PRICE', 'ราคาต้องเป็น 0 ขึ้นไป'];
  if (!['new', 'like_new', 'good', 'fair'].includes(f.condition)) return [null, 'BAD_CONDITION', 'สภาพหนังสือต้องเป็น new, like_new, good หรือ fair'];
  if (f.imageUrl && !f.imageUrl.startsWith('http') && !f.imageUrl.startsWith('/')) return [null, 'BAD_IMAGE', 'รูปต้องเป็น URL เต็ม (https://...) หรือรูปในเว็บ (/covers/...)'];
  return [f];
}

app.get('/api/me/books', requireLogin, (req, res) => {
  res.json({ items: db.books.filter(b => b.sellerId === req.me.id).sort(byNewest).map(bookJSON) });
});

app.post('/api/books', requireLogin, (req, res) => {
  const [f, code, msg] = validateBook(req.body);
  if (!f) return fail(res, 400, code, msg);
  const b = { id: nextId.book++, sellerId: req.me.id, ...f, status: 'available', createdAt: now() };
  db.books.push(b);
  res.status(201).json(bookJSON(b));
});

// เจ้าของ หรือ admin เท่านั้น คนอื่นได้ 404 เหมือน Go
const ownBook = (req) => db.books.find(b => b.id === Number(req.params.id) && (b.sellerId === req.me.id || req.me.role === 'admin'));

app.put('/api/books/:id', requireLogin, (req, res) => {
  const b = ownBook(req);
  if (!b) return fail(res, 404, 'BOOK_NOT_FOUND', 'ไม่พบหนังสือเล่มนี้ในประกาศของคุณ');
  const [f, code, msg] = validateBook(req.body);
  if (!f) return fail(res, 400, code, msg);
  Object.assign(b, f, { updatedAt: now() });
  res.json(bookJSON(b));
});

app.delete('/api/books/:id', requireLogin, (req, res) => {
  const b = ownBook(req);
  if (!b) return fail(res, 404, 'BOOK_NOT_FOUND', 'ไม่พบหนังสือเล่มนี้ในประกาศของคุณ');
  db.books = db.books.filter(x => x.id !== b.id);
  db.requests = db.requests.filter(r => r.bookId !== b.id);     // ON DELETE CASCADE
  db.cart = db.cart.filter(c => c.bookId !== b.id);
  res.status(204).end();
});

// ---------- คำขอซื้อ ----------
app.post('/api/books/:id/requests', requireLogin, (req, res) => {
  const b = db.books.find(x => x.id === Number(req.params.id));
  if (!b) return fail(res, 404, 'BOOK_NOT_FOUND', 'ไม่พบหนังสือเล่มนี้');
  if (b.sellerId === req.me.id) return fail(res, 400, 'OWN_BOOK', 'ส่งคำขอซื้อหนังสือของตัวเองไม่ได้');
  if (b.status !== 'available') return fail(res, 409, 'NOT_AVAILABLE', 'หนังสือเล่มนี้ถูกจองหรือขายไปแล้ว');
  if (db.requests.some(r => r.bookId === b.id && r.buyerId === req.me.id && ['pending', 'accepted'].includes(r.status))) {
    return fail(res, 409, 'ALREADY_REQUESTED', 'คุณส่งคำขอซื้อเล่มนี้ไว้แล้ว');
  }
  const r = { id: nextId.request++, bookId: b.id, buyerId: req.me.id, message: req.body?.message?.trim() || null, status: 'pending', createdAt: now() };
  db.requests.push(r);
  res.status(201).json({ id: r.id, bookId: b.id, status: 'pending' });
});

app.get('/api/me/requests', requireLogin, (req, res) => {
  res.json({ items: db.requests.filter(r => r.buyerId === req.me.id).sort(byNewest).map(r => requestJSON(r, 'buyer')) });
});

app.get('/api/me/incoming', requireLogin, (req, res) => {
  const mine = new Set(db.books.filter(b => b.sellerId === req.me.id).map(b => b.id));
  res.json({ items: db.requests.filter(r => mine.has(r.bookId)).sort(byNewest).map(r => requestJSON(r, 'seller')) });
});

// กติกาสถานะเดียวกับ store.UpdateRequestStatus ฝั่ง Go
app.put('/api/requests/:id/status', requireLogin, (req, res) => {
  const next = req.body?.status;
  if (!['accepted', 'rejected', 'cancelled', 'completed'].includes(next)) {
    return fail(res, 400, 'BAD_STATUS', 'status ต้องเป็น accepted, rejected, cancelled หรือ completed');
  }
  const r = db.requests.find(x => x.id === Number(req.params.id));
  const b = r && db.books.find(x => x.id === r.bookId);
  const isBuyer = r?.buyerId === req.me.id;
  const isSeller = b?.sellerId === req.me.id;
  if (!r || (!isBuyer && !isSeller)) return fail(res, 404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอนี้');

  const cur = r.status;
  if (next === 'accepted' && isSeller && cur === 'pending' && b.status === 'available') {
    b.status = 'reserved';
    db.requests.forEach(x => { if (x.bookId === b.id && x.id !== r.id && x.status === 'pending') x.status = 'rejected'; });
  } else if (next === 'rejected' && isSeller && cur === 'pending') {
    // แค่เปลี่ยนสถานะคำขอ
  } else if (next === 'cancelled' && isBuyer && (cur === 'pending' || cur === 'accepted')) {
    if (cur === 'accepted') b.status = 'available';
  } else if (next === 'completed' && isSeller && cur === 'accepted') {
    b.status = 'sold';
  } else {
    return fail(res, 409, 'BAD_TRANSITION', 'ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน');
  }
  r.status = next;
  r.updatedAt = now();
  res.json({ id: r.id, status: next });
});

// ---------- ตะกร้า (กติกาเดียวกับ store/cart.go) ----------
app.get('/api/me/cart', requireLogin, (req, res) => {
  const mine = db.cart.filter(c => c.memberId === req.me.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  res.json({ items: mine.map(c => bookJSON(db.books.find(b => b.id === c.bookId))) });
});

app.put('/api/me/cart/:bookId', requireLogin, (req, res) => {
  const b = db.books.find(x => x.id === Number(req.params.bookId));
  if (!b) return fail(res, 404, 'BOOK_NOT_FOUND', 'ไม่พบหนังสือเล่มนี้');
  if (b.sellerId === req.me.id) return fail(res, 400, 'OWN_BOOK', 'ใส่หนังสือของตัวเองลงตะกร้าไม่ได้');
  if (!db.cart.some(c => c.memberId === req.me.id && c.bookId === b.id)) db.cart.push({ memberId: req.me.id, bookId: b.id, addedAt: now() });
  res.json({ bookId: b.id });
});

app.delete('/api/me/cart/:bookId', requireLogin, (req, res) => {
  db.cart = db.cart.filter(c => !(c.memberId === req.me.id && c.bookId === Number(req.params.bookId)));
  res.status(204).end();
});

// ---------- หน้าร้าน + รีวิวร้าน (กติกาเดียวกับ store/reviews.go) ----------
const reviewJSON = (r) => ({
  id: r.id, rating: r.rating, text: r.text, createdAt: r.createdAt,
  reviewer: { id: r.reviewerId, displayName: member(r.reviewerId)?.displayName },
});

app.get('/api/sellers/:id', (req, res) => {
  const m = member(Number(req.params.id));
  if (!m) return fail(res, 404, 'SELLER_NOT_FOUND', 'ไม่พบร้านนี้');
  res.json({
    seller: {
      id: m.id, displayName: m.displayName, createdAt: m.createdAt, ...sellerRating(m.id),
      booksSold: db.books.filter(b => b.sellerId === m.id && b.status === 'sold').length,
    },
    books: db.books.filter(b => b.sellerId === m.id && b.status !== 'sold').sort(byNewest).map(bookJSON),
    reviews: db.reviews.filter(r => r.sellerId === m.id).sort(byNewest).map(reviewJSON),
  });
});

app.post('/api/sellers/:id/reviews', requireLogin, (req, res) => {
  const sellerId = Number(req.params.id);
  const rating = Number(req.body?.rating);
  if (!(rating >= 1 && rating <= 5) || !Number.isInteger(rating)) return fail(res, 400, 'BAD_RATING', 'คะแนนต้องเป็น 1 ถึง 5 ดาว');
  if (sellerId === req.me.id) return fail(res, 400, 'SELF_REVIEW', 'รีวิวร้านของตัวเองไม่ได้');
  const bought = db.requests.some(r => r.buyerId === req.me.id && r.status === 'completed' &&
    db.books.find(b => b.id === r.bookId)?.sellerId === sellerId);
  if (!bought) return fail(res, 403, 'NOT_BUYER', 'รีวิวได้หลังซื้อขายกับร้านนี้เสร็จแล้วเท่านั้น');
  if (db.reviews.some(r => r.sellerId === sellerId && r.reviewerId === req.me.id)) return fail(res, 409, 'ALREADY_REVIEWED', 'คุณรีวิวร้านนี้ไปแล้ว');
  if (!member(sellerId)) return fail(res, 404, 'SELLER_NOT_FOUND', 'ไม่พบร้านนี้');
  const r = { id: nextId.review++, sellerId, reviewerId: req.me.id, rating, text: req.body?.text?.trim() || null, createdAt: now() };
  db.reviews.push(r);
  res.status(201).json(reviewJSON(r));
});

app.delete('/api/seller-reviews/:id', requireLogin, (req, res) => {
  const r = db.reviews.find(x => x.id === Number(req.params.id) && (x.reviewerId === req.me.id || req.me.role === 'admin'));
  if (!r) return fail(res, 404, 'REVIEW_NOT_FOUND', 'ไม่พบรีวิวนี้');
  db.reviews = db.reviews.filter(x => x.id !== r.id);
  res.status(204).end();
});

// ---------- หลังบ้าน ----------
app.get('/api/admin/stats', admin, (req, res) => {
  const count = (list, f = () => true) => list.filter(f).length;
  res.json({
    members: db.members.length, admins: count(db.members, m => m.role === 'admin'),
    books: db.books.length, booksAvailable: count(db.books, b => b.status === 'available'),
    booksReserved: count(db.books, b => b.status === 'reserved'), booksSold: count(db.books, b => b.status === 'sold'),
    categories: db.categories.length, requests: db.requests.length,
    requestsPending: count(db.requests, r => r.status === 'pending'), requestsCompleted: count(db.requests, r => r.status === 'completed'),
    reviews: db.reviews.length,
  });
});

app.get('/api/admin/books', admin, (req, res) => res.json({ items: [...db.books].sort(byNewest).map(bookJSON) }));
app.get('/api/admin/requests', admin, (req, res) => res.json({ items: [...db.requests].sort(byNewest).map(r => requestJSON(r, 'admin')) }));

app.post('/api/admin/categories', admin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return fail(res, 400, 'BAD_NAME', 'ต้องมีชื่อหมวดหมู่ และยาวไม่เกิน 50 ตัวอักษร');
  if (db.categories.some(c => c.name === name)) return fail(res, 409, 'CATEGORY_EXISTS', 'มีหมวดหมู่ชื่อนี้อยู่แล้ว');
  const c = { id: nextId.category++, name };
  db.categories.push(c);
  res.status(201).json({ ...c, bookCount: 0 });
});

app.put('/api/admin/categories/:id', admin, (req, res) => {
  const c = db.categories.find(x => x.id === Number(req.params.id));
  if (!c) return fail(res, 404, 'CATEGORY_NOT_FOUND', 'ไม่พบหมวดหมู่นี้');
  const name = String(req.body?.name || '').trim();
  if (!name) return fail(res, 400, 'BAD_NAME', 'ต้องมีชื่อหมวดหมู่ และยาวไม่เกิน 50 ตัวอักษร');
  if (db.categories.some(x => x.name === name && x.id !== c.id)) return fail(res, 409, 'CATEGORY_EXISTS', 'มีหมวดหมู่ชื่อนี้อยู่แล้ว');
  c.name = name;
  res.json({ ...c, bookCount: db.books.filter(b => b.categoryId === c.id).length });
});

app.delete('/api/admin/categories/:id', admin, (req, res) => {
  const id = Number(req.params.id);
  if (!db.categories.some(c => c.id === id)) return fail(res, 404, 'CATEGORY_NOT_FOUND', 'ไม่พบหมวดหมู่นี้');
  if (db.books.some(b => b.categoryId === id)) return fail(res, 409, 'CATEGORY_IN_USE', 'หมวดนี้ยังมีหนังสืออยู่ ย้ายหรือลบหนังสือก่อน');
  db.categories = db.categories.filter(c => c.id !== id);
  res.status(204).end();
});

app.get('/api/admin/members', admin, (req, res) => res.json({ items: [...db.members].sort(byNewest).map(publicMember) }));

app.put('/api/admin/members/:id/role', admin, (req, res) => {
  const id = Number(req.params.id);
  if (!['member', 'admin'].includes(req.body?.role)) return fail(res, 400, 'BAD_ROLE', 'role ต้องเป็น member หรือ admin');
  if (id === req.me.id) return fail(res, 400, 'SELF_ROLE', 'เปลี่ยนบทบาทของตัวเองไม่ได้ ให้ admin คนอื่นทำแทน');
  const m = member(id);
  if (!m) return fail(res, 404, 'MEMBER_NOT_FOUND', 'ไม่พบสมาชิกคนนี้');
  m.role = req.body.role;
  res.json(publicMember(m));
});

app.delete('/api/admin/members/:id', admin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.me.id) return fail(res, 400, 'SELF_DELETE', 'ลบบัญชีของตัวเองไม่ได้');
  if (!member(id)) return fail(res, 404, 'MEMBER_NOT_FOUND', 'ไม่พบสมาชิกคนนี้');
  const theirBooks = new Set(db.books.filter(b => b.sellerId === id).map(b => b.id));
  db.members = db.members.filter(m => m.id !== id);
  db.books = db.books.filter(b => b.sellerId !== id);
  db.requests = db.requests.filter(r => r.buyerId !== id && !theirBooks.has(r.bookId));
  db.cart = db.cart.filter(c => c.memberId !== id && !theirBooks.has(c.bookId));
  db.reviews = db.reviews.filter(r => r.sellerId !== id && r.reviewerId !== id);
  res.status(204).end();
});

app.use('/api', (req, res) => fail(res, 404, 'NO_ENDPOINT', `ไม่มี endpoint ${req.method} ${req.originalUrl}`));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Book Marketplace mock backend พร้อมที่ http://localhost:${PORT}`);
  console.log('บัญชีทดลอง (รหัส password1 ทุกบัญชี): admin@test.com (admin), seller@test.com (ผู้ขาย), buyer@test.com (ผู้ซื้อ ยังรีวิวร้านพี่เอได้), nida@test.com, ton@test.com');
});
