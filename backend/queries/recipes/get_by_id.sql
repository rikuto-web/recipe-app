-- レシピ詳細 1 件（カテゴリ名込み）
SELECT
  r.id,
  r.title,
  r.description,
  r.servings,
  r.cook_time_minutes,
  r.difficulty,
  r.created_at,
  r.updated_at,
  c.id AS category_id,
  c.name AS category_name
FROM recipes r
INNER JOIN categories c ON c.id = r.category_id
WHERE r.id = ?
