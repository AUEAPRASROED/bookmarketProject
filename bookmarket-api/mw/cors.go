package mw

import (
    "net/http"
    "strings"
)

// CORS อนุญาตเฉพาะ origin ที่อยู่ในรายชื่อ
// รองรับ * ได้ 1 ตัวต่อรายการ เช่น https://bookmarket-project-*-aueaprasroeds-projects.vercel.app
// (ใช้สำหรับ URL พรีวิวของ Vercel ที่สุ่มชื่อใหม่ทุกครั้งที่ deploy)
func CORS(allowed []string, next http.Handler) http.Handler {
    ok := map[string]bool{}
    var patterns [][2]string // [ส่วนหน้า *, ส่วนหลัง *]
    for _, o := range allowed {
        o = strings.TrimSpace(o)
        if before, after, found := strings.Cut(o, "*"); found {
            patterns = append(patterns, [2]string{before, after})
        } else if o != "" {
            ok[o] = true
        }
    }
    allow := func(origin string) bool {
        if ok[origin] {
            return true
        }
        for _, p := range patterns {
            // ต้องขึ้นต้นและลงท้ายตรง และตรงกลาง (ส่วน *) ห้ามมี "." หรือ "/" กันโดเมนแปลกปลอม
            if len(origin) > len(p[0])+len(p[1]) &&
                strings.HasPrefix(origin, p[0]) && strings.HasSuffix(origin, p[1]) {
                middle := origin[len(p[0]) : len(origin)-len(p[1])]
                if !strings.ContainsAny(middle, "./") {
                    return true
                }
            }
        }
        return false
    }
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        if allow(origin) {
            h := w.Header()
            h.Set("Access-Control-Allow-Origin", origin)
            h.Add("Vary", "Origin")
            h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
            h.Set("Access-Control-Max-Age", "600")
        }
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}