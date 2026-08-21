-- sqlite_master からテーブル存在を確認（マイグレーション検証用）
SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?
