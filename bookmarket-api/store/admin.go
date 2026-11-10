package store

import "context"

type Stats struct {
    Members           int64 `json:"members"`
    Admins            int64 `json:"admins"`
    Books             int64 `json:"books"`
    BooksAvailable    int64 `json:"booksAvailable"`
    BooksReserved     int64 `json:"booksReserved"`
    BooksSold         int64 `json:"booksSold"`
    Categories        int64 `json:"categories"`
    Requests          int64 `json:"requests"`
    RequestsPending   int64 `json:"requestsPending"`
    RequestsCompleted int64 `json:"requestsCompleted"`
}

// Stats รวมตัวเลขของทั้งเว็บในคำขอเดียว ให้หน้า Dashboard ยิงครั้งเดียวจบ (แบบ MovieHub)
func (s *Store) Stats(ctx context.Context) (Stats, error) {
    var st Stats
    err := s.Pool.QueryRow(ctx,
        `SELECT (SELECT count(*) FROM members),
                (SELECT count(*) FROM members WHERE role = 'admin'),
                (SELECT count(*) FROM books),
                (SELECT count(*) FROM books WHERE status = 'available'),
                (SELECT count(*) FROM books WHERE status = 'reserved'),
                (SELECT count(*) FROM books WHERE status = 'sold'),
                (SELECT count(*) FROM categories),
                (SELECT count(*) FROM purchase_requests),
                (SELECT count(*) FROM purchase_requests WHERE status = 'pending'),
                (SELECT count(*) FROM purchase_requests WHERE status = 'completed')`).
        Scan(&st.Members, &st.Admins, &st.Books, &st.BooksAvailable, &st.BooksReserved, &st.BooksSold,
            &st.Categories, &st.Requests, &st.RequestsPending, &st.RequestsCompleted)
    return st, err
}
