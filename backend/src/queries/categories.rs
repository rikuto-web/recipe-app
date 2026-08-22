//! categories テーブル向けクエリ（docs/05-data-model.md §3.1）。

use sqlx::{Row, SqlitePool};

use super::query_sql;

const COUNT: &str = query_sql!("categories/count.sql");
const GET_BY_ID: &str = query_sql!("categories/get_by_id.sql");
const LIST: &str = query_sql!("categories/list.sql");
const LIST_NAMES_ORDERED: &str = query_sql!("categories/list_names_ordered.sql");

/// カテゴリ 1 件。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Category {
    pub id: i64,
    pub name: String,
}

/// カテゴリ件数。
pub async fn count(pool: &SqlitePool) -> Result<i64, sqlx::Error> {
    let (count,): (i64,) = sqlx::query_as(COUNT).fetch_one(pool).await?;
    Ok(count)
}

/// カテゴリ一覧（id 昇順）。
pub async fn list(pool: &SqlitePool) -> Result<Vec<Category>, sqlx::Error> {
    let rows = sqlx::query(LIST).fetch_all(pool).await?;

    rows.into_iter()
        .map(|row| {
            Ok(Category {
                id: row.try_get("id")?,
                name: row.try_get("name")?,
            })
        })
        .collect()
}

/// ID 指定でカテゴリを取得する。存在しなければ `None`。
pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Category>, sqlx::Error> {
    let Some(row) = sqlx::query(GET_BY_ID).bind(id).fetch_optional(pool).await? else {
        return Ok(None);
    };

    Ok(Some(Category {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
    }))
}

/// カテゴリ名一覧（id 昇順）。
pub async fn list_names_ordered(pool: &SqlitePool) -> Result<Vec<String>, sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(LIST_NAMES_ORDERED).fetch_all(pool).await?;

    Ok(rows.into_iter().map(|(name,)| name).collect())
}
