use tauri::State;
use crate::process::manager::ProcessManager;

#[tauri::command]
pub async fn start_process(
    manager: State<'_, ProcessManager>,
    command: String,
) -> Result<String, String> {
    manager.spawn(&command).await
}

#[tauri::command]
pub async fn send_process_message(
    manager: State<'_, ProcessManager>,
    process_id: String,
    message: String,
) -> Result<(), String> {
    manager.send_message(&process_id, message).await
}
