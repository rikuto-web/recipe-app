//! VS-00: マイグレーション適用とカテゴリシード（5 件）の検証。

use recipe_backend::queries::{categories, recipes, schema};
use recipe_backend::test_utils::test_pool;

#[tokio::test]
async fn migrations_create_all_tables() {
    let pool = test_pool().await;

    for table in ["categories", "recipes", "ingredients", "steps"] {
        assert!(
            schema::table_exists(&pool, table).await.unwrap(),
            "table {table} should exist"
        );
    }
}

#[tokio::test]
async fn seed_inserts_five_categories() {
    let pool = test_pool().await;

    let count = categories::count(&pool).await.unwrap();
    assert_eq!(count, 5);

    let names = categories::list_names_ordered(&pool).await.unwrap();
    assert_eq!(names, vec!["和食", "洋食", "中華", "デザート", "その他"]);
}

#[tokio::test]
async fn foreign_keys_reject_invalid_category_id() {
    let pool = test_pool().await;

    let result = recipes::insert(
        &pool,
        999,
        "test",
        "",
        1,
        10,
        1,
        "2026-01-01T00:00:00Z",
        "2026-01-01T00:00:00Z",
    )
    .await;

    assert!(result.is_err(), "FK violation should be rejected");
}
