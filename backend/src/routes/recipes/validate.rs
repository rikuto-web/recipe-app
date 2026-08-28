//! レシピ API の入力バリデーション。

use sqlx::SqlitePool;

use crate::error::{AppError, FieldError};
use crate::queries::categories;
use crate::queries::recipes::{RecipeListFilter, RecipeSort};

use super::dto::{
    CreateRecipeRequest, RecipeListQuery, UpdateRecipeRequest,
};

const MAX_COOK_TIME_FILTER_STEP_MINUTES: i32 = 10;

pub async fn validate_update_request(
    pool: &SqlitePool,
    body: &UpdateRecipeRequest,
) -> Result<(), AppError> {
    let mut errors = Vec::new();
    collect_parent_errors(
        pool,
        body.title.trim(),
        body.description.as_deref().unwrap_or(""),
        body.category_id,
        body.servings,
        body.cook_time_minutes,
        body.difficulty,
        &mut errors,
    )
    .await?;

    if errors.is_empty() {
        Ok(())
    } else {
        Err(AppError::validations(errors))
    }
}

pub fn validate_ingredient_row(
    name: &str,
    quantity: f64,
    unit: &str,
    prefix: &str,
) -> Result<(), AppError> {
    let mut errors = Vec::new();
    collect_ingredient_errors(name, quantity, unit, prefix, &mut errors);
    if errors.is_empty() {
        Ok(())
    } else {
        Err(AppError::validations(errors))
    }
}

pub fn validate_step_body(body: &str, field: &str) -> Result<(), AppError> {
    let body_text = body.trim();
    if body_text.is_empty() {
        return Err(AppError::validation(field, "手順本文は必須です"));
    }
    if body_text.chars().count() > 2000 {
        return Err(AppError::validation(field, "手順本文は2000文字以内です"));
    }
    Ok(())
}

pub async fn validate_create_request(
    pool: &SqlitePool,
    body: &CreateRecipeRequest,
) -> Result<(), AppError> {
    let mut errors = Vec::new();
    collect_parent_errors(
        pool,
        body.title.trim(),
        body.description.as_deref().unwrap_or(""),
        body.category_id,
        body.servings,
        body.cook_time_minutes,
        body.difficulty,
        &mut errors,
    )
    .await?;

    if body.ingredients.is_empty() {
        errors.push(field_error("ingredients", "材料は 1 件以上必要です"));
    } else {
        for (index, ingredient) in body.ingredients.iter().enumerate() {
            collect_ingredient_errors(
                &ingredient.name,
                ingredient.quantity,
                &ingredient.unit,
                &format!("ingredients[{index}]"),
                &mut errors,
            );
        }
    }

    if body.steps.is_empty() {
        errors.push(field_error("steps", "手順は 1 件以上必要です"));
    } else {
        let mut seen_numbers = std::collections::HashSet::new();
        for (index, step) in body.steps.iter().enumerate() {
            let prefix = format!("steps[{index}]");
            let body_text = step.body.trim();
            if body_text.is_empty() {
                errors.push(field_error(&format!("{prefix}.body"), "手順本文は必須です"));
            } else if body_text.chars().count() > 2000 {
                errors.push(field_error(
                    &format!("{prefix}.body"),
                    "手順本文は2000文字以内です",
                ));
            }

            if step.step_number < 1 {
                errors.push(field_error(
                    &format!("{prefix}.step_number"),
                    "手順番号は 1 以上の整数です",
                ));
            } else if !seen_numbers.insert(step.step_number) {
                errors.push(field_error("steps", "手順番号が重複しています"));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(AppError::validations(errors))
    }
}

pub fn parse_filter(query: RecipeListQuery) -> Result<RecipeListFilter, AppError> {
    let q = query
        .q
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let category_id = parse_optional_integer("category_id", query.category_id)?;
    if let Some(category_id) = category_id {
        if category_id < 1 {
            return Err(AppError::validation(
                "category_id",
                "カテゴリ ID は 1 以上の整数です",
            ));
        }
    }

    let difficulty = parse_optional_integer("difficulty", query.difficulty)?;
    if let Some(difficulty) = difficulty {
        if !(1..=5).contains(&difficulty) {
            return Err(AppError::validation(
                "difficulty",
                "難易度は 1 から 5 の整数です",
            ));
        }
    }

    let max_cook_time_raw = parse_optional_integer("max_cook_time", query.max_cook_time)?;
    let max_cook_time = if let Some(raw) = max_cook_time_raw {
        if raw < 0 {
            return Err(AppError::validation(
                "max_cook_time",
                "調理時間上限は 0 以上の整数です",
            ));
        }
        Some(normalize_max_cook_time_filter(raw))
    } else {
        None
    };

    let sort = match query.sort.as_deref() {
        None | Some("") | Some("newest") => RecipeSort::Newest,
        Some("cook_time_asc") => RecipeSort::CookTimeAsc,
        Some(_) => {
            return Err(AppError::validation(
                "sort",
                "sort は newest または cook_time_asc です",
            ));
        }
    };

    Ok(RecipeListFilter {
        q,
        category_id,
        difficulty,
        max_cook_time,
        sort,
    })
}

pub fn parse_path_integer<T>(field: &str, raw: String) -> Result<T, AppError>
where
    T: std::str::FromStr,
{
    parse_optional_integer(field, Some(raw))?
        .ok_or_else(|| AppError::validation(field, &format!("{field} は整数です")))
}

fn field_name(prefix: &str, field: &str) -> String {
    if prefix.is_empty() {
        field.to_string()
    } else {
        format!("{prefix}.{field}")
    }
}

fn collect_ingredient_errors(
    name: &str,
    quantity: f64,
    unit: &str,
    prefix: &str,
    errors: &mut Vec<FieldError>,
) {
    let name = name.trim();
    if name.is_empty() {
        errors.push(field_error(&field_name(prefix, "name"), "材料名は必須です"));
    } else if name.chars().count() > 100 {
        errors.push(field_error(
            &field_name(prefix, "name"),
            "材料名は100文字以内です",
        ));
    }

    if !quantity.is_finite() || quantity <= 0.0 {
        errors.push(field_error(
            &field_name(prefix, "quantity"),
            "分量は 0 より大きい数値です",
        ));
    }

    let unit = unit.trim();
    if unit.is_empty() {
        errors.push(field_error(&field_name(prefix, "unit"), "単位は必須です"));
    } else if unit.chars().count() > 20 {
        errors.push(field_error(
            &field_name(prefix, "unit"),
            "単位は20文字以内です",
        ));
    }
}

async fn collect_parent_errors(
    pool: &SqlitePool,
    title: &str,
    description: &str,
    category_id: i64,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    errors: &mut Vec<FieldError>,
) -> Result<(), AppError> {
    if title.is_empty() {
        errors.push(field_error("title", "タイトルは必須です"));
    } else if title.chars().count() > 100 {
        errors.push(field_error("title", "タイトルは100文字以内です"));
    }

    if description.trim().chars().count() > 2000 {
        errors.push(field_error("description", "説明は2000文字以内です"));
    }

    if category_id < 1 {
        errors.push(field_error(
            "category_id",
            "カテゴリ ID は 1 以上の整数です",
        ));
    } else if categories::get_by_id(pool, category_id).await?.is_none() {
        errors.push(field_error("category_id", "カテゴリが存在しません"));
    }

    if servings < 1 {
        errors.push(field_error("servings", "人数は 1 以上の整数です"));
    }

    if cook_time_minutes < 10 || cook_time_minutes % 10 != 0 {
        errors.push(field_error(
            "cook_time_minutes",
            "調理時間は 10 分以上（10分単位）です",
        ));
    }

    if !(1..=5).contains(&difficulty) {
        errors.push(field_error("difficulty", "難易度は 1 から 5 の整数です"));
    }

    Ok(())
}

fn field_error(field: &str, message: &str) -> FieldError {
    FieldError {
        field: field.to_string(),
        message: message.to_string(),
    }
}

fn normalize_max_cook_time_filter(minutes: i32) -> i32 {
    let snapped = ((minutes + MAX_COOK_TIME_FILTER_STEP_MINUTES / 2)
        / MAX_COOK_TIME_FILTER_STEP_MINUTES)
        * MAX_COOK_TIME_FILTER_STEP_MINUTES;
    snapped.max(MAX_COOK_TIME_FILTER_STEP_MINUTES)
}

fn parse_optional_integer<T>(field: &str, raw: Option<String>) -> Result<Option<T>, AppError>
where
    T: std::str::FromStr,
{
    let Some(value) = raw
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    else {
        return Ok(None);
    };

    value
        .parse::<T>()
        .map(Some)
        .map_err(|_| AppError::validation(field, &format!("{field} は整数です")))
}
