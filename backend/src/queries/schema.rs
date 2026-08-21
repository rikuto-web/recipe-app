//! スキーマ検証向けクエリ（マイグレーション・結合テスト用）。

use sqlx::SqlitePool;

use super::query_sql;

const TABLE_EXISTS: &str = query_sql!("schema/table_exists.sql");

/// 指定テーブルが存在するか。
pub async fn table_exists(pool: &SqlitePool, table_name: &str) -> Result<bool, sqlx::Error> {
    let (count,): (i64,) = sqlx::query_as(TABLE_EXISTS)
        .bind(table_name)
        .fetch_one(pool)
        .await?;

    Ok(count > 0)
}
