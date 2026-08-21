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
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
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

#[derive(Debug, Clone, Serialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("validation error")]
    Validation {
        message: String,
        details: Vec<FieldError>,
    },
    #[error("internal server error")]
    Internal(#[from] sqlx::Error),
}

impl AppError {
    pub fn validation(field: &str, message: &str) -> Self {
        Self::Validation {
            message: "入力内容に誤りがあります".to_string(),
            details: vec![FieldError {
                field: field.to_string(),
                message: message.to_string(),
            }],
        }
    }

    pub fn internal_server_error() -> Self {
        Self::Internal(sqlx::Error::RowNotFound)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message, details) = match &self {
            AppError::Validation { message, details } => (
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                message.as_str(),
                Some(details.clone()),
            ),
            AppError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "サーバー内部エラーが発生しました",
                None,
            ),
        };

        let body = ErrorBody {
            error: ErrorDetail {
                code: code.to_string(),
                message: message.to_string(),
                details,
            },
        };

        (status, Json(body)).into_response()
    }
}
