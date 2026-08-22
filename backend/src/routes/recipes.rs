//! `GET /api/recipes` と `GET /api/recipes/{id}`（docs/06-api.md §5–6）。

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::error::AppError;
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
    let Some(recipe) = recipes::get_by_id(&pool, id).await? else {
        return Err(AppError::not_found("レシピが見つかりません"));
    };

    let ingredients = ingredients::list_by_recipe(&pool, id)
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

    let steps = steps::list_by_recipe(&pool, id)
        .await?
        .into_iter()
        .map(|item| StepJson {
            id: item.id,
            step_number: item.step_number,
            body: item.body,
        })
        .collect();

    Ok(Json(RecipeDetailJson {
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
    }))
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
        .route("/api/recipes", get(list_recipes))
        .route("/api/recipes/{id}", get(get_recipe))
}
