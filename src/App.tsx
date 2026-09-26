import { useEffect, useCallback } from 'react';
import { useAppStore } from './stores/useAppStore';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import StatusBar from './components/StatusBar';
import RequestPanel from './components/RequestPanel';
import StreamPanel from './components/StreamPanel';
import WelcomeScreen from './components/WelcomeScreen';

export default function App() {
  const {
    loadWorkspace,
    loadCollections,
    loadEnvironments,
    loadHistory,
    tabs,
    activeTabId,
    openTab,
    closeTab,
  } = useAppStore();

  // Initialize app data on mount
  useEffect(() => {
    const init = async () => {
      await loadWorkspace();
      await Promise.all([loadCollections(), loadEnvironments(), loadHistory()]);
    };
    init();
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === 'n') {
        e.preventDefault();
        openTab();
      }

      if (isCtrlOrCmd && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
    },
    [activeTabId, openTab, closeTab]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="app-layout">
      <div className="app-layout__body">
        <Sidebar />
        <div className="app-layout__main">
          <TabBar />
          <div className="app-layout__content" style={{ flexDirection: 'column' }}>
            {activeTab ? (
              <RequestPanel tab={activeTab} />
            ) : (
              <WelcomeScreen />
            )}
          </div>
          <StreamPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
