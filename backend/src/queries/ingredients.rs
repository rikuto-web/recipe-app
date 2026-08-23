//! ingredients テーブル向けクエリ（docs/05-data-model.md §3.3）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const LIST_BY_RECIPE: &str = query_sql!("ingredients/list_by_recipe.sql");
const GET_BY_ID: &str = query_sql!("ingredients/get_by_id.sql");
const INSERT: &str = query_sql!("ingredients/insert.sql");
const UPDATE: &str = query_sql!("ingredients/update.sql");
const DELETE: &str = query_sql!("ingredients/delete.sql");
const COUNT_BY_RECIPE: &str = query_sql!("ingredients/count_by_recipe.sql");
const MAX_SORT_ORDER: &str = query_sql!("ingredients/max_sort_order.sql");

/// 材料 1 行。
#[derive(Debug, Clone, PartialEq)]
pub struct Ingredient {
    pub id: i64,
    pub sort_order: i32,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
}

fn map_ingredient(row: sqlx::sqlite::SqliteRow) -> Result<Ingredient, sqlx::Error> {
    Ok(Ingredient {
        id: row.try_get("id")?,
        sort_order: row.try_get("sort_order")?,
        name: row.try_get("name")?,
        quantity: row.try_get("quantity")?,
        unit: row.try_get("unit")?,
    })
}

/// 指定レシピの材料を表示順で返す。
pub async fn list_by_recipe(
    pool: &SqlitePool,
    recipe_id: i64,
) -> Result<Vec<Ingredient>, sqlx::Error> {
    list_by_recipe_exec(pool, recipe_id).await
}

/// トランザクション内でも使える材料一覧。
pub async fn list_by_recipe_exec<'e, E>(
    executor: E,
    recipe_id: i64,
) -> Result<Vec<Ingredient>, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let rows = sqlx::query(LIST_BY_RECIPE)
        .bind(recipe_id)
        .fetch_all(executor)
        .await?;

    rows.into_iter().map(map_ingredient).collect()
}

/// 材料 1 行を取得する。親レシピに属さなければ `None`。
pub async fn get_by_id<'e, E>(
    executor: E,
    recipe_id: i64,
    id: i64,
) -> Result<Option<Ingredient>, sqlx::Error>
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

    map_ingredient(row).map(Some)
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

/// 材料 1 行を UPDATE する。
pub async fn update<'e, E>(
    executor: E,
    recipe_id: i64,
    id: i64,
    sort_order: i32,
    name: &str,
    quantity: f64,
    unit: &str,
) -> Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    sqlx::query(UPDATE)
        .bind(sort_order)
        .bind(name)
        .bind(quantity)
        .bind(unit)
        .bind(id)
        .bind(recipe_id)
        .execute(executor)
        .await
}

/// 材料 1 行を DELETE する。
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

/// レシピの材料件数。
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

/// レシピ内の最大 `sort_order`。材料がなければ 0。
pub async fn max_sort_order<'e, E>(executor: E, recipe_id: i64) -> Result<i32, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
{
    let (max,): (i32,) = sqlx::query_as(MAX_SORT_ORDER)
        .bind(recipe_id)
        .fetch_one(executor)
        .await?;
    Ok(max)
}

/// 残りの材料の `sort_order` を 1 始まりに詰め直す。
pub async fn compact_sort_orders(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    recipe_id: i64,
) -> Result<(), sqlx::Error> {
    let remaining = list_by_recipe_exec(&mut **tx, recipe_id).await?;
    renumber_listed(tx, recipe_id, &remaining).await
}

/// 渡した順で `sort_order` を 1 始まりに振り直す。
pub async fn renumber_listed(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    recipe_id: i64,
    remaining: &[Ingredient],
) -> Result<(), sqlx::Error> {
    for ingredient in remaining {
        sqlx::query(UPDATE)
            .bind(-ingredient.id as i32)
            .bind(&ingredient.name)
            .bind(ingredient.quantity)
            .bind(&ingredient.unit)
            .bind(ingredient.id)
            .bind(recipe_id)
            .execute(&mut **tx)
            .await?;
    }

    for (index, ingredient) in remaining.iter().enumerate() {
        let sort_order = i32::try_from(index + 1)
            .map_err(|error| sqlx::Error::Protocol(format!("sort_order overflow: {error}")))?;
        sqlx::query(UPDATE)
            .bind(sort_order)
            .bind(&ingredient.name)
            .bind(ingredient.quantity)
            .bind(&ingredient.unit)
            .bind(ingredient.id)
            .bind(recipe_id)
            .execute(&mut **tx)
            .await?;
    }

    Ok(())
}
