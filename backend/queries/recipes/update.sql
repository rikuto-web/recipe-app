-- レシピ親情報の更新（材料・手順は含めない）
UPDATE recipes
SET
  category_id = ?,
  title = ?,
  description = ?,
  servings = ?,
  cook_time_minutes = ?,
  difficulty = ?,
  updated_at = ?
WHERE id = ?
