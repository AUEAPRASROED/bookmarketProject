package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "unicode/utf8"

    "bookmarket/mw"
    "bookmarket/store"
)

// Seller หน้าร้านสาธารณะ: ข้อมูลร้าน + หนังสือที่ยังขายอยู่ + รีวิว ในคำขอเดียว (แบบ Stats ที่หน้าเว็บยิงครั้งเดียวจบ)
func (h *Handler) Seller(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขร้านต้องเป็นตัวเลข")
        return
    }
    profile, err := h.Store.GetSellerProfile(r.Context(), id)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "SELLER_NOT_FOUND", "ไม่พบร้านนี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    books, err := h.Store.ListPublicBooksBySeller(r.Context(), id)
    if err != nil {
        internal(w, err)
        return
    }
    reviews, err := h.Store.ListSellerReviews(r.Context(), id)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"seller": profile, "books": books, "reviews": reviews})
}

type sellerReviewReq struct {
    Rating int     `json:"rating"`
    Text   *string `json:"text"`
}

// AddSellerReview ให้คะแนนร้าน 1-5 ดาว ข้อความไม่บังคับ
func (h *Handler) AddSellerReview(w http.ResponseWriter, r *http.Request) {
    sellerID, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขร้านต้องเป็นตัวเลข")
        return
    }
    var req sellerReviewReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    if req.Rating < 1 || req.Rating > 5 {
        writeError(w, http.StatusBadRequest, "BAD_RATING", "คะแนนต้องเป็น 1 ถึง 5 ดาว")
        return
    }
    text := trimPtr(req.Text)
    if text != nil && utf8.RuneCountInString(*text) > 500 {
        writeError(w, http.StatusBadRequest, "REVIEW_TOO_LONG", "รีวิวยาวไม่เกิน 500 ตัวอักษร")
        return
    }
    reviewerID, _ := mw.MemberID(r.Context())
    rv, err := h.Store.AddSellerReview(r.Context(), sellerID, reviewerID, req.Rating, text)
    switch {
    case errors.Is(err, store.ErrSelfReview):
        writeError(w, http.StatusBadRequest, "SELF_REVIEW", "รีวิวร้านของตัวเองไม่ได้")
        return
    case errors.Is(err, store.ErrNotBuyer):
        writeError(w, http.StatusForbidden, "NOT_BUYER", "รีวิวได้หลังซื้อขายกับร้านนี้เสร็จแล้วเท่านั้น")
        return
    case errors.Is(err, store.ErrDuplicate):
        writeError(w, http.StatusConflict, "ALREADY_REVIEWED", "คุณรีวิวร้านนี้ไปแล้ว")
        return
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "SELLER_NOT_FOUND", "ไม่พบร้านนี้")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, rv)
}

// DeleteSellerReview คนเขียนลบของตัวเองได้ admin ลบได้ทุกรีวิว (ตรวจรีวิวที่ไม่เหมาะสม)
func (h *Handler) DeleteSellerReview(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขรีวิวต้องเป็นตัวเลข")
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    isAdmin := mw.Role(r.Context()) == "admin"
    err := h.Store.DeleteSellerReview(r.Context(), id, memberID, isAdmin)
    if errors.Is(err, store.ErrNotFound) {
        writeError(w, http.StatusNotFound, "REVIEW_NOT_FOUND", "ไม่พบรีวิวนี้")
        return
    }
    if err != nil {
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
