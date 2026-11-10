package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "strings"
    "unicode/utf8"

    "bookmarket/mw"
    "bookmarket/store"
)

// ทุก handler ในไฟล์นี้ (ยกเว้น Categories ที่เป็นสาธารณะ) ถูกครอบด้วย RequireLogin + RequireRole("admin") ใน main.go แล้ว
// จึงไม่ต้องเช็กบทบาทซ้ำในนี้ แต่ "ใครเป็นคนกด" ยังอ่านจากตั๋วผ่าน mw.MemberID เสมอ

// ---------- Dashboard ----------

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
    st, err := h.Store.Stats(r.Context())
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, st)
}

func (h *Handler) AdminBooks(w http.ResponseWriter, r *http.Request) {
    items, err := h.Store.ListAllBooks(r.Context())
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) AdminRequests(w http.ResponseWriter, r *http.Request) {
    items, err := h.Store.ListAllRequests(r.Context())
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ---------- หมวดหมู่ ----------

// Categories สาธารณะ: ใช้ทำปุ่มกรองหน้า Books และ dropdown ในฟอร์มประกาศ
func (h *Handler) Categories(w http.ResponseWriter, r *http.Request) {
    items, err := h.Store.ListCategories(r.Context())
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type categoryReq struct {
    Name string `json:"name"`
}

func readCategory(w http.ResponseWriter, r *http.Request) (string, bool) {
    var req categoryReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return "", false
    }
    name := strings.TrimSpace(req.Name)
    if name == "" || utf8.RuneCountInString(name) > 50 {
        writeError(w, http.StatusBadRequest, "BAD_NAME", "ต้องมีชื่อหมวดหมู่ และยาวไม่เกิน 50 ตัวอักษร")
        return "", false
    }
    return name, true
}

func (h *Handler) AdminCreateCategory(w http.ResponseWriter, r *http.Request) {
    name, ok := readCategory(w, r)
    if !ok {
        return
    }
    c, err := h.Store.CreateCategory(r.Context(), name)
    if errors.Is(err, store.ErrDuplicate) {
        writeError(w, http.StatusConflict, "CATEGORY_EXISTS", "มีหมวดหมู่ชื่อนี้อยู่แล้ว")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, c)
}

func (h *Handler) AdminUpdateCategory(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหมวดหมู่ต้องเป็นตัวเลข")
        return
    }
    name, ok := readCategory(w, r)
    if !ok {
        return
    }
    c, err := h.Store.UpdateCategory(r.Context(), int(id), name)
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "CATEGORY_NOT_FOUND", "ไม่พบหมวดหมู่นี้")
        return
    case errors.Is(err, store.ErrDuplicate):
        writeError(w, http.StatusConflict, "CATEGORY_EXISTS", "มีหมวดหมู่ชื่อนี้อยู่แล้ว")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, c)
}

func (h *Handler) AdminDeleteCategory(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหมวดหมู่ต้องเป็นตัวเลข")
        return
    }
    err := h.Store.DeleteCategory(r.Context(), int(id))
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "CATEGORY_NOT_FOUND", "ไม่พบหมวดหมู่นี้")
        return
    case errors.Is(err, store.ErrCategoryInUse):
        writeError(w, http.StatusConflict, "CATEGORY_IN_USE", "หมวดนี้ยังมีหนังสืออยู่ ย้ายหรือลบหนังสือก่อน")
        return
    case err != nil:
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

// ---------- สมาชิก ----------

func (h *Handler) AdminMembers(w http.ResponseWriter, r *http.Request) {
    items, err := h.Store.ListMembers(r.Context())
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type roleReq struct {
    Role string `json:"role"`
}

// AdminSetRole ห้ามแก้ของตัวเอง (กัน admin คนสุดท้ายลดตัวเองจนไม่มีใครเข้าหลังบ้านได้)
func (h *Handler) AdminSetRole(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสมาชิกต้องเป็นตัวเลข")
        return
    }
    var req roleReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    if req.Role != "member" && req.Role != "admin" {
        writeError(w, http.StatusBadRequest, "BAD_ROLE", "role ต้องเป็น member หรือ admin")
        return
    }
    if me, _ := mw.MemberID(r.Context()); me == id {
        writeError(w, http.StatusBadRequest, "SELF_ROLE", "เปลี่ยนบทบาทของตัวเองไม่ได้ ให้ admin คนอื่นทำแทน")
        return
    }
    m, err := h.Store.UpdateMemberRole(r.Context(), id, req.Role)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "MEMBER_NOT_FOUND", "ไม่พบสมาชิกคนนี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, m)
}

// AdminDeleteMember ลบสมาชิก (ประกาศและคำขอของคนนั้นหายตาม) ห้ามลบตัวเอง
func (h *Handler) AdminDeleteMember(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสมาชิกต้องเป็นตัวเลข")
        return
    }
    if me, _ := mw.MemberID(r.Context()); me == id {
        writeError(w, http.StatusBadRequest, "SELF_DELETE", "ลบบัญชีของตัวเองไม่ได้")
        return
    }
    err := h.Store.DeleteMember(r.Context(), id)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "MEMBER_NOT_FOUND", "ไม่พบสมาชิกคนนี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
