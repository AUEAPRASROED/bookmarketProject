#!/usr/bin/env bash
# ทดสอบ API ทั้งระบบด้วย curl (แบบชุดคำสั่งในใบงาน "ช่องขายตั๋วกับพนักงานตรวจตั๋ว")
# ใช้: ./smoke-test.sh                      ยิงที่ localhost:8080
#      ./smoke-test.sh https://<ชื่อ>.onrender.com
# ต้องมี admin อยู่แล้ว 1 คน: ตั้ง ADMIN_EMAIL / ADMIN_PASS ก่อนรัน ถ้าไม่ตั้ง จะข้ามส่วน admin
# สคริปต์สมัครสมาชิกใหม่ทุกรอบ (อีเมลมีเลขเวลาต่อท้าย) จึงรันซ้ำได้

API=${1:-http://localhost:8080}
RUN=$(date +%s)
PASS=0; FAIL=0

# check <ชื่อ> <รหัสที่ควรได้> <รหัสที่ได้จริง>
check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✅ $1 -> $3"
  else FAIL=$((FAIL+1)); echo "  ❌ $1 -> ได้ $3 ควรได้ $2"; fi
}
# code <method> <path> [token] [json]  พิมพ์แค่รหัสตอบกลับ
code() {
  local auth=() data=()
  [ -n "$3" ] && auth=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && data=(-H 'Content-Type: application/json' -d "$4")
  curl -s -o /dev/null -w '%{http_code}' -X "$1" "${auth[@]}" "${data[@]}" "$API$2"
}
# body <method> <path> [token] [json]  พิมพ์ JSON ที่ตอบมา
body() {
  local auth=() data=()
  [ -n "$3" ] && auth=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && data=(-H 'Content-Type: application/json' -d "$4")
  curl -s -X "$1" "${auth[@]}" "${data[@]}" "$API$2"
}
field() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }
login() { body POST /api/auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}" | field '["token"]'; }

echo "== ทดสอบ $API"

echo "1) สมาชิก"
SELLER="seller$RUN@test.com"; BUYER="buyer$RUN@test.com"; OTHER="other$RUN@test.com"
check "สมัครผู้ขาย"            201 "$(code POST /api/auth/register "" "{\"email\":\"$SELLER\",\"password\":\"password1\",\"displayName\":\"ผู้ขาย\",\"contact\":\"LINE: seller\"}")"
check "สมัครอีเมลซ้ำ"          409 "$(code POST /api/auth/register "" "{\"email\":\"$SELLER\",\"password\":\"password1\",\"displayName\":\"ซ้ำ\"}")"
check "รหัสสั้นเกินไป"          400 "$(code POST /api/auth/register "" "{\"email\":\"x$RUN@test.com\",\"password\":\"123\",\"displayName\":\"x\"}")"
check "สมัครผู้ซื้อ"            201 "$(code POST /api/auth/register "" "{\"email\":\"$BUYER\",\"password\":\"password1\",\"displayName\":\"ผู้ซื้อ\",\"contact\":\"081-111\"}")"
check "สมัครคนที่สาม"          201 "$(code POST /api/auth/register "" "{\"email\":\"$OTHER\",\"password\":\"password1\",\"displayName\":\"คนอื่น\"}")"
check "login รหัสผิด"          401 "$(code POST /api/auth/login "" "{\"email\":\"$SELLER\",\"password\":\"wrongpass\"}")"
S=$(login "$SELLER" password1); B=$(login "$BUYER" password1); O=$(login "$OTHER" password1)
check "GET /api/me ไม่มีตั๋ว"   401 "$(code GET /api/me)"
check "GET /api/me มีตั๋ว"      200 "$(code GET /api/me "$S")"
check "แก้ profile"            200 "$(code PUT /api/me "$O" '{"displayName":"คนอื่นแก้ชื่อ","contact":"IG: other"}')"
check "เปลี่ยนรหัส รหัสเดิมผิด"  400 "$(code PUT /api/me/password "$O" '{"currentPassword":"nope","newPassword":"password2"}')"
check "เปลี่ยนรหัส"             204 "$(code PUT /api/me/password "$O" '{"currentPassword":"password1","newPassword":"password2"}')"
check "login ด้วยรหัสใหม่"       200 "$(code POST /api/auth/login "" "{\"email\":\"$OTHER\",\"password\":\"password2\"}")"

echo "2) หนังสือ"
CAT=$(body GET /api/categories | field '["items"][0]["id"]')
check "Guest ลงประกาศไม่ได้"    401 "$(code POST /api/books "" "{\"title\":\"x\",\"author\":\"y\",\"condition\":\"good\",\"price\":1,\"categoryId\":$CAT}")"
check "ราคาติดลบ"              400 "$(code POST /api/books "$S" "{\"title\":\"x\",\"author\":\"y\",\"condition\":\"good\",\"price\":-1,\"categoryId\":$CAT}")"
BOOK=$(body POST /api/books "$S" "{\"title\":\"Calculus $RUN\",\"author\":\"Stewart\",\"condition\":\"good\",\"price\":300,\"categoryId\":$CAT}" | field '["id"]')
check "ลงประกาศ (ได้ id)"       200 "$([ -n "$BOOK" ] && echo 200 || echo 000)"
check "Guest ดูรายการ"         200 "$(code GET /api/books)"
check "Guest ดูรายละเอียด"      200 "$(code GET /api/books/$BOOK)"
check "เล่มที่ไม่มี"             404 "$(code GET /api/books/999999999)"
check "คนอื่นแก้ประกาศ"         404 "$(code PUT /api/books/$BOOK "$O" "{\"title\":\"hack\",\"author\":\"y\",\"condition\":\"good\",\"price\":1,\"categoryId\":$CAT}")"
check "คนอื่นลบประกาศ"          404 "$(code DELETE /api/books/$BOOK "$O")"
check "เจ้าของแก้ประกาศ"        200 "$(code PUT /api/books/$BOOK "$S" "{\"title\":\"Calculus $RUN\",\"author\":\"Stewart\",\"condition\":\"like_new\",\"price\":280,\"categoryId\":$CAT}")"

echo "3) คำขอซื้อ"
check "ขอซื้อเล่มของตัวเอง"      400 "$(code POST /api/books/$BOOK/requests "$S" '{}')"
R1=$(body POST /api/books/$BOOK/requests "$B" '{"message":"รับที่ตึกวิทย์"}' | field '["id"]')
check "ผู้ซื้อส่งคำขอ"           200 "$([ -n "$R1" ] && echo 200 || echo 000)"
check "ส่งคำขอซ้ำ"              409 "$(code POST /api/books/$BOOK/requests "$B" '{}')"
R2=$(body POST /api/books/$BOOK/requests "$O" '{}' | field '["id"]')
CONTACT=$(body GET /api/me/requests "$B" | field '["items"][0]["seller"]["contact"]')
check "ก่อนยอมรับ ไม่เห็นช่องติดต่อ" None "$CONTACT"
check "ผู้ซื้อกดยอมรับเองไม่ได้"    409 "$(code PUT /api/requests/$R1/status "$B" '{"status":"accepted"}')"
check "คนนอกแตะคำขอไม่ได้"       404 "$(code PUT /api/requests/$R1/status "$O" '{"status":"rejected"}')"
check "ผู้ขายยอมรับ"            200 "$(code PUT /api/requests/$R1/status "$S" '{"status":"accepted"}')"
check "หนังสือเป็น reserved"     reserved "$(body GET /api/books/$BOOK | field '["status"]')"
check "คำขออื่นถูกปฏิเสธอัตโนมัติ"  rejected "$(body GET /api/me/requests "$O" | field '["items"][0]["status"]')"
check "หลังยอมรับ เห็นช่องติดต่อ"  "LINE: seller" "$(body GET /api/me/requests "$B" | field '["items"][0]["seller"]["contact"]')"
check "ผู้ซื้อยกเลิกหลังยอมรับ"     200 "$(code PUT /api/requests/$R1/status "$B" '{"status":"cancelled"}')"
check "หนังสือกลับมา available"  available "$(body GET /api/books/$BOOK | field '["status"]')"
R3=$(body POST /api/books/$BOOK/requests "$B" '{}' | field '["id"]')
check "ส่งคำขอใหม่หลังยกเลิกได้"   200 "$([ -n "$R3" ] && echo 200 || echo 000)"
check "ยอมรับอีกครั้ง"           200 "$(code PUT /api/requests/$R3/status "$S" '{"status":"accepted"}')"
check "ซื้อขายเสร็จ"             200 "$(code PUT /api/requests/$R3/status "$S" '{"status":"completed"}')"
check "หนังสือเป็น sold"         sold "$(body GET /api/books/$BOOK | field '["status"]')"
check "ยกเลิกหลังเสร็จไม่ได้"      409 "$(code PUT /api/requests/$R3/status "$B" '{"status":"cancelled"}')"

echo "4) ตะกร้า + รีวิวร้าน"
SID=$(body GET /api/me "$S" | field '["id"]')
BOOK2=$(body POST /api/books "$S" "{\"title\":\"Physics $RUN\",\"author\":\"Serway\",\"condition\":\"good\",\"price\":200,\"categoryId\":$CAT}" | field '["id"]')
check "Guest ใส่ตะกร้าไม่ได้"       401 "$(code PUT /api/me/cart/$BOOK2)"
check "ใส่หนังสือตัวเองลงตะกร้า"     400 "$(code PUT /api/me/cart/$BOOK2 "$S")"
check "ใส่ตะกร้าเล่มที่ไม่มี"         404 "$(code PUT /api/me/cart/999999999 "$B")"
check "ใส่ตะกร้า"                 200 "$(code PUT /api/me/cart/$BOOK2 "$B")"
check "ใส่ซ้ำได้ผลเหมือนเดิม"        200 "$(code PUT /api/me/cart/$BOOK2 "$B")"
check "ตะกร้ามี 1 เล่ม"            1 "$(body GET /api/me/cart "$B" | field '["items"].__len__()')"
check "ตะกร้าคนอื่นไม่เห็น"          0 "$(body GET /api/me/cart "$O" | field '["items"].__len__()')"
check "เอาออกจากตะกร้า"            204 "$(code DELETE /api/me/cart/$BOOK2 "$B")"
check "ตะกร้าว่างแล้ว"              0 "$(body GET /api/me/cart "$B" | field '["items"].__len__()')"
check "Guest ดูหน้าร้าน"           200 "$(code GET /api/sellers/$SID)"
check "ร้านที่ไม่มี"                404 "$(code GET /api/sellers/999999999)"
check "Guest รีวิวไม่ได้"           401 "$(code POST /api/sellers/$SID/reviews "" '{"rating":5}')"
check "ยังไม่เคยซื้อ รีวิวไม่ได้"      403 "$(code POST /api/sellers/$SID/reviews "$O" '{"rating":5}')"
check "รีวิวร้านตัวเองไม่ได้"         400 "$(code POST /api/sellers/$SID/reviews "$S" '{"rating":5}')"
check "ดาวเกิน 5"                400 "$(code POST /api/sellers/$SID/reviews "$B" '{"rating":6}')"
RV=$(body POST /api/sellers/$SID/reviews "$B" '{"rating":4,"text":"นัดรับตรงเวลา"}' | field '["id"]')
check "ซื้อเสร็จแล้ว รีวิวได้"        200 "$([ -n "$RV" ] && echo 200 || echo 000)"
check "รีวิวซ้ำ"                  409 "$(code POST /api/sellers/$SID/reviews "$B" '{"rating":5}')"
check "หน้าร้านนับรีวิว"            1 "$(body GET /api/sellers/$SID | field '["seller"]["reviewCount"]')"
check "หนังสือมีคะแนนร้านติดมา"      1 "$(body GET /api/books/$BOOK2 | field '["seller"]["reviewCount"]')"
check "คนอื่นลบรีวิวไม่ได้"          404 "$(code DELETE /api/seller-reviews/$RV "$O")"

echo "5) สิทธิ์ admin"
check "member เข้า /api/admin"   403 "$(code GET /api/admin/stats "$S")"
check "ไม่มีตั๋วเข้า /api/admin"  401 "$(code GET /api/admin/stats)"
if [ -n "$ADMIN_EMAIL" ]; then
  A=$(login "$ADMIN_EMAIL" "$ADMIN_PASS")
  check "admin ดู stats"          200 "$(code GET /api/admin/stats "$A")"
  check "admin ดูรายการซื้อขาย"     200 "$(code GET /api/admin/requests "$A")"
  CID=$(body POST /api/admin/categories "$A" "{\"name\":\"ทดสอบ $RUN\"}" | field '["id"]')
  check "admin เพิ่มหมวด"         200 "$([ -n "$CID" ] && echo 200 || echo 000)"
  check "เพิ่มหมวดชื่อซ้ำ"          409 "$(code POST /api/admin/categories "$A" "{\"name\":\"ทดสอบ $RUN\"}")"
  check "admin แก้ชื่อหมวด"        200 "$(code PUT /api/admin/categories/$CID "$A" "{\"name\":\"ทดสอบแก้ $RUN\"}")"
  check "ลบหมวดที่มีหนังสือ"        409 "$(code DELETE /api/admin/categories/$CAT "$A")"
  check "admin ลบหมวดว่าง"        204 "$(code DELETE /api/admin/categories/$CID "$A")"
  check "admin ลบประกาศของคนอื่น"   204 "$(code DELETE /api/books/$BOOK "$A")"
  check "admin ลบรีวิวที่ไม่เหมาะสม"  204 "$(code DELETE /api/seller-reviews/$RV "$A")"
  OID=$(body GET /api/me "$O" | field '["id"]')
  check "admin ลบสมาชิก"          204 "$(code DELETE /api/admin/members/$OID "$A")"
  SID=$(body GET /api/me "$S" | field '["id"]'); BID=$(body GET /api/me "$B" | field '["id"]')
  code DELETE /api/admin/members/$SID "$A" >/dev/null; code DELETE /api/admin/members/$BID "$A" >/dev/null   # เก็บกวาดข้อมูลทดสอบ
else
  echo "  (ข้ามส่วน admin: ตั้ง ADMIN_EMAIL และ ADMIN_PASS ก่อนรัน)"
fi

echo "== ผ่าน $PASS ไม่ผ่าน $FAIL"
[ "$FAIL" = 0 ]
