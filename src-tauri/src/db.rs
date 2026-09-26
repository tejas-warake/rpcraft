use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

/// Database wrapper managing the SQLite connection and migrations
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open or create the database at the given path
    pub fn open(path: &PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| rusqlite::Error::InvalidPath(path.clone().into()))?;
        }

        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// Run all database migrations
    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                parent_id TEXT,
                name TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS saved_requests (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                name TEXT NOT NULL,
                protocol TEXT NOT NULL DEFAULT 'jsonRpc',
                transport TEXT NOT NULL DEFAULT 'tcp',
                target TEXT NOT NULL DEFAULT '',
                method TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                headers TEXT NOT NULL DEFAULT '[]',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS environments (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                variables TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                protocol TEXT NOT NULL,
                transport TEXT NOT NULL,
                target TEXT NOT NULL,
                method TEXT NOT NULL,
                request_body TEXT NOT NULL DEFAULT '',
                request_headers TEXT NOT NULL DEFAULT '[]',
                response_body TEXT,
                response_headers TEXT,
                status TEXT,
                latency_ms REAL,
                error TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_history_workspace ON history(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at);
            CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
            CREATE INDEX IF NOT EXISTS idx_saved_requests_collection ON saved_requests(collection_id);
            ",
        )?;

        // Insert a default workspace if none exists
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM workspaces",
            [],
            |row| row.get(0),
        )?;

        if count == 0 {
            conn.execute(
                "INSERT INTO workspaces (id, name) VALUES (?1, ?2)",
                params![uuid::Uuid::new_v4().to_string(), "Default Workspace"],
            )?;
        }

        Ok(())
    }
}
