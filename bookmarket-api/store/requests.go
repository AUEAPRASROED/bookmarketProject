package store

import (
    "context"
    "errors"
    "time"

    "github.com/jackc/pgx/v5"
)

type RequestBook struct {
    ID       int64   `json:"id"`
    Title    string  `json:"title"`
    Price    float64 `json:"price"`
    ImageURL *string `json:"imageUrl"`
    Status   string  `json:"status"`
}

type Party struct {
    ID          int64   `json:"id"`
    DisplayName string  `json:"displayName"`
    Contact     *string `json:"contact"` // null ถ้ายังไม่ถึงเวลาเปิดเผย
}

type PurchaseRequest struct {
    ID        int64       `json:"id"`
    Status    string      `json:"status"`
    Message   *string     `json:"message"`
    CreatedAt time.Time   `json:"createdAt"`
    UpdatedAt time.Time   `json:"updatedAt"`
    Book      RequestBook `json:"book"`
    Buyer     Party       `json:"buyer"`
    Seller    Party       `json:"seller"`
}

// สามมุมมอง เขียนเป็นข้อความเต็มไว้เลยให้อ่านง่าย (ไม่ต่อสตริงจากค่าของผู้ใช้)
const (
    // ผู้ซื้อดูคำขอของตัวเอง: เห็นช่องติดต่อผู้ขายเมื่อผู้ขายยอมรับแล้วเท่านั้น
    buyerView = `SELECT r.id, r.status, r.message, r.created_at, r.updated_at,
                        b.id, b.title, b.price::float8, b.image_url, b.status,
                        buyer.id, buyer.display_name, buyer.contact,
                        seller.id, seller.display_name,
                        CASE WHEN r.status IN ('accepted', 'completed') THEN seller.contact END
                 FROM purchase_requests r
                 JOIN books b        ON b.id = r.book_id
                 JOIN members buyer  ON buyer.id = r.buyer_id
                 JOIN members seller ON seller.id = b.seller_id `
    // ผู้ขายดูคำขอที่เข้ามา: เห็นช่องติดต่อผู้ซื้อ (ผู้ซื้อเป็นฝ่ายส่งคำขอมาเอง) เพื่อตรวจสอบรายละเอียดผู้ซื้อ
    sellerView = `SELECT r.id, r.status, r.message, r.created_at, r.updated_at,
                         b.id, b.title, b.price::float8, b.image_url, b.status,
                         buyer.id, buyer.display_name, buyer.contact,
                         seller.id, seller.display_name, seller.contact
                  FROM purchase_requests r
                  JOIN books b        ON b.id = r.book_id
                  JOIN members buyer  ON buyer.id = r.buyer_id
                  JOIN members seller ON seller.id = b.seller_id `
    // admin ดูภาพรวมการซื้อขาย: เห็นแค่ชื่อ ไม่ต้องเห็นช่องติดต่อของใคร
    adminView = `SELECT r.id, r.status, r.message, r.created_at, r.updated_at,
                        b.id, b.title, b.price::float8, b.image_url, b.status,
                        buyer.id, buyer.display_name, NULL::varchar,
                        seller.id, seller.display_name, NULL::varchar
                 FROM purchase_requests r
                 JOIN books b        ON b.id = r.book_id
                 JOIN members buyer  ON buyer.id = r.buyer_id
                 JOIN members seller ON seller.id = b.seller_id `
)

func (s *Store) queryRequests(ctx context.Context, sql string, args ...any) ([]PurchaseRequest, error) {
    rows, err := s.Pool.Query(ctx, sql, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    out := []PurchaseRequest{}
    for rows.Next() {
        var r PurchaseRequest
        if err := rows.Scan(&r.ID, &r.Status, &r.Message, &r.CreatedAt, &r.UpdatedAt,
            &r.Book.ID, &r.Book.Title, &r.Book.Price, &r.Book.ImageURL, &r.Book.Status,
            &r.Buyer.ID, &r.Buyer.DisplayName, &r.Buyer.Contact,
            &r.Seller.ID, &r.Seller.DisplayName, &r.Seller.Contact); err != nil {
            return nil, err
        }
        out = append(out, r)
    }
    return out, rows.Err()
}

// ListRequestsByBuyer คำขอซื้อที่ฉันส่ง
func (s *Store) ListRequestsByBuyer(ctx context.Context, buyerID int64) ([]PurchaseRequest, error) {
    return s.queryRequests(ctx, buyerView+`WHERE r.buyer_id = $1 ORDER BY r.created_at DESC, r.id DESC`, buyerID)
}

// ListIncoming คำขอที่เข้ามาที่หนังสือของฉัน
func (s *Store) ListIncoming(ctx context.Context, sellerID int64) ([]PurchaseRequest, error) {
    return s.queryRequests(ctx, sellerView+`WHERE b.seller_id = $1 ORDER BY r.created_at DESC, r.id DESC`, sellerID)
}

// ListAllRequests รายการซื้อขายทั้งหมดสำหรับ admin
func (s *Store) ListAllRequests(ctx context.Context) ([]PurchaseRequest, error) {
    return s.queryRequests(ctx, adminView+`ORDER BY r.created_at DESC, r.id DESC`)
}

// CreateRequest ส่งคำขอซื้อ ตรวจกติกาทั้งหมดใน transaction เดียว (แบบ CreateMovie)
func (s *Store) CreateRequest(ctx context.Context, bookID, buyerID int64, message *string) (int64, error) {
    tx, err := s.Pool.Begin(ctx)
    if err != nil {
        return 0, err
    }
    defer tx.Rollback(ctx) // ถ้า Commit ไปแล้ว Rollback จะไม่มีผล

    var sellerID int64
    var bookStatus string
    err = tx.QueryRow(ctx, `SELECT seller_id, status FROM books WHERE id = $1`, bookID).Scan(&sellerID, &bookStatus)
    if errors.Is(err, pgx.ErrNoRows) {
        return 0, ErrNotFound
    }
    if err != nil {
        return 0, err
    }
    if sellerID == buyerID {
        return 0, ErrOwnBook
    }
    if bookStatus != "available" {
        return 0, ErrNotAvailable
    }
    var open int64
    if err := tx.QueryRow(ctx,
        `SELECT count(*) FROM purchase_requests
         WHERE book_id = $1 AND buyer_id = $2 AND status IN ('pending', 'accepted')`,
        bookID, buyerID).Scan(&open); err != nil {
        return 0, err
    }
    if open > 0 {
        return 0, ErrAlreadyRequested
    }
    var id int64
    if err := tx.QueryRow(ctx,
        `INSERT INTO purchase_requests (book_id, buyer_id, message)
         VALUES ($1, $2, $3) RETURNING id`, bookID, buyerID, message).Scan(&id); err != nil {
        return 0, err
    }
    return id, tx.Commit(ctx)
}

// UpdateRequestStatus เปลี่ยนสถานะคำขอตามตารางในเอกสารออกแบบ ข้อ 4
// คำขอกับหนังสือเปลี่ยนพร้อมกันใน transaction เดียว ถ้าขั้นไหนพลาด Rollback ทั้งหมด
//
//   pending            -> accepted   ผู้ขาย  หนังสือเป็น reserved และคำขอ pending อื่นของเล่มนี้เป็น rejected
//   pending            -> rejected   ผู้ขาย
//   pending | accepted -> cancelled  ผู้ซื้อ ถ้าเดิม accepted หนังสือกลับเป็น available
//   accepted           -> completed  ผู้ขาย  หนังสือเป็น sold
func (s *Store) UpdateRequestStatus(ctx context.Context, requestID, memberID int64, next string) error {
    tx, err := s.Pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)

    var cur, bookStatus string
    var buyerID, sellerID, bookID int64
    err = tx.QueryRow(ctx,
        `SELECT r.status, r.buyer_id, b.seller_id, b.id, b.status
         FROM purchase_requests r JOIN books b ON b.id = r.book_id
         WHERE r.id = $1`, requestID).Scan(&cur, &buyerID, &sellerID, &bookID, &bookStatus)
    if errors.Is(err, pgx.ErrNoRows) {
        return ErrNotFound
    }
    if err != nil {
        return err
    }
    isBuyer, isSeller := memberID == buyerID, memberID == sellerID
    if !isBuyer && !isSeller {
        return ErrNotFound // ไม่ใช่คำขอของเรา ตอบเหมือนไม่มีอยู่ (แบบ DeleteReview)
    }

    switch {
    case next == "accepted" && isSeller && cur == "pending" && bookStatus == "available":
        if err := setStatus(ctx, tx, requestID, bookID, "accepted", "reserved"); err != nil {
            return err
        }
        // คำขอ pending อื่นของเล่มนี้ถูกปฏิเสธอัตโนมัติ เพราะหนังสือถูกจองแล้ว
        if _, err := tx.Exec(ctx,
            `UPDATE purchase_requests SET status = 'rejected', updated_at = now()
             WHERE book_id = $1 AND id <> $2 AND status = 'pending'`, bookID, requestID); err != nil {
            return err
        }
    case next == "rejected" && isSeller && cur == "pending":
        if err := setStatus(ctx, tx, requestID, bookID, "rejected", ""); err != nil {
            return err
        }
    case next == "cancelled" && isBuyer && cur == "pending":
        if err := setStatus(ctx, tx, requestID, bookID, "cancelled", ""); err != nil {
            return err
        }
    case next == "cancelled" && isBuyer && cur == "accepted":
        // ยกเลิกหลังผู้ขายยอมรับแล้ว: หนังสือกลับมาขายได้อีก
        if err := setStatus(ctx, tx, requestID, bookID, "cancelled", "available"); err != nil {
            return err
        }
    case next == "completed" && isSeller && cur == "accepted":
        if err := setStatus(ctx, tx, requestID, bookID, "completed", "sold"); err != nil {
            return err
        }
    default:
        return ErrBadTransition
    }
    return tx.Commit(ctx)
}

// setStatus เปลี่ยนสถานะคำขอ และเปลี่ยนสถานะหนังสือด้วยถ้า bookStatus ไม่ว่าง (อยู่ใน transaction เดียวกัน)
func setStatus(ctx context.Context, tx pgx.Tx, requestID, bookID int64, reqStatus, bookStatus string) error {
    if _, err := tx.Exec(ctx,
        `UPDATE purchase_requests SET status = $2, updated_at = now() WHERE id = $1`,
        requestID, reqStatus); err != nil {
        return err
    }
    if bookStatus == "" {
        return nil
    }
    _, err := tx.Exec(ctx, `UPDATE books SET status = $2, updated_at = now() WHERE id = $1`, bookID, bookStatus)
    return err
}
