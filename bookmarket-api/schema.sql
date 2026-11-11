-- Student Second-hand Book Marketplace: database schema (PostgreSQL 14+)
-- โครงเดียวกับ schema.sql ของ MovieHub: แต่ละตารางมีคำอธิบาย กติกาข้อมูลอยู่ใน CHECK / REFERENCES

BEGIN;

-- ---------------------------------------------------------------------------
-- members: สมาชิกของเว็บ สมัครแล้วได้ role = member เสมอ admin ตั้งด้วย SQL ครั้งแรกเท่านั้น
-- ---------------------------------------------------------------------------
CREATE TABLE members (
    id             BIGSERIAL     PRIMARY KEY,
    email          VARCHAR(255)  NOT NULL,
    password_hash  VARCHAR(255)  NOT NULL,          -- bcrypt ห้ามเก็บรหัสผ่านตรง ๆ
    display_name   VARCHAR(50)   NOT NULL CHECK (char_length(btrim(display_name)) >= 1),
    contact        VARCHAR(100),                    -- เบอร์โทร / LINE ID ผู้ซื้อเห็นได้หลังผู้ขายยอมรับคำขอ
    role           VARCHAR(10)   NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- อีเมลห้ามซ้ำโดยไม่สนตัวพิมพ์เล็กใหญ่ (Go lower() ก่อนบันทึกและก่อนค้นตอน login)
CREATE UNIQUE INDEX uq_members_email ON members (lower(email));

-- ---------------------------------------------------------------------------
-- categories: หมวดหมู่หนังสือ admin เพิ่ม แก้ ลบได้
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id    SERIAL       PRIMARY KEY,
    name  VARCHAR(50)  NOT NULL UNIQUE CHECK (char_length(btrim(name)) >= 1)
);

-- ---------------------------------------------------------------------------
-- books: ประกาศขายหนังสือ 1 แถวต่อ 1 เล่ม
-- status: available = ขายอยู่, reserved = ผู้ขายยอมรับคำขอแล้ว รอนัดรับ, sold = ขายแล้ว
-- ---------------------------------------------------------------------------
CREATE TABLE books (
    id           BIGSERIAL      PRIMARY KEY,
    seller_id    BIGINT         NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    category_id  INTEGER        NOT NULL REFERENCES categories (id),   -- ไม่มี CASCADE: ลบหมวดที่ยังมีหนังสือไม่ได้
    title        VARCHAR(255)   NOT NULL CHECK (char_length(btrim(title)) >= 1),
    author       VARCHAR(255)   NOT NULL CHECK (char_length(btrim(author)) >= 1),
    description  TEXT,
    condition    VARCHAR(10)    NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
    price        NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
    image_url    VARCHAR(500),                     -- URL รูปเต็ม (https://...) หรือ NULL
    status       VARCHAR(10)    NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_seller   ON books (seller_id);
CREATE INDEX idx_books_category ON books (category_id);
CREATE INDEX idx_books_created  ON books (created_at DESC);

-- ---------------------------------------------------------------------------
-- purchase_requests: คำขอซื้อ ผู้ซื้อ 1 คนมีคำขอที่ยัง pending / accepted ต่อ 1 เล่มได้ครั้งละ 1 คำขอ (ตรวจใน Go)
-- pending -> accepted | rejected      (ผู้ขาย)
-- pending | accepted -> cancelled     (ผู้ซื้อ)
-- accepted -> completed               (ผู้ขาย)
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_requests (
    id          BIGSERIAL     PRIMARY KEY,
    book_id     BIGINT        NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    buyer_id    BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    message     VARCHAR(500),                      -- ข้อความถึงผู้ขาย เช่น "สะดวกรับที่ตึกวิทย์"
    status      VARCHAR(10)   NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_book  ON purchase_requests (book_id);
CREATE INDEX idx_requests_buyer ON purchase_requests (buyer_id);

-- ---------------------------------------------------------------------------
-- cart_items: ตะกร้าหนังสือของสมาชิก (แบบ wishlist_items ของ MovieHub) 1 คน 1 เล่ม 1 แถว
-- ---------------------------------------------------------------------------
CREATE TABLE cart_items (
    member_id  BIGINT       NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    book_id    BIGINT       NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (member_id, book_id)
);

-- ---------------------------------------------------------------------------
-- seller_reviews: รีวิวร้าน (ผู้ขาย) คนหนึ่งรีวิวร้านหนึ่งได้ครั้งเดียว (แบบ reviews ของ MovieHub)
-- Go ตรวจเพิ่มว่าผู้รีวิวต้องเคยซื้อขายกับร้านนี้จนสถานะเป็น completed แล้ว
-- ---------------------------------------------------------------------------
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
CREATE INDEX idx_seller_reviews_seller ON seller_reviews (seller_id);

COMMIT;
