-- รันใน Supabase SQL Editor ทันทีหลังสร้างตาราง (Week 11 ข้อ 1.4)
-- ปิด Data API ของ Supabase ทุกตาราง Go ต่อด้วย user เจ้าของตารางจึงยังใช้ได้ตามปกติ
ALTER TABLE public.members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews    ENABLE ROW LEVEL SECURITY;
