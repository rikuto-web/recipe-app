//! recipes テーブル向けクエリ（docs/05-data-model.md §3.2）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const INSERT: &str = query_sql!("recipes/insert.sql");
const LIST_NEWEST: &str = query_sql!("recipes/list_newest.sql");
const LIST_COOK_TIME_ASC: &str = query_sql!("recipes/list_cook_time_asc.sql");
const COUNT_FILTERED: &str = query_sql!("recipes/count_filtered.sql");

/// 一覧の並び順。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RecipeSort {
    #[default]
    Newest,
    CookTimeAsc,
}

/// `GET /api/recipes` のフィルタ条件。
#[derive(Debug, Clone, Default)]
pub struct RecipeListFilter {
    pub q: Option<String>,
    pub category_id: Option<i64>,
    pub difficulty: Option<i32>,
    pub max_cook_time: Option<i32>,
    pub sort: RecipeSort,
}

/// 一覧用のレシピ要約（材料・手順は含めない）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecipeListItem {
    pub id: i64,
    pub title: String,
    pub servings: i32,
    pub cook_time_minutes: i32,
    pub difficulty: i32,
    pub created_at: String,
    pub updated_at: String,
    pub category_id: i64,
    pub category_name: String,
}

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

/// フィルタ後の件数。
pub async fn count_filtered(
    pool: &SqlitePool,
    filter: &RecipeListFilter,
) -> Result<i64, sqlx::Error> {
    let (count,): (i64,) = sqlx::query_as(COUNT_FILTERED)
        .bind(filter.q.as_deref())
        .bind(filter.category_id)
        .bind(filter.difficulty)
        .bind(filter.max_cook_time)
        .fetch_one(pool)
        .await?;
    Ok(count)
}

/// フィルタ付き一覧。
pub async fn list(
    pool: &SqlitePool,
    filter: &RecipeListFilter,
) -> Result<Vec<RecipeListItem>, sqlx::Error> {
    let sql = match filter.sort {
        RecipeSort::Newest => LIST_NEWEST,
        RecipeSort::CookTimeAsc => LIST_COOK_TIME_ASC,
    };

    let rows = sqlx::query(sql)
        .bind(filter.q.as_deref())
        .bind(filter.category_id)
        .bind(filter.difficulty)
        .bind(filter.max_cook_time)
        .fetch_all(pool)
        .await?;

    rows.into_iter()
        .map(|row| {
            Ok(RecipeListItem {
                id: row.try_get("id")?,
                title: row.try_get("title")?,
                servings: row.try_get("servings")?,
                cook_time_minutes: row.try_get("cook_time_minutes")?,
                difficulty: row.try_get("difficulty")?,
                created_at: row.try_get("created_at")?,
                updated_at: row.try_get("updated_at")?,
                category_id: row.try_get("category_id")?,
                category_name: row.try_get("category_name")?,
            })
        })
        .collect()
}
