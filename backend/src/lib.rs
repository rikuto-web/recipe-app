//! レシピ API のライブラリ本体。
//!
//! - DB 接続・マイグレーション
//! - Axum ルータ組み立て（CORS / 構造化ログ）
//! - 以降の垂直スライスで `/api/*` ルートをここにマージする

use std::net::SocketAddr;

use axum::Router;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub mod config;
pub mod db;
pub mod error;
pub mod queries;
pub mod routes;

pub use config::Config;

/// SQLite 接続プールを作成し、未適用マイグレーションを実行する。
pub async fn build_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    ensure_sqlite_parent_dir(database_url)?;

    let options = sqlite_connect_options(database_url)?;

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    db::run_migrations(&pool).await?;

    Ok(pool)
}

/// HTTP アプリケーションを組み立てる。
/// 開発時 FE（:5173）からのアクセスを許可する CORS を全ルートに適用する。
pub fn build_app(pool: SqlitePool) -> Router {
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:5173"
                .parse()
                .expect("valid localhost origin"),
        ])
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .merge(routes::health::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool)
}

/// ログ初期化 → DB 接続 → `HOST:PORT`（既定 `127.0.0.1:8080`）で待ち受け。
pub async fn run(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();

    let pool = build_pool(&config.database_url).await?;
    let app = build_app(pool);
    let addr: SocketAddr = format!("{}:{}", config.host, config.port)
        .parse()
        .map_err(|error| format!("invalid HOST/PORT: {error}"))?;

    tracing::info!(%addr, "starting server");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}

/// SQLite 接続オプション。FK 制約と CASCADE を有効にする（SQLite 既定は OFF）。
fn sqlite_connect_options(database_url: &str) -> Result<SqliteConnectOptions, sqlx::Error> {
    database_url
        .parse::<SqliteConnectOptions>()
        .map(|options| options.create_if_missing(true).foreign_keys(true))
}

/// ファイルパス指定の SQLite URL 向けに親ディレクトリ（例: `data/`）を自動作成する。
fn ensure_sqlite_parent_dir(database_url: &str) -> Result<(), sqlx::Error> {
    let Some(path) = database_url.strip_prefix("sqlite:") else {
        return Ok(());
    };

    if path == ":memory:" {
        return Ok(());
    }

    let db_path = std::path::Path::new(path);
    if let Some(parent) = db_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|error| {
                sqlx::Error::Configuration(
                    format!("failed to create database directory: {error}").into(),
                )
            })?;
        }
    }

    Ok(())
}

/// 結合テスト用ヘルパー。インメモリ DB にマイグレーション済みプールを返す。
pub mod test_utils {
    use super::*;

    pub async fn test_pool() -> SqlitePool {
        let options = sqlite_connect_options("sqlite::memory:")
            .expect("valid sqlite memory url");

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("connect to in-memory sqlite");

        db::run_migrations(&pool)
            .await
            .expect("run migrations in tests");

        pool
    }

    pub async fn test_app() -> Router {
        build_app(test_pool().await)
    }
}
