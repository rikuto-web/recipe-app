-- 初期スキーマ（docs/05-data-model.md §3, §4 準拠）
-- SQLite には DATE / DATETIME 型がなく、日時は TEXT（ISO 8601 UTC）または INTEGER（Unix 秒）で保持する。
-- 本プロジェクトは PostgreSQL 移行を見据え、API でも ISO 8601 文字列を使うため TEXT を採用する。

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  servings INTEGER NOT NULL CHECK (servings >= 1),
  cook_time_minutes INTEGER NOT NULL CHECK (cook_time_minutes >= 0),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  -- ISO 8601 UTC（例: 2026-08-21T12:00:00Z）。一覧の新しい順ソート用インデックスあり。
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 材料・手順は行単位 PATCH/DELETE で更新する子テーブル。
-- 親 recipes.updated_at でレシピ全体の最終更新を表すため、子行に created_at/updated_at は持たない（仕様どおり）。
CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL
);

CREATE TABLE steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  UNIQUE (recipe_id, step_number)
);

CREATE INDEX idx_recipes_category_id ON recipes(category_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
