// Type definitions matching the Rust backend types

export type Id = string;

export type Protocol = 'jsonRpc' | 'grpc' | 'lsp' | 'mcp';
export type Transport = 'tcp' | 'webSocket' | 'http' | 'stdio';

export interface Workspace {
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: Id;
  workspaceId: Id;
  parentId: Id | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRequest {
  id: Id;
  collectionId: Id;
  name: string;
  protocol: Protocol;
  transport: Transport;
  target: string;
  method: string;
  body: string;
  headers: KeyValue[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: Id;
  workspaceId: Id;
  name: string;
  variables: EnvVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HistoryEntry {
  id: Id;
  workspaceId: Id;
  protocol: Protocol;
  transport: Transport;
  target: string;
  method: string;
  requestBody: string;
  requestHeaders: KeyValue[];
  responseBody: string | null;
  responseHeaders: KeyValue[] | null;
  status: string | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface CollectionTreeNode {
  id: Id;
  name: string;
  parentId: Id | null;
  sortOrder: number;
  children: CollectionTreeNode[];
  requests: SavedRequest[];
}

export interface TabState {
  id: Id;
  title: string;
  savedRequestId: Id | null;
  protocol: Protocol;
  transport: Transport;
  target: string;
  method: string;
  body: string;
  headers: KeyValue[];
  isDirty: boolean;
}

// Protocol display configuration
export const PROTOCOL_CONFIG: Record<Protocol, {
  label: string;
  color: string;
  defaultTransport: Transport;
  defaultPort: string;
}> = {
  jsonRpc: {
    label: 'JSON-RPC',
    color: 'var(--color-jsonrpc)',
    defaultTransport: 'tcp',
    defaultPort: '8545',
  },
  grpc: {
    label: 'gRPC',
    color: 'var(--color-grpc)',
    defaultTransport: 'http',
    defaultPort: '50051',
  },
  lsp: {
    label: 'LSP',
    color: 'var(--color-lsp)',
    defaultTransport: 'stdio',
    defaultPort: '',
  },
  mcp: {
    label: 'MCP',
    color: 'var(--color-mcp)',
    defaultTransport: 'stdio',
    defaultPort: '',
  },
};

export const TRANSPORT_CONFIG: Record<Transport, {
  label: string;
}> = {
  tcp: { label: 'TCP' },
  webSocket: { label: 'WebSocket' },
  http: { label: 'HTTP' },
  stdio: { label: 'stdio' },
};
