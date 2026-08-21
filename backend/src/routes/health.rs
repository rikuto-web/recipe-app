//! Walking Skeleton 用の死活監視エンドポイント。
//!
//! ロードバランサや開発時の疎通確認に利用する。DB 状態は見ない。

use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

pub fn router() -> Router<sqlx::SqlitePool> {
    Router::new().route("/health", get(health))
}
