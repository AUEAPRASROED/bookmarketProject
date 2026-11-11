# Student Second-hand Book Marketplace: เอกสารออกแบบ (Phase 2 + Phase 4)

ระบบซื้อขายหนังสือมือสองสำหรับนักศึกษา | React + Fetch API → Go → Supabase | Deploy: Vercel / Render / Supabase

ทุกส่วนในเอกสารนี้อ้างอิงแบบที่เรียนจาก repo MovieHub (React) และ beweek6-lab/moviehub (Go) พร้อมเอกสาร Week 11, Week 12 และใบงาน "ช่องขายตั๋วกับพนักงานตรวจตั๋ว" ไม่เพิ่ม framework, ORM หรือ library ใหม่

## ข้อตัดสินใจที่ยืนยันแล้ว

| # | เรื่อง | ข้อสรุป |
|---|---|---|
| 1 | รูปหนังสือ | กรอกเป็น URL (แบบช่องโปสเตอร์ใน `AdminMovieForm`) ไม่มีอัปโหลดไฟล์ |
| 2 | เปลี่ยนรหัสผ่าน | `PUT /api/me/password` ต้องกรอกรหัสเดิม ตรวจด้วย `auth.CheckPassword` |
| 3 | ยกเลิกคำขอซื้อ | ผู้ซื้อยกเลิกได้ตลอด ทั้งตอน `pending` และ `accepted` (ยกเลิกตอน accepted แล้วหนังสือกลับเป็น `available`) ยกเว้นเมื่อซื้อขายเสร็จแล้ว (`completed`) (ยืนยันแล้ว) |
| 4 | ข้อมูลผู้ขาย | Guest เห็นแค่ชื่อที่แสดง ช่องติดต่อเห็นได้หลังผู้ขายยอมรับคำขอแล้ว |
| 5 | ประกาศไม่เหมาะสม | Admin ลบทิ้งเลย ไม่มีสถานะซ่อน และ admin ลบสมาชิกได้ (ห้ามลบตัวเอง) |
| 6 | Repo | เปิดใหม่ 2 repo (Go และ React) ใช้โครงเดียวกับ lab |

---

## Phase 2: ความเป็นไปได้ของแต่ละฟังก์ชัน

| ฟังก์ชัน | สิ่งที่ต้องใช้ | มีในบทเรียนหรือไม่ | วิธีดำเนินการ (อ้างอิง) |
|---|---|---|---|
| Register | bcrypt, INSERT, ตรวจอีเมลซ้ำ 23505 | มี | ลอก `handler/auth.go` `Register` + `store/members.go` `CreateMember` เพิ่มช่อง `contact` |
| Login / Logout | JWT ใน `auth/token.go`, localStorage | มี | `Login` เดิม (รวม dummyHash ด่าน 7) ฝั่ง React ใช้ `AuthContext.login/logout` เดิม |
| ดู Profile | `GET /api/me` + `RequireLogin` | มี | `Me` เดิม |
| แก้ Profile | UPDATE ด้วยเลขจากตั๋ว | ประยุกต์ | แบบ `UpdateMemberRole` แต่ id มาจาก `mw.MemberID` |
| เปลี่ยน Password | `CheckPassword` + `HashPassword` | ประยุกต์ | ใช้สองฟังก์ชันใน `auth/password.go` ที่มีอยู่ ไม่ต้องใช้อะไรใหม่ |
| Guest ดู/ค้นหา/กรองหมวด | GET สาธารณะ, กรองในเครื่อง | มี | `SearchMovies` + หน้า `Movies.jsx` (ค้นหา + ปุ่มหมวด กรองใน React) |
| รายละเอียดหนังสือ | `GET /{id}` 404 | มี | `GetMovie` + `MovieDetail.jsx` |
| CRUD หนังสือ (เจ้าของ) | INSERT/UPDATE/DELETE + ตรวจเจ้าของใน WHERE | ประยุกต์ | CRUD จาก `store/admin.go` + เงื่อนไขเจ้าของแบบ `DeleteReview` (`WHERE id=$1 AND (seller_id=$2 OR $3)`) |
| ฟอร์มประกาศ | ฟอร์ม state object เดียว, ตรวจสองชั้น | มี | `AdminMovieForm.jsx` (ฟอร์มเดียวสองโหมด) + `validateMovie` ฝั่ง Go |
| ระบบคำขอซื้อ | ตารางใหม่ + สถานะ + transaction | ประยุกต์ | transaction แบบ `CreateMovie` (Begin/Commit/Rollback) เปลี่ยนสถานะคำขอกับหนังสือพร้อมกัน |
| Admin dashboard | count หลายตารางในคำขอเดียว | มี | `Stats` ใน `store/admin.go` + `AdminDashboard.jsx` |
| Admin หมวดหมู่ CRUD | CRUD + FK 23503 | ประยุกต์ | แบบ CRUD หนัง ลบหมวดที่ยังมีหนังสือ → 409 (แปลรหัส 23503 แบบ `ErrBadGenre`) |
| Admin จัดการประกาศ | ลบได้ทุกประกาศ | มี | ใช้ DELETE เดียวกับเจ้าของ ส่ง `isAdmin=true` แบบ `DeleteReview` |
| Admin จัดการสมาชิก | ดูรายชื่อ + เปลี่ยนบทบาท + ลบ | มี / ประยุกต์ | `AdminMembers` / `AdminSetRole` เดิม (ห้ามแก้ตัวเอง) ลบใช้ DELETE แบบ `DeleteMovie` + ON DELETE CASCADE |
| Admin คนแรก | SQL ครั้งเดียว | มี | Week 12 ข้อ 5.7 `UPDATE members SET role='admin'` |
| แยกสิทธิ์ FE/BE | `ProtectedRoute`, `RequireRole`, `RequireLogin`, `RequireRole` (Go) | มี | ใช้ของเดิมทั้งหมด |
| Loading/Empty/Error | 3 สถานะ + ปุ่มลองใหม่ | มี | `MovieGrid.jsx`, `AdminStates.jsx` |
| Unit Test | Jest + Testing Library + `jest.mock` | มี | แบบ `Movies.test.jsx`, `ReviewForm.test.jsx`, `RequireRole.test.jsx` + Go `token_test.go` |
| Deploy | Supabase / Render / Vercel + CORS | มี | Week 11 + `DEPLOY-GUIDE.md` |

ไม่มีฟังก์ชันไหนต้องใช้เทคโนโลยีนอกบทเรียนหลังจากตัดสินใจข้อ 1 แล้ว

---

## 1. System Overview

```
เบราว์เซอร์ ──fetch (apiFetch)──▶ Go API (Render) ──pgx──▶ PostgreSQL (Supabase)
React บน Vercel                    mw: Logging → CORS → RequireLogin → RequireRole → handler → store
```

env 4 ค่าเหมือน Week 11: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS` (Render) และ `REACT_APP_API_URL` (Vercel)

## 2. User Flow

**Guest**: หน้าแรก → หน้าหนังสือ (ค้นหา/กรองหมวด) → รายละเอียด → ปุ่ม "ส่งคำขอซื้อ" พาไปหน้า Login (ProtectedRoute จำหน้าเดิมไว้)

**Member (ผู้ขาย)**: Login → "ประกาศของฉัน" → ลงประกาศ/แก้/ลบ → "คำขอที่เข้ามา" → ยอมรับ (หนังสือเป็น `reserved` คำขออื่นของเล่มนั้นถูกปฏิเสธอัตโนมัติ) หรือปฏิเสธ → นัดรับของกันเอง → กด "ซื้อขายเสร็จ" (หนังสือเป็น `sold`)

**Member (ผู้ซื้อ)**: รายละเอียดหนังสือ → ส่งคำขอพร้อมข้อความ → "คำขอซื้อของฉัน" ติดตามสถานะ → เมื่อ `accepted` เห็นช่องติดต่อผู้ขาย → ยกเลิกได้ถ้ายังไม่ `completed`

**Admin**: Login → หลังบ้าน: Dashboard / หนังสือทั้งหมด (แก้ ลบ) / หมวดหมู่ (เพิ่ม แก้ ลบ) / คำขอซื้อทั้งหมด (ดู) / สมาชิก (เปลี่ยนบทบาท ลบ)

## 3. หน้าเว็บ

| Path | หน้า | สิทธิ์ |
|---|---|---|
| `/` | Home: หนังสือล่าสุด | ทุกคน |
| `/books` | Books: ค้นหา + กรองหมวด | ทุกคน |
| `/books/:id` | BookDetail: ราคา สภาพ ผู้ขาย ปุ่มส่งคำขอ | ทุกคน (ส่งคำขอต้อง login) |
| `/login`, `/register` | Login / Register | ทุกคน |
| `/me` | Profile: แก้ชื่อ ช่องติดต่อ เปลี่ยนรหัสผ่าน | Member |
| `/me/books` | MyBooks: ประกาศของฉัน + สถานะ | Member |
| `/me/books/new`, `/me/books/:id` | BookForm: ฟอร์มเดียวสองโหมด | Member (เจ้าของ) |
| `/me/requests` | MyRequests: คำขอที่ฉันส่ง | Member |
| `/me/incoming` | IncomingRequests: คำขอที่เข้ามาที่หนังสือของฉัน | Member |
| `/admin` | AdminDashboard | Admin |
| `/admin/books` | AdminBooks | Admin |
| `/admin/categories` | AdminCategories | Admin |
| `/admin/requests` | AdminRequests | Admin |
| `/admin/members` | AdminMembers | Admin |
| `*` | NotFound | ทุกคน |

## 4. Functional Requirements (กติกาที่ Go ต้องตรวจ)

- สมัครได้บทบาท `member` เสมอ (ค่าเริ่มต้นใน schema)
- รหัสผ่าน 8–72 ไบต์ ชื่อ 1–50 ตัว (กติกาเดิมจาก lab)
- หนังสือ: ต้องมี title, author, category, condition ราคา ≥ 0 รูปต้องเป็น `http...` หรือว่าง
- แก้/ลบหนังสือได้เมื่อเป็นเจ้าของหรือ admin ไม่ใช่ทั้งสองอย่างตอบ 404 (แบบ `DeleteReview`)
- ส่งคำขอ: หนังสือต้อง `available` ห้ามขอซื้อหนังสือตัวเอง (400) ห้ามมีคำขอ `pending`/`accepted` ซ้ำในเล่มเดียวกัน (409)
- เปลี่ยนสถานะคำขอที่ทำได้

| จาก | เป็น | ใครทำ | ผลต่อหนังสือ |
|---|---|---|---|
| `pending` | `accepted` | ผู้ขาย | `reserved` และคำขอ `pending` อื่นของเล่มนั้นเป็น `rejected` |
| `pending` | `rejected` | ผู้ขาย | ไม่เปลี่ยน |
| `pending` / `accepted` | `cancelled` | ผู้ซื้อ | ถ้าเดิม `accepted` หนังสือกลับเป็น `available` |
| `accepted` | `completed` | ผู้ขาย | `sold` |

  การเปลี่ยนนอกตารางนี้ตอบ 409 `BAD_TRANSITION` ทุกขั้นที่แตะสองตารางทำใน transaction เดียว
- ช่องติดต่อของผู้ขายส่งออกไปกับคำขอเฉพาะเมื่อสถานะเป็น `accepted` หรือ `completed` และเฉพาะกับผู้ซื้อคนนั้น

## 5. Database Tables

```sql
CREATE TABLE members (
    id             BIGSERIAL     PRIMARY KEY,
    email          VARCHAR(255)  NOT NULL,
    password_hash  VARCHAR(255)  NOT NULL,
    display_name   VARCHAR(50)   NOT NULL CHECK (char_length(btrim(display_name)) >= 1),
    contact        VARCHAR(100),                 -- เบอร์โทร/LINE เห็นได้หลังยอมรับคำขอ
    role           VARCHAR(10)   NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_members_email ON members (lower(email));

CREATE TABLE categories (
    id    SERIAL       PRIMARY KEY,
    name  VARCHAR(50)  NOT NULL UNIQUE
);

CREATE TABLE books (
    id           BIGSERIAL      PRIMARY KEY,
    seller_id    BIGINT         NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    category_id  INTEGER        NOT NULL REFERENCES categories (id),   -- ลบหมวดที่ยังมีหนังสือไม่ได้
    title        VARCHAR(255)   NOT NULL,
    author       VARCHAR(255)   NOT NULL,
    description  TEXT,
    condition    VARCHAR(10)    NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
    price        NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
    image_url    VARCHAR(500),
    status       VARCHAR(10)    NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_books_seller ON books (seller_id);

CREATE TABLE purchase_requests (
    id          BIGSERIAL     PRIMARY KEY,
    book_id     BIGINT        NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    buyer_id    BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    message     VARCHAR(500),
    status      VARCHAR(10)   NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_book  ON purchase_requests (book_id);
CREATE INDEX idx_requests_buyer ON purchase_requests (buyer_id);
```

ความสัมพันธ์: members 1–N books (ขาย), members 1–N purchase_requests (ซื้อ), books 1–N purchase_requests, categories 1–N books
หลังโหลดขึ้น Supabase เปิด RLS ทั้ง 4 ตารางเหมือน Week 11 ข้อ 1.4 ส่วน seed.sql ใส่หมวดเริ่มต้น เช่น วิทยาศาสตร์ วิศวกรรม คอมพิวเตอร์ บริหารธุรกิจ ภาษา ศึกษาทั่วไป

## 6. API Endpoints

error ทุกตัวเป็นรูปแบบเดียวกับ lab: `{"error":{"code":"...","message":"..."}}`

| Method | Path | ประตู | ตอบ |
|---|---|---|---|
| POST | `/api/auth/register` | – | 201 / 400 / 409 |
| POST | `/api/auth/login` | – | 200 `{token, member}` / 401 |
| GET | `/api/me` | login | 200 |
| PUT | `/api/me` | login | 200 `{displayName, contact}` / 400 |
| PUT | `/api/me/password` | login | 204 / 400 (รหัสเดิมผิด ใช้ 400 เพราะตั๋วยังถูกต้อง) |
| GET | `/api/categories` | – | 200 `{items}` |
| GET | `/api/books?q=` | – | 200 `{items}` (เฉพาะ `available` + `reserved`) |
| GET | `/api/books/{id}` | – | 200 / 404 |
| POST | `/api/books` | login | 201 / 400 |
| PUT | `/api/books/{id}` | login (เจ้าของ หรือ admin) | 200 / 400 / 404 |
| DELETE | `/api/books/{id}` | login (เจ้าของ หรือ admin) | 204 / 404 |
| GET | `/api/me/books` | login | 200 ทุกสถานะของตัวเอง |
| POST | `/api/books/{id}/requests` | login | 201 / 400 / 404 / 409 |
| GET | `/api/me/requests` | login | 200 คำขอที่ฉันส่ง |
| GET | `/api/me/incoming` | login | 200 คำขอที่หนังสือของฉันได้รับ |
| PUT | `/api/requests/{id}/status` | login (ตามตาราง ข้อ 4) | 200 / 404 / 409 |
| GET | `/api/admin/stats` | admin | 200 จำนวนสมาชิก หนังสือแยกสถานะ คำขอแยกสถานะ |
| GET | `/api/admin/books` | admin | 200 ทุกเล่มทุกสถานะ |
| GET | `/api/admin/requests` | admin | 200 ทุกคำขอ |
| POST / PUT / DELETE | `/api/admin/categories`, `/api/admin/categories/{id}` | admin | 201 / 200 / 204 / 409 |
| GET | `/api/admin/members` | admin | 200 |
| PUT | `/api/admin/members/{id}/role` | admin | 200 / 400 (แก้ตัวเอง) |
| DELETE | `/api/admin/members/{id}` | admin | 204 / 400 (ลบตัวเอง) / 404 |

## 7. โครงสร้าง Frontend (ตาม repo MovieHub)

```
src/
  api/backend.js            apiFetch + ฟังก์ชันทุก endpoint
  api/backend.test.js
  auth/AuthContext.jsx      token, member, isAdmin, login, register, logout (+ updateMember หลังแก้ profile)
  components/
    Navbar.jsx  Footer.jsx  ProtectedRoute.jsx  RequireRole.jsx
    BookCard.jsx  BookGrid.jsx (loading/error/empty)  StatusBadge.jsx
    admin/AdminStates.jsx   ErrorBox, Loading, ConfirmBox, ปุ่ม
  pages/
    Home.jsx  Books.jsx  BookDetail.jsx  Login.jsx  Register.jsx  NotFound.jsx
    Profile.jsx  MyBooks.jsx  BookForm.jsx  MyRequests.jsx  IncomingRequests.jsx
    admin/AdminLayout.jsx  AdminDashboard.jsx  AdminBooks.jsx  AdminCategories.jsx  AdminRequests.jsx  AdminMembers.jsx
vercel.json  .env.example  .github/workflows/test.yml
```

ใช้ React 19 + React Router 6 + Tailwind 3 + Testing Library ตาม `package.json` ของ MovieHub ไม่เพิ่ม dependency

## 8. โครงสร้าง Backend (ตาม beweek6-lab/moviehub)

```
bookmarket/
  main.go                   env, pool.Ping, mux, login/admin helper, CORS, PORT
  auth/password.go  auth/token.go  auth/token_test.go
  mw/auth.go  mw/cors.go  mw/logging.go
  handler/handler.go        writeJSON, writeError, internal, pathID
  handler/auth.go           Register, Login, Me, UpdateMe, ChangePassword
  handler/books.go          List, Get, Create, Update, Delete, MyBooks
  handler/requests.go       Create, MyRequests, Incoming, UpdateStatus
  handler/admin.go          Stats, Books, Requests, Categories CRUD, Members, SetRole
  store/store.go  store/members.go  store/books.go  store/requests.go  store/categories.go  store/admin.go
  schema.sql  seed.sql  .env.example  .gitignore
```

library เดิมเท่านั้น: pgx v5, golang-jwt v5, x/crypto/bcrypt, godotenv

## 9. การตรวจสอบสิทธิ์

| ชั้น | Guest | Member | Admin |
|---|---|---|---|
| React | ProtectedRoute พาไป /login | RequireRole แสดง 403 ที่ /admin | เห็นเมนูหลังบ้าน |
| Go middleware | ไม่มีตั๋ว → 401 | `RequireRole("admin")` → 403 | ผ่าน |
| Go store (ความเป็นเจ้าของ) | – | `WHERE id=$1 AND (seller_id=$2 OR $3)` | `$3 = true` |

เลขสมาชิกมาจากตั๋วเท่านั้น ไม่อ่านจาก body หรือ URL (สัญญาใน `docs/db-schema.md` ของ MovieHub) พิสูจน์ด้วย curl: member ยิง `/api/admin/stats` ได้ 403, member A ลบหนังสือของ B ได้ 404

## 10. การเชื่อมต่อ

`apiFetch(path, {method, body, token})` → `fetch(REACT_APP_API_URL + path)` แนบ `Authorization: Bearer` → Go: Logging → CORS → RequireLogin → handler อ่าน JSON ตรวจข้อมูล → store ยิง SQL ด้วย `$1` → แปลรหัส PostgreSQL เป็นรหัส HTTP → `writeJSON` → React อ่าน `data.error?.message` แล้ว setState 3 สถานะ

## 11. แผนการทดสอบ

**React (Jest + Testing Library + jest.mock ตามบทเรียน)**
- `backend.test.js`: แนบ Bearer, 204 คืน null, อ่าน error ของ Go
- `ProtectedRoute.test.jsx`, `RequireRole.test.jsx`: Guest ไป login, member เห็น 403, admin เห็นหลังบ้าน
- `Books.test.jsx`: โหลดสำเร็จ / กรองหมวดไม่ยิงซ้ำ / error + ลองใหม่ / ว่างเปล่า
- `BookForm.test.jsx`: ราคาติดลบกดส่งไม่ได้ ส่งแล้วเรียก `createBook` ด้วยข้อมูลถูก
- `IncomingRequests.test.jsx`: กดยอมรับต้องผ่านกล่องยืนยันก่อนเรียก backend

**Go**: `go test ./auth -v` (ตั๋วปลอม 6 แบบ) และชุด curl ตามสถานการณ์ในข้อ 4 และข้อ 9 (บันทึกผลไว้ใช้เป็นหลักฐานในคลิป)

GitHub Actions `test.yml` รัน `npm test` และ `npm run build` ทุก push

## 12. Deployment Plan

ตาม `DEPLOY-GUIDE.md`: Supabase (โหลด schema.sql + seed.sql ผ่าน psql, เปิด RLS 4 ตาราง, ตั้ง admin ด้วย SQL) → Render (Root `bookmarket`, `go build -o app .`, env 3 ค่า, Health Check `/api/books`) → Vercel (`REACT_APP_API_URL` + Redeploy) → เพิ่ม URL Vercel ใน `ALLOWED_ORIGINS`

---

## แผนแบ่งงาน 2 คน (แบ่งตามฟีเจอร์ ทุกคนอธิบายได้ครบ React → API → Go → DB)

| | คนที่ 1 | คนที่ 2 |
|---|---|---|
| ฟีเจอร์ | สมาชิก (register, login, profile, password), หนังสือ (Guest ดู/ค้น/กรอง, CRUD ประกาศของฉัน) | คำขอซื้อ (ส่ง, ติดตาม, ยกเลิก, ยอมรับ/ปฏิเสธ/เสร็จ), หลังบ้าน admin ทั้งหมด |
| Go | auth/, mw/, handler+store: auth, members, books | handler+store: requests, categories, admin |
| React | AuthContext, Login, Register, Profile, Home, Books, BookDetail, MyBooks, BookForm | MyRequests, IncomingRequests, admin/* |
| Test | backend.test, ProtectedRoute.test, Books.test, BookForm.test | RequireRole.test, IncomingRequests.test |
| Deploy | Supabase + Render | Vercel + ตรวจหลัง deploy |

## ลำดับพัฒนา (เมื่ออนุมัติแล้ว)

1. โครง 2 repo + schema.sql/seed.sql ทดสอบใน PostgreSQL
2. Go: auth + members → books → requests → admin (ทดสอบ curl ทุกขั้น)
3. React: AuthContext + หน้า Guest → หน้า Member → หน้า Admin
4. Unit Test ทั้งหมด → Deploy → ทดสอบบนโดเมนจริง
5. Phase 8: README, Checklist ตาม Rubric, Script คลิป 15 นาที


---

## ส่วนเพิ่มเติม v2: ตะกร้าหนังสือ + รีวิวร้าน + ปรับหน้าตา

ทุกอย่างใช้รูปแบบเดิมจากบทเรียน ไม่เพิ่ม library ใหม่

| ฟังก์ชัน | อ้างอิงบทเรียน | วิธีทำ |
|---|---|---|
| ตะกร้าหนังสือ | wishlist ในใบงานด่าน 5 (`PUT/DELETE /api/me/wishlist/{movieId}`, ON CONFLICT) | ตาราง `cart_items` + `GET/PUT/DELETE /api/me/cart/{bookId}` ฝั่ง React ใช้ `CartContext` แบบเดียวกับ `AuthContext` |
| รีวิวร้าน | reviews ในใบงานด่าน 4-5 (คนละครั้ง, 23505 → 409, ลบได้เมื่อเป็นเจ้าของหรือ admin) + votes (คะแนนเป็นช่วง) | ตาราง `seller_reviews` คะแนน 1-5 ดาว รีวิวได้เมื่อเคยซื้อขายกับร้านนั้นจนสถานะเป็น `completed` |
| หน้าร้าน | Stats (ยิงครั้งเดียวได้ข้อมูลทั้งหน้า) | `GET /api/sellers/{id}` ตอบ `{seller, books, reviews}` |
| หน้าตาเว็บ | Tailwind ใน MovieHub | ปกจำลองสีไล่ระดับ (`BookCover`), ดาว (`Stars`), hero, ไอคอนหมวด, การ์ดเงา |

### ตารางใหม่

```sql
CREATE TABLE cart_items (
    member_id  BIGINT       NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    book_id    BIGINT       NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (member_id, book_id)
);
CREATE TABLE seller_reviews (
    id           BIGSERIAL     PRIMARY KEY,
    seller_id    BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    reviewer_id  BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    rating       SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text         VARCHAR(500),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_seller_reviews UNIQUE (seller_id, reviewer_id),
    CONSTRAINT ck_no_self_review CHECK (seller_id <> reviewer_id)
);
```
Supabase ที่สร้างไว้แล้ว: รัน `migrate-002-cart-reviews.sql` ครั้งเดียว

### Endpoint ใหม่

| Method | Path | ประตู | ตอบ |
|---|---|---|---|
| GET | `/api/me/cart` | login | 200 `{items}` (หนังสือรูปร่างเดียวกับ `/api/books`) |
| PUT | `/api/me/cart/{bookId}` | login | 200 / 400 (หนังสือตัวเอง) / 404 |
| DELETE | `/api/me/cart/{bookId}` | login | 204 |
| GET | `/api/sellers/{id}` | - | 200 `{seller, books, reviews}` / 404 |
| POST | `/api/sellers/{id}/reviews` | login | 201 / 400 (ดาวผิด, รีวิวตัวเอง) / 403 (ยังไม่เคยซื้อขายเสร็จ) / 409 (รีวิวแล้ว) |
| DELETE | `/api/seller-reviews/{id}` | login (คนเขียน หรือ admin) | 204 / 404 |

หนังสือทุกเล่มที่ตอบจาก API มี `seller.rating` และ `seller.reviewCount` ติดมา หน้า Dashboard มีตัวเลข `reviews`

### หน้าใหม่

| Path | หน้า | สิทธิ์ |
|---|---|---|
| `/me/cart` | ตะกร้า: ส่งคำขอทีละเล่มหรือทั้งหมด ส่งสำเร็จแล้วเอาออกจากตะกร้า | Member |
| `/sellers/:id` | หน้าร้าน: คะแนน รีวิว หนังสือที่ขายอยู่ ฟอร์มรีวิว | ทุกคน (รีวิวต้อง login + ซื้อขายเสร็จแล้ว) |

### เทสต์ใหม่
`Cart.test.jsx` (โหลด / ส่งคำขอแล้วเอาออก / 409 / ว่าง) และ `SellerPage.test.jsx` (แสดงร้าน / ไม่มีสิทธิ์รีวิว / รีวิวแล้วคะแนนอัปเดต / Guest)
