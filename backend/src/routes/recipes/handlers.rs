//! レシピ REST ハンドラ（docs/06-api.md §5–10）。

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::Utc;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::queries::ingredients;
use crate::queries::recipes;
use crate::queries::steps;
use crate::routes::dto::CategoryJson;

use super::dto::{
    CreateIngredientRowRequest, CreateRecipeRequest, CreateStepRowRequest, DeletedResponse,
    IngredientJson, PatchIngredientRequest, PatchStepRequest, RecipeDetailJson,
    RecipeIngredientPath, RecipeListQuery, RecipeStepPath, RecipeSummaryJson, RecipesResponse,
    StepJson, UpdateRecipeRequest, build_recipe_detail, ingredient_json, step_json,
};
use super::validate::{
    parse_filter, parse_path_integer, validate_create_request, validate_ingredient_row,
    validate_step_body, validate_update_request,
};

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
        steps::insert(&mut *tx, recipe_id, step.step_number, step.body.trim()).await?;
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

async fn update_recipe(
    State(pool): State<SqlitePool>,
    Path(raw_id): Path<String>,
    Json(body): Json<UpdateRecipeRequest>,
) -> Result<Json<RecipeDetailJson>, AppError> {
    let id = parse_path_integer("id", raw_id)?;
    require_recipe(&pool, id).await?;
    validate_update_request(&pool, &body).await?;

    let description = body.description.unwrap_or_default();
    let now = utc_now_iso8601();

    let mut tx = pool.begin().await?;
    recipes::update(
        &mut *tx,
        id,
        body.category_id,
        body.title.trim(),
        description.trim(),
        body.servings,
        body.cook_time_minutes,
        body.difficulty,
        &now,
    )
    .await?;
    tx.commit().await?;

    Ok(Json(build_recipe_detail(&pool, id).await?))
}

async fn create_ingredient(
    State(pool): State<SqlitePool>,
    Path(raw_id): Path<String>,
    Json(body): Json<CreateIngredientRowRequest>,
) -> Result<Response, AppError> {
    let recipe_id = parse_path_integer("id", raw_id)?;
    require_recipe(&pool, recipe_id).await?;
    validate_ingredient_row(&body.name, body.quantity, &body.unit, "")?;
    if let Some(sort_order) = body.sort_order {
        if sort_order < 1 {
            return Err(AppError::validation(
                "sort_order",
                "並び順は 1 以上の整数です",
            ));
        }
    }

    let sort_order = match body.sort_order {
        Some(value) => value,
        None => ingredients::max_sort_order(&pool, recipe_id).await? + 1,
    };
    let now = utc_now_iso8601();

    let mut tx = pool.begin().await?;
    let result = ingredients::insert(
        &mut *tx,
        recipe_id,
        sort_order,
        body.name.trim(),
        body.quantity,
        body.unit.trim(),
    )
    .await?;
    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    let ingredient_id = result.last_insert_rowid();
    let ingredient = ingredients::get_by_id(&pool, recipe_id, ingredient_id)
        .await?
        .ok_or_else(AppError::internal_server_error)?;

    let location = format!("/api/recipes/{recipe_id}/ingredients/{ingredient_id}");
    let mut headers = HeaderMap::new();
    headers.insert(
        "Location",
        HeaderValue::from_str(&location).map_err(|_| AppError::internal_server_error())?,
    );

    Ok((
        StatusCode::CREATED,
        headers,
        Json(ingredient_json(ingredient)),
    )
        .into_response())
}

async fn update_ingredient(
    State(pool): State<SqlitePool>,
    Path(path): Path<RecipeIngredientPath>,
    Json(body): Json<PatchIngredientRequest>,
) -> Result<Json<IngredientJson>, AppError> {
    let recipe_id = parse_path_integer("id", path.id)?;
    let ingredient_id = parse_path_integer("ingredient_id", path.ingredient_id)?;
    require_recipe(&pool, recipe_id).await?;

    let current = ingredients::get_by_id(&pool, recipe_id, ingredient_id)
        .await?
        .ok_or_else(|| AppError::not_found("材料が見つかりません"))?;

    let name = body
        .name
        .as_deref()
        .map(str::trim)
        .unwrap_or(current.name.as_str());
    let quantity = body.quantity.unwrap_or(current.quantity);
    let unit = body
        .unit
        .as_deref()
        .map(str::trim)
        .unwrap_or(current.unit.as_str());
    let sort_order = body.sort_order.unwrap_or(current.sort_order);

    validate_ingredient_row(name, quantity, unit, "")?;
    if sort_order < 1 {
        return Err(AppError::validation(
            "sort_order",
            "並び順は 1 以上の整数です",
        ));
    }

    let now = utc_now_iso8601();
    let mut tx = pool.begin().await?;
    ingredients::update(
        &mut *tx,
        recipe_id,
        ingredient_id,
        sort_order,
        name,
        quantity,
        unit,
    )
    .await?;
    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    let updated = ingredients::get_by_id(&pool, recipe_id, ingredient_id)
        .await?
        .ok_or_else(AppError::internal_server_error)?;
    Ok(Json(ingredient_json(updated)))
}

async fn delete_ingredient(
    State(pool): State<SqlitePool>,
    Path(path): Path<RecipeIngredientPath>,
) -> Result<(StatusCode, Json<DeletedResponse>), AppError> {
    let recipe_id = parse_path_integer("id", path.id)?;
    let ingredient_id = parse_path_integer("ingredient_id", path.ingredient_id)?;
    require_recipe(&pool, recipe_id).await?;

    let _current = ingredients::get_by_id(&pool, recipe_id, ingredient_id)
        .await?
        .ok_or_else(|| AppError::not_found("材料が見つかりません"))?;

    let count = ingredients::count_by_recipe(&pool, recipe_id).await?;
    if count <= 1 {
        return Err(AppError::validation(
            "ingredients",
            "材料は 1 件以上必要です",
        ));
    }

    let now = utc_now_iso8601();
    let mut tx = pool.begin().await?;
    ingredients::delete(&mut *tx, recipe_id, ingredient_id).await?;
    ingredients::compact_sort_orders(&mut tx, recipe_id).await?;
    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    Ok((StatusCode::OK, Json(DeletedResponse { message: "deleted" })))
}

async fn create_step(
    State(pool): State<SqlitePool>,
    Path(raw_id): Path<String>,
    Json(body): Json<CreateStepRowRequest>,
) -> Result<Response, AppError> {
    let recipe_id = parse_path_integer("id", raw_id)?;
    require_recipe(&pool, recipe_id).await?;
    validate_step_body(&body.body, "body")?;
    if let Some(step_number) = body.step_number {
        if step_number < 1 {
            return Err(AppError::validation(
                "step_number",
                "手順番号は 1 以上の整数です",
            ));
        }
    }

    let now = utc_now_iso8601();
    let mut tx = pool.begin().await?;
    let max = steps::max_step_number(&mut *tx, recipe_id).await?;
    let desired = body.step_number.unwrap_or(max + 1);
    let insert_number = if desired <= max { max + 1000 } else { desired };

    let result = steps::insert(&mut *tx, recipe_id, insert_number, body.body.trim()).await?;
    let step_id = result.last_insert_rowid();

    if desired <= max {
        let mut remaining = steps::list_by_recipe_exec(&mut *tx, recipe_id).await?;
        remaining.retain(|step| step.id != step_id);
        let insert_at = usize::try_from(desired - 1).unwrap_or(remaining.len());
        let insert_at = insert_at.min(remaining.len());
        remaining.insert(
            insert_at,
            steps::Step {
                id: step_id,
                step_number: desired,
                body: body.body.trim().to_string(),
            },
        );
        steps::renumber_listed(&mut tx, recipe_id, &remaining).await?;
    }

    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    let step = steps::get_by_id(&pool, recipe_id, step_id)
        .await?
        .ok_or_else(AppError::internal_server_error)?;

    let location = format!("/api/recipes/{recipe_id}/steps/{step_id}");
    let mut headers = HeaderMap::new();
    headers.insert(
        "Location",
        HeaderValue::from_str(&location).map_err(|_| AppError::internal_server_error())?,
    );

    Ok((StatusCode::CREATED, headers, Json(step_json(step))).into_response())
}

async fn update_step(
    State(pool): State<SqlitePool>,
    Path(path): Path<RecipeStepPath>,
    Json(body): Json<PatchStepRequest>,
) -> Result<Json<StepJson>, AppError> {
    let recipe_id = parse_path_integer("id", path.id)?;
    let step_id = parse_path_integer("step_id", path.step_id)?;
    require_recipe(&pool, recipe_id).await?;

    let current = steps::get_by_id(&pool, recipe_id, step_id)
        .await?
        .ok_or_else(|| AppError::not_found("手順が見つかりません"))?;

    let body_text = body
        .body
        .as_deref()
        .map(str::trim)
        .unwrap_or(current.body.as_str());
    validate_step_body(body_text, "body")?;

    if let Some(step_number) = body.step_number {
        if step_number < 1 {
            return Err(AppError::validation(
                "step_number",
                "手順番号は 1 以上の整数です",
            ));
        }
    }

    let now = utc_now_iso8601();
    let mut tx = pool.begin().await?;

    if let Some(desired) = body.step_number {
        if desired != current.step_number {
            let mut remaining = steps::list_by_recipe_exec(&mut *tx, recipe_id).await?;
            remaining.retain(|step| step.id != step_id);
            let insert_at = usize::try_from(desired - 1).unwrap_or(remaining.len());
            let insert_at = insert_at.min(remaining.len());
            remaining.insert(
                insert_at,
                steps::Step {
                    id: step_id,
                    step_number: desired,
                    body: body_text.to_string(),
                },
            );
            steps::renumber_listed(&mut tx, recipe_id, &remaining).await?;
        } else {
            steps::update(&mut *tx, recipe_id, step_id, current.step_number, body_text).await?;
        }
    } else {
        steps::update(&mut *tx, recipe_id, step_id, current.step_number, body_text).await?;
    }

    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    let updated = steps::get_by_id(&pool, recipe_id, step_id)
        .await?
        .ok_or_else(AppError::internal_server_error)?;
    Ok(Json(step_json(updated)))
}

async fn delete_step(
    State(pool): State<SqlitePool>,
    Path(path): Path<RecipeStepPath>,
) -> Result<(StatusCode, Json<DeletedResponse>), AppError> {
    let recipe_id = parse_path_integer("id", path.id)?;
    let step_id = parse_path_integer("step_id", path.step_id)?;
    require_recipe(&pool, recipe_id).await?;

    let _current = steps::get_by_id(&pool, recipe_id, step_id)
        .await?
        .ok_or_else(|| AppError::not_found("手順が見つかりません"))?;

    let count = steps::count_by_recipe(&pool, recipe_id).await?;
    if count <= 1 {
        return Err(AppError::validation("steps", "手順は 1 件以上必要です"));
    }

    let now = utc_now_iso8601();
    let mut tx = pool.begin().await?;
    steps::delete(&mut *tx, recipe_id, step_id).await?;
    steps::compact_step_numbers(&mut tx, recipe_id).await?;
    recipes::touch_updated_at(&mut *tx, recipe_id, &now).await?;
    tx.commit().await?;

    Ok((StatusCode::OK, Json(DeletedResponse { message: "deleted" })))
}

async fn delete_recipe(
    State(pool): State<SqlitePool>,
    Path(raw_id): Path<String>,
) -> Result<(StatusCode, Json<DeletedResponse>), AppError> {
    let recipe_id = parse_path_integer("id", raw_id)?;
    require_recipe(&pool, recipe_id).await?;

    recipes::delete(&pool, recipe_id).await?;

    Ok((StatusCode::OK, Json(DeletedResponse { message: "deleted" })))
}

async fn require_recipe(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    if recipes::get_by_id(pool, id).await?.is_none() {
        return Err(AppError::not_found("レシピが見つかりません"));
    }
    Ok(())
}

fn utc_now_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/api/recipes", get(list_recipes).post(create_recipe))
        .route(
            "/api/recipes/{id}",
            get(get_recipe).put(update_recipe).delete(delete_recipe),
        )
        .route(
            "/api/recipes/{id}/ingredients",
            axum::routing::post(create_ingredient),
        )
        .route(
            "/api/recipes/{id}/ingredients/{ingredient_id}",
            axum::routing::patch(update_ingredient).delete(delete_ingredient),
        )
        .route("/api/recipes/{id}/steps", axum::routing::post(create_step))
        .route(
            "/api/recipes/{id}/steps/{step_id}",
            axum::routing::patch(update_step).delete(delete_step),
        )
}
