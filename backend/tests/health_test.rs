//! VS-00: Walking Skeleton の `/health` エンドポイント結合テスト。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use recipe_backend::test_utils::test_app;
use tower::ServiceExt;

#[tokio::test]
async fn health_returns_200() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
