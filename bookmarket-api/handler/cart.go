package handler

import (
    "errors"
    "net/http"

    "bookmarket/mw"
    "bookmarket/store"
)

// ตะกร้าหนังสือ: ทั้งสามเส้นทางครอบด้วย login ใน main.go และเลขสมาชิกมาจากตั๋วเท่านั้น (แบบ wishlist ในใบงานด่าน 5)

func (h *Handler) Cart(w http.ResponseWriter, r *http.Request) {
    memberID, _ := mw.MemberID(r.Context())
    items, err := h.Store.ListCart(r.Context(), memberID)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) AddToCart(w http.ResponseWriter, r *http.Request) {
    bookID, ok := pathID(r, "bookId")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    err := h.Store.AddToCart(r.Context(), memberID, bookID)
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "ไม่พบหนังสือเล่มนี้")
        return
    case errors.Is(err, store.ErrOwnBook):
        writeError(w, http.StatusBadRequest, "OWN_BOOK", "ใส่หนังสือของตัวเองลงตะกร้าไม่ได้")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"bookId": bookID})
}

func (h *Handler) RemoveFromCart(w http.ResponseWriter, r *http.Request) {
    bookID, ok := pathID(r, "bookId")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    if err := h.Store.RemoveFromCart(r.Context(), memberID, bookID); err != nil {
        internal(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
