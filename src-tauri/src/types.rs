use serde::{Deserialize, Serialize};

/// Unique identifier type used throughout the application
pub type Id = String;

/// Supported RPC protocols
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Protocol {
    JsonRpc,
    Grpc,
    Lsp,
    Mcp,
}

impl std::fmt::Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Protocol::JsonRpc => write!(f, "JSON-RPC"),
            Protocol::Grpc => write!(f, "gRPC"),
            Protocol::Lsp => write!(f, "LSP"),
            Protocol::Mcp => write!(f, "MCP"),
        }
    }
}

/// Transport mechanisms for RPC communication
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Transport {
    Tcp,
    WebSocket,
    Http,
    Stdio,
}

/// A workspace contains collections and environment configs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: Id,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

/// A collection is a folder of saved requests
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: Id,
    pub workspace_id: Id,
    pub parent_id: Option<Id>,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// A saved request template
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedRequest {
    pub id: Id,
    pub collection_id: Id,
    pub name: String,
    pub protocol: Protocol,
    pub transport: Transport,
    pub target: String,
    pub method: String,
    pub body: String,
    pub headers: Vec<KeyValue>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Key-value pair for headers and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyValue {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

/// An environment is a named set of variables
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: Id,
    pub workspace_id: Id,
    pub name: String,
    pub variables: Vec<EnvVariable>,
    pub created_at: String,
    pub updated_at: String,
}

/// A single environment variable
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvVariable {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

/// A history entry records a request/response pair
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: Id,
    pub workspace_id: Id,
    pub protocol: Protocol,
    pub transport: Transport,
    pub target: String,
    pub method: String,
    pub request_body: String,
    pub request_headers: Vec<KeyValue>,
    pub response_body: Option<String>,
    pub response_headers: Option<Vec<KeyValue>>,
    pub status: Option<String>,
    pub latency_ms: Option<f64>,
    pub error: Option<String>,
    pub created_at: String,
}

/// Sidebar tree node for rendering collection hierarchy
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionTreeNode {
    pub id: Id,
    pub name: String,
    pub parent_id: Option<Id>,
    pub sort_order: i32,
    pub children: Vec<CollectionTreeNode>,
    pub requests: Vec<SavedRequest>,
}

/// Tab state for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabState {
    pub id: Id,
    pub title: String,
    pub saved_request_id: Option<Id>,
    pub protocol: Protocol,
    pub transport: Transport,
    pub target: String,
    pub method: String,
    pub body: String,
    pub headers: Vec<KeyValue>,
    pub is_dirty: bool,
}
