package store

import (
    "context"
    "errors"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
)

type Member struct {
    ID           int64      `json:"id"`
    Email        string     `json:"email"`
    DisplayName  string     `json:"displayName"`
    Contact      *string    `json:"contact"`
    Role         string     `json:"role"`
    CreatedAt    *time.Time `json:"createdAt,omitempty"`
    PasswordHash string     `json:"-"` // ไม่มีวันออกไปกับ JSON
}

func (s *Store) CreateMember(ctx context.Context, email, hash, name string, contact *string) (Member, error) {
    m := Member{Email: email, DisplayName: name, Contact: contact}
    err := s.Pool.QueryRow(ctx,
        `INSERT INTO members (email, password_hash, display_name, contact)
         VALUES ($1, $2, $3, $4)
         RETURNING id, role, created_at`, email, hash, name, contact).Scan(&m.ID, &m.Role, &m.CreatedAt)
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23505" {
        return Member{}, ErrEmailTaken
    }
    return m, err
}

func (s *Store) MemberByEmail(ctx context.Context, email string) (Member, error) {
    var m Member
    err := s.Pool.QueryRow(ctx,
        `SELECT id, email, display_name, contact, role, password_hash
         FROM members WHERE lower(email) = $1`, email).
        Scan(&m.ID, &m.Email, &m.DisplayName, &m.Contact, &m.Role, &m.PasswordHash)
    if errors.Is(err, pgx.ErrNoRows) {
        return Member{}, ErrNotFound
    }
    return m, err
}

// MemberByID ใช้กับ GET /api/me และตอนเปลี่ยนรหัสผ่าน: เลขมาจากตั๋วที่ตรวจแล้ว
func (s *Store) MemberByID(ctx context.Context, id int64) (Member, error) {
    var m Member
    err := s.Pool.QueryRow(ctx,
        `SELECT id, email, display_name, contact, role, created_at, password_hash
         FROM members WHERE id = $1`, id).
        Scan(&m.ID, &m.Email, &m.DisplayName, &m.Contact, &m.Role, &m.CreatedAt, &m.PasswordHash)
    if errors.Is(err, pgx.ErrNoRows) {
        return Member{}, ErrNotFound
    }
    return m, err
}

// UpdateProfile แก้ชื่อที่แสดงและช่องติดต่อของตัวเอง (อีเมลและบทบาทแก้ที่นี่ไม่ได้)
func (s *Store) UpdateProfile(ctx context.Context, id int64, name string, contact *string) (Member, error) {
    var m Member
    err := s.Pool.QueryRow(ctx,
        `UPDATE members SET display_name = $2, contact = $3, updated_at = now()
         WHERE id = $1
         RETURNING id, email, display_name, contact, role, created_at`, id, name, contact).
        Scan(&m.ID, &m.Email, &m.DisplayName, &m.Contact, &m.Role, &m.CreatedAt)
    if errors.Is(err, pgx.ErrNoRows) {
        return Member{}, ErrNotFound
    }
    return m, err
}

func (s *Store) UpdatePassword(ctx context.Context, id int64, hash string) error {
    tag, err := s.Pool.Exec(ctx,
        `UPDATE members SET password_hash = $2, updated_at = now() WHERE id = $1`, id, hash)
    if err != nil {
        return err
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}

// ListMembers รายชื่อสมาชิกทั้งหมดสำหรับ admin เรียงคนใหม่ก่อน
func (s *Store) ListMembers(ctx context.Context) ([]Member, error) {
    rows, err := s.Pool.Query(ctx,
        `SELECT id, email, display_name, contact, role, created_at
         FROM members ORDER BY created_at DESC, id DESC`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    out := []Member{}
    for rows.Next() {
        var m Member
        if err := rows.Scan(&m.ID, &m.Email, &m.DisplayName, &m.Contact, &m.Role, &m.CreatedAt); err != nil {
            return nil, err
        }
        out = append(out, m)
    }
    return out, rows.Err()
}

func (s *Store) UpdateMemberRole(ctx context.Context, id int64, role string) (Member, error) {
    var m Member
    err := s.Pool.QueryRow(ctx,
        `UPDATE members SET role = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, email, display_name, contact, role, created_at`, id, role).
        Scan(&m.ID, &m.Email, &m.DisplayName, &m.Contact, &m.Role, &m.CreatedAt)
    if errors.Is(err, pgx.ErrNoRows) {
        return Member{}, ErrNotFound
    }
    return m, err
}

// DeleteMember ลบสมาชิก ประกาศและคำขอซื้อของคนนั้นหายตามด้วย ON DELETE CASCADE ใน schema
func (s *Store) DeleteMember(ctx context.Context, id int64) error {
    tag, err := s.Pool.Exec(ctx, `DELETE FROM members WHERE id = $1`, id)
    if err != nil {
        return err
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
