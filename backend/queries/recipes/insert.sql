-- レシピ 1 件 INSERT（VS-03 POST /api/recipes でも同 SQL をベースにする）
INSERT INTO recipes (
  category_id,
  title,
  description,
  servings,
  cook_time_minutes,
  difficulty,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
