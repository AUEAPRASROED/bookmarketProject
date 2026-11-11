package store

import (
    "context"
    "errors"

    "github.com/jackc/pgx/v5"
)

// ตะกร้าหนังสือ: ทำแบบเดียวกับ wishlist ในใบงานด่านที่ 5
// เลขสมาชิกมาจากตั๋วเท่านั้น จึงไม่มีทางดูหรือแก้ตะกร้าของคนอื่นได้

// ListCart หนังสือในตะกร้าของฉัน (รูปร่างเดียวกับ GET /api/books) เรียงเล่มที่เพิ่มล่าสุดก่อน
// เล่มที่ถูกจองหรือขายไปแล้วยังอยู่ในตะกร้า หน้าเว็บจะบอกสถานะให้รู้
func (s *Store) ListCart(ctx context.Context, memberID int64) ([]Book, error) {
    return s.queryBooks(ctx, bookSelect+
        `JOIN cart_items ci ON ci.book_id = b.id
         WHERE ci.member_id = $1
         ORDER BY ci.added_at DESC`, memberID)
}

// AddToCart ใส่ตะกร้า กดซ้ำได้ผลเหมือนเดิม (ON CONFLICT DO NOTHING) ใส่หนังสือของตัวเองไม่ได้
func (s *Store) AddToCart(ctx context.Context, memberID, bookID int64) error {
    var sellerID int64
    err := s.Pool.QueryRow(ctx, `SELECT seller_id FROM books WHERE id = $1`, bookID).Scan(&sellerID)
    if errors.Is(err, pgx.ErrNoRows) {
        return ErrNotFound
    }
    if err != nil {
        return err
    }
    if sellerID == memberID {
        return ErrOwnBook
    }
    _, err = s.Pool.Exec(ctx,
        `INSERT INTO cart_items (member_id, book_id) VALUES ($1, $2)
         ON CONFLICT (member_id, book_id) DO NOTHING`, memberID, bookID)
    return err
}

// RemoveFromCart เอาออกจากตะกร้าของตัวเอง ไม่มีอยู่แล้วก็ไม่ error
func (s *Store) RemoveFromCart(ctx context.Context, memberID, bookID int64) error {
    _, err := s.Pool.Exec(ctx, `DELETE FROM cart_items WHERE member_id = $1 AND book_id = $2`, memberID, bookID)
    return err
}
