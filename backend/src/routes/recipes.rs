//! `GET /api/recipes` / `GET /api/recipes/{id}` / `POST /api/recipes`（docs/06-api.md §5–7）。

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::error::{AppError, FieldError};
use crate::queries::categories;
use crate::queries::ingredients;
use crate::queries::recipes::{self, RecipeListFilter, RecipeSort};
use crate::queries::steps;

#[derive(Debug, Deserialize)]
struct RecipeListQuery {
    q: Option<String>,
    category_id: Option<String>,
    difficulty: Option<String>,
    max_cook_time: Option<String>,
    sort: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateRecipeRequest {
    title: String,
    description: Option<String>,
    category_id: i64,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    ingredients: Vec<CreateIngredientRequest>,
    steps: Vec<CreateStepRequest>,
}

#[derive(Debug, Deserialize)]
struct CreateIngredientRequest {
    sort_order: i32,
    name: String,
    quantity: f64,
    unit: String,
}

#[derive(Debug, Deserialize)]
struct CreateStepRequest {
    step_number: i32,
    body: String,
}

#[derive(Serialize)]
struct RecipesResponse {
    recipes: Vec<RecipeSummaryJson>,
    total: i64,
}

#[derive(Serialize)]
struct RecipeSummaryJson {
    id: i64,
    title: String,
    category: CategoryJson,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
struct CategoryJson {
    id: i64,
    name: String,
}

#[derive(Serialize)]
struct RecipeDetailJson {
    id: i64,
    title: String,
    description: String,
    category: CategoryJson,
    servings: i32,
    cook_time_minutes: i32,
    difficulty: i32,
    ingredients: Vec<IngredientJson>,
    steps: Vec<StepJson>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
struct IngredientJson {
    id: i64,
    sort_order: i32,
    name: String,
    quantity: f64,
    unit: String,
}

#[derive(Serialize)]
struct StepJson {
    id: i64,
    step_number: i32,
    body: String,
}

async fn list_recipes(
    State(pool): State<SqlitePool>,
    Query(query): Query<RecipeListQuery>,
) -> Result<Json<RecipesResponse>, AppError> {
    let filter = parse_filter(query)?;
    let total = recipes::count_filtered(&pool, &filter).await?;
    let items = recipes::list(&pool, &filter).await?;

    let recipes = items
        .into_iter()
        .map(|item| RecipeSummaryJson {
            id: item.id,
            title: item.title,
            category: CategoryJson {
                id: item.category_id,
                name: item.category_name,
            },
            servings: item.servings,
            cook_time_minutes: item.cook_time_minutes,
            difficulty: item.difficulty,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
        .collect();

    Ok(Json(RecipesResponse { recipes, total }))
}

async fn get_recipe(
    State(pool): State<SqlitePool>,
    Path(raw_id): Path<String>,
) -> Result<Json<RecipeDetailJson>, AppError> {
    let id = parse_path_integer("id", raw_id)?;
    Ok(Json(build_recipe_detail(&pool, id).await?))
}

async fn create_recipe(
    State(pool): State<SqlitePool>,
    Json(body): Json<CreateRecipeRequest>,
) -> Result<Response, AppError> {
    validate_create_request(&pool, &body).await?;

    let description = body.description.unwrap_or_default();
    let now = utc_now_iso8601();

    let mut tx = pool.begin().await?;

    let result = recipes::insert(
        &mut *tx,
        body.category_id,
        body.title.trim(),
        description.trim(),
        body.servings,
        body.cook_time_minutes,
        body.difficulty,
        &now,
        &now,
    )
    .await?;

    let recipe_id = result.last_insert_rowid();

    for ingredient in &body.ingredients {
        ingredients::insert(
            &mut *tx,
            recipe_id,
            ingredient.sort_order,
            ingredient.name.trim(),
            ingredient.quantity,
            ingredient.unit.trim(),
        )
        .await?;
    }

    for step in &body.steps {
        steps::insert(
            &mut *tx,
            recipe_id,
            step.step_number,
            step.body.trim(),
        )
        .await?;
    }

    tx.commit().await?;

    let detail = build_recipe_detail(&pool, recipe_id).await?;
    let location = format!("/api/recipes/{recipe_id}");
    let mut headers = HeaderMap::new();
    headers.insert(
        "Location",
        HeaderValue::from_str(&location).map_err(|_| AppError::internal_server_error())?,
    );

    Ok((StatusCode::CREATED, headers, Json(detail)).into_response())
}

async fn build_recipe_detail(pool: &SqlitePool, id: i64) -> Result<RecipeDetailJson, AppError> {
    let Some(recipe) = recipes::get_by_id(pool, id).await? else {
        return Err(AppError::not_found("レシピが見つかりません"));
    };

    let ingredients = ingredients::list_by_recipe(pool, id)
        .await?
        .into_iter()
        .map(|item| IngredientJson {
            id: item.id,
            sort_order: item.sort_order,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
        })
        .collect();

    let steps = steps::list_by_recipe(pool, id)
        .await?
        .into_iter()
        .map(|item| StepJson {
            id: item.id,
            step_number: item.step_number,
            body: item.body,
        })
        .collect();

    Ok(RecipeDetailJson {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        category: CategoryJson {
            id: recipe.category_id,
            name: recipe.category_name,
        },
        servings: recipe.servings,
        cook_time_minutes: recipe.cook_time_minutes,
        difficulty: recipe.difficulty,
        ingredients,
        steps,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
    })
}

async fn validate_create_request(
    pool: &SqlitePool,
    body: &CreateRecipeRequest,
) -> Result<(), AppError> {
    let mut errors = Vec::new();

    let title = body.title.trim();
    if title.is_empty() {
        errors.push(field_error("title", "タイトルは必須です"));
    } else if title.chars().count() > 100 {
        errors.push(field_error("title", "タイトルは100文字以内です"));
    }

    let description = body.description.as_deref().unwrap_or("").trim();
    if description.chars().count() > 2000 {
        errors.push(field_error("description", "説明は2000文字以内です"));
    }

    if body.category_id < 1 {
        errors.push(field_error("category_id", "カテゴリ ID は 1 以上の整数です"));
    } else if categories::get_by_id(pool, body.category_id)
        .await?
        .is_none()
    {
        errors.push(field_error("category_id", "カテゴリが存在しません"));
    }

    if body.servings < 1 {
        errors.push(field_error("servings", "人数は 1 以上の整数です"));
    }

    if body.cook_time_minutes < 10 || body.cook_time_minutes % 10 != 0 {
        errors.push(field_error(
            "cook_time_minutes",
            "調理時間は 10 分以上（10分単位）です",
        ));
    }

    if !(1..=5).contains(&body.difficulty) {
        errors.push(field_error("difficulty", "難易度は 1 から 5 の整数です"));
    }

    if body.ingredients.is_empty() {
        errors.push(field_error("ingredients", "材料は 1 件以上必要です"));
    } else {
        for (index, ingredient) in body.ingredients.iter().enumerate() {
            let prefix = format!("ingredients[{index}]");
            let name = ingredient.name.trim();
            if name.is_empty() {
                errors.push(field_error(&format!("{prefix}.name"), "材料名は必須です"));
            } else if name.chars().count() > 100 {
                errors.push(field_error(
                    &format!("{prefix}.name"),
                    "材料名は100文字以内です",
                ));
            }

            if ingredient.quantity <= 0.0 || ingredient.quantity.is_nan() {
                errors.push(field_error(
                    &format!("{prefix}.quantity"),
                    "分量は 0 より大きい数値です",
                ));
            }

            let unit = ingredient.unit.trim();
            if unit.is_empty() {
                errors.push(field_error(&format!("{prefix}.unit"), "単位は必須です"));
            } else if unit.chars().count() > 20 {
                errors.push(field_error(
                    &format!("{prefix}.unit"),
                    "単位は20文字以内です",
                ));
            }
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

fn field_error(field: &str, message: &str) -> FieldError {
    FieldError {
        field: field.to_string(),
        message: message.to_string(),
    }
}

fn utc_now_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

fn parse_filter(query: RecipeListQuery) -> Result<RecipeListFilter, AppError> {
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

    let max_cook_time = parse_optional_integer("max_cook_time", query.max_cook_time)?;
    if let Some(max_cook_time) = max_cook_time {
        if max_cook_time < 0 {
            return Err(AppError::validation(
                "max_cook_time",
                "調理時間上限は 0 以上の整数です",
            ));
        }
    }

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

fn parse_path_integer<T>(field: &str, raw: String) -> Result<T, AppError>
where
    T: std::str::FromStr,
{
    parse_optional_integer(field, Some(raw))?
        .ok_or_else(|| AppError::validation(field, &format!("{field} は整数です")))
}

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/api/recipes", get(list_recipes).post(create_recipe))
        .route("/api/recipes/{id}", get(get_recipe))
}
