UPDATE ingredients
SET sort_order = ?, name = ?, quantity = ?, unit = ?
WHERE id = ? AND recipe_id = ?
