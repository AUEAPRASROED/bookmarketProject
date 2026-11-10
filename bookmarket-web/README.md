# bookmarket-web: Student Second-hand Book Marketplace (React)

หน้าเว็บของระบบซื้อขายหนังสือมือสองสำหรับนักศึกษา React 19 + React Router 6 + Tailwind CSS 3 เรียก Go API ผ่าน Fetch (`src/api/backend.js`) โครงเดียวกับ MovieHub ที่เรียน
เอกสารออกแบบอยู่ใน [docs/design.md](docs/design.md)

```
src/
  api/backend.js          apiFetch + ฟังก์ชันทุก endpoint (ที่เดียวที่เรียก fetch)
  auth/AuthContext.jsx    token, member, isAdmin, login, register, logout, updateMember
  data/labels.js          ป้ายภาษาไทยของสภาพหนังสือ / สถานะ, จัดรูปแบบราคาและวันที่
  components/             Navbar, Footer, ProtectedRoute, RequireRole, BookCard, BookGrid, StatusBadge, admin/AdminStates
  pages/                  Home, Books, BookDetail, Login, Register, Profile, MyBooks, BookForm, MyRequests, IncomingRequests, NotFound
  pages/admin/            AdminLayout, AdminDashboard, AdminBooks, AdminCategories, AdminRequests, AdminMembers
  *.test.js(x)            Unit test (Jest + Testing Library)
```

## รันในเครื่อง

```bash
npm install
cp .env.example .env.local     # REACT_APP_API_URL=http://localhost:8080 (รัน Go ไว้อีกหน้าต่าง)
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
| `/admin` ... | ภาพรวม, หนังสือ, หมวดหมู่, รายการซื้อขาย, สมาชิก | Admin |

## Deploy บน Vercel

1. Import repo นี้ (Framework: Create React App) `vercel.json` rewrite ทุก path ไป index.html ให้ React Router แล้ว
2. Settings → Environment Variables: `REACT_APP_API_URL = https://<ชื่อ>.onrender.com` (Production และ Preview)
3. Deployments → Redeploy (ต้องทำทุกครั้งที่แก้ค่า เพราะ CRA ฝังค่าตอน build)
4. ไปเพิ่ม URL ของ Vercel ใน `ALLOWED_ORIGINS` บน Render (ตรงทุกตัวอักษร ไม่มี `/` ปิดท้าย)

GitHub Actions (`.github/workflows/test.yml`) รัน `npm test` และ `npm run build` ทุก push
