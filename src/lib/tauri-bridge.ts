import { invoke } from '@tauri-apps/api/core';
import type {
  Workspace,
  CollectionTreeNode,
  Collection,
  SavedRequest,
  Environment,
  HistoryEntry,
} from '../types';

// ── Workspace ──────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  return invoke('get_workspaces');
}

export async function getActiveWorkspace(): Promise<Workspace> {
  return invoke('get_active_workspace');
}

// ── Collections ────────────────────────────────────────

export async function getCollections(workspaceId: string): Promise<CollectionTreeNode[]> {
  return invoke('get_collections', { workspaceId });
}

export async function createCollection(
  workspaceId: string,
  name: string,
  parentId?: string | null
): Promise<Collection> {
  return invoke('create_collection', { workspaceId, name, parentId: parentId ?? null });
}

export async function renameCollection(id: string, name: string): Promise<void> {
  return invoke('rename_collection', { id, name });
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke('delete_collection', { id });
}

// ── Saved Requests ─────────────────────────────────────

export async function createRequest(collectionId: string, name: string): Promise<SavedRequest> {
  return invoke('create_request', { collectionId, name });
}

export async function updateRequest(request: SavedRequest): Promise<void> {
  return invoke('update_request', { request });
}

export async function deleteRequest(id: string): Promise<void> {
  return invoke('delete_request', { id });
}

// ── Environments ───────────────────────────────────────

export async function getEnvironments(workspaceId: string): Promise<Environment[]> {
  return invoke('get_environments', { workspaceId });
}

export async function createEnvironment(workspaceId: string, name: string): Promise<Environment> {
  return invoke('create_environment', { workspaceId, name });
}

export async function updateEnvironment(environment: Environment): Promise<void> {
  return invoke('update_environment', { environment });
}

export async function deleteEnvironment(id: string): Promise<void> {
  return invoke('delete_environment', { id });
}

// ── History ────────────────────────────────────────────

export async function getHistory(
  workspaceId: string,
  limit?: number
): Promise<HistoryEntry[]> {
  return invoke('get_history', { workspaceId, limit: limit ?? 100 });
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<string> {
  return invoke('add_history_entry', { entry });
}

export async function clearHistory(workspaceId: string): Promise<void> {
  return invoke('clear_history', { workspaceId });
}
