//! ingredients テーブル向けクエリ（docs/05-data-model.md §3.3）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const LIST_BY_RECIPE: &str = query_sql!("ingredients/list_by_recipe.sql");
const INSERT: &str = query_sql!("ingredients/insert.sql");

/// 材料 1 行。
#[derive(Debug, Clone, PartialEq)]
pub struct Ingredient {
    pub id: i64,
    pub sort_order: i32,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
}

/// 指定レシピの材料を表示順で返す。
pub async fn list_by_recipe(
    pool: &SqlitePool,
    recipe_id: i64,
) -> Result<Vec<Ingredient>, sqlx::Error> {
    let rows = sqlx::query(LIST_BY_RECIPE)
        .bind(recipe_id)
        .fetch_all(pool)
        .await?;

    rows.into_iter()
        .map(|row| {
            Ok(Ingredient {
                id: row.try_get("id")?,
                sort_order: row.try_get("sort_order")?,
                name: row.try_get("name")?,
                quantity: row.try_get("quantity")?,
                unit: row.try_get("unit")?,
            })
        })
        .collect()
}

/// 材料 1 行を INSERT する。
pub async fn insert<'e, E>(
    executor: E,
    recipe_id: i64,
    sort_order: i32,
    name: &str,
    quantity: f64,
    unit: &str,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    sqlx::query(INSERT)
        .bind(recipe_id)
        .bind(sort_order)
        .bind(name)
        .bind(quantity)
        .bind(unit)
        .execute(executor)
        .await
}
