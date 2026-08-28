//! VS-05: `DELETE /api/recipes/{id}` の物理削除結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::queries::ingredients;
use recipe_backend::queries::recipes;
use recipe_backend::queries::steps;
use recipe_backend::test_utils::test_pool;
use serde_json::Value;
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn insert_recipe(
    pool: &SqlitePool,
    category_id: i64,
    title: &str,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    created_at: &str,
) -> i64 {
    let result = recipes::insert(
        pool,
        category_id,
        title,
        "",
        servings,
        cook_time_minutes,
        difficulty,
        created_at,
        created_at,
    )
    .await
    .expect("insert recipe");
    result.last_insert_rowid()
}

async fn seed_ramen(pool: &SqlitePool) -> i64 {
    let id = insert_recipe(pool, 1, "醤油ラーメン", 2, 30, 3, "2026-08-21T00:00:00Z").await;

    ingredients::insert(pool, id, 1, "中華麺", 120.0, "g")
        .await
        .expect("insert ingredient 1");
    ingredients::insert(pool, id, 2, "豚バラ", 80.0, "g")
        .await
        .expect("insert ingredient 2");
    steps::insert(pool, id, 1, "スープを作る")
        .await
        .expect("insert step 1");
    steps::insert(pool, id, 2, "麺を茹でる")
        .await
        .expect("insert step 2");

    id
}

async fn test_app_with_pool(pool: SqlitePool) -> axum::Router {
    recipe_backend::build_app(pool, recipe_backend::parse_cors_origins(
        recipe_backend::DEFAULT_CORS_ORIGIN,
    ))
}

async fn request_json(app: axum::Router, method: &str, uri: &str) -> (StatusCode, Value) {
    let response = app
        .oneshot(
            Request::builder()
                .method(method)
                .uri(uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = if body.is_empty() {
        serde_json::json!({})
    } else {
        serde_json::from_slice(&body).unwrap()
    };
    (status, json)
}

#[tokio::test]
async fn delete_recipe_returns_200_and_removes_recipe() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json) = request_json(app, "DELETE", &format!("/api/recipes/{id}")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["message"], "deleted");
    assert!(recipes::get_by_id(&pool, id).await.unwrap().is_none());
}

#[tokio::test]
async fn delete_recipe_cascades_ingredients_and_steps() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, _) = request_json(app.clone(), "DELETE", &format!("/api/recipes/{id}")).await;
    assert_eq!(status, StatusCode::OK);

    let ingredient_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM ingredients WHERE recipe_id = ?")
            .bind(id)
            .fetch_one(&pool)
            .await
            .expect("count ingredients");
    let step_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM steps WHERE recipe_id = ?")
        .bind(id)
        .fetch_one(&pool)
        .await
        .expect("count steps");

    assert_eq!(ingredient_count.0, 0);
    assert_eq!(step_count.0, 0);

    let (get_status, _) = request_json(app, "GET", &format!("/api/recipes/{id}")).await;
    assert_eq!(get_status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn delete_recipe_returns_404_when_missing() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json) = request_json(app, "DELETE", "/api/recipes/999").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json["error"]["code"], "NOT_FOUND");
}

#[tokio::test]
async fn delete_recipe_rejects_non_integer_id() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json) = request_json(app, "DELETE", "/api/recipes/abc").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert_eq!(json["error"]["details"][0]["field"], "id");
}
