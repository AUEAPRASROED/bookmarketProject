package handler

import (
    "encoding/json"
    "errors"
    "math"
    "net/http"
    "strings"
    "unicode/utf8"

    "bookmarket/mw"
    "bookmarket/store"
)

// validateBook ตรวจฝั่ง server ซ้ำอีกชั้น แม้ฟอร์ม React จะเช็กไปแล้ว เพราะ curl ไม่ผ่านฟอร์ม (แบบ validateMovie)
func validateBook(in *store.BookInput) (code, message string) {
    in.Title = strings.TrimSpace(in.Title)
    in.Author = strings.TrimSpace(in.Author)
    in.Description = trimPtr(in.Description)
    in.ImageURL = trimPtr(in.ImageURL)

    switch {
    case in.Title == "" || utf8.RuneCountInString(in.Title) > 255:
        return "BAD_TITLE", "ต้องมีชื่อหนังสือ และยาวไม่เกิน 255 ตัวอักษร"
    case in.Author == "" || utf8.RuneCountInString(in.Author) > 255:
        return "BAD_AUTHOR", "ต้องมีชื่อผู้แต่ง และยาวไม่เกิน 255 ตัวอักษร"
    case in.CategoryID <= 0:
        return "BAD_CATEGORY", "ต้องเลือกหมวดหมู่"
    case in.Price < 0 || in.Price > 99999999:
        return "BAD_PRICE", "ราคาต้องเป็น 0 ขึ้นไป"
    }
    in.Price = math.Round(in.Price*100) / 100 // เก็บทศนิยมสองตำแหน่งตาม NUMERIC(10,2)
    switch in.Condition {
    case "new", "like_new", "good", "fair":
    default:
        return "BAD_CONDITION", "สภาพหนังสือต้องเป็น new, like_new, good หรือ fair"
    }
    // รูปเป็น URL เต็ม หรือรูปที่อยู่ในเว็บเอง เช่น /covers/book-01.svg (ไฟล์ใน public/covers ของ React)
    if in.ImageURL != nil && !strings.HasPrefix(*in.ImageURL, "http") && !strings.HasPrefix(*in.ImageURL, "/") {
        return "BAD_IMAGE", "รูปต้องเป็น URL เต็ม (https://...) หรือรูปในเว็บ (/covers/...)"
    }
    return "", ""
}

// ---------- สาธารณะ (Guest เห็นได้) ----------

func (h *Handler) ListBooks(w http.ResponseWriter, r *http.Request) {
    items, err := h.Store.ListBooks(r.Context(), r.URL.Query().Get("q"))
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) GetBook(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    b, err := h.Store.GetBook(r.Context(), id)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "ไม่พบหนังสือเล่มนี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, b)
}

// ---------- สมาชิก ----------

func (h *Handler) MyBooks(w http.ResponseWriter, r *http.Request) {
    memberID, _ := mw.MemberID(r.Context())
    items, err := h.Store.ListBooksBySeller(r.Context(), memberID)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CreateBook(w http.ResponseWriter, r *http.Request) {
    var in store.BookInput
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    if code, msg := validateBook(&in); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    memberID, _ := mw.MemberID(r.Context()) // ผู้ขายคือเจ้าของตั๋ว ไม่อ่านจาก body
    b, err := h.Store.CreateBook(r.Context(), memberID, in)
    if errors.Is(err, store.ErrBadCategory) {
        writeError(w, http.StatusBadRequest, "BAD_CATEGORY", "ไม่มีหมวดหมู่นี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, b)
}

// UpdateBook เจ้าของแก้ของตัวเองได้ admin แก้ได้ทุกเล่ม คนอื่นได้ 404 เหมือนไม่มีเล่มนี้
func (h *Handler) UpdateBook(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    var in store.BookInput
    if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    if code, msg := validateBook(&in); code != "" {
        writeError(w, http.StatusBadRequest, code, msg)
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    isAdmin := mw.Role(r.Context()) == "admin"
    b, err := h.Store.UpdateBook(r.Context(), id, memberID, isAdmin, in)
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "ไม่พบหนังสือเล่มนี้ในประกาศของคุณ")
        return
    case errors.Is(err, store.ErrBadCategory):
        writeError(w, http.StatusBadRequest, "BAD_CATEGORY", "ไม่มีหมวดหมู่นี้")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, b)
}

func (h *Handler) DeleteBook(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    isAdmin := mw.Role(r.Context()) == "admin"
    err := h.Store.DeleteBook(r.Context(), id, memberID, isAdmin)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "ไม่พบหนังสือเล่มนี้ในประกาศของคุณ")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
