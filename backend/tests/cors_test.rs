//! VS-00: 開発オリジン `http://localhost:5173` への CORS 許可を検証する。

use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use recipe_backend::test_utils::test_app;
use tower::ServiceExt;

#[tokio::test]
async fn cors_allows_localhost_5173() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/health")
                .header(header::ORIGIN, "http://localhost:5173")
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let allow_origin = response
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
        .expect("access-control-allow-origin header");

    assert_eq!(allow_origin, "http://localhost:5173");
}
