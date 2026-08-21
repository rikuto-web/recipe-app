//! VS-01: `GET /api/categories` の結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use recipe_backend::test_utils::test_app;
use tower::ServiceExt;

#[tokio::test]
async fn get_categories_returns_seeded_five() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/categories")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    let categories = json["categories"].as_array().expect("categories array");
    assert_eq!(categories.len(), 5);
    assert_eq!(categories[0]["id"], 1);
    assert_eq!(categories[0]["name"], "和食");
    assert_eq!(categories[4]["id"], 5);
    assert_eq!(categories[4]["name"], "その他");
}
