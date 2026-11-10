package store

import (
    "context"
    "errors"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
)

type Category struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    BookCount int64  `json:"bookCount"` // admin ใช้ดูว่าหมวดไหนลบได้
}

func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
    rows, err := s.Pool.Query(ctx,
        `SELECT c.id, c.name, (SELECT count(*) FROM books b WHERE b.category_id = c.id)
         FROM categories c ORDER BY c.id`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    out := []Category{}
    for rows.Next() {
        var c Category
        if err := rows.Scan(&c.ID, &c.Name, &c.BookCount); err != nil {
            return nil, err
        }
        out = append(out, c)
    }
    return out, rows.Err()
}

func (s *Store) CreateCategory(ctx context.Context, name string) (Category, error) {
    c := Category{Name: name}
    err := s.Pool.QueryRow(ctx,
        `INSERT INTO categories (name) VALUES ($1) RETURNING id`, name).Scan(&c.ID)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23505" { // ชื่อหมวดซ้ำ
        return Category{}, ErrDuplicate
    }
    return c, err
}

func (s *Store) UpdateCategory(ctx context.Context, id int, name string) (Category, error) {
    c := Category{ID: id}
    err := s.Pool.QueryRow(ctx,
        `UPDATE categories SET name = $2 WHERE id = $1
         RETURNING name, (SELECT count(*) FROM books WHERE category_id = $1)`, id, name).
        Scan(&c.Name, &c.BookCount)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23505" {
        return Category{}, ErrDuplicate
    }
    if errors.Is(err, pgx.ErrNoRows) {
        return Category{}, ErrNotFound
    }
    return c, err
}

// DeleteCategory ลบหมวดที่ยังมีหนังสืออยู่ไม่ได้: foreign key ของ books ตอบ 23503 กลับมา
func (s *Store) DeleteCategory(ctx context.Context, id int) error {
    tag, err := s.Pool.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23503" {
        return ErrCategoryInUse
    }
    if err != nil {
        return err
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
