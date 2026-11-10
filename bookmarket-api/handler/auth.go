package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "strings"
    "unicode/utf8"

    "bookmarket/auth"
    "bookmarket/mw"
    "bookmarket/store"
)

// dummyHash คือลายนิ้วมือหลอก ใช้เทียบเมื่อไม่พบอีเมล เพื่อให้เสียเวลาเท่ากับกรณีรหัสผิด (ใบงานด่านที่ 7)
var dummyHash, _ = auth.HashPassword("ไม่มีใครใช้รหัสนี้")

// ---------- ตรวจข้อมูลที่ใช้ร่วมกัน ----------

func checkPassword(p string) (code, msg string) {
    if utf8.RuneCountInString(p) < 8 || len(p) > 72 {
        return "BAD_PASSWORD", "รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์"
    }
    return "", ""
}

func checkProfile(name string, contact *string) (code, msg string) {
    if name == "" || utf8.RuneCountInString(name) > 50 {
        return "BAD_NAME", "ต้องมีชื่อที่แสดง และยาวไม่เกิน 50 ตัวอักษร"
    }
    if contact != nil && utf8.RuneCountInString(*contact) > 100 {
        return "BAD_CONTACT", "ช่องติดต่อยาวไม่เกิน 100 ตัวอักษร"
    }
    return "", ""
}

// ---------- สมัคร / เข้าสู่ระบบ ----------

type registerReq struct {
    Email       string  `json:"email"`
    Password    string  `json:"password"`
    DisplayName string  `json:"displayName"`
    Contact     *string `json:"contact"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
    var req registerReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    email := strings.ToLower(strings.TrimSpace(req.Email))
    name := strings.TrimSpace(req.DisplayName)
    contact := trimPtr(req.Contact)
    if !strings.Contains(email, "@") || len(email) > 255 {
        writeError(w, http.StatusBadRequest, "BAD_EMAIL", "รูปแบบอีเมลไม่ถูกต้อง")
        return
    }
    if code, msg := checkPassword(req.Password); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    if code, msg := checkProfile(name, contact); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    hash, err := auth.HashPassword(req.Password)
    if err != nil {
        internal(w, err)
        return
    }
    // ไม่รับ role จากคำขอเลย ทุกคนที่สมัครได้ member ตามค่าเริ่มต้นของตาราง
    m, err := h.Store.CreateMember(r.Context(), email, hash, name, contact)
    if errors.Is(err, store.ErrEmailTaken) {
        writeError(w, http.StatusConflict, "EMAIL_TAKEN", "อีเมลนี้มีบัญชีอยู่แล้ว")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, m)
}

type loginReq struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
    var req loginReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    email := strings.ToLower(strings.TrimSpace(req.Email))
    m, err := h.Store.MemberByEmail(r.Context(), email)
    if errors.Is(err, store.ErrNotFound) {
        auth.CheckPassword(dummyHash, req.Password) // เสียเวลาเท่ากับกรณีรหัสผิด
        writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    if !auth.CheckPassword(m.PasswordHash, req.Password) {
        writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        return
    }
    token, err := h.Tickets.Issue(m.ID, m.Role)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"token": token, "member": m})
}

// ---------- Profile (เลขสมาชิกมาจากตั๋วที่ RequireLogin ตรวจแล้วเท่านั้น) ----------

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
    id, _ := mw.MemberID(r.Context())
    m, err := h.Store.MemberByID(r.Context(), id)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, m)
}

type profileReq struct {
    DisplayName string  `json:"displayName"`
    Contact     *string `json:"contact"`
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
    var req profileReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    name := strings.TrimSpace(req.DisplayName)
    contact := trimPtr(req.Contact)
    if code, msg := checkProfile(name, contact); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    id, _ := mw.MemberID(r.Context())
    m, err := h.Store.UpdateProfile(r.Context(), id, name, contact)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, m)
}

type passwordReq struct {
    CurrentPassword string `json:"currentPassword"`
    NewPassword     string `json:"newPassword"`
}

// ChangePassword ต้องรู้รหัสเดิมก่อน กันคนที่หยิบเครื่องที่ login ค้างไว้มาเปลี่ยนรหัสแทน
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
    var req passwordReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    if code, msg := checkPassword(req.NewPassword); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    id, _ := mw.MemberID(r.Context())
    m, err := h.Store.MemberByID(r.Context(), id)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    // รหัสเดิมผิดตอบ 400 ไม่ใช่ 401 เพราะตั๋วยังถูกต้อง (401 = ไม่รู้ว่าเป็นใคร ตาม Week 12)
    if !auth.CheckPassword(m.PasswordHash, req.CurrentPassword) {
        writeError(w, http.StatusBadRequest, "WRONG_PASSWORD", "รหัสผ่านเดิมไม่ถูกต้อง")
        return
    }
    hash, err := auth.HashPassword(req.NewPassword)
    if err != nil {
        internal(w, err)
        return
    }
    if err := h.Store.UpdatePassword(r.Context(), id, hash); err != nil {
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
