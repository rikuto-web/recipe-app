//! recipes テーブル向けクエリ（docs/05-data-model.md §3.2）。

use sqlx::SqlitePool;

use super::query_sql;

const INSERT: &str = query_sql!("recipes/insert.sql");

/// レシピ 1 件を INSERT する（親行のみ。材料・手順は別クエリ）。
pub async fn insert(
    pool: &SqlitePool,
    category_id: i64,
    title: &str,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    created_at: &str,
    updated_at: &str,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> {
    sqlx::query(INSERT)
        .bind(category_id)
        .bind(title)
        .bind(servings)
        .bind(cook_time_minutes)
        .bind(difficulty)
        .bind(created_at)
        .bind(updated_at)
        .execute(pool)
        .await
}
