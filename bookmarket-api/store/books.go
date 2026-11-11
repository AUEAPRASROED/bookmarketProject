package store

import (
    "context"
    "errors"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
)

type SellerInfo struct {
    ID          int64    `json:"id"`
    DisplayName string   `json:"displayName"` // เปิดเผยแค่ชื่อที่แสดง ช่องติดต่อเห็นได้หลังยอมรับคำขอเท่านั้น
    Rating      *float64 `json:"rating"`      // คะแนนรีวิวร้านเฉลี่ย 1-5 (null = ยังไม่มีรีวิว)
    ReviewCount int64    `json:"reviewCount"`
}

type Book struct {
    ID          int64      `json:"id"`
    Title       string     `json:"title"`
    Author      string     `json:"author"`
    Description *string    `json:"description"`
    Condition   string     `json:"condition"`
    Price       float64    `json:"price"`
    ImageURL    *string    `json:"imageUrl"`
    Status      string     `json:"status"`
    CategoryID  int        `json:"categoryId"`
    Category    string     `json:"category"`
    Seller      SellerInfo `json:"seller"`
    CreatedAt   time.Time  `json:"createdAt"`
    UpdatedAt   time.Time  `json:"updatedAt"`
}

// BookInput คือช่องที่เจ้าของประกาศแก้ได้ (status เปลี่ยนผ่านระบบคำขอซื้อเท่านั้น)
type BookInput struct {
    Title       string  `json:"title"`
    Author      string  `json:"author"`
    Description *string `json:"description"`
    Condition   string  `json:"condition"`
    Price       float64 `json:"price"`
    ImageURL    *string `json:"imageUrl"`
    CategoryID  int     `json:"categoryId"`
}

// bookSelect คอลัมน์ชุดเดียวกันทุกคำสั่งที่อ่านหนังสือ ลำดับต้องตรงกับ Scan ใน scanBook
const bookSelect = `SELECT b.id, b.title, b.author, b.description, b.condition, b.price::float8,
                           b.image_url, b.status, b.category_id, c.name, m.id, m.display_name,
                           (SELECT round(avg(sr.rating), 1)::float8 FROM seller_reviews sr WHERE sr.seller_id = m.id),
                           (SELECT count(*) FROM seller_reviews sr WHERE sr.seller_id = m.id),
                           b.created_at, b.updated_at
                    FROM books b
                    JOIN categories c ON c.id = b.category_id
                    JOIN members m    ON m.id = b.seller_id `

// scanner คือสิ่งที่มี Scan ได้ทั้งแถวเดียว (QueryRow) และหลายแถว (Query)
type scanner interface {
    Scan(dest ...any) error
}

func scanBook(row scanner) (Book, error) {
    var b Book
    err := row.Scan(&b.ID, &b.Title, &b.Author, &b.Description, &b.Condition, &b.Price,
        &b.ImageURL, &b.Status, &b.CategoryID, &b.Category, &b.Seller.ID, &b.Seller.DisplayName,
        &b.Seller.Rating, &b.Seller.ReviewCount, &b.CreatedAt, &b.UpdatedAt)
    return b, err
}

func (s *Store) queryBooks(ctx context.Context, sql string, args ...any) ([]Book, error) {
    rows, err := s.Pool.Query(ctx, sql, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    out := []Book{}
    for rows.Next() {
        b, err := scanBook(rows)
        if err != nil {
            return nil, err
        }
        out = append(out, b)
    }
    return out, rows.Err()
}

// ListBooks หน้าสาธารณะ: แสดงเล่มที่ยังขายอยู่หรือรอนัดรับ (ขายแล้วไม่โชว์) ค่าจากผู้ใช้เดินผ่าน $1 เสมอ
func (s *Store) ListBooks(ctx context.Context, q string) ([]Book, error) {
    return s.queryBooks(ctx, bookSelect+
        `WHERE b.status IN ('available', 'reserved')
           AND (lower(b.title) LIKE '%' || lower($1) || '%' OR lower(b.author) LIKE '%' || lower($1) || '%')
         ORDER BY b.created_at DESC, b.id DESC`, q)
}

// ListBooksBySeller ประกาศของฉัน ทุกสถานะ
func (s *Store) ListBooksBySeller(ctx context.Context, sellerID int64) ([]Book, error) {
    return s.queryBooks(ctx, bookSelect+`WHERE b.seller_id = $1 ORDER BY b.created_at DESC, b.id DESC`, sellerID)
}

// ListPublicBooksBySeller หนังสือในหน้าร้าน: เฉพาะเล่มที่ยังขายอยู่หรือติดจอง
func (s *Store) ListPublicBooksBySeller(ctx context.Context, sellerID int64) ([]Book, error) {
    return s.queryBooks(ctx, bookSelect+
        `WHERE b.seller_id = $1 AND b.status IN ('available', 'reserved') ORDER BY b.created_at DESC, b.id DESC`, sellerID)
}

// ListAllBooks สำหรับ admin ทุกเล่มทุกสถานะ
func (s *Store) ListAllBooks(ctx context.Context) ([]Book, error) {
    return s.queryBooks(ctx, bookSelect+`ORDER BY b.created_at DESC, b.id DESC`)
}

func (s *Store) GetBook(ctx context.Context, id int64) (Book, error) {
    b, err := scanBook(s.Pool.QueryRow(ctx, bookSelect+`WHERE b.id = $1`, id))
    if errors.Is(err, pgx.ErrNoRows) {
        return Book{}, ErrNotFound
    }
    return b, err
}

// CreateBook เลขผู้ขายมาจากตั๋วเท่านั้น
func (s *Store) CreateBook(ctx context.Context, sellerID int64, in BookInput) (Book, error) {
    var id int64
    err := s.Pool.QueryRow(ctx,
        `INSERT INTO books (seller_id, category_id, title, author, description, condition, price, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        sellerID, in.CategoryID, in.Title, in.Author, in.Description, in.Condition, in.Price, in.ImageURL).Scan(&id)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23503" { // ไม่มีหมวดนี้
        return Book{}, ErrBadCategory
    }
    if err != nil {
        return Book{}, err
    }
    return s.GetBook(ctx, id)
}

// UpdateBook แก้ได้เมื่อเป็นเจ้าของประกาศ หรือเป็น admin ไม่ตรงทั้งสองข้อจะไม่มีแถวไหนถูกแก้ (แบบ DeleteReview ในใบงาน)
func (s *Store) UpdateBook(ctx context.Context, id, memberID int64, isAdmin bool, in BookInput) (Book, error) {
    tag, err := s.Pool.Exec(ctx,
        `UPDATE books
         SET category_id = $4, title = $5, author = $6, description = $7, condition = $8,
             price = $9, image_url = $10, updated_at = now()
         WHERE id = $1 AND (seller_id = $2 OR $3)`,
        id, memberID, isAdmin, in.CategoryID, in.Title, in.Author, in.Description, in.Condition, in.Price, in.ImageURL)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23503" {
        return Book{}, ErrBadCategory
    }
    if err != nil {
        return Book{}, err
    }
    if tag.RowsAffected() == 0 {
        return Book{}, ErrNotFound
    }
    return s.GetBook(ctx, id)
}

// DeleteBook ลบได้เมื่อเป็นเจ้าของ หรือ admin คำขอซื้อของเล่มนี้หายตามด้วย ON DELETE CASCADE
func (s *Store) DeleteBook(ctx context.Context, id, memberID int64, isAdmin bool) error {
    tag, err := s.Pool.Exec(ctx,
        `DELETE FROM books WHERE id = $1 AND (seller_id = $2 OR $3)`, id, memberID, isAdmin)
    if err != nil {
        return err
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
