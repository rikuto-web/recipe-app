-- カテゴリマスタの初期データ（docs/05-data-model.md §3.1）
-- 利用者による CRUD は行わず、参照専用マスタとして利用する。

INSERT INTO categories (id, name) VALUES
  (1, '和食'),
  (2, '洋食'),
  (3, '中華'),
  (4, 'デザート'),
  (5, 'その他');
