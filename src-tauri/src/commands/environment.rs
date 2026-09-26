use rusqlite::params;
use tauri::State;
use crate::db::Database;
use crate::types::{Environment, EnvVariable};

#[tauri::command]
pub fn get_environments(db: State<'_, Database>, workspace_id: String) -> Result<Vec<Environment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, name, variables, created_at, updated_at
             FROM environments WHERE workspace_id = ?1 ORDER BY name"
        )
        .map_err(|e| e.to_string())?;

    let envs = stmt
        .query_map(params![workspace_id], |row| {
            let vars_json: String = row.get(3)?;
            let variables: Vec<EnvVariable> = serde_json::from_str(&vars_json).unwrap_or_default();
            Ok(Environment {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                variables,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(envs)
}

#[tauri::command]
pub fn create_environment(
    db: State<'_, Database>,
    workspace_id: String,
    name: String,
) -> Result<Environment, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO environments (id, workspace_id, name, variables, created_at, updated_at)
         VALUES (?1, ?2, ?3, '[]', ?4, ?5)",
        params![id, workspace_id, name, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Environment {
        id,
        workspace_id,
        name,
        variables: vec![],
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_environment(
    db: State<'_, Database>,
    environment: Environment,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let vars_json = serde_json::to_string(&environment.variables).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE environments SET name = ?1, variables = ?2, updated_at = ?3 WHERE id = ?4",
        params![environment.name, vars_json, now, environment.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_environment(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM environments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
