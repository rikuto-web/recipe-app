//! 環境変数から実行設定を読み込む。
//!
//! | 変数 | 既定値 | 説明 |
//! | --- | --- | --- |
//! | `DATABASE_URL` | `sqlite:../data/recipe.db` | SQLite 接続 URL |
//! | `HOST` | `127.0.0.1` | 待ち受け IP。Docker Compose 等では `0.0.0.0` |
//! | `PORT` | `8080` | HTTP 待ち受けポート（1〜65535） |
//! | `CORS_ORIGIN` | `http://localhost:5173` | 許可する CORS オリジン（カンマ区切り可） |

use std::env;

pub const DEFAULT_CORS_ORIGIN: &str = "http://localhost:5173";

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub cors_origin: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:../data/recipe.db".to_string());
        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = match env::var("PORT") {
            Ok(value) => value.parse::<u16>().map_err(|_| {
                format!("PORT must be a valid port number (1-65535), got: {value:?}")
            })?,
            Err(_) => 8080,
        };
        let cors_origin =
            env::var("CORS_ORIGIN").unwrap_or_else(|_| DEFAULT_CORS_ORIGIN.to_string());

        Ok(Self {
            database_url,
            host,
            port,
            cors_origin,
        })
    }

    pub fn cors_origins(&self) -> Vec<axum::http::HeaderValue> {
        parse_cors_origins(&self.cors_origin)
    }
}

pub fn parse_cors_origins(origins: &str) -> Vec<axum::http::HeaderValue> {
    origins
        .split(',')
        .map(str::trim)
        .filter(|origin| !origin.is_empty())
        .map(|origin| {
            origin
                .parse()
                .unwrap_or_else(|_| panic!("invalid CORS origin: {origin:?}"))
        })
        .collect()
}
