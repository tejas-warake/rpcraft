import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { CollectionTreeNode, SavedRequest } from '../types';
import { PROTOCOL_CONFIG } from '../types';
import {
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  HistoryIcon,
  GlobeIcon,
} from './Icons';

// ── Collection Tree Node ──
function TreeNode({ node }: { node: CollectionTreeNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const renameRef = useRef<HTMLInputElement>(null);

  const {
    renameCollectionById,
    removeCollection,
    addRequest,
  } = useAppStore();

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      renameCollectionById(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleAddRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    addRequest(node.id, 'New Request');
    setIsOpen(true);
  };

  return (
    <div className="tree-node">
      <div className="tree-node__header" onClick={() => setIsOpen(!isOpen)}>
        <ChevronRightIcon
          className={`tree-node__chevron ${isOpen ? 'tree-node__chevron--open' : ''}`}
        />
        {isOpen ? (
          <FolderOpenIcon className="tree-node__icon tree-node__icon--folder" />
        ) : (
          <FolderIcon className="tree-node__icon tree-node__icon--folder" />
        )}
        {isRenaming ? (
          <input
            ref={renameRef}
            className="inline-rename"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-node__name">{node.name}</span>
        )}
        <div className="tree-node__actions">
          <button
            className="tree-node__action"
            title="Add request"
            onClick={handleAddRequest}
          >
            <PlusIcon size={12} />
          </button>
          <button
            className="tree-node__action"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenameValue(node.name);
              setIsRenaming(true);
            }}
          >
            <EditIcon size={12} />
          </button>
          <button
            className="tree-node__action"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              removeCollection(node.id);
            }}
          >
            <TrashIcon size={12} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="tree-node__children">
          {node.requests.map((req) => (
            <RequestItem key={req.id} request={req} />
          ))}
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Request Item ──
function RequestItem({ request }: { request: SavedRequest }) {
  const { openTab, removeRequest, tabs, activeTabId, setActiveTab } = useAppStore();
  const config = PROTOCOL_CONFIG[request.protocol];
  const isActive = tabs.some(
    (t) => t.savedRequestId === request.id && t.id === activeTabId
  );

  const handleClick = () => {
    // Check if there's already a tab for this request
    const existingTab = tabs.find((t) => t.savedRequestId === request.id);
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      openTab({
        title: request.name,
        savedRequestId: request.id,
        protocol: request.protocol,
        transport: request.transport,
        target: request.target,
        method: request.method,
        body: request.body || '{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "",\n  "params": {}\n}',
        headers: request.headers,
        isDirty: false,
      });
    }
  };

  return (
    <div
      className={`request-item ${isActive ? 'request-item--active' : ''}`}
      onClick={handleClick}
    >
      <span
        className="request-item__badge"
        style={{
          color: config.color,
          background: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        }}
      >
        {config.label}
      </span>
      <span className="request-item__name">{request.name}</span>
      <div className="request-item__actions">
        <button
          className="tree-node__action"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            removeRequest(request.id);
          }}
        >
          <TrashIcon size={12} />
        </button>
      </div>
    </div>
  );
}

// ── History Section ──
function HistorySection() {
  const { history, clearAllHistory, openTab } = useAppStore();

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div className="sidebar__header">
        <span className="sidebar__header-title">History</span>
        {history.length > 0 && (
          <div className="sidebar__header-actions">
            <button
              className="sidebar__action-btn"
              title="Clear history"
              onClick={clearAllHistory}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
      {history.length === 0 ? (
        <div className="empty-state">
          <HistoryIcon size={32} />
          <div className="empty-state__text">No history yet</div>
        </div>
      ) : (
        history.map((entry) => (
          <div
            key={entry.id}
            className="history-item"
            onClick={() => {
              openTab({
                title: entry.method || entry.target,
                protocol: entry.protocol,
                transport: entry.transport,
                target: entry.target,
                method: entry.method,
                body: entry.requestBody,
                headers: entry.requestHeaders,
              });
            }}
          >
            <div className="history-item__top">
              <span className="history-item__method">{entry.method || '(no method)'}</span>
              <span className="history-item__target">{entry.target}</span>
              <span className="history-item__time">{formatTime(entry.createdAt)}</span>
            </div>
            <div className="history-item__bottom">
              {entry.status && (
                <span
                  className={`history-item__status ${
                    entry.error
                      ? 'history-item__status--error'
                      : 'history-item__status--success'
                  }`}
                >
                  {entry.status}
                </span>
              )}
              {entry.latencyMs != null && (
                <span className="history-item__latency">{Math.round(entry.latencyMs)}ms</span>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ── Environment Section ──
function EnvironmentSection() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
    removeEnvironment,
  } = useAppStore();

  return (
    <>
      <div className="sidebar__header">
        <span className="sidebar__header-title">Environments</span>
        <div className="sidebar__header-actions">
          <button
            className="sidebar__action-btn"
            title="New environment"
            onClick={() => addEnvironment('New Environment')}
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      {environments.length === 0 ? (
        <div className="empty-state">
          <GlobeIcon size={32} />
          <div className="empty-state__text">No environments</div>
          <button
            className="empty-state__action"
            onClick={() => addEnvironment('Development')}
          >
            Create one
          </button>
        </div>
      ) : (
        <>
          <div className="env-panel__selector">
            <select
              className="env-panel__select"
              value={activeEnvironmentId ?? ''}
              onChange={(e) => setActiveEnvironment(e.target.value || null)}
            >
              <option value="">No active environment</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
          {environments.map((env) => (
            <div key={env.id} className="tree-node">
              <div className="tree-node__header">
                <GlobeIcon className="tree-node__icon" style={{ color: 'var(--color-info)' }} />
                <span className="tree-node__name">{env.name}</span>
                <div className="tree-node__actions">
                  <button
                    className="tree-node__action"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEnvironment(env.id);
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              </div>
              {env.variables.length > 0 && (
                <div className="tree-node__children">
                  {env.variables.map((v, i) => (
                    <div key={i} className="request-item" style={{ fontSize: 'var(--text-xs)' }}>
                      <span className="mono" style={{ color: 'var(--accent-primary)' }}>
                        {v.key}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>=</span>
                      <span className="mono truncate" style={{ color: 'var(--text-secondary)' }}>
                        {v.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ── Main Sidebar Component ──
export default function Sidebar() {
  const {
    collections,
    sidebarSection,
    setSidebarSection,
    addCollection,
  } = useAppStore();

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <button
          className={`sidebar__nav-btn ${sidebarSection === 'collections' ? 'sidebar__nav-btn--active' : ''}`}
          onClick={() => setSidebarSection('collections')}
        >
          <FolderIcon />
          <span>Collections</span>
        </button>
        <button
          className={`sidebar__nav-btn ${sidebarSection === 'history' ? 'sidebar__nav-btn--active' : ''}`}
          onClick={() => setSidebarSection('history')}
        >
          <HistoryIcon />
          <span>History</span>
        </button>
        <button
          className={`sidebar__nav-btn ${sidebarSection === 'environments' ? 'sidebar__nav-btn--active' : ''}`}
          onClick={() => setSidebarSection('environments')}
        >
          <GlobeIcon />
          <span>Env</span>
        </button>
      </nav>

      <div className="sidebar__body">
        {sidebarSection === 'collections' && (
          <>
            <div className="sidebar__header">
              <span className="sidebar__header-title">Collections</span>
              <div className="sidebar__header-actions">
                <button
                  className="sidebar__action-btn"
                  title="New collection"
                  onClick={() => addCollection('New Collection')}
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            {collections.length === 0 ? (
              <div className="empty-state">
                <FolderIcon size={32} />
                <div className="empty-state__text">No collections yet</div>
                <button
                  className="empty-state__action"
                  onClick={() => addCollection('My First Collection')}
                >
                  Create one
                </button>
              </div>
            ) : (
              collections.map((node) => <TreeNode key={node.id} node={node} />)
            )}
          </>
        )}
        {sidebarSection === 'history' && <HistorySection />}
        {sidebarSection === 'environments' && <EnvironmentSection />}
      </div>
    </aside>
  );
}
