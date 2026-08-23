//! ルート間で共有する JSON 型。

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CategoryJson {
    pub id: i64,
    pub name: String,
}
