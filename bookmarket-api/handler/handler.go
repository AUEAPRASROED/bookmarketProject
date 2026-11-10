package handler

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "strings"

    "bookmarket/auth"
    "bookmarket/store"
)

type Handler struct {
    Store   *store.Store
    Tickets *auth.Issuer
}

func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(v)
}

// writeError ตอบ error รูปแบบเดียวทั้งระบบ {"error":{"code","message"}} ฝั่ง React อ่าน data.error.message
func writeError(w http.ResponseWriter, status int, code, message string) {
    writeJSON(w, status, map[string]any{
        "error": map[string]string{"code": code, "message": message},
    })
}

// internal จดรายละเอียดไว้ใน log ฝั่งเรา แต่บอกผู้ใช้แค่ว่าระบบขัดข้อง
func internal(w http.ResponseWriter, err error) {
    log.Printf("internal error: %v", err)
    writeError(w, http.StatusInternalServerError, "INTERNAL", "ระบบขัดข้อง ลองใหม่อีกครั้ง")
}

func pathID(r *http.Request, name string) (int64, bool) {
    id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
    return id, err == nil && id > 0
}

// trimPtr ตัดช่องว่างหัวท้าย และทำให้ช่องว่างเปล่ากลายเป็น NULL ในฐานข้อมูล
func trimPtr(p *string) *string {
    if p == nil {
        return nil
    }
    s := strings.TrimSpace(*p)
    if s == "" {
        return nil
    }
    return &s
}
