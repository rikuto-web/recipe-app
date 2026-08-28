SELECT COALESCE(MAX(sort_order), 0) FROM ingredients WHERE recipe_id = ?
