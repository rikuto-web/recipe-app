SELECT COALESCE(MAX(step_number), 0) FROM steps WHERE recipe_id = ?
