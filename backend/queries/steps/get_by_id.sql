-- 手順 1 行（親レシピに属するものだけ）
SELECT id, step_number, body
FROM steps
WHERE id = ? AND recipe_id = ?
