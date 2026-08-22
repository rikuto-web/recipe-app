//! VS-02: `GET /api/recipes/{id}` の詳細取得結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::queries::recipes;
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

    sqlx::query("UPDATE recipes SET description = ? WHERE id = ?")
        .bind("シンプルな醤油ラーメン")
        .bind(id)
        .execute(pool)
        .await
        .expect("set description");

    sqlx::query(
        "INSERT INTO ingredients (recipe_id, sort_order, name, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(1)
    .bind("中華麺")
    .bind(120.0)
    .bind("g")
    .execute(pool)
    .await
    .expect("insert ingredient 1");

    sqlx::query(
        "INSERT INTO ingredients (recipe_id, sort_order, name, quantity, unit) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(2)
    .bind("豚バラ")
    .bind(80.0)
    .bind("g")
    .execute(pool)
    .await
    .expect("insert ingredient 2");

    sqlx::query("INSERT INTO steps (recipe_id, step_number, body) VALUES (?, ?, ?)")
        .bind(id)
        .bind(1)
        .bind("スープを作る")
        .execute(pool)
        .await
        .expect("insert step 1");

    sqlx::query("INSERT INTO steps (recipe_id, step_number, body) VALUES (?, ?, ?)")
        .bind(id)
        .bind(2)
        .bind("麺を茹でる")
        .execute(pool)
        .await
        .expect("insert step 2");

    id
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

#[tokio::test]
async fn get_recipe_returns_detail_with_ingredients_and_steps() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool).await;

    let (status, json) = request_json(app, &format!("/api/recipes/{id}")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["id"], id);
    assert_eq!(json["title"], "醤油ラーメン");
    assert_eq!(json["description"], "シンプルな醤油ラーメン");
    assert_eq!(json["category"]["id"], 1);
    assert_eq!(json["category"]["name"], "和食");
    assert_eq!(json["servings"], 2);
    assert_eq!(json["cook_time_minutes"], 30);
    assert_eq!(json["difficulty"], 3);
    assert_eq!(json["created_at"], "2026-08-21T00:00:00Z");
    assert_eq!(json["updated_at"], "2026-08-21T00:00:00Z");

    let ingredients = json["ingredients"].as_array().expect("ingredients array");
    assert_eq!(ingredients.len(), 2);
    assert_eq!(ingredients[0]["sort_order"], 1);
    assert_eq!(ingredients[0]["name"], "中華麺");
    assert_eq!(ingredients[0]["quantity"].as_f64(), Some(120.0));
    assert_eq!(ingredients[0]["unit"], "g");
    assert_eq!(ingredients[1]["sort_order"], 2);
    assert_eq!(ingredients[1]["name"], "豚バラ");
    assert_eq!(ingredients[1]["quantity"].as_f64(), Some(80.0));
    assert_eq!(ingredients[1]["unit"], "g");

    let steps = json["steps"].as_array().expect("steps array");
    assert_eq!(steps.len(), 2);
    assert_eq!(steps[0]["step_number"], 1);
    assert_eq!(steps[0]["body"], "スープを作る");
    assert_eq!(steps[1]["step_number"], 2);
    assert_eq!(steps[1]["body"], "麺を茹でる");
}

#[tokio::test]
async fn get_recipe_returns_404_when_missing() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json) = request_json(app, "/api/recipes/999").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json["error"]["code"], "NOT_FOUND");
}

#[tokio::test]
async fn get_recipe_rejects_non_integer_id() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;
    let (status, json) = request_json(app, "/api/recipes/abc").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert_eq!(json["error"]["details"][0]["field"], "id");
}
