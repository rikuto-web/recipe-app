//! SQL クエリの Rust ラッパー。
//!
//! クエリ本文は `backend/queries/` 配下の `.sql` ファイルに置き、
//! アプリケーションコードから SQL 文字列を直書きしない。

pub mod categories;
pub mod ingredients;
pub mod recipes;
pub mod schema;
pub mod steps;

/// `queries/` 配下の SQL ファイルをコンパイル時に読み込む。
macro_rules! query_sql {
    ($path:literal) => {
        include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/queries/", $path))
    };
}

pub(crate) use query_sql;
