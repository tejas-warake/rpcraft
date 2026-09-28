package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// Database wraps the SQLite connection
type Database struct {
	conn *sql.DB
}

// OpenDatabase opens or creates the database at the given path
func OpenDatabase(path string) (*Database, error) {
	// Ensure parent directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	conn, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &Database{conn: conn}
	if err := db.runMigrations(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

// runMigrations creates the database schema and seeds default data
func (db *Database) runMigrations() error {
	migrations := `
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
	`

	if _, err := db.conn.Exec(migrations); err != nil {
		return err
	}

	// Seed a default workspace if none exists
	var count int
	if err := db.conn.QueryRow("SELECT COUNT(*) FROM workspaces").Scan(&count); err != nil {
		return err
	}

	if count == 0 {
		_, err := db.conn.Exec(
			"INSERT INTO workspaces (id, name) VALUES (?, ?)",
			uuid.New().String(), "Default Workspace",
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// Close closes the database connection
func (db *Database) Close() error {
	return db.conn.Close()
}

// ── Helper: serialize/deserialize JSON columns ──

func marshalJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func unmarshalKeyValues(raw string) []KeyValue {
	var kv []KeyValue
	if err := json.Unmarshal([]byte(raw), &kv); err != nil {
		return []KeyValue{}
	}
	return kv
}

func unmarshalEnvVariables(raw string) []EnvVariable {
	var vars []EnvVariable
	if err := json.Unmarshal([]byte(raw), &vars); err != nil {
		return []EnvVariable{}
	}
	return vars
}
