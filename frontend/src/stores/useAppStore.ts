import { create } from 'zustand';
import type {
  Workspace,
  CollectionTreeNode,
  TabState,
  Environment,
  HistoryEntry,
  Protocol,
  Transport,
} from '../types';
import * as api from '../lib/wails-bridge';

export interface StreamMessage {
  id: string;
  processId: string;
  direction: 'request' | 'response' | 'notification' | 'error';
  timestamp: number;
  content: string;
}

interface AppStore {
  // ── Workspace ──
  workspace: Workspace | null;
  loadWorkspace: () => Promise<void>;

  // ── Collections ──
  collections: CollectionTreeNode[];
  loadCollections: () => Promise<void>;
  addCollection: (name: string, parentId?: string | null) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  renameCollectionById: (id: string, name: string) => Promise<void>;
  addRequest: (collectionId: string, name: string) => Promise<void>;
  removeRequest: (id: string) => Promise<void>;

  // ── Tabs ──
  tabs: TabState[];
  activeTabId: string | null;
  openTab: (tab?: Partial<TabState>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TabState>) => void;

  // ── Environments ──
  environments: Environment[];
  activeEnvironmentId: string | null;
  loadEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
  addEnvironment: (name: string) => Promise<void>;
  removeEnvironment: (id: string) => Promise<void>;
  saveEnvironment: (env: Environment) => Promise<void>;

  // ── History ──
  history: HistoryEntry[];
  loadHistory: () => Promise<void>;
  addToHistory: (entry: HistoryEntry) => Promise<void>;
  clearAllHistory: () => Promise<void>;

  // ── Sidebar ──
  sidebarSection: 'collections' | 'history' | 'environments';
  setSidebarSection: (section: 'collections' | 'history' | 'environments') => void;

  // ── UI ──
  streamPanelOpen: boolean;
  toggleStreamPanel: () => void;
  streamMessages: StreamMessage[];
  addStreamMessage: (msg: StreamMessage) => void;
  clearStreamMessages: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultTab(overrides?: Partial<TabState>): TabState {
  return {
    id: generateId(),
    title: 'New Request',
    savedRequestId: null,
    protocol: 'jsonRpc' as Protocol,
    transport: 'tcp' as Transport,
    target: '',
    method: '',
    body: '{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "",\n  "params": {}\n}',
    headers: [],
    isDirty: false,
    processId: null,
    ...overrides,
  };
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Workspace ──
  workspace: null,
  loadWorkspace: async () => {
    try {
      const workspace = await api.getActiveWorkspace();
      set({ workspace });
    } catch (e) {
      console.error('Failed to load workspace:', e);
    }
  },

  // ── Collections ──
  collections: [],
  loadCollections: async () => {
    const { workspace } = get();
    if (!workspace) return;
    try {
      const collections = await api.getCollections(workspace.id);
      set({ collections });
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  },
  addCollection: async (name, parentId) => {
    const { workspace, loadCollections } = get();
    if (!workspace) return;
    await api.createCollection(workspace.id, name, parentId);
    await loadCollections();
  },
  removeCollection: async (id) => {
    await api.deleteCollection(id);
    await get().loadCollections();
  },
  renameCollectionById: async (id, name) => {
    await api.renameCollection(id, name);
    await get().loadCollections();
  },
  addRequest: async (collectionId, name) => {
    const req = await api.createRequest(collectionId, name);
    await get().loadCollections();
    // Auto-open the new request in a tab
    get().openTab({
      title: name,
      savedRequestId: req.id,
      protocol: req.protocol,
      transport: req.transport,
      target: req.target,
      method: req.method,
      body: req.body,
      headers: req.headers,
    });
  },
  removeRequest: async (id) => {
    await api.deleteRequest(id);
    await get().loadCollections();
    // Close any tab that was viewing this request
    const { tabs } = get();
    const tab = tabs.find((t) => t.savedRequestId === id);
    if (tab) get().closeTab(tab.id);
  },

  // ── Tabs ──
  tabs: [],
  activeTabId: null,
  openTab: (overrides) => {
    const tab = createDefaultTab(overrides);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  closeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex((t) => t.id === id);
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
      }
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, ...updates, isDirty: true } : t
      ),
    }));
  },

  // ── Environments ──
  environments: [],
  activeEnvironmentId: null,
  loadEnvironments: async () => {
    const { workspace } = get();
    if (!workspace) return;
    try {
      const environments = await api.getEnvironments(workspace.id);
      set({ environments });
    } catch (e) {
      console.error('Failed to load environments:', e);
    }
  },
  setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),
  addEnvironment: async (name) => {
    const { workspace, loadEnvironments } = get();
    if (!workspace) return;
    await api.createEnvironment(workspace.id, name);
    await loadEnvironments();
  },
  removeEnvironment: async (id) => {
    await api.deleteEnvironment(id);
    const { activeEnvironmentId, loadEnvironments } = get();
    if (activeEnvironmentId === id) {
      set({ activeEnvironmentId: null });
    }
    await loadEnvironments();
  },
  saveEnvironment: async (env) => {
    await api.updateEnvironment(env);
    await get().loadEnvironments();
  },

  // ── History ──
  history: [],
  loadHistory: async () => {
    const { workspace } = get();
    if (!workspace) return;
    try {
      const history = await api.getHistory(workspace.id);
      set({ history });
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  },
  addToHistory: async (entry) => {
    await api.addHistoryEntry(entry);
    await get().loadHistory();
  },
  clearAllHistory: async () => {
    const { workspace, loadHistory } = get();
    if (!workspace) return;
    await api.clearHistory(workspace.id);
    await loadHistory();
  },

  // ── Sidebar ──
  sidebarSection: 'collections',
  setSidebarSection: (section) => set({ sidebarSection: section }),

  // ── UI ──
  streamPanelOpen: false,
  toggleStreamPanel: () =>
    set((state) => ({ streamPanelOpen: !state.streamPanelOpen })),
  streamMessages: [],
  addStreamMessage: (msg) => set((state) => ({ streamMessages: [...state.streamMessages, msg] })),
  clearStreamMessages: () => set({ streamMessages: [] }),
}));
