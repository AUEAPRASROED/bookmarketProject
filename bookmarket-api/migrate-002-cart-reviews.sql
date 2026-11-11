-- สำหรับ Supabase ที่รัน schema.sql รุ่นแรก (4 ตาราง) ไปแล้ว: วางใน SQL Editor แล้วกด Run ครั้งเดียว
-- ถ้าเพิ่งเริ่มใหม่ ใช้ schema.sql ตัวล่าสุดได้เลย ไม่ต้องรันไฟล์นี้ (รันซ้ำก็ไม่พัง)
BEGIN;

CREATE TABLE IF NOT EXISTS cart_items (
    member_id  BIGINT       NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    book_id    BIGINT       NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (member_id, book_id)
);

CREATE TABLE IF NOT EXISTS seller_reviews (
    id           BIGSERIAL     PRIMARY KEY,
    seller_id    BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    reviewer_id  BIGINT        NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    rating       SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text         VARCHAR(500),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_seller_reviews UNIQUE (seller_id, reviewer_id),
    CONSTRAINT ck_no_self_review CHECK (seller_id <> reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON seller_reviews (seller_id);

ALTER TABLE public.cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'cart_items' AS t, count(*) FROM cart_items UNION ALL SELECT 'seller_reviews', count(*) FROM seller_reviews;
