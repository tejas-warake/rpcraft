
import { useAppStore } from '../stores/useAppStore';
import { ActivityIcon, XIcon } from './Icons';

// Stream panel for viewing real-time message flow
// In Phase 1, this serves as a demo panel — full streaming comes with the JSON-RPC adapter
export default function StreamPanel() {
  const { streamPanelOpen, toggleStreamPanel, streamMessages: messages } = useAppStore();

  if (!streamPanelOpen) return null;

  const dirSymbol: Record<string, string> = {
    request: '⬆',
    response: '⬇',
    notification: '🔔',
    error: '✕',
  };

  const dirClass: Record<string, string> = {
    request: 'stream-msg__dir--request',
    response: 'stream-msg__dir--response',
    notification: 'stream-msg__dir--notification',
    error: 'stream-msg__dir--error',
  };

  return (
    <div className="stream-panel">
      <div className="stream-panel__header">
        <div className="stream-panel__title">
          <ActivityIcon size={12} />
          Stream
          <span className="stream-panel__count">{messages.length}</span>
        </div>
        <div className="stream-panel__controls">
          <button
            className="sidebar__action-btn"
            title="Close stream panel"
            onClick={toggleStreamPanel}
          >
            <XIcon size={12} />
          </button>
        </div>
      </div>
      <div className="stream-panel__body">
        {messages.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <ActivityIcon size={24} />
            <div className="empty-state__text">
              No stream messages yet. Send a request to see the message flow.
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`stream-msg`}
            >
              <span className={`stream-msg__dir ${dirClass[msg.direction]}`}>
                {dirSymbol[msg.direction]}
              </span>
              <span className="stream-msg__time">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="stream-msg__content">{msg.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
