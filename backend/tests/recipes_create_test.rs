//! VS-03: `POST /api/recipes` の作成結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::test_utils::test_pool;
use serde_json::{Value, json};
use sqlx::SqlitePool;
use tower::ServiceExt;

fn valid_payload() -> Value {
    json!({
        "title": "醤油ラーメン",
        "description": "シンプルな醤油ラーメン",
        "category_id": 1,
        "servings": 2,
        "cook_time_minutes": 30,
        "difficulty": 3,
        "ingredients": [
            { "sort_order": 1, "name": "中華麺", "quantity": 120, "unit": "g" },
            { "sort_order": 2, "name": "豚バラ", "quantity": 80, "unit": "g" }
        ],
        "steps": [
            { "step_number": 1, "body": "スープを作る" },
            { "step_number": 2, "body": "麺を茹でる" }
        ]
    })
}

async fn test_app_with_pool(pool: SqlitePool) -> axum::Router {
    recipe_backend::build_app(pool)
}

async fn post_json(app: axum::Router, body: Value) -> (StatusCode, Value) {
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/recipes")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();
    (status, json)
}

async fn recipe_count(pool: &SqlitePool) -> i64 {
    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM recipes")
        .fetch_one(pool)
        .await
        .expect("count recipes");
    count
}

#[tokio::test]
async fn post_recipes_returns_201_with_detail() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json) = post_json(app, valid_payload()).await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(json["id"].as_i64().unwrap() > 0);
    assert_eq!(json["title"], "醤油ラーメン");
    assert_eq!(json["description"], "シンプルな醤油ラーメン");
    assert_eq!(json["category"]["id"], 1);
    assert_eq!(json["category"]["name"], "和食");
    assert_eq!(json["servings"], 2);
    assert_eq!(json["cook_time_minutes"], 30);
    assert_eq!(json["difficulty"], 3);
    assert_eq!(json["ingredients"].as_array().unwrap().len(), 2);
    assert_eq!(json["steps"].as_array().unwrap().len(), 2);
    assert!(json["created_at"].as_str().unwrap().ends_with('Z'));
}

#[tokio::test]
async fn post_recipes_returns_400_on_empty_title() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["title"] = json!("");
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "title")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_invalid_category_id() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["category_id"] = json!(999);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "category_id")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_empty_ingredients() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["ingredients"] = json!([]);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "ingredients")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_empty_steps() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["steps"] = json!([]);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "steps")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_empty_step_body() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["steps"] = json!([{ "step_number": 1, "body": "" }]);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "steps[0].body")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_duplicate_step_numbers() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["steps"] = json!([
        { "step_number": 1, "body": "スープを作る" },
        { "step_number": 1, "body": "麺を茹でる" }
    ]);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "steps")
    );
    assert_eq!(recipe_count(&pool).await, before);
}

#[tokio::test]
async fn post_recipes_returns_400_on_zero_cook_time() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool.clone()).await;
    let before = recipe_count(&pool).await;

    let mut payload = valid_payload();
    payload["cook_time_minutes"] = json!(0);
    let (status, json) = post_json(app, payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "cook_time_minutes")
    );
    assert_eq!(recipe_count(&pool).await, before);
}
