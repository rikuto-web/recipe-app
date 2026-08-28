-- 材料 1 行（親レシピに属するものだけ）
SELECT id, sort_order, name, quantity, unit
FROM ingredients
WHERE id = ? AND recipe_id = ?
