# bookmarket-web: Student Second-hand Book Marketplace (React)

หน้าเว็บของระบบซื้อขายหนังสือมือสองสำหรับนักศึกษา React 19 + React Router 6 + Tailwind CSS 3 เรียก Go API ผ่าน Fetch (`src/api/backend.js`) โครงเดียวกับ MovieHub ที่เรียน
เอกสารออกแบบอยู่ใน [docs/design.md](docs/design.md)

```
src/
  api/backend.js          apiFetch + ฟังก์ชันทุก endpoint (ที่เดียวที่เรียก fetch)
  auth/AuthContext.jsx    token, member, isAdmin, login, register, logout, updateMember
  cart/CartContext.jsx    ตะกร้า: items, count, inCart, add, remove (ข้อมูลจริงอยู่ในตาราง cart_items)
  data/labels.js          ป้ายภาษาไทยของสภาพหนังสือ / สถานะ, จัดรูปแบบราคาและวันที่
  components/             Navbar, Footer, ProtectedRoute, RequireRole, BookCard, BookCover, BookGrid, Stars, StatusBadge, admin/AdminStates
  pages/                  Home, Books, BookDetail, Cart, SellerPage, Login, Register, Profile, MyBooks, BookForm, MyRequests, IncomingRequests, NotFound
  pages/admin/            AdminLayout, AdminDashboard, AdminBooks, AdminCategories, AdminRequests, AdminMembers
  *.test.js(x)            Unit test (Jest + Testing Library)
mock/server.js            backend จำลองสำหรับดูหน้าเว็บโดยไม่ต้องมี Go (ข้อมูลใน mock/demo-data.json ชุดเดียวกับ seed-demo.sql)
public/covers/            ปกหนังสือตัวอย่าง 43 รูป (SVG) ใช้ใน imageUrl เป็น /covers/book-01.svg
```

## ดูหน้าเว็บอย่างเดียว (ไม่ต้องมี Supabase / Go)

```bash
npm install
npm run mock      # หน้าต่างที่ 1: backend จำลองที่พอร์ต 4000 ข้อมูลอยู่ในหน่วยความจำ ปิดแล้วหาย
npm start         # หน้าต่างที่ 2: เปิด http://localhost:3000 (ไม่ต้องมี .env.local หรือปล่อย REACT_APP_API_URL ว่าง)
```

บัญชีทดลอง รหัส `password1` ทุกบัญชี: `admin@test.com` (admin), `seller@test.com` (ผู้ขาย), `buyer@test.com` (ผู้ซื้อ มีของในตะกร้า และรีวิวร้านพี่เอได้), `nida@test.com`, `ton@test.com`
`mock/server.js` ตอบ path, JSON และรหัสเดียวกับ Go ทุกตัว พอ Go พร้อมแค่ตั้ง `REACT_APP_API_URL` ก็สลับไปใช้ของจริงได้

## รันกับ Go จริง

```bash
npm install
cp .env.example .env.local     # แล้วแก้เป็น REACT_APP_API_URL=http://localhost:8080 (รัน Go ไว้อีกหน้าต่าง)
npm start                      # แก้ .env.local แล้วต้องหยุดแล้ว start ใหม่
npm test -- --watchAll=false   # Unit test ทั้งหมด ต้องเขียว
```

## หน้าเว็บ

| Path | หน้า | สิทธิ์ |
|---|---|---|
| `/`, `/books`, `/books/:id` | หน้าแรก, ค้นหา/กรองหมวด, รายละเอียด | ทุกคน |
| `/login`, `/register` | เข้าสู่ระบบ, สมัครสมาชิก | ทุกคน |
| `/me` | Profile + เปลี่ยนรหัสผ่าน | Member |
| `/me/books`, `/me/books/new`, `/me/books/:id` | ประกาศของฉัน, ลงประกาศ, แก้ไข | Member |
| `/me/requests`, `/me/incoming` | คำขอซื้อของฉัน, คำขอที่เข้ามา | Member |
| `/me/cart` | ตะกร้าหนังสือ | Member |
| `/sellers/:id` | หน้าร้าน + รีวิวร้าน | ทุกคน (รีวิวต้องซื้อขายเสร็จแล้ว) |
| `/admin` ... | ภาพรวม, หนังสือ, หมวดหมู่, รายการซื้อขาย, สมาชิก | Admin |

## Deploy บน Vercel

1. Import repo นี้ ตั้ง Root Directory = `bookmarket-web` (Framework: Create React App) `vercel.json` rewrite ทุก path ไป index.html ให้ React Router แล้ว
2. Settings → Environment Variables: `REACT_APP_API_URL = https://<ชื่อ>.onrender.com` (Production และ Preview)
3. Deployments → Redeploy (ต้องทำทุกครั้งที่แก้ค่า เพราะ CRA ฝังค่าตอน build)
4. ไปเพิ่ม URL ของ Vercel ใน `ALLOWED_ORIGINS` บน Render (ตรงทุกตัวอักษร ไม่มี `/` ปิดท้าย)

GitHub Actions (`.github/workflows/test.yml`) รัน `npm test` และ `npm run build` ทุก push
