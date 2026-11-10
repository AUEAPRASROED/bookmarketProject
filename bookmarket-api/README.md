# bookmarket-api: Student Second-hand Book Marketplace (Go)

Backend ของระบบซื้อขายหนังสือมือสองสำหรับนักศึกษา ใช้ Go + pgx + Supabase (PostgreSQL) โครงเดียวกับ `beweek6-lab/moviehub` ที่เรียน
เอกสารออกแบบทั้งหมด (ตาราง, endpoint, กติกาสถานะ, การแบ่งงาน) อยู่ใน [DESIGN.md](DESIGN.md)

```
main.go        env, ต่อ DB, เส้นทางทั้งหมด, CORS, PORT
auth/          bcrypt (password.go), ตั๋ว JWT (token.go), ชุดทดสอบตั๋วปลอม (token_test.go)
mw/            RequireLogin / RequireRole (auth.go), CORS (cors.go), Logging (logging.go)
handler/       รับคำขอ ตรวจข้อมูล แปลง error เป็นรหัส HTTP: auth, books, requests, admin
store/         คุยกับฐานข้อมูลด้วย SQL + $1: members, books, requests, categories, admin
schema.sql     สร้างตาราง 4 ตาราง      seed.sql  หมวดหมู่เริ่มต้น      rls.sql  เปิด RLS บน Supabase
smoke-test.sh  ทดสอบ API ทั้งระบบด้วย curl
```

## รันในเครื่อง

```bash
cp .env.example .env     # ใส่ DATABASE_URL, JWT_SECRET (ผลของ openssl rand -base64 48), ALLOWED_ORIGINS
go mod tidy
go test ./auth -v        # ตั๋วปลอม 6 แบบต้องถูกปฏิเสธ
go run .                 # ต้องเห็น "Book Marketplace API ฟังอยู่ที่ :8080"
./smoke-test.sh          # อีกหน้าต่างหนึ่ง ต้องจบด้วย "ไม่ผ่าน 0"
ADMIN_EMAIL=... ADMIN_PASS=... ./smoke-test.sh   # รวมส่วน admin
```

## ฐานข้อมูลบน Supabase

1. สร้างโปรเจกต์ใหม่ (Region เอเชีย) ตั้งรหัส DB เป็นตัวอักษรกับตัวเลขเท่านั้น
2. กด Connect → **Session pooler** → Use IPv4 → URI (ต้องเป็น port 5432) ต่อท้ายด้วย `?sslmode=require` นี่คือ `DATABASE_URL`
3. SQL Editor: วางเนื้อหา `schema.sql` → Run, `seed.sql` → Run, `rls.sql` → Run (ไฟล์พวกนี้ไม่มี `COPY` จึงวางใน SQL Editor ได้)
4. สมัครสมาชิกผ่านหน้าเว็บ 1 บัญชี แล้วตั้งเป็น admin คนแรก จากนั้น **ออกจากระบบแล้วเข้าใหม่**
   ```sql
   UPDATE members SET role = 'admin' WHERE email = 'อีเมลของคุณ';
   ```

## Deploy บน Render

| ช่อง | ค่า |
|---|---|
| Language / Branch / Region | Go / main / Singapore |
| Root Directory | (ว่าง ถ้า go.mod อยู่รากของ repo) |
| Build Command | `go build -o app .` |
| Start Command | `./app` |
| Health Check Path | `/api/books` |
| Environment | `DATABASE_URL`, `JWT_SECRET` (สุ่มใหม่ ไม่ใช้ค่าในเครื่อง), `ALLOWED_ORIGINS=https://<ชื่อ>.vercel.app,http://localhost:3000` |

ทดสอบหลัง deploy: `./smoke-test.sh https://<ชื่อ>.onrender.com`
ถ้า build ฟ้องเรื่องเวอร์ชัน Go ให้แก้บรรทัด `go` ใน go.mod เป็นเวอร์ชันที่ `go version` บอก แล้ว `go mod tidy`

## Endpoints

| Method | Path | ประตู |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | สาธารณะ |
| GET | `/api/categories`, `/api/books`, `/api/books/{id}` | สาธารณะ |
| GET / PUT | `/api/me` | login |
| PUT | `/api/me/password` | login |
| GET | `/api/me/books`, `/api/me/requests`, `/api/me/incoming` | login |
| POST | `/api/books` | login |
| PUT / DELETE | `/api/books/{id}` | login (เจ้าของ หรือ admin ตรวจใน SQL) |
| POST | `/api/books/{id}/requests` | login |
| PUT | `/api/requests/{id}/status` | login (ผู้ขาย/ผู้ซื้อตามกติกาสถานะ) |
| GET | `/api/admin/stats`, `/api/admin/books`, `/api/admin/requests`, `/api/admin/members` | admin |
| POST / PUT / DELETE | `/api/admin/categories`, `/api/admin/categories/{id}` | admin |
| PUT | `/api/admin/members/{id}/role` | admin |
| DELETE | `/api/admin/members/{id}` | admin |

error ทุกตัว: `{"error":{"code":"...","message":"ข้อความภาษาไทย"}}`
