//! steps テーブル向けクエリ（docs/05-data-model.md §3.4）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const LIST_BY_RECIPE: &str = query_sql!("steps/list_by_recipe.sql");
const GET_BY_ID: &str = query_sql!("steps/get_by_id.sql");
const INSERT: &str = query_sql!("steps/insert.sql");
const UPDATE: &str = query_sql!("steps/update.sql");
const DELETE: &str = query_sql!("steps/delete.sql");
const COUNT_BY_RECIPE: &str = query_sql!("steps/count_by_recipe.sql");
const MAX_STEP_NUMBER: &str = query_sql!("steps/max_step_number.sql");

/// 手順 1 行。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Step {
    pub id: i64,
    pub step_number: i32,
    pub body: String,
}

fn map_step(row: sqlx::sqlite::SqliteRow) -> Result<Step, sqlx::Error> {
    Ok(Step {
        id: row.try_get("id")?,
        step_number: row.try_get("step_number")?,
        body: row.try_get("body")?,
    })
}

/// 指定レシピの手順を番号順で返す。
pub async fn list_by_recipe(pool: &SqlitePool, recipe_id: i64) -> Result<Vec<Step>, sqlx::Error> {
    list_by_recipe_exec(pool, recipe_id).await
}

/// トランザクション内でも使える手順一覧。
pub async fn list_by_recipe_exec<'e, E>(
    executor: E,
    recipe_id: i64,
) -> Result<Vec<Step>, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let rows = sqlx::query(LIST_BY_RECIPE)
        .bind(recipe_id)
        .fetch_all(executor)
        .await?;

    rows.into_iter().map(map_step).collect()
}

/// 手順 1 行を取得する。親レシピに属さなければ `None`。
pub async fn get_by_id<'e, E>(
    executor: E,
    recipe_id: i64,
    id: i64,
) -> Result<Option<Step>, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let Some(row) = sqlx::query(GET_BY_ID)
        .bind(id)
        .bind(recipe_id)
        .fetch_optional(executor)
        .await?
    else {
        return Ok(None);
    };

    map_step(row).map(Some)
}

/// 手順 1 行を INSERT する。
pub async fn insert<'e, E>(
    executor: E,
    recipe_id: i64,
    step_number: i32,
    body: &str,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    sqlx::query(INSERT)
        .bind(recipe_id)
        .bind(step_number)
        .bind(body)
        .execute(executor)
        .await
}

/// 手順 1 行を UPDATE する。
pub async fn update<'e, E>(
    executor: E,
    recipe_id: i64,
    id: i64,
    step_number: i32,
    body: &str,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    sqlx::query(UPDATE)
        .bind(step_number)
        .bind(body)
        .bind(id)
        .bind(recipe_id)
        .execute(executor)
        .await
}

/// 手順 1 行を DELETE する。
pub async fn delete<'e, E>(
    executor: E,
    recipe_id: i64,
    id: i64,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    sqlx::query(DELETE)
        .bind(id)
        .bind(recipe_id)
        .execute(executor)
        .await
}

/// レシピの手順件数。
pub async fn count_by_recipe<'e, E>(executor: E, recipe_id: i64) -> Result<i64, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let (count,): (i64,) = sqlx::query_as(COUNT_BY_RECIPE)
        .bind(recipe_id)
        .fetch_one(executor)
        .await?;
    Ok(count)
}

/// レシピ内の最大 `step_number`。手順がなければ 0。
pub async fn max_step_number<'e, E>(executor: E, recipe_id: i64) -> Result<i32, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let (max,): (i32,) = sqlx::query_as(MAX_STEP_NUMBER)
        .bind(recipe_id)
        .fetch_one(executor)
        .await?;
    Ok(max)
}

/// 残りの手順番号を 1 始まりに詰め直す（UNIQUE 制約回避のため 2 段階）。
pub async fn compact_step_numbers(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    recipe_id: i64,
) -> Result<(), sqlx::Error> {
    let remaining = list_by_recipe_exec(&mut **tx, recipe_id).await?;
    renumber_listed(tx, recipe_id, &remaining).await
}

/// 渡した順で手順番号を 1 始まりに振り直す。
pub async fn renumber_listed(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    recipe_id: i64,
    remaining: &[Step],
) -> Result<(), sqlx::Error> {
    for step in remaining {
        sqlx::query(UPDATE)
            .bind(-step.id as i32)
            .bind(&step.body)
            .bind(step.id)
            .bind(recipe_id)
            .execute(&mut **tx)
            .await?;
    }

    for (index, step) in remaining.iter().enumerate() {
        let step_number = i32::try_from(index + 1)
            .map_err(|error| sqlx::Error::Protocol(format!("step_number overflow: {error}")))?;
        sqlx::query(UPDATE)
            .bind(step_number)
            .bind(&step.body)
            .bind(step.id)
            .bind(recipe_id)
            .execute(&mut **tx)
            .await?;
    }

    Ok(())
}
