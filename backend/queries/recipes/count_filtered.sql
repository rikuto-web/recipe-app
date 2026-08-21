-- フィルタ後のレシピ件数
SELECT COUNT(*)
FROM recipes r
WHERE
  (?1 IS NULL OR r.title LIKE '%' || ?1 || '%')
  AND (?2 IS NULL OR r.category_id = ?2)
  AND (?3 IS NULL OR r.difficulty = ?3)
  AND (?4 IS NULL OR r.cook_time_minutes <= ?4)
