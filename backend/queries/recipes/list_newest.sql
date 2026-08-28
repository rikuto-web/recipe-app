-- レシピ一覧（新しい順）。フィルタはすべて任意。
SELECT
  r.id,
  r.title,
  r.servings,
  r.cook_time_minutes,
  r.difficulty,
  r.created_at,
  r.updated_at,
  c.id AS category_id,
  c.name AS category_name
FROM recipes r
INNER JOIN categories c ON c.id = r.category_id
WHERE
  (?1 IS NULL OR r.title LIKE '%' || ?1 || '%')
  AND (?2 IS NULL OR r.category_id = ?2)
  AND (?3 IS NULL OR r.difficulty = ?3)
  AND (?4 IS NULL OR r.cook_time_minutes <= ?4)
ORDER BY r.created_at DESC, r.id DESC
