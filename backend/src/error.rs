//! API 共通エラーレスポンス（docs/06-api.md §3.2）。
//!
//! ```json
//! {
//!   "error": {
//!     "code": "VALIDATION_ERROR",
//!     "message": "...",
//!     "details": [{ "field": "title", "message": "..." }]
//!   }
//! }
//! ```

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub error: ErrorDetail,
}

#[derive(Debug, Serialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<FieldError>>,
}

#[derive(Debug, Serialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("internal server error")]
    Internal(#[from] sqlx::Error),
}

impl AppError {
    pub fn internal_server_error() -> Self {
        Self::Internal(sqlx::Error::RowNotFound)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "サーバー内部エラーが発生しました",
            ),
        };

        let body = ErrorBody {
            error: ErrorDetail {
                code: code.to_string(),
                message: message.to_string(),
                details: None,
            },
        };

        (status, Json(body)).into_response()
    }
}
