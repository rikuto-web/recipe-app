//! steps テーブル向けクエリ（docs/05-data-model.md §3.4）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const LIST_BY_RECIPE: &str = query_sql!("steps/list_by_recipe.sql");

/// 手順 1 行。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Step {
    pub id: i64,
    pub step_number: i32,
    pub body: String,
}

/// 指定レシピの手順を番号順で返す。
pub async fn list_by_recipe(pool: &SqlitePool, recipe_id: i64) -> Result<Vec<Step>, sqlx::Error> {
    let rows = sqlx::query(LIST_BY_RECIPE)
        .bind(recipe_id)
        .fetch_all(pool)
        .await?;

    rows.into_iter()
        .map(|row| {
            Ok(Step {
                id: row.try_get("id")?,
                step_number: row.try_get("step_number")?,
                body: row.try_get("body")?,
            })
        })
        .collect()
}
