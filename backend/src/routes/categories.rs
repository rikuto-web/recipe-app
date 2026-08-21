//! `GET /api/categories`（docs/06-api.md §4）。

use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::queries::categories;

#[derive(Serialize)]
struct CategoriesResponse {
    categories: Vec<CategoryJson>,
}

#[derive(Serialize)]
struct CategoryJson {
    id: i64,
    name: String,
}

async fn list_categories(
    State(pool): State<SqlitePool>,
) -> Result<Json<CategoriesResponse>, AppError> {
    let categories = categories::list(&pool)
        .await?
        .into_iter()
        .map(|category| CategoryJson {
            id: category.id,
            name: category.name,
        })
        .collect();

    Ok(Json(CategoriesResponse { categories }))
}

pub fn router() -> Router<SqlitePool> {
    Router::new().route("/api/categories", get(list_categories))
}
