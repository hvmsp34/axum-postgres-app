use axum::{
    Router,
    extract::{Json, Path, State},
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::net::SocketAddr;
use std::path::Path as FilePath;
use std::process::Command;
use tower_http::cors::CorsLayer;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct User {
    id: i32,
    name: String,
    email: String,
}

#[derive(Debug, Deserialize)]
struct CreateUser {
    name: String,
    email: String,
}

#[derive(Clone)]
struct AppState {
    pool: PgPool,
}

#[tokio::main]
async fn main() {
    // Загружает переменные из .env файла в окружение процесса
    dotenvy::dotenv()
        .expect("Не удалось загрузить .env файл");

    let db_user = std::env::var("DB_USER").expect("DB_USER missing");
    let db_pass = std::env::var("DB_PASSWORD").expect("DB_PASSWORD missing");
    let db_host = std::env::var("DB_HOST").expect("DB_HOST missing");
    let db_port = std::env::var("DB_PORT").expect("DB_PORT missing");
    let db_name = std::env::var("DB_NAME").expect("DB_NAME missing");

    let database_url = format!("postgres://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}");

    // Подключение к PostgreSQL с использованием полученной строки
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Не удалось подключиться к базе данных");

    // Создание таблицы, если её нет
    create_users_table(&pool).await;

    let state = AppState { pool };

    // Роутер
    let app = Router::new()
        .route("/users", post(create_user).get(list_users))
        .route("/users/:id", get(get_user).delete(delete_user))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running on http://{}", addr);

    println!("GitHub: https://github.com/hvmsp34/axum-postgres-app");

    open_in_browser("./frontend/index.html");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// Создание таблицы вручную
async fn create_users_table(pool: &PgPool) {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create users table");

    println!("✓ Users table ready");
}

// Создать пользователя
async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> impl IntoResponse {
    let result = sqlx::query_as::<_, User>(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(user) => Json(user).into_response(),
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// Получить всех пользователей
async fn list_users(State(state): State<AppState>) -> impl IntoResponse {
    let users = sqlx::query_as::<_, User>("SELECT id, name, email FROM users")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(users)
}

// Получить пользователя по ID
async fn get_user(State(state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let user = sqlx::query_as::<_, User>("SELECT id, name, email FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await;

    match user {
        Ok(Some(user)) => Json(user).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Удалить пользователя
async fn delete_user(State(state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => axum::http::StatusCode::NO_CONTENT.into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

fn open_in_browser(file_path: &str) {
    let path = FilePath::new(file_path);

    // Проверяем, существует ли файл
    if !path.exists() {
        println!("Файл не найден: {}", file_path);
        return;
    }

    // Получаем абсолютный путь
    let absolute_path = std::fs::canonicalize(path).unwrap();
    let url = format!("file://{}", absolute_path.display());

    // Открываем в браузере в зависимости от ОС
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .expect("Не удалось открыть браузер");
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", &url])
            .spawn()
            .expect("Не удалось открыть браузер");
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .expect("Не удалось открыть браузер");
    }

    println!("Файл открыт в браузере: {}", url);
}
