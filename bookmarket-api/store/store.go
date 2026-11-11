package store

import (
    "errors"

    "github.com/jackc/pgx/v5/pgxpool"
)

// ความผิดพลาดที่มีชื่อ handler ใช้ errors.Is แปลงเป็นรหัส HTTP (แบบเดียวกับ MovieHub)
var (
    ErrNotFound         = errors.New("not found")
    ErrEmailTaken       = errors.New("email taken")
    ErrDuplicate        = errors.New("duplicate")
    ErrBadCategory      = errors.New("bad category")
    ErrCategoryInUse    = errors.New("category in use")
    ErrOwnBook          = errors.New("own book")
    ErrNotAvailable     = errors.New("book not available")
    ErrAlreadyRequested = errors.New("already requested")
    ErrBadTransition    = errors.New("bad transition")
    ErrSelfReview       = errors.New("self review")
    ErrNotBuyer         = errors.New("no completed purchase")
)

type Store struct {
    Pool *pgxpool.Pool
}
