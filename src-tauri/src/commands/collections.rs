use rusqlite::params;
use tauri::State;
use crate::db::Database;
use crate::types::{Collection, CollectionTreeNode, KeyValue, SavedRequest};

#[tauri::command]
pub fn get_collections(db: State<'_, Database>, workspace_id: String) -> Result<Vec<CollectionTreeNode>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Fetch all collections for this workspace
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, parent_id, name, sort_order, created_at, updated_at
             FROM collections WHERE workspace_id = ?1 ORDER BY sort_order, name"
        )
        .map_err(|e| e.to_string())?;

    let collections: Vec<Collection> = stmt
        .query_map(params![workspace_id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Fetch all saved requests for this workspace
    let mut req_stmt = conn
        .prepare(
            "SELECT sr.id, sr.collection_id, sr.name, sr.protocol, sr.transport,
                    sr.target, sr.method, sr.body, sr.headers, sr.sort_order,
                    sr.created_at, sr.updated_at
             FROM saved_requests sr
             JOIN collections c ON sr.collection_id = c.id
             WHERE c.workspace_id = ?1
             ORDER BY sr.sort_order, sr.name"
        )
        .map_err(|e| e.to_string())?;

    let requests: Vec<SavedRequest> = req_stmt
        .query_map(params![workspace_id], |row| {
            let headers_json: String = row.get(8)?;
            let headers: Vec<KeyValue> = serde_json::from_str(&headers_json).unwrap_or_default();
            Ok(SavedRequest {
                id: row.get(0)?,
                collection_id: row.get(1)?,
                name: row.get(2)?,
                protocol: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(3)?)).unwrap_or(crate::types::Protocol::JsonRpc),
                transport: serde_json::from_str(&format!("\"{}\"", row.get::<_, String>(4)?)).unwrap_or(crate::types::Transport::Tcp),
                target: row.get(5)?,
                method: row.get(6)?,
                body: row.get(7)?,
                headers,
                sort_order: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Build tree
    Ok(build_tree(&collections, &requests, None))
}

fn build_tree(collections: &[Collection], requests: &[SavedRequest], parent_id: Option<&str>) -> Vec<CollectionTreeNode> {
    collections
        .iter()
        .filter(|c| c.parent_id.as_deref() == parent_id)
        .map(|c| {
            let children = build_tree(collections, requests, Some(&c.id));
            let reqs: Vec<SavedRequest> = requests
                .iter()
                .filter(|r| r.collection_id == c.id)
                .cloned()
                .collect();
            CollectionTreeNode {
                id: c.id.clone(),
                name: c.name.clone(),
                parent_id: c.parent_id.clone(),
                sort_order: c.sort_order,
                children,
                requests: reqs,
            }
        })
        .collect()
}

#[tauri::command]
pub fn create_collection(
    db: State<'_, Database>,
    workspace_id: String,
    name: String,
    parent_id: Option<String>,
) -> Result<Collection, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get next sort order
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM collections WHERE workspace_id = ?1 AND parent_id IS ?2",
            params![workspace_id, parent_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO collections (id, workspace_id, parent_id, name, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, workspace_id, parent_id, name, max_order + 1, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Collection {
        id,
        workspace_id,
        parent_id,
        name,
        sort_order: max_order + 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn rename_collection(
    db: State<'_, Database>,
    id: String,
    name: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE collections SET name = ?1, updated_at = ?2 WHERE id = ?3",
        params![name, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_collection(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_request(
    db: State<'_, Database>,
    collection_id: String,
    name: String,
) -> Result<SavedRequest, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM saved_requests WHERE collection_id = ?1",
            params![collection_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO saved_requests (id, collection_id, name, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, collection_id, name, max_order + 1, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(SavedRequest {
        id,
        collection_id,
        name,
        protocol: crate::types::Protocol::JsonRpc,
        transport: crate::types::Transport::Tcp,
        target: String::new(),
        method: String::new(),
        body: String::new(),
        headers: vec![],
        sort_order: max_order + 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_request(
    db: State<'_, Database>,
    request: SavedRequest,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let headers_json = serde_json::to_string(&request.headers).map_err(|e| e.to_string())?;
    let protocol_str = serde_json::to_string(&request.protocol).map_err(|e| e.to_string())?;
    let transport_str = serde_json::to_string(&request.transport).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE saved_requests SET name = ?1, protocol = ?2, transport = ?3, target = ?4,
         method = ?5, body = ?6, headers = ?7, updated_at = ?8 WHERE id = ?9",
        params![
            request.name,
            protocol_str.trim_matches('"'),
            transport_str.trim_matches('"'),
            request.target,
            request.method,
            request.body,
            headers_json,
            now,
            request.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_request(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM saved_requests WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
