package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// App is the main application struct. Methods on this struct are automatically
// bound to the frontend by Wails and callable from JavaScript.
type App struct {
	ctx     context.Context
	db      *Database
	process *ProcessManager
}

// NewApp creates a new App instance
func NewApp() *App {
	return &App{}
}

// startup is called when the Wails app starts. We use it to save the context
// and initialize the database.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Determine database path
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	dbPath := filepath.Join(configDir, "rpcraft", "rpcraft.db")

	db, err := OpenDatabase(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open database: %v\n", err)
		os.Exit(1)
	}
	a.db = db
	a.process = NewProcessManager(a)
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// ════════════════════════════════════════════════════════════════
// Workspace commands
// ════════════════════════════════════════════════════════════════

// GetWorkspaces returns all workspaces
func (a *App) GetWorkspaces() ([]Workspace, error) {
	rows, err := a.db.conn.Query("SELECT id, name, created_at, updated_at FROM workspaces ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []Workspace
	for rows.Next() {
		var w Workspace
		if err := rows.Scan(&w.ID, &w.Name, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, w)
	}
	return workspaces, nil
}

// GetActiveWorkspace returns the first workspace
func (a *App) GetActiveWorkspace() (*Workspace, error) {
	var w Workspace
	err := a.db.conn.QueryRow(
		"SELECT id, name, created_at, updated_at FROM workspaces ORDER BY created_at ASC LIMIT 1",
	).Scan(&w.ID, &w.Name, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// ════════════════════════════════════════════════════════════════
// Collection commands
// ════════════════════════════════════════════════════════════════

// GetCollections returns the collection tree for a workspace
func (a *App) GetCollections(workspaceID string) ([]CollectionTreeNode, error) {
	// Fetch all collections
	rows, err := a.db.conn.Query(
		`SELECT id, workspace_id, parent_id, name, sort_order, created_at, updated_at
		 FROM collections WHERE workspace_id = ? ORDER BY sort_order, name`, workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.WorkspaceID, &c.ParentID, &c.Name, &c.SortOrder, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		collections = append(collections, c)
	}

	// Fetch all saved requests for this workspace
	reqRows, err := a.db.conn.Query(
		`SELECT sr.id, sr.collection_id, sr.name, sr.protocol, sr.transport,
		        sr.target, sr.method, sr.body, sr.headers, sr.sort_order,
		        sr.created_at, sr.updated_at
		 FROM saved_requests sr
		 JOIN collections c ON sr.collection_id = c.id
		 WHERE c.workspace_id = ?
		 ORDER BY sr.sort_order, sr.name`, workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer reqRows.Close()

	var requests []SavedRequest
	for reqRows.Next() {
		var r SavedRequest
		var headersJSON string
		if err := reqRows.Scan(&r.ID, &r.CollectionID, &r.Name, &r.Protocol, &r.Transport,
			&r.Target, &r.Method, &r.Body, &headersJSON, &r.SortOrder,
			&r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		r.Headers = unmarshalKeyValues(headersJSON)
		requests = append(requests, r)
	}

	return buildTree(collections, requests, nil), nil
}

func buildTree(collections []Collection, requests []SavedRequest, parentID *string) []CollectionTreeNode {
	var nodes []CollectionTreeNode
	for _, c := range collections {
		if ptrStringEqual(c.ParentID, parentID) {
			children := buildTree(collections, requests, &c.ID)
			var reqs []SavedRequest
			for _, r := range requests {
				if r.CollectionID == c.ID {
					reqs = append(reqs, r)
				}
			}
			if children == nil {
				children = []CollectionTreeNode{}
			}
			if reqs == nil {
				reqs = []SavedRequest{}
			}
			nodes = append(nodes, CollectionTreeNode{
				ID:        c.ID,
				Name:      c.Name,
				ParentID:  c.ParentID,
				SortOrder: c.SortOrder,
				Children:  children,
				Requests:  reqs,
			})
		}
	}
	if nodes == nil {
		return []CollectionTreeNode{}
	}
	return nodes
}

func ptrStringEqual(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

// CreateCollection creates a new collection
func (a *App) CreateCollection(workspaceID string, name string, parentID *string) (*Collection, error) {
	id := uuid.New().String()
	ts := now()

	var maxOrder int
	err := a.db.conn.QueryRow(
		"SELECT COALESCE(MAX(sort_order), -1) FROM collections WHERE workspace_id = ? AND parent_id IS ?",
		workspaceID, parentID,
	).Scan(&maxOrder)
	if err != nil {
		maxOrder = -1
	}

	_, err = a.db.conn.Exec(
		`INSERT INTO collections (id, workspace_id, parent_id, name, sort_order, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, workspaceID, parentID, name, maxOrder+1, ts, ts,
	)
	if err != nil {
		return nil, err
	}

	return &Collection{
		ID:          id,
		WorkspaceID: workspaceID,
		ParentID:    parentID,
		Name:        name,
		SortOrder:   maxOrder + 1,
		CreatedAt:   ts,
		UpdatedAt:   ts,
	}, nil
}

// RenameCollection renames a collection
func (a *App) RenameCollection(id string, name string) error {
	_, err := a.db.conn.Exec(
		"UPDATE collections SET name = ?, updated_at = ? WHERE id = ?",
		name, now(), id,
	)
	return err
}

// DeleteCollection deletes a collection
func (a *App) DeleteCollection(id string) error {
	_, err := a.db.conn.Exec("DELETE FROM collections WHERE id = ?", id)
	return err
}

// CreateRequest creates a new saved request in a collection
func (a *App) CreateRequest(collectionID string, name string) (*SavedRequest, error) {
	id := uuid.New().String()
	ts := now()

	var maxOrder int
	err := a.db.conn.QueryRow(
		"SELECT COALESCE(MAX(sort_order), -1) FROM saved_requests WHERE collection_id = ?",
		collectionID,
	).Scan(&maxOrder)
	if err != nil {
		maxOrder = -1
	}

	_, err = a.db.conn.Exec(
		`INSERT INTO saved_requests (id, collection_id, name, sort_order, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, collectionID, name, maxOrder+1, ts, ts,
	)
	if err != nil {
		return nil, err
	}

	return &SavedRequest{
		ID:           id,
		CollectionID: collectionID,
		Name:         name,
		Protocol:     ProtocolJsonRpc,
		Transport:    TransportTcp,
		Target:       "",
		Method:       "",
		Body:         "",
		Headers:      []KeyValue{},
		SortOrder:    maxOrder + 1,
		CreatedAt:    ts,
		UpdatedAt:    ts,
	}, nil
}

// UpdateRequest updates an existing saved request
func (a *App) UpdateRequest(request SavedRequest) error {
	headersJSON := marshalJSON(request.Headers)
	_, err := a.db.conn.Exec(
		`UPDATE saved_requests SET name = ?, protocol = ?, transport = ?, target = ?,
		 method = ?, body = ?, headers = ?, updated_at = ? WHERE id = ?`,
		request.Name, request.Protocol, request.Transport, request.Target,
		request.Method, request.Body, headersJSON, now(), request.ID,
	)
	return err
}

// DeleteRequest deletes a saved request
func (a *App) DeleteRequest(id string) error {
	_, err := a.db.conn.Exec("DELETE FROM saved_requests WHERE id = ?", id)
	return err
}

// ════════════════════════════════════════════════════════════════
// Environment commands
// ════════════════════════════════════════════════════════════════

// GetEnvironments returns all environments for a workspace
func (a *App) GetEnvironments(workspaceID string) ([]Environment, error) {
	rows, err := a.db.conn.Query(
		`SELECT id, workspace_id, name, variables, created_at, updated_at
		 FROM environments WHERE workspace_id = ? ORDER BY name`, workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envs []Environment
	for rows.Next() {
		var e Environment
		var varsJSON string
		if err := rows.Scan(&e.ID, &e.WorkspaceID, &e.Name, &varsJSON, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		e.Variables = unmarshalEnvVariables(varsJSON)
		envs = append(envs, e)
	}
	if envs == nil {
		return []Environment{}, nil
	}
	return envs, nil
}

// CreateEnvironment creates a new environment
func (a *App) CreateEnvironment(workspaceID string, name string) (*Environment, error) {
	id := uuid.New().String()
	ts := now()

	_, err := a.db.conn.Exec(
		`INSERT INTO environments (id, workspace_id, name, variables, created_at, updated_at)
		 VALUES (?, ?, ?, '[]', ?, ?)`,
		id, workspaceID, name, ts, ts,
	)
	if err != nil {
		return nil, err
	}

	return &Environment{
		ID:          id,
		WorkspaceID: workspaceID,
		Name:        name,
		Variables:   []EnvVariable{},
		CreatedAt:   ts,
		UpdatedAt:   ts,
	}, nil
}

// UpdateEnvironment updates an environment's name and variables
func (a *App) UpdateEnvironment(environment Environment) error {
	varsJSON := marshalJSON(environment.Variables)
	_, err := a.db.conn.Exec(
		"UPDATE environments SET name = ?, variables = ?, updated_at = ? WHERE id = ?",
		environment.Name, varsJSON, now(), environment.ID,
	)
	return err
}

// DeleteEnvironment deletes an environment
func (a *App) DeleteEnvironment(id string) error {
	_, err := a.db.conn.Exec("DELETE FROM environments WHERE id = ?", id)
	return err
}

// ════════════════════════════════════════════════════════════════
// History commands
// ════════════════════════════════════════════════════════════════

// GetHistory returns recent history entries for a workspace
func (a *App) GetHistory(workspaceID string, limit int) ([]HistoryEntry, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := a.db.conn.Query(
		`SELECT id, workspace_id, protocol, transport, target, method,
		        request_body, request_headers, response_body, response_headers,
		        status, latency_ms, error, created_at
		 FROM history WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
		workspaceID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []HistoryEntry
	for rows.Next() {
		var e HistoryEntry
		var reqHeadersJSON string
		var resHeadersJSON sql.NullString
		if err := rows.Scan(&e.ID, &e.WorkspaceID, &e.Protocol, &e.Transport, &e.Target, &e.Method,
			&e.RequestBody, &reqHeadersJSON, &e.ResponseBody, &resHeadersJSON,
			&e.Status, &e.LatencyMs, &e.Error, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.RequestHeaders = unmarshalKeyValues(reqHeadersJSON)
		if resHeadersJSON.Valid {
			e.ResponseHeaders = unmarshalKeyValues(resHeadersJSON.String)
		}
		entries = append(entries, e)
	}
	if entries == nil {
		return []HistoryEntry{}, nil
	}
	return entries, nil
}

// AddHistoryEntry adds a new history entry
func (a *App) AddHistoryEntry(entry HistoryEntry) (string, error) {
	reqHeadersJSON := marshalJSON(entry.RequestHeaders)
	var resHeadersJSON *string
	if entry.ResponseHeaders != nil {
		s := marshalJSON(entry.ResponseHeaders)
		resHeadersJSON = &s
	}

	_, err := a.db.conn.Exec(
		`INSERT INTO history (id, workspace_id, protocol, transport, target, method,
		 request_body, request_headers, response_body, response_headers,
		 status, latency_ms, error, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		entry.ID, entry.WorkspaceID, entry.Protocol, entry.Transport,
		entry.Target, entry.Method, entry.RequestBody, reqHeadersJSON,
		entry.ResponseBody, resHeadersJSON,
		entry.Status, entry.LatencyMs, entry.Error, entry.CreatedAt,
	)
	if err != nil {
		return "", err
	}
	return entry.ID, nil
}

// ClearHistory deletes all history for a workspace
func (a *App) ClearHistory(workspaceID string) error {
	_, err := a.db.conn.Exec("DELETE FROM history WHERE workspace_id = ?", workspaceID)
	return err
}

// ════════════════════════════════════════════════════════════════
// Process commands
// ════════════════════════════════════════════════════════════════

// StartProcess spawns a new child process and returns its ID
func (a *App) StartProcess(command string) (string, error) {
	return a.process.StartProcess(command)
}

// SendProcessMessage sends a message to a running process's stdin
func (a *App) SendProcessMessage(processID string, message string) error {
	return a.process.SendProcessMessage(processID, message)
}
