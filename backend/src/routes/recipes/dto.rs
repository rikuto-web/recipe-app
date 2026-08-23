//! レシピ API のリクエスト / レスポンス DTO と JSON マッピング。

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::queries::ingredients;
use crate::queries::recipes;
use crate::queries::steps;
use crate::routes::dto::CategoryJson;

#[derive(Debug, Deserialize)]
pub struct RecipeListQuery {
    pub q: Option<String>,
    pub category_id: Option<String>,
    pub difficulty: Option<String>,
    pub max_cook_time: Option<String>,
    pub sort: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRecipeRequest {
    pub title: String,
    pub description: Option<String>,
    pub category_id: i64,
    pub servings: i32,
    pub cook_time_minutes: i32,
    pub difficulty: i32,
    pub ingredients: Vec<CreateIngredientRequest>,
    pub steps: Vec<CreateStepRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateIngredientRequest {
    pub sort_order: i32,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateStepRequest {
    pub step_number: i32,
    pub body: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRecipeRequest {
    pub title: String,
    pub description: Option<String>,
    pub category_id: i64,
    pub servings: i32,
    pub cook_time_minutes: i32,
    pub difficulty: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateIngredientRowRequest {
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PatchIngredientRequest {
    pub name: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStepRowRequest {
    pub body: String,
    pub step_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct PatchStepRequest {
    pub body: Option<String>,
    pub step_number: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RecipeIngredientPath {
    pub id: String,
    pub ingredient_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RecipeStepPath {
    pub id: String,
    pub step_id: String,
}

#[derive(Serialize)]
pub struct RecipesResponse {
    pub recipes: Vec<RecipeSummaryJson>,
    pub total: i64,
}

#[derive(Serialize)]
pub struct RecipeSummaryJson {
    pub id: i64,
    pub title: String,
    pub category: CategoryJson,
    pub servings: i32,
    pub cook_time_minutes: i32,
    pub difficulty: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct RecipeDetailJson {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub category: CategoryJson,
    pub servings: i32,
    pub cook_time_minutes: i32,
    pub difficulty: i32,
    pub ingredients: Vec<IngredientJson>,
    pub steps: Vec<StepJson>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct IngredientJson {
    pub id: i64,
    pub sort_order: i32,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
}

#[derive(Serialize)]
pub struct StepJson {
    pub id: i64,
    pub step_number: i32,
    pub body: String,
}

#[derive(Serialize)]
pub struct DeletedResponse {
    pub message: &'static str,
}

pub fn ingredient_json(item: ingredients::Ingredient) -> IngredientJson {
    IngredientJson {
        id: item.id,
        sort_order: item.sort_order,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
    }
}

pub fn step_json(item: steps::Step) -> StepJson {
    StepJson {
        id: item.id,
        step_number: item.step_number,
        body: item.body,
    }
}

pub async fn build_recipe_detail(pool: &SqlitePool, id: i64) -> Result<RecipeDetailJson, AppError> {
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
