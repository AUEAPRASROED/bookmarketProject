-- ข้อมูลตัวอย่างสำหรับเดโม: หนังสือ 40 เล่ม (8 หมวด x 5) + ขายแล้ว 3 เล่ม, สมาชิก 4 คน, คำขอซื้อ, ตะกร้า, รีวิวร้าน
-- รันหลัง schema.sql + seed.sql (หรือหลัง migrate-002) ใน Supabase SQL Editor ได้เลย รันซ้ำได้ไม่เกิดข้อมูลซ้ำ
-- รูปปกอยู่ที่ bookmarket-web/public/covers/ จึงใช้ path ที่ขึ้นต้นด้วย /covers/
--
-- บัญชีตัวอย่าง รหัสผ่าน password1 ทุกบัญชี (ไม่มีบัญชี admin: ตั้ง admin เองด้วย UPDATE ตามขั้นตอนใน README)
--   seller@test.com พี่เอ | buyer@test.com น้องบี | nida@test.com นิดา | ton@test.com ต้น
-- ⚠️ ก่อนส่งงาน/เปิดให้คนอื่นใช้ ควรเปลี่ยนรหัสหรือลบบัญชีพวกนี้ เพราะรหัสอยู่ในไฟล์นี้

BEGIN;

INSERT INTO members (email, password_hash, display_name, contact) VALUES
    ('seller@test.com', '$2a$10$KP6k8//XwVXMWGUPKdMWW.B8lGlwO4188ADiH8jYJSDc/2lDhz8wC', 'พี่เอ', 'LINE: pa_books'),
    ('buyer@test.com', '$2a$10$KP6k8//XwVXMWGUPKdMWW.B8lGlwO4188ADiH8jYJSDc/2lDhz8wC', 'น้องบี', '081-234-5678'),
    ('nida@test.com', '$2a$10$KP6k8//XwVXMWGUPKdMWW.B8lGlwO4188ADiH8jYJSDc/2lDhz8wC', 'นิดา', 'IG: nida.reads'),
    ('ton@test.com', '$2a$10$KP6k8//XwVXMWGUPKdMWW.B8lGlwO4188ADiH8jYJSDc/2lDhz8wC', 'ต้น', 'LINE: ton.eng')
ON CONFLICT ((lower(email))) DO NOTHING;

INSERT INTO books (seller_id, category_id, title, author, description, condition, price, image_url, status, created_at, updated_at)
SELECT m.id, c.id, v.title, v.author, v.description, v.condition, v.price, v.image_url, v.status,
       now() - make_interval(secs => v.days * 86400), now() - make_interval(secs => v.days * 86400)
FROM (VALUES
    ('seller@test.com', 'วิทยาศาสตร์', 'ฟิสิกส์ทั่วไป 1', 'ผศ.ดร.ธนากร ศรีสุข', 'ครบทุกบท กลศาสตร์ถึงคลื่น มีโจทย์ท้ายบทพร้อมเฉลย', 'good', 320, '/covers/book-01.svg', 'available', 0.2),
    ('nida@test.com', 'คณิตศาสตร์', 'แคลคูลัส 1', 'ผศ.วิชัย คำนวณ', 'ลิมิต อนุพันธ์ อินทิกรัล มีเฉลยแบบฝึกหัดคี่', 'good', 380, '/covers/book-02.svg', 'available', 0.5),
    ('ton@test.com', 'คอมพิวเตอร์', 'เขียนโปรแกรมภาษา Go', 'ณัฐพล โค้ดดี', 'เริ่มจากศูนย์จนทำ Web API ได้', 'like_new', 450, '/covers/book-03.svg', 'available', 0.8),
    ('buyer@test.com', 'วิศวกรรมศาสตร์', 'กลศาสตร์วิศวกรรมสถิตยศาสตร์', 'รศ.ดร.ประยุทธ แรงสมดุล', 'free body diagram ละเอียด โจทย์เยอะ', 'good', 520, '/covers/book-04.svg', 'available', 1.1),
    ('seller@test.com', 'บริหารธุรกิจ', 'หลักการตลาด', 'ผศ.ดร.มาลี ขายดี', '4P, STP, กรณีศึกษาธุรกิจไทย', 'good', 330, '/covers/book-05.svg', 'reserved', 1.4),
    ('nida@test.com', 'ภาษา', 'English for Communication', 'Ajarn Sarah Wilson', 'ฝึกพูด ฟัง เขียน มี QR ไฟล์เสียง', 'good', 260, '/covers/book-06.svg', 'available', 1.7),
    ('ton@test.com', 'ศึกษาทั่วไป', 'ความคิดสร้างสรรค์กับการแก้ปัญหา', 'ศูนย์ศึกษาทั่วไป', 'ใช้เรียนวิชา GE มีกิจกรรมกลุ่ม', 'fair', 90, '/covers/book-07.svg', 'available', 2.0),
    ('buyer@test.com', 'อื่น ๆ', 'ถ่ายภาพด้วยมือถือ', 'ภาณุ เลนส์สวย', 'จัดองค์ประกอบ แสง แต่งภาพ', 'like_new', 210, '/covers/book-08.svg', 'available', 2.3),
    ('nida@test.com', 'วิทยาศาสตร์', 'เคมีทั่วไป', 'ดร.พิมพ์ชนก วงศ์ทอง', 'ใช้เรียน 1 เทอม มีไฮไลต์บางหน้า', 'like_new', 290, '/covers/book-09.svg', 'available', 3.2),
    ('ton@test.com', 'คณิตศาสตร์', 'แคลคูลัส 2', 'ผศ.วิชัย คำนวณ', 'ต่อจากเล่ม 1 อนุกรมและหลายตัวแปร', 'like_new', 390, '/covers/book-10.svg', 'available', 3.5),
    ('buyer@test.com', 'คอมพิวเตอร์', 'โครงสร้างข้อมูลและอัลกอริทึม', 'ผศ.ดร.ปกรณ์ ลำดับ', 'Big-O, tree, graph, sorting ครบ', 'good', 420, '/covers/book-11.svg', 'available', 3.8),
    ('seller@test.com', 'วิศวกรรมศาสตร์', 'วงจรไฟฟ้า 1', 'ผศ.ดร.วรวุฒิ กระแส', 'KVL KCL Thevenin มีเฉลยท้ายบท', 'like_new', 400, '/covers/book-12.svg', 'available', 4.1),
    ('nida@test.com', 'บริหารธุรกิจ', 'การบัญชีขั้นต้น', 'อ.ชนิดา งบดุล', 'บันทึกบัญชี งบการเงิน มีแบบฝึกหัด', 'like_new', 280, '/covers/book-13.svg', 'available', 4.4),
    ('ton@test.com', 'ภาษา', 'ไวยากรณ์อังกฤษฉบับเข้าใจง่าย', 'อ.ปวีณา แกรมม่า', 'Tense ครบ มีแบบทดสอบท้ายบท', 'like_new', 220, '/covers/book-14.svg', 'available', 4.7),
    ('buyer@test.com', 'ศึกษาทั่วไป', 'พลเมืองดิจิทัล', 'อ.ธนวัฒน์ ออนไลน์', 'รู้เท่าทันสื่อ ความปลอดภัยออนไลน์', 'good', 150, '/covers/book-15.svg', 'available', 5.0),
    ('seller@test.com', 'อื่น ๆ', 'ทำอาหารง่ายสำหรับหอพัก', 'เชฟแอน หม้อหุงข้าว', 'เมนูไมโครเวฟและหม้อหุงข้าว 50 เมนู', 'good', 150, '/covers/book-16.svg', 'available', 5.3),
    ('ton@test.com', 'วิทยาศาสตร์', 'ชีววิทยาเบื้องต้น', 'รศ.ดร.กมล ใจดี', 'รูปประกอบสีทั้งเล่ม เหมาะกับปี 1', 'good', 350, '/covers/book-17.svg', 'available', 6.2),
    ('buyer@test.com', 'คณิตศาสตร์', 'พีชคณิตเชิงเส้น', 'ดร.สุดารัตน์ เมทริกซ์', 'เวกเตอร์ เมทริกซ์ ค่าเฉพาะ สภาพดีมาก', 'good', 300, '/covers/book-18.svg', 'available', 6.5),
    ('seller@test.com', 'คอมพิวเตอร์', 'พัฒนาเว็บด้วย React', 'กิตติ ฟรอนต์เอนด์', 'Hooks, Router, Fetch API มีโปรเจกต์ตัวอย่าง', 'new', 480, '/covers/book-19.svg', 'available', 6.8),
    ('nida@test.com', 'วิศวกรรมศาสตร์', 'เขียนแบบวิศวกรรม', 'อ.สมศักดิ์ เส้นตรง', 'ภาพฉาย ไอโซเมตริก ใช้เรียนวิชาเขียนแบบ', 'good', 260, '/covers/book-20.svg', 'available', 7.1),
    ('ton@test.com', 'บริหารธุรกิจ', 'เศรษฐศาสตร์จุลภาค', 'ดร.ภูมิ อุปสงค์', 'อุปสงค์ อุปทาน ตลาดแข่งขัน', 'good', 300, '/covers/book-21.svg', 'available', 7.4),
    ('buyer@test.com', 'ภาษา', 'ภาษาญี่ปุ่นเบื้องต้น 1', 'อ.ยูกิ ทานากะ', 'ฮิรางานะ คาตาคานะ บทสนทนาพื้นฐาน', 'good', 310, '/covers/book-22.svg', 'available', 7.7),
    ('seller@test.com', 'ศึกษาทั่วไป', 'สุขภาพและการออกกำลังกาย', 'อ.พลศึกษา แข็งแรง', 'วางแผนออกกำลังกาย โภชนาการพื้นฐาน', 'like_new', 160, '/covers/book-23.svg', 'available', 8.0),
    ('nida@test.com', 'อื่น ๆ', 'จิตวิทยาการพัฒนาตนเอง', 'ดร.สุขใจ เติบโต', 'ตั้งเป้าหมาย จัดการเวลา', 'new', 230, '/covers/book-24.svg', 'available', 8.3),
    ('buyer@test.com', 'วิทยาศาสตร์', 'ปฏิบัติการเคมีอินทรีย์', 'คณะวิทยาศาสตร์', 'คู่มือแล็บ มีจดบันทึกผลการทดลองด้วยดินสอ', 'fair', 120, '/covers/book-25.svg', 'available', 9.2),
    ('seller@test.com', 'คณิตศาสตร์', 'สถิติเบื้องต้น', 'ภาควิชาสถิติ', 'ใช้คู่กับโปรแกรม Excel มีตารางท้ายเล่ม', 'fair', 150, '/covers/book-26.svg', 'available', 9.5),
    ('nida@test.com', 'คอมพิวเตอร์', 'ระบบฐานข้อมูล', 'ดร.ศิริพร ตาราง', 'ER Diagram, SQL, Normalization', 'good', 360, '/covers/book-27.svg', 'available', 9.8),
    ('ton@test.com', 'วิศวกรรมศาสตร์', 'กลศาสตร์ของไหล', 'ดร.ชลธิชา น้ำไหล', 'สมการเบอร์นูลลี การไหลในท่อ', 'fair', 300, '/covers/book-28.svg', 'available', 10.1),
    ('buyer@test.com', 'บริหารธุรกิจ', 'การจัดการการเงิน', 'ผศ.ดร.ธนพร ทุนดี', 'มูลค่าเงินตามเวลา งบลงทุน', 'fair', 190, '/covers/book-29.svg', 'available', 10.4),
    ('seller@test.com', 'ภาษา', 'ภาษาจีนกลางสำหรับผู้เริ่มต้น', 'อ.หลิว เหมย', 'พินอิน วรรณยุกต์ ศัพท์ HSK 1', 'new', 290, '/covers/book-30.svg', 'available', 10.7),
    ('nida@test.com', 'ศึกษาทั่วไป', 'ปรัชญาและจริยศาสตร์', 'ผศ.ดร.ปัญญา ใคร่ครวญ', 'แนวคิดนักปรัชญาสำคัญ อ่านง่าย', 'good', 180, '/covers/book-31.svg', 'available', 11.0),
    ('ton@test.com', 'อื่น ๆ', 'วางแผนการเงินส่วนบุคคล', 'อ.ออมเงิน มั่งคั่ง', 'งบรายจ่ายนักศึกษา การออมและลงทุนเบื้องต้น', 'good', 190, '/covers/book-32.svg', 'available', 11.3),
    ('seller@test.com', 'วิทยาศาสตร์', 'ดาราศาสตร์สำหรับทุกคน', 'ดร.นภา ดาวเรือง', 'อ่านสนุก ภาษาเข้าใจง่าย เล่มนี้เหมือนใหม่', 'new', 250, '/covers/book-33.svg', 'available', 12.2),
    ('nida@test.com', 'คณิตศาสตร์', 'คณิตศาสตร์ไม่ต่อเนื่อง', 'ดร.อนุชา ตรรกะ', 'ตรรกศาสตร์ เซต กราฟ เหมาะกับสายคอม', 'good', 280, '/covers/book-34.svg', 'available', 12.5),
    ('ton@test.com', 'คอมพิวเตอร์', 'เครือข่ายคอมพิวเตอร์', 'ผศ.ธีรพงษ์ สายส่ง', 'OSI, TCP/IP, routing มีรอยปากกาเล็กน้อย', 'fair', 200, '/covers/book-35.svg', 'available', 12.8),
    ('buyer@test.com', 'วิศวกรรมศาสตร์', 'วัสดุวิศวกรรม', 'ผศ.อรรถพล เหล็กกล้า', 'โครงสร้างผลึก สมบัติเชิงกล สภาพใหม่มาก', 'new', 450, '/covers/book-36.svg', 'available', 13.1),
    ('seller@test.com', 'บริหารธุรกิจ', 'การเป็นผู้ประกอบการ', 'อ.ปิยะ สตาร์ทอัพ', 'Business Model Canvas พร้อมตัวอย่าง', 'new', 350, '/covers/book-37.svg', 'available', 13.4),
    ('nida@test.com', 'ภาษา', 'การเขียนภาษาไทยเชิงวิชาการ', 'รศ.วรรณา อักษร', 'การเขียนรายงาน การอ้างอิง', 'fair', 140, '/covers/book-38.svg', 'available', 13.7),
    ('ton@test.com', 'ศึกษาทั่วไป', 'สังคมไทยร่วมสมัย', 'อ.ชุมชน สามัคคี', 'ประวัติศาสตร์ วัฒนธรรม การเปลี่ยนแปลง', 'good', 120, '/covers/book-39.svg', 'available', 14.0),
    ('buyer@test.com', 'อื่น ๆ', 'เตรียมสอบ TOEIC', 'Ajarn Mark Lee', 'ข้อสอบเสมือนจริง 5 ชุด มีเฉลยอธิบาย', 'fair', 170, '/covers/book-40.svg', 'available', 14.3),
    ('seller@test.com', 'วิทยาศาสตร์', 'เคมีวิเคราะห์', 'ดร.พิมพ์ชนก วงศ์ทอง', 'ขายแล้ว', 'good', 250, '/covers/book-41.svg', 'sold', 21),
    ('seller@test.com', 'คณิตศาสตร์', 'สมการเชิงอนุพันธ์', 'ผศ.วิชัย คำนวณ', 'ขายแล้ว', 'good', 300, '/covers/book-42.svg', 'sold', 22),
    ('seller@test.com', 'คอมพิวเตอร์', 'ระบบปฏิบัติการ', 'ผศ.ดร.ปกรณ์ ลำดับ', 'ขายแล้ว', 'fair', 220, '/covers/book-43.svg', 'sold', 23)
) AS v(email, category, title, author, description, condition, price, image_url, status, days)
JOIN members m    ON lower(m.email) = v.email
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (SELECT 1 FROM books b WHERE b.title = v.title AND b.seller_id = m.id);

INSERT INTO purchase_requests (book_id, buyer_id, message, status, created_at, updated_at)
SELECT b.id, m.id, v.message, v.status, now() - make_interval(secs => v.days * 86400), now() - make_interval(secs => v.days * 86400)
FROM (VALUES
    ('ฟิสิกส์ทั่วไป 1', 'buyer@test.com', 'สะดวกรับที่ตึกวิทย์ช่วงบ่ายครับ', 'pending', 0.5),
    ('หลักการตลาด', 'buyer@test.com', 'ขอนัดรับวันพฤหัสได้ไหมครับ', 'accepted', 1.5),
    ('วงจรไฟฟ้า 1', 'nida@test.com', 'ยังมีอยู่ไหมคะ', 'pending', 0.8),
    ('เคมีวิเคราะห์', 'buyer@test.com', NULL, 'completed', 18),
    ('สมการเชิงอนุพันธ์', 'nida@test.com', NULL, 'completed', 17),
    ('ระบบปฏิบัติการ', 'ton@test.com', NULL, 'completed', 16)
) AS v(title, email, message, status, days)
JOIN books b   ON b.title = v.title
JOIN members m ON lower(m.email) = v.email
WHERE NOT EXISTS (SELECT 1 FROM purchase_requests r WHERE r.book_id = b.id AND r.buyer_id = m.id);

INSERT INTO cart_items (member_id, book_id)
SELECT m.id, b.id
FROM (VALUES
    ('buyer@test.com', 'แคลคูลัส 1'),
    ('buyer@test.com', 'เขียนโปรแกรมภาษา Go')
) AS v(email, title)
JOIN members m ON lower(m.email) = v.email
JOIN books b   ON b.title = v.title
ON CONFLICT (member_id, book_id) DO NOTHING;

INSERT INTO seller_reviews (seller_id, reviewer_id, rating, text)
SELECT s.id, r.id, v.rating, v.text
FROM (VALUES
    ('seller@test.com', 'nida@test.com', 5, 'หนังสือสภาพดีตรงปก นัดรับตรงเวลา แนะนำเลยค่ะ'),
    ('seller@test.com', 'ton@test.com', 4, 'ตอบไว เป็นกันเอง มีรอยดินสอนิดหน่อยตามที่บอกไว้')
) AS v(seller, reviewer, rating, text)
JOIN members s ON lower(s.email) = v.seller
JOIN members r ON lower(r.email) = v.reviewer
ON CONFLICT (seller_id, reviewer_id) DO NOTHING;

COMMIT;

-- ตรวจผล: ทุกหมวดต้องมี 5 เล่มที่ยังขายอยู่/ติดจอง
SELECT c.name AS category, count(b.id) FILTER (WHERE b.status <> 'sold') AS on_sale, count(b.id) AS all_books
FROM categories c LEFT JOIN books b ON b.category_id = c.id
GROUP BY c.id, c.name ORDER BY c.id;
