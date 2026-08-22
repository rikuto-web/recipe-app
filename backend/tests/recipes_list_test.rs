//! VS-01: `GET /api/recipes` の検索・フィルタ結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::queries::recipes;
use recipe_backend::test_utils::{test_app, test_pool};
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
) {
    recipes::insert(
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
}

async fn seed_sample_recipes(pool: &SqlitePool) {
    insert_recipe(pool, 3, "醤油ラーメン", 2, 30, 3, "2026-03-01T00:00:00Z").await;
    insert_recipe(pool, 4, "チーズケーキ", 6, 60, 4, "2026-02-15T00:00:00Z").await;
    insert_recipe(pool, 2, "鮭のムニエル", 2, 20, 2, "2026-01-20T00:00:00Z").await;
}

async fn get_json(uri: &str) -> (StatusCode, Value) {
    let pool = test_pool().await;
    seed_sample_recipes(&pool).await;
    let app = test_app_with_pool(pool).await;
    request_json(app, uri).await
}

async fn test_app_with_pool(pool: SqlitePool) -> axum::Router {
    recipe_backend::build_app(pool)
}

async fn request_json(app: axum::Router, uri: &str) -> (StatusCode, Value) {
    let response = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();

    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    (status, json)
}

fn titles(json: &Value) -> Vec<&str> {
    json["recipes"]
        .as_array()
        .expect("recipes array")
        .iter()
        .map(|recipe| recipe["title"].as_str().expect("title string"))
        .collect()
}

#[tokio::test]
async fn get_recipes_returns_empty_list_when_none() {
    let app = test_app().await;
    let (status, json) = request_json(app, "/api/recipes").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["recipes"], serde_json::json!([]));
    assert_eq!(json["total"], 0);
}

#[tokio::test]
async fn get_recipes_returns_summaries_sorted_newest_by_default() {
    let (status, json) = get_json("/api/recipes").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 3);
    assert_eq!(
        titles(&json),
        vec!["醤油ラーメン", "チーズケーキ", "鮭のムニエル"]
    );

    let first = &json["recipes"][0];
    assert_eq!(first["title"], "醤油ラーメン");
    assert_eq!(first["category"]["id"], 3);
    assert_eq!(first["category"]["name"], "中華");
    assert_eq!(first["servings"], 2);
    assert_eq!(first["cook_time_minutes"], 30);
    assert_eq!(first["difficulty"], 3);
    assert_eq!(first["created_at"], "2026-03-01T00:00:00Z");
    assert!(first.get("ingredients").is_none());
    assert!(first.get("steps").is_none());
}

#[tokio::test]
async fn get_recipes_filters_by_title_partial_match() {
    let (status, json) = get_json("/api/recipes?q=ラーメン").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 1);
    assert_eq!(titles(&json), vec!["醤油ラーメン"]);
}

#[tokio::test]
async fn get_recipes_filters_by_category_id() {
    let (status, json) = get_json("/api/recipes?category_id=4").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 1);
    assert_eq!(titles(&json), vec!["チーズケーキ"]);
}

#[tokio::test]
async fn get_recipes_filters_by_difficulty() {
    let (status, json) = get_json("/api/recipes?difficulty=2").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 1);
    assert_eq!(titles(&json), vec!["鮭のムニエル"]);
}

#[tokio::test]
async fn get_recipes_filters_by_max_cook_time() {
    let (status, json) = get_json("/api/recipes?max_cook_time=30").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 2);
    assert_eq!(titles(&json), vec!["醤油ラーメン", "鮭のムニエル"]);
}

#[tokio::test]
async fn get_recipes_sorts_by_cook_time_asc() {
    let (status, json) = get_json("/api/recipes?sort=cook_time_asc").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        titles(&json),
        vec!["鮭のムニエル", "醤油ラーメン", "チーズケーキ"]
    );
}

#[tokio::test]
async fn get_recipes_combines_filters() {
    let (status, json) = get_json("/api/recipes?q=ケ&max_cook_time=90&sort=newest").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 1);
    assert_eq!(titles(&json), vec!["チーズケーキ"]);
}

#[tokio::test]
async fn get_recipes_rejects_invalid_sort() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;
    let (status, json) = request_json(app, "/api/recipes?sort=oldest").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
}

#[tokio::test]
async fn get_recipes_rejects_invalid_difficulty() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;
    let (status, json) = request_json(app, "/api/recipes?difficulty=9").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
}

#[tokio::test]
async fn get_recipes_rejects_non_integer_category_id() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;
    let (status, json) = request_json(app, "/api/recipes?category_id=abc").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert_eq!(json["error"]["details"][0]["field"], "category_id");
}
