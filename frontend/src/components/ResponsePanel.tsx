import type { KeyValue } from '../types';
import { ZapIcon, CopyIcon } from './Icons';

interface ResponsePanelProps {
  response: {
    body: string;
    status: string;
    latencyMs: number;
    error?: string;
    headers?: KeyValue[];
  } | null;
}

export default function ResponsePanel({ response }: ResponsePanelProps) {
  const copyToClipboard = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
    }
  };

  const formatBytes = (str: string) => {
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (!response) {
    return (
      <div className="response-panel">
        <div className="response-panel__empty">
          <ZapIcon size={48} />
          <div className="response-panel__empty-text">No response yet</div>
          <div className="response-panel__empty-hint">
            Send a request to see the response here
          </div>
        </div>
      </div>
    );
  }

  const isError = response.error || response.status.startsWith('4') || response.status.startsWith('5') || response.status === 'Error';

  return (
    <div className="response-panel">
      <div className="response-panel__header">
        <span
          className={`response-panel__status ${
            isError ? 'response-panel__status--error' : 'response-panel__status--success'
          }`}
        >
          {response.error ? '✕ Error' : `● ${response.status}`}
        </span>
        <div className="response-panel__meta">
          <span className="response-panel__meta-item">
            ⏱ {Math.round(response.latencyMs)}ms
          </span>
          {response.body && (
            <span className="response-panel__meta-item">
              ↕ {formatBytes(response.body)}
            </span>
          )}
          {response.body && (
            <button
              className="sidebar__action-btn"
              onClick={copyToClipboard}
              title="Copy response"
            >
              <CopyIcon size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="response-panel__body">
        {response.error ? (
          <div className="response-panel__json" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
            {response.error}
          </div>
        ) : (
          <pre className="response-panel__json">{response.body || '(empty response)'}</pre>
        )}
      </div>
    </div>
  );
}
