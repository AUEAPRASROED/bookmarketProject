package store

import (
    "context"
    "errors"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
)

// รีวิวร้าน: ทำแบบเดียวกับระบบรีวิวในใบงานด่านที่ 4-5
// คนหนึ่งรีวิวร้านหนึ่งได้ครั้งเดียว (UNIQUE ใน schema) และต้องเคยซื้อขายกับร้านนี้จนเสร็จแล้ว (ตรวจใน AddSellerReview)

type Reviewer struct {
    ID          int64  `json:"id"`
    DisplayName string `json:"displayName"`
}

type SellerReview struct {
    ID        int64     `json:"id"`
    Rating    int16     `json:"rating"`
    Text      *string   `json:"text"`
    CreatedAt time.Time `json:"createdAt"`
    Reviewer  Reviewer  `json:"reviewer"`
}

// SellerProfile ข้อมูลหน้าร้านที่เปิดเผยได้: ไม่มีอีเมลและช่องติดต่อ
type SellerProfile struct {
    ID          int64     `json:"id"`
    DisplayName string    `json:"displayName"`
    CreatedAt   time.Time `json:"createdAt"`
    Rating      *float64  `json:"rating"`
    ReviewCount int64     `json:"reviewCount"`
    BooksSold   int64     `json:"booksSold"`
}

func (s *Store) GetSellerProfile(ctx context.Context, sellerID int64) (SellerProfile, error) {
    var p SellerProfile
    err := s.Pool.QueryRow(ctx,
        `SELECT m.id, m.display_name, m.created_at,
                (SELECT round(avg(rating), 1)::float8 FROM seller_reviews WHERE seller_id = m.id),
                (SELECT count(*) FROM seller_reviews WHERE seller_id = m.id),
                (SELECT count(*) FROM books WHERE seller_id = m.id AND status = 'sold')
         FROM members m WHERE m.id = $1`, sellerID).
        Scan(&p.ID, &p.DisplayName, &p.CreatedAt, &p.Rating, &p.ReviewCount, &p.BooksSold)
    if errors.Is(err, pgx.ErrNoRows) {
        return SellerProfile{}, ErrNotFound
    }
    return p, err
}

func (s *Store) ListSellerReviews(ctx context.Context, sellerID int64) ([]SellerReview, error) {
    rows, err := s.Pool.Query(ctx,
        `SELECT r.id, r.rating, r.text, r.created_at, m.id, m.display_name
         FROM seller_reviews r
         JOIN members m ON m.id = r.reviewer_id
         WHERE r.seller_id = $1
         ORDER BY r.created_at DESC, r.id DESC`, sellerID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    out := []SellerReview{}
    for rows.Next() {
        var r SellerReview
        if err := rows.Scan(&r.ID, &r.Rating, &r.Text, &r.CreatedAt, &r.Reviewer.ID, &r.Reviewer.DisplayName); err != nil {
            return nil, err
        }
        out = append(out, r)
    }
    return out, rows.Err()
}

// AddSellerReview เลขผู้รีวิวมาจากตั๋วเท่านั้น
func (s *Store) AddSellerReview(ctx context.Context, sellerID, reviewerID int64, rating int, text *string) (SellerReview, error) {
    if sellerID == reviewerID {
        return SellerReview{}, ErrSelfReview
    }
    // ต้องเคยซื้อหนังสือจากร้านนี้จนสถานะเป็น completed อย่างน้อย 1 ครั้ง
    var done int64
    if err := s.Pool.QueryRow(ctx,
        `SELECT count(*) FROM purchase_requests r JOIN books b ON b.id = r.book_id
         WHERE r.buyer_id = $1 AND b.seller_id = $2 AND r.status = 'completed'`,
        reviewerID, sellerID).Scan(&done); err != nil {
        return SellerReview{}, err
    }
    if done == 0 {
        return SellerReview{}, ErrNotBuyer
    }

    r := SellerReview{Rating: int16(rating), Text: text}
    err := s.Pool.QueryRow(ctx,
        `INSERT INTO seller_reviews (seller_id, reviewer_id, rating, text)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`, sellerID, reviewerID, rating, text).Scan(&r.ID, &r.CreatedAt)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) {
        switch pgErr.Code {
        case "23505": // รีวิวร้านนี้ไปแล้ว
            return SellerReview{}, ErrDuplicate
        case "23503": // ไม่มีร้านนี้
            return SellerReview{}, ErrNotFound
        }
    }
    if err != nil {
        return SellerReview{}, err
    }
    err = s.Pool.QueryRow(ctx, `SELECT id, display_name FROM members WHERE id = $1`, reviewerID).
        Scan(&r.Reviewer.ID, &r.Reviewer.DisplayName)
    return r, err
}

// DeleteSellerReview ลบได้เมื่อเป็นคนเขียนรีวิว หรือเป็น admin (แบบ DeleteReview ในใบงาน)
func (s *Store) DeleteSellerReview(ctx context.Context, reviewID, memberID int64, isAdmin bool) error {
    tag, err := s.Pool.Exec(ctx,
        `DELETE FROM seller_reviews WHERE id = $1 AND (reviewer_id = $2 OR $3)`, reviewID, memberID, isAdmin)
    if err != nil {
        return err
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
