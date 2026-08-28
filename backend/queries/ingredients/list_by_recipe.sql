-- レシピの材料一覧（表示順）
SELECT id, sort_order, name, quantity, unit
FROM ingredients
WHERE recipe_id = ?
ORDER BY sort_order ASC, id ASC
