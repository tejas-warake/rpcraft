import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { TabState, Protocol, Transport, KeyValue, HistoryEntry } from '../types';
import { PROTOCOL_CONFIG, TRANSPORT_CONFIG } from '../types';
import { SendIcon } from './Icons';
import KeyValueEditor from './KeyValueEditor';
import ResponsePanel from './ResponsePanel';

interface RequestPanelProps {
  tab: TabState;
}

/** Interpolate {{variable}} placeholders from active environment */
function interpolateVars(text: string, variables: Array<{ key: string; value: string; enabled: boolean }>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const found = variables.find((v) => v.key === varName && v.enabled);
    return found ? found.value : match;
  });
}

export default function RequestPanel({ tab }: RequestPanelProps) {
  const {
    updateTab,
    environments,
    activeEnvironmentId,
    addToHistory,
    workspace,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'body' | 'headers'>('body');
  const [response, setResponse] = useState<{
    body: string;
    status: string;
    latencyMs: number;
    error?: string;
    headers?: KeyValue[];
  } | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Get active environment variables
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const envVars = activeEnv?.variables ?? [];

  const handleUpdateField = useCallback(
    (field: keyof TabState, value: any) => {
      updateTab(tab.id, { [field]: value });
    },
    [tab.id, updateTab]
  );

  const handleSend = useCallback(async () => {
    if (!tab.target || isSending) return;

    setIsSending(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      // Interpolate environment variables
      const target = interpolateVars(tab.target, envVars);
      const body = interpolateVars(tab.body, envVars);
      const method = interpolateVars(tab.method, envVars);

      // Parse the JSON-RPC body
      let requestBody: any;
      try {
        requestBody = JSON.parse(body);
      } catch {
        requestBody = { jsonrpc: '2.0', id: 1, method, params: {} };
      }

      // For Phase 1, we do JSON-RPC over a simple HTTP POST or echo for demo
      // In a full implementation, this would go through the Rust backend
      const res = await fetch(`http://${target}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(
            tab.headers
              .filter((h) => h.enabled && h.key)
              .map((h) => [
                interpolateVars(h.key, envVars),
                interpolateVars(h.value, envVars),
              ])
          ),
        },
        body: JSON.stringify(requestBody),
      });

      const latencyMs = performance.now() - startTime;
      const responseText = await res.text();

      let formattedBody = responseText;
      try {
        formattedBody = JSON.stringify(JSON.parse(responseText), null, 2);
      } catch {
        // keep raw text
      }

      const result = {
        body: formattedBody,
        status: `${res.status} ${res.statusText}`,
        latencyMs,
      };
      setResponse(result);

      // Add to history
      if (workspace) {
        const historyEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          protocol: tab.protocol,
          transport: tab.transport,
          target: tab.target,
          method: tab.method || requestBody?.method || '',
          requestBody: body,
          requestHeaders: tab.headers,
          responseBody: formattedBody,
          responseHeaders: null,
          status: result.status,
          latencyMs,
          error: null,
          createdAt: new Date().toISOString(),
        };
        addToHistory(historyEntry);
      }
    } catch (err: any) {
      const latencyMs = performance.now() - startTime;
      const result = {
        body: '',
        status: 'Error',
        latencyMs,
        error: err.message || 'Connection failed',
      };
      setResponse(result);

      if (workspace) {
        const historyEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          protocol: tab.protocol,
          transport: tab.transport,
          target: tab.target,
          method: tab.method,
          requestBody: tab.body,
          requestHeaders: tab.headers,
          responseBody: null,
          responseHeaders: null,
          status: 'Error',
          latencyMs,
          error: err.message,
          createdAt: new Date().toISOString(),
        };
        addToHistory(historyEntry);
      }
    } finally {
      setIsSending(false);
    }
  }, [tab, isSending, envVars, workspace, addToHistory]);

  return (
    <div className="app-layout__content">
      <div className="request-panel">
        {/* Toolbar */}
        <div className="request-panel__toolbar">
          <select
            className="request-panel__protocol-select"
            value={tab.protocol}
            onChange={(e) => {
              const proto = e.target.value as Protocol;
              handleUpdateField('protocol', proto);
              handleUpdateField('transport', PROTOCOL_CONFIG[proto].defaultTransport);
              if (!tab.target) {
                handleUpdateField('target', `localhost:${PROTOCOL_CONFIG[proto].defaultPort}`);
              }
            }}
            style={{ color: PROTOCOL_CONFIG[tab.protocol].color }}
          >
            {Object.entries(PROTOCOL_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <select
            className="request-panel__transport-select"
            value={tab.transport}
            onChange={(e) => handleUpdateField('transport', e.target.value as Transport)}
          >
            {Object.entries(TRANSPORT_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <input
            className="request-panel__target-input"
            placeholder="localhost:8545"
            value={tab.target}
            onChange={(e) => handleUpdateField('target', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />

          <input
            className="request-panel__method-input"
            placeholder="Method name"
            value={tab.method}
            onChange={(e) => handleUpdateField('method', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />

          <button
            className="request-panel__send-btn"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span>
            ) : (
              <SendIcon size={14} />
            )}
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Section tabs */}
        <div className="request-panel__section-tabs">
          <button
            className={`request-panel__section-tab ${activeSection === 'body' ? 'request-panel__section-tab--active' : ''}`}
            onClick={() => setActiveSection('body')}
          >
            Body
          </button>
          <button
            className={`request-panel__section-tab ${activeSection === 'headers' ? 'request-panel__section-tab--active' : ''}`}
            onClick={() => setActiveSection('headers')}
          >
            Headers
            {tab.headers.length > 0 && (
              <span style={{
                marginLeft: 4,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
              }}>
                ({tab.headers.length})
              </span>
            )}
          </button>
        </div>

        {/* Editor area */}
        <div className="request-panel__editor">
          {activeSection === 'body' && (
            <textarea
              className="json-editor"
              value={tab.body}
              onChange={(e) => handleUpdateField('body', e.target.value)}
              placeholder='{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "example",\n  "params": {}\n}'
              spellCheck={false}
            />
          )}
          {activeSection === 'headers' && (
            <KeyValueEditor
              items={tab.headers}
              onChange={(headers) => handleUpdateField('headers', headers)}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
            />
          )}
        </div>
      </div>

      <ResponsePanel response={response} />
    </div>
  );
}
