//! VS-04: レシピ更新 API（PUT / 材料行 / 手順行）の結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::queries::ingredients;
use recipe_backend::queries::recipes;
use recipe_backend::queries::steps;
use recipe_backend::test_utils::test_pool;
use serde_json::{Value, json};
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

    sqlx::query("UPDATE recipes SET description = ? WHERE id = ?")
        .bind("シンプルな醤油ラーメン")
        .bind(id)
        .execute(pool)
        .await
        .expect("set description");

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

async fn send_json(
    app: axum::Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Option<Value>, axum::http::HeaderMap) {
    let builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");
    let request = match body {
        Some(json) => builder.body(Body::from(json.to_string())).unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    };

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json = if bytes.is_empty() {
        None
    } else {
        Some(serde_json::from_slice(&bytes).unwrap())
    };
    (status, json, headers)
}

fn parent_payload() -> Value {
    json!({
        "title": "味噌ラーメン",
        "description": "味噌ベースに変更",
        "category_id": 3,
        "servings": 4,
        "cook_time_minutes": 40,
        "difficulty": 4
    })
}

#[tokio::test]
async fn put_recipe_updates_parent_only() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let ingredient_count_before = ingredients::list_by_recipe(&pool, id).await.unwrap().len();
    let step_count_before = steps::list_by_recipe(&pool, id).await.unwrap().len();
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "PUT",
        &format!("/api/recipes/{id}"),
        Some(parent_payload()),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["id"], id);
    assert_eq!(json["title"], "味噌ラーメン");
    assert_eq!(json["description"], "味噌ベースに変更");
    assert_eq!(json["category"]["id"], 3);
    assert_eq!(json["category"]["name"], "中華");
    assert_eq!(json["servings"], 4);
    assert_eq!(json["cook_time_minutes"], 40);
    assert_eq!(json["difficulty"], 4);
    assert_eq!(
        json["ingredients"].as_array().unwrap().len(),
        ingredient_count_before
    );
    assert_eq!(json["steps"].as_array().unwrap().len(), step_count_before);
    assert_eq!(json["ingredients"][0]["name"], "中華麺");
    assert_eq!(json["steps"][0]["body"], "スープを作る");
    assert_ne!(json["updated_at"], "2026-08-21T00:00:00Z");
}

#[tokio::test]
async fn put_recipe_returns_404_when_missing() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json, _) = send_json(app, "PUT", "/api/recipes/999", Some(parent_payload())).await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json["error"]["code"], "NOT_FOUND");
}

#[tokio::test]
async fn put_recipe_returns_400_on_empty_title() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool).await;

    let mut payload = parent_payload();
    payload["title"] = json!("");
    let (status, json, _) =
        send_json(app, "PUT", &format!("/api/recipes/{id}"), Some(payload)).await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert!(
        json["error"]["details"]
            .as_array()
            .unwrap()
            .iter()
            .any(|detail| detail["field"] == "title")
    );
}

#[tokio::test]
async fn post_ingredient_adds_one_row() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, headers) = send_json(
        app,
        "POST",
        &format!("/api/recipes/{id}/ingredients"),
        Some(json!({
            "name": "ネギ",
            "quantity": 10,
            "unit": "g",
            "sort_order": 3
        })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::CREATED);
    assert!(json["id"].as_i64().unwrap() > 0);
    assert_eq!(json["name"], "ネギ");
    assert_eq!(json["quantity"].as_f64(), Some(10.0));
    assert_eq!(json["unit"], "g");
    assert_eq!(json["sort_order"], 3);
    assert_eq!(
        ingredients::list_by_recipe(&pool, id).await.unwrap().len(),
        3
    );
    let location = headers
        .get("location")
        .map(|value| value.to_str().unwrap().to_string());
    if let Some(location) = location {
        assert!(location.contains("/ingredients/"));
    }
}

#[tokio::test]
async fn patch_ingredient_updates_specified_fields() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let ingredient_id = ingredients::list_by_recipe(&pool, id).await.unwrap()[0].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "PATCH",
        &format!("/api/recipes/{id}/ingredients/{ingredient_id}"),
        Some(json!({ "quantity": 15 })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["id"], ingredient_id);
    assert_eq!(json["name"], "中華麺");
    assert_eq!(json["quantity"].as_f64(), Some(15.0));
    assert_eq!(json["unit"], "g");
    assert_eq!(json["sort_order"], 1);
}

#[tokio::test]
async fn delete_ingredient_removes_one_row() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let ingredient_id = ingredients::list_by_recipe(&pool, id).await.unwrap()[1].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "DELETE",
        &format!("/api/recipes/{id}/ingredients/{ingredient_id}"),
        None,
    )
    .await;

    assert!(status == StatusCode::OK || status == StatusCode::NO_CONTENT);
    assert_eq!(
        ingredients::list_by_recipe(&pool, id).await.unwrap().len(),
        1
    );
    if let Some(json) = json {
        assert_eq!(json["message"], "deleted");
    }
}

#[tokio::test]
async fn delete_ingredient_compacts_sort_order() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let ingredients = ingredients::list_by_recipe(&pool, id).await.unwrap();
    let first_id = ingredients[0].id;
    assert_eq!(ingredients[0].sort_order, 1);
    assert_eq!(ingredients[1].sort_order, 2);
    let app = test_app_with_pool(pool.clone()).await;

    let (status, _, _) = send_json(
        app,
        "DELETE",
        &format!("/api/recipes/{id}/ingredients/{first_id}"),
        None,
    )
    .await;

    assert!(status == StatusCode::OK || status == StatusCode::NO_CONTENT);
    let remaining = ingredients::list_by_recipe(&pool, id).await.unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].name, "豚バラ");
    assert_eq!(remaining[0].sort_order, 1);
}

#[tokio::test]
async fn delete_last_ingredient_returns_400() {
    let pool = test_pool().await;
    let id = insert_recipe(&pool, 1, "単品", 1, 10, 1, "2026-08-21T00:00:00Z").await;
    ingredients::insert(&pool, id, 1, "塩", 1.0, "g")
        .await
        .expect("insert ingredient");
    steps::insert(&pool, id, 1, "混ぜる")
        .await
        .expect("insert step");
    let ingredient_id = ingredients::list_by_recipe(&pool, id).await.unwrap()[0].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "DELETE",
        &format!("/api/recipes/{id}/ingredients/{ingredient_id}"),
        None,
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert_eq!(
        ingredients::list_by_recipe(&pool, id).await.unwrap().len(),
        1
    );
}

#[tokio::test]
async fn post_step_appends_when_number_omitted() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "POST",
        &format!("/api/recipes/{id}/steps"),
        Some(json!({ "body": "ネギを刻んでトッピングする" })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::CREATED);
    assert!(json["id"].as_i64().unwrap() > 0);
    assert_eq!(json["body"], "ネギを刻んでトッピングする");
    assert_eq!(json["step_number"], 3);
    assert_eq!(steps::list_by_recipe(&pool, id).await.unwrap().len(), 3);
}

#[tokio::test]
async fn patch_step_updates_body() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let step_id = steps::list_by_recipe(&pool, id).await.unwrap()[1].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "PATCH",
        &format!("/api/recipes/{id}/steps/{step_id}"),
        Some(json!({ "body": "麺を al dente になるまで茹でる" })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["id"], step_id);
    assert_eq!(json["step_number"], 2);
    assert_eq!(json["body"], "麺を al dente になるまで茹でる");
}

#[tokio::test]
async fn delete_step_compacts_remaining_numbers() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    steps::insert(&pool, id, 3, "盛り付ける")
        .await
        .expect("insert step 3");
    let first_id = steps::list_by_recipe(&pool, id).await.unwrap()[0].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, _, _) = send_json(
        app,
        "DELETE",
        &format!("/api/recipes/{id}/steps/{first_id}"),
        None,
    )
    .await;

    assert!(status == StatusCode::OK || status == StatusCode::NO_CONTENT);
    let remaining = steps::list_by_recipe(&pool, id).await.unwrap();
    assert_eq!(remaining.len(), 2);
    assert_eq!(remaining[0].step_number, 1);
    assert_eq!(remaining[0].body, "麺を茹でる");
    assert_eq!(remaining[1].step_number, 2);
    assert_eq!(remaining[1].body, "盛り付ける");
}

#[tokio::test]
async fn delete_last_step_returns_400() {
    let pool = test_pool().await;
    let id = insert_recipe(&pool, 1, "単品", 1, 10, 1, "2026-08-21T00:00:00Z").await;
    ingredients::insert(&pool, id, 1, "塩", 1.0, "g")
        .await
        .expect("insert ingredient");
    steps::insert(&pool, id, 1, "混ぜる")
        .await
        .expect("insert step");
    let step_id = steps::list_by_recipe(&pool, id).await.unwrap()[0].id;
    let app = test_app_with_pool(pool.clone()).await;

    let (status, json, _) = send_json(
        app,
        "DELETE",
        &format!("/api/recipes/{id}/steps/{step_id}"),
        None,
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
    assert_eq!(steps::list_by_recipe(&pool, id).await.unwrap().len(), 1);
}

#[tokio::test]
async fn child_apis_return_404_when_recipe_missing() {
    let pool = test_pool().await;
    let app = test_app_with_pool(pool).await;

    let (status, json, _) = send_json(
        app,
        "POST",
        "/api/recipes/999/ingredients",
        Some(json!({
            "name": "ネギ",
            "quantity": 10,
            "unit": "g"
        })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json["error"]["code"], "NOT_FOUND");
}

#[tokio::test]
async fn patch_ingredient_returns_404_when_row_missing() {
    let pool = test_pool().await;
    let id = seed_ramen(&pool).await;
    let app = test_app_with_pool(pool).await;

    let (status, json, _) = send_json(
        app,
        "PATCH",
        &format!("/api/recipes/{id}/ingredients/999"),
        Some(json!({ "quantity": 15 })),
    )
    .await;
    let json = json.expect("json body");

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(json["error"]["code"], "NOT_FOUND");
}
