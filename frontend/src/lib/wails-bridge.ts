/**
 * Wails Bridge — Type-safe wrappers around Wails-generated Go bindings.
 *
 * Wails auto-generates TypeScript bindings in `wailsjs/go/main/App.ts`
 * from the public methods on the Go `App` struct. We re-export them here
 * to keep the rest of the frontend decoupled from the binding layer.
 */

import type {
  Workspace,
  CollectionTreeNode,
  Collection,
  SavedRequest,
  Environment,
  HistoryEntry,
} from '../types';

// Wails auto-generates these bindings when you run `wails dev`
import {
  GetWorkspaces as _GetWorkspaces,
  GetActiveWorkspace as _GetActiveWorkspace,
  GetCollections as _GetCollections,
  CreateCollection as _CreateCollection,
  RenameCollection as _RenameCollection,
  DeleteCollection as _DeleteCollection,
  CreateRequest as _CreateRequest,
  UpdateRequest as _UpdateRequest,
  DeleteRequest as _DeleteRequest,
  GetEnvironments as _GetEnvironments,
  CreateEnvironment as _CreateEnvironment,
  UpdateEnvironment as _UpdateEnvironment,
  DeleteEnvironment as _DeleteEnvironment,
  GetHistory as _GetHistory,
  AddHistoryEntry as _AddHistoryEntry,
  ClearHistory as _ClearHistory,
  StartProcess as _StartProcess,
  SendProcessMessage as _SendProcessMessage,
} from '../../wailsjs/go/main/App';

// ── Workspace ──────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  return (await _GetWorkspaces()) as unknown as Workspace[];
}

export async function getActiveWorkspace(): Promise<Workspace> {
  return (await _GetActiveWorkspace()) as unknown as Workspace;
}

// ── Collections ────────────────────────────────────────

export async function getCollections(workspaceId: string): Promise<CollectionTreeNode[]> {
  return (await _GetCollections(workspaceId)) as unknown as CollectionTreeNode[];
}

export async function createCollection(
  workspaceId: string,
  name: string,
  parentId?: string | null
): Promise<Collection> {
  return (await _CreateCollection(workspaceId, name, parentId ?? null)) as unknown as Collection;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  return _RenameCollection(id, name);
}

export async function deleteCollection(id: string): Promise<void> {
  return _DeleteCollection(id);
}

// ── Saved Requests ─────────────────────────────────────

export async function createRequest(collectionId: string, name: string): Promise<SavedRequest> {
  return (await _CreateRequest(collectionId, name)) as unknown as SavedRequest;
}

export async function updateRequest(request: SavedRequest): Promise<void> {
  return _UpdateRequest(request as any);
}

export async function deleteRequest(id: string): Promise<void> {
  return _DeleteRequest(id);
}

// ── Environments ───────────────────────────────────────

export async function getEnvironments(workspaceId: string): Promise<Environment[]> {
  return (await _GetEnvironments(workspaceId)) as unknown as Environment[];
}

export async function createEnvironment(workspaceId: string, name: string): Promise<Environment> {
  return (await _CreateEnvironment(workspaceId, name)) as unknown as Environment;
}

export async function updateEnvironment(environment: Environment): Promise<void> {
  return _UpdateEnvironment(environment as any);
}

export async function deleteEnvironment(id: string): Promise<void> {
  return _DeleteEnvironment(id);
}

// ── History ────────────────────────────────────────────

export async function getHistory(
  workspaceId: string,
  limit?: number
): Promise<HistoryEntry[]> {
  return (await _GetHistory(workspaceId, limit ?? 100)) as unknown as HistoryEntry[];
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<string> {
  return _AddHistoryEntry(entry as any);
}

export async function clearHistory(workspaceId: string): Promise<void> {
  return _ClearHistory(workspaceId);
}

// ── Process ────────────────────────────────────────────

export async function startProcess(command: string): Promise<string> {
  return _StartProcess(command);
}

export async function sendProcessMessage(processId: string, message: string): Promise<void> {
  return _SendProcessMessage(processId, message);
}
