-- レシピの手順一覧（手順番号順）
SELECT id, step_number, body
FROM steps
WHERE recipe_id = ?
ORDER BY step_number ASC
