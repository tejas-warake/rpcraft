use rusqlite::params;
use tauri::State;
use crate::db::Database;
use crate::types::{HistoryEntry, KeyValue};

#[tauri::command]
pub fn get_history(
    db: State<'_, Database>,
    workspace_id: String,
    limit: Option<i32>,
) -> Result<Vec<HistoryEntry>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, protocol, transport, target, method,
                    request_body, request_headers, response_body, response_headers,
                    status, latency_ms, error, created_at
             FROM history WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT ?2"
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map(params![workspace_id, limit], |row| {
            let req_headers_json: String = row.get(7)?;
            let res_headers_json: Option<String> = row.get(9)?;
            Ok(HistoryEntry {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                protocol: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(2)?))
                    .unwrap_or(crate::types::Protocol::JsonRpc),
                transport: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(3)?))
                    .unwrap_or(crate::types::Transport::Tcp),
                target: row.get(4)?,
                method: row.get(5)?,
                request_body: row.get(6)?,
                request_headers: serde_json::from_str(&req_headers_json).unwrap_or_default(),
                response_body: row.get(8)?,
                response_headers: res_headers_json
                    .map(|j| serde_json::from_str(&j).unwrap_or_default()),
                status: row.get(10)?,
                latency_ms: row.get(11)?,
                error: row.get(12)?,
                created_at: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
pub fn add_history_entry(
    db: State<'_, Database>,
    entry: HistoryEntry,
) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let req_headers = serde_json::to_string(&entry.request_headers).map_err(|e| e.to_string())?;
    let res_headers = entry
        .response_headers
        .as_ref()
        .map(|h| serde_json::to_string(h).unwrap_or_default());
    let protocol_str = serde_json::to_string(&entry.protocol).map_err(|e| e.to_string())?;
    let transport_str = serde_json::to_string(&entry.transport).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO history (id, workspace_id, protocol, transport, target, method,
         request_body, request_headers, response_body, response_headers,
         status, latency_ms, error, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            entry.id,
            entry.workspace_id,
            protocol_str.trim_matches('"'),
            transport_str.trim_matches('"'),
            entry.target,
            entry.method,
            entry.request_body,
            req_headers,
            entry.response_body,
            res_headers,
            entry.status,
            entry.latency_ms,
            entry.error,
            entry.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(entry.id)
}

#[tauri::command]
pub fn clear_history(db: State<'_, Database>, workspace_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM history WHERE workspace_id = ?1",
        params![workspace_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
