//! データベース接続まわり（マイグレーション実行）。
//!
//! スキーマ DDL は `migrations/`、DML クエリは `queries/` に分離する。
//! 定義の正は `docs/05-data-model.md`。

use sqlx::SqlitePool;

/// `migrations/` 内の未適用 SQL を順に実行する。
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::migrate!().run(pool).await.map_err(Into::into)
}
