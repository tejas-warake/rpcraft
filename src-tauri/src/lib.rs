use tauri::Manager;
mod commands;
mod db;
pub mod process;
pub mod types;

use db::Database;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Determine database path in app data directory
            let app_data = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            let db_path = app_data.join("rpcraft.db");
            log::info!("Database path: {:?}", db_path);

            let database = Database::open(&db_path)
                .expect("failed to open database");

            app.manage(database);
            
            let app_handle = app.handle().clone();
            app.manage(process::manager::ProcessManager::new(app_handle));
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Workspace commands
            commands::workspace::get_workspaces,
            commands::workspace::get_active_workspace,
            // Collection commands
            commands::collections::get_collections,
            commands::collections::create_collection,
            commands::collections::rename_collection,
            commands::collections::delete_collection,
            commands::collections::create_request,
            commands::collections::update_request,
            commands::collections::delete_request,
            // Environment commands
            commands::environment::get_environments,
            commands::environment::create_environment,
            commands::environment::update_environment,
            commands::environment::delete_environment,
            // History commands
            commands::history::get_history,
            commands::history::add_history_entry,
            commands::history::clear_history,
            // Process commands
            commands::process::start_process,
            commands::process::send_process_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RPCraft");
}
