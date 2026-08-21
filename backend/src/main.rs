//! バイナリエントリポイント。`cargo run` で API サーバーを起動する。

use recipe_backend::{config::Config, run};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config =
        Config::from_env().map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;
    run(config).await
}
