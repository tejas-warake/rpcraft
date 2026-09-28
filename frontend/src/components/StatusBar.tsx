
import { useAppStore } from '../stores/useAppStore';
import { ActivityIcon } from './Icons';

export default function StatusBar() {
  const { workspace, tabs, activeTabId, activeEnvironmentId, environments, streamPanelOpen, toggleStreamPanel } =
    useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <footer className="statusbar">
      <div className="statusbar__section">
        <span className="statusbar__dot statusbar__dot--disconnected" />
        <span>Ready</span>
      </div>

      {activeTab && (
        <>
          <div className="statusbar__section">
            <span>{activeTab.protocol.toUpperCase()}</span>
          </div>
          {activeTab.target && (
            <div className="statusbar__section">
              <span>{activeTab.target}</span>
            </div>
          )}
        </>
      )}

      <div className="statusbar__spacer" />

      {activeEnv && (
        <div className="statusbar__section" style={{ color: 'var(--color-success)' }}>
          <span>● {activeEnv.name}</span>
        </div>
      )}

      <div className="statusbar__section">
        <button
          className="sidebar__action-btn"
          onClick={toggleStreamPanel}
          title="Toggle stream panel"
          style={{
            width: 18,
            height: 18,
            color: streamPanelOpen ? 'var(--accent-primary)' : undefined,
          }}
        >
          <ActivityIcon size={12} />
        </button>
      </div>

      {workspace && (
        <div className="statusbar__section">
          <span>{workspace.name}</span>
        </div>
      )}
    </footer>
  );
}
