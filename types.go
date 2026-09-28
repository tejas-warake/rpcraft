package main

// Supported RPC protocols
const (
	ProtocolJsonRpc = "jsonRpc"
	ProtocolGrpc    = "grpc"
	ProtocolLsp     = "lsp"
	ProtocolMcp     = "mcp"
)

// Transport mechanisms for RPC communication
const (
	TransportTcp       = "tcp"
	TransportWebSocket = "webSocket"
	TransportHttp      = "http"
	TransportStdio     = "stdio"
)

// KeyValue represents a key-value pair for headers and metadata
type KeyValue struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// Workspace contains collections and environment configs
type Workspace struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// Collection is a folder of saved requests
type Collection struct {
	ID          string  `json:"id"`
	WorkspaceID string  `json:"workspaceId"`
	ParentID    *string `json:"parentId"`
	Name        string  `json:"name"`
	SortOrder   int     `json:"sortOrder"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

// SavedRequest is a saved request template
type SavedRequest struct {
	ID           string     `json:"id"`
	CollectionID string     `json:"collectionId"`
	Name         string     `json:"name"`
	Protocol     string     `json:"protocol"`
	Transport    string     `json:"transport"`
	Target       string     `json:"target"`
	Method       string     `json:"method"`
	Body         string     `json:"body"`
	Headers      []KeyValue `json:"headers"`
	SortOrder    int        `json:"sortOrder"`
	CreatedAt    string     `json:"createdAt"`
	UpdatedAt    string     `json:"updatedAt"`
}

// Environment is a named set of variables
type Environment struct {
	ID          string        `json:"id"`
	WorkspaceID string        `json:"workspaceId"`
	Name        string        `json:"name"`
	Variables   []EnvVariable `json:"variables"`
	CreatedAt   string        `json:"createdAt"`
	UpdatedAt   string        `json:"updatedAt"`
}

// EnvVariable is a single environment variable
type EnvVariable struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

// HistoryEntry records a request/response pair
type HistoryEntry struct {
	ID              string     `json:"id"`
	WorkspaceID     string     `json:"workspaceId"`
	Protocol        string     `json:"protocol"`
	Transport       string     `json:"transport"`
	Target          string     `json:"target"`
	Method          string     `json:"method"`
	RequestBody     string     `json:"requestBody"`
	RequestHeaders  []KeyValue `json:"requestHeaders"`
	ResponseBody    *string    `json:"responseBody"`
	ResponseHeaders []KeyValue `json:"responseHeaders"`
	Status          *string    `json:"status"`
	LatencyMs       *float64   `json:"latencyMs"`
	Error           *string    `json:"error"`
	CreatedAt       string     `json:"createdAt"`
}

// CollectionTreeNode is used for rendering the collection hierarchy in the sidebar
type CollectionTreeNode struct {
	ID        string               `json:"id"`
	Name      string               `json:"name"`
	ParentID  *string              `json:"parentId"`
	SortOrder int                  `json:"sortOrder"`
	Children  []CollectionTreeNode `json:"children"`
	Requests  []SavedRequest       `json:"requests"`
}

// ProcessEvent is emitted from the backend to the frontend for process I/O
type ProcessEvent struct {
	ProcessID string `json:"process_id"`
	EventType string `json:"event_type"` // "stdout", "stderr", "error", "exit"
	Data      string `json:"data"`
}
