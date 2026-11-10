package handler

import (
    "encoding/json"
    "errors"
    "io"
    "net/http"
    "unicode/utf8"

    "bookmarket/mw"
    "bookmarket/store"
)

type requestReq struct {
    Message *string `json:"message"`
}

// CreateRequest ผู้ซื้อส่งคำขอซื้อ เลขผู้ซื้อมาจากตั๋วเท่านั้น ไม่ส่ง body มาก็ได้ (ไม่มีข้อความถึงผู้ขาย)
func (h *Handler) CreateRequest(w http.ResponseWriter, r *http.Request) {
    bookID, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขหนังสือต้องเป็นตัวเลข")
        return
    }
    var req requestReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    msg := trimPtr(req.Message)
    if msg != nil && utf8.RuneCountInString(*msg) > 500 {
        writeError(w, http.StatusBadRequest, "MESSAGE_TOO_LONG", "ข้อความถึงผู้ขายยาวไม่เกิน 500 ตัวอักษร")
        return
    }
    buyerID, _ := mw.MemberID(r.Context())
    id, err := h.Store.CreateRequest(r.Context(), bookID, buyerID, msg)
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "ไม่พบหนังสือเล่มนี้")
        return
    case errors.Is(err, store.ErrOwnBook):
        writeError(w, http.StatusBadRequest, "OWN_BOOK", "ส่งคำขอซื้อหนังสือของตัวเองไม่ได้")
        return
    case errors.Is(err, store.ErrNotAvailable):
        writeError(w, http.StatusConflict, "NOT_AVAILABLE", "หนังสือเล่มนี้ถูกจองหรือขายไปแล้ว")
        return
    case errors.Is(err, store.ErrAlreadyRequested):
        writeError(w, http.StatusConflict, "ALREADY_REQUESTED", "คุณส่งคำขอซื้อเล่มนี้ไว้แล้ว")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, map[string]any{"id": id, "bookId": bookID, "status": "pending"})
}

func (h *Handler) MyRequests(w http.ResponseWriter, r *http.Request) {
    buyerID, _ := mw.MemberID(r.Context())
    items, err := h.Store.ListRequestsByBuyer(r.Context(), buyerID)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) IncomingRequests(w http.ResponseWriter, r *http.Request) {
    sellerID, _ := mw.MemberID(r.Context())
    items, err := h.Store.ListIncoming(r.Context(), sellerID)
    if err != nil {
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type statusReq struct {
    Status string `json:"status"`
}

// UpdateRequestStatus ใครทำอะไรได้ในสถานะไหน ตรวจใน store.UpdateRequestStatus
func (h *Handler) UpdateRequestStatus(w http.ResponseWriter, r *http.Request) {
    id, ok := pathID(r, "id")
    if !ok {
        writeError(w, http.StatusBadRequest, "BAD_ID", "เลขคำขอต้องเป็นตัวเลข")
        return
    }
    var req statusReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
        return
    }
    switch req.Status {
    case "accepted", "rejected", "cancelled", "completed":
    default:
        writeError(w, http.StatusBadRequest, "BAD_STATUS", "status ต้องเป็น accepted, rejected, cancelled หรือ completed")
        return
    }
    memberID, _ := mw.MemberID(r.Context())
    err := h.Store.UpdateRequestStatus(r.Context(), id, memberID, req.Status)
    switch {
    case errors.Is(err, store.ErrNotFound):
        writeError(w, http.StatusNotFound, "REQUEST_NOT_FOUND", "ไม่พบคำขอนี้")
        return
    case errors.Is(err, store.ErrBadTransition):
        writeError(w, http.StatusConflict, "BAD_TRANSITION", "ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน")
        return
    case err != nil:
        internal(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"id": id, "status": req.Status})
}
