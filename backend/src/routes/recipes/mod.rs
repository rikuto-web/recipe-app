//! レシピ REST（docs/06-api.md §5–10）。一覧・詳細・作成・親更新・行単位更新。

mod dto;
mod handlers;
mod validate;

pub use handlers::router;
