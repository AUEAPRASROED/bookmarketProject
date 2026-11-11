package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
    _ "github.com/joho/godotenv/autoload" // โหลด .env ให้เองถ้ามีไฟล์ (ในเครื่อง) บน Render ไม่มีไฟล์ก็เงียบ

    "bookmarket/auth"
    "bookmarket/handler"
    "bookmarket/mw"
    "bookmarket/store"
)

func main() {
    secret := os.Getenv("JWT_SECRET")
    if len(secret) < 32 {
        log.Fatal("JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร")
    }
    pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer pool.Close()
    if err := pool.Ping(context.Background()); err != nil {
        log.Fatal("ต่อฐานข้อมูลไม่ติด ", err)
    }

    tickets := &auth.Issuer{Secret: []byte(secret), TTL: time.Hour}
    h := &handler.Handler{Store: &store.Store{Pool: pool}, Tickets: tickets}

    // login = ต้องมีตั๋ว, admin = ต้องมีตั๋วและบทบาทเป็น admin (ตรวจตั๋วก่อนเสมอ ค่อยดูบทบาท)
    login := func(next http.HandlerFunc) http.HandlerFunc { return mw.RequireLogin(tickets, next) }
    admin := func(next http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole("admin", next)) }

    mux := http.NewServeMux()

    // สาธารณะ: Guest ใช้ได้
    mux.HandleFunc("POST /api/auth/register", h.Register)
    mux.HandleFunc("POST /api/auth/login", h.Login)
    mux.HandleFunc("GET /api/categories", h.Categories)
    mux.HandleFunc("GET /api/books", h.ListBooks)
    mux.HandleFunc("GET /api/books/{id}", h.GetBook)
    mux.HandleFunc("GET /api/sellers/{id}", h.Seller)                 // หน้าร้าน: ข้อมูลร้าน + หนังสือ + รีวิว

    // สมาชิก: ต้องมีตั๋ว เลขสมาชิกอ่านจากตั๋วเท่านั้น
    mux.HandleFunc("GET /api/me", login(h.Me))
    mux.HandleFunc("PUT /api/me", login(h.UpdateMe))
    mux.HandleFunc("PUT /api/me/password", login(h.ChangePassword))
    mux.HandleFunc("GET /api/me/books", login(h.MyBooks))
    mux.HandleFunc("GET /api/me/requests", login(h.MyRequests))
    mux.HandleFunc("GET /api/me/incoming", login(h.IncomingRequests))
    mux.HandleFunc("POST /api/books", login(h.CreateBook))
    mux.HandleFunc("PUT /api/books/{id}", login(h.UpdateBook))       // เจ้าของ หรือ admin (ตรวจใน SQL)
    mux.HandleFunc("DELETE /api/books/{id}", login(h.DeleteBook))    // เจ้าของ หรือ admin (ตรวจใน SQL)
    mux.HandleFunc("POST /api/books/{id}/requests", login(h.CreateRequest))
    mux.HandleFunc("PUT /api/requests/{id}/status", login(h.UpdateRequestStatus))
    mux.HandleFunc("GET /api/me/cart", login(h.Cart))
    mux.HandleFunc("PUT /api/me/cart/{bookId}", login(h.AddToCart))
    mux.HandleFunc("DELETE /api/me/cart/{bookId}", login(h.RemoveFromCart))
    mux.HandleFunc("POST /api/sellers/{id}/reviews", login(h.AddSellerReview))
    mux.HandleFunc("DELETE /api/seller-reviews/{id}", login(h.DeleteSellerReview))   // คนเขียน หรือ admin

    // หลังบ้าน: ทุกเส้นทางใต้ /api/admin ผ่าน admin(...) ไม่มีข้อยกเว้น
    mux.HandleFunc("GET /api/admin/stats", admin(h.AdminStats))
    mux.HandleFunc("GET /api/admin/books", admin(h.AdminBooks))
    mux.HandleFunc("GET /api/admin/requests", admin(h.AdminRequests))
    mux.HandleFunc("POST /api/admin/categories", admin(h.AdminCreateCategory))
    mux.HandleFunc("PUT /api/admin/categories/{id}", admin(h.AdminUpdateCategory))
    mux.HandleFunc("DELETE /api/admin/categories/{id}", admin(h.AdminDeleteCategory))
    mux.HandleFunc("GET /api/admin/members", admin(h.AdminMembers))
    mux.HandleFunc("PUT /api/admin/members/{id}/role", admin(h.AdminSetRole))
    mux.HandleFunc("DELETE /api/admin/members/{id}", admin(h.AdminDeleteMember))

    origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")

    port := os.Getenv("PORT") // Render ส่งมาให้ ในเครื่องไม่มีก็ใช้ 8080
    if port == "" {
        port = "8080"
    }
    log.Println("Book Marketplace API ฟังอยู่ที่ :"+port, "ต้อนรับ", origins)
    log.Fatal(http.ListenAndServe(":"+port, mw.Logging(mw.CORS(origins, mux))))
}
