use rusqlite::params;
use tauri::State;
use crate::db::Database;
use crate::types::Workspace;

#[tauri::command]
pub fn get_workspaces(db: State<'_, Database>) -> Result<Vec<Workspace>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, created_at, updated_at FROM workspaces ORDER BY name")
        .map_err(|e| e.to_string())?;

    let workspaces = stmt
        .query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workspaces)
}

#[tauri::command]
pub fn get_active_workspace(db: State<'_, Database>) -> Result<Workspace, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, created_at, updated_at FROM workspaces ORDER BY created_at ASC LIMIT 1",
        [],
        |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
