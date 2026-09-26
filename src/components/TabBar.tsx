
import { useAppStore } from '../stores/useAppStore';
import { PROTOCOL_CONFIG } from '../types';
import { XIcon, PlusIcon } from './Icons';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useAppStore();

  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tabbar__tab ${tab.id === activeTabId ? 'tabbar__tab--active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          title={tab.title}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: PROTOCOL_CONFIG[tab.protocol].color,
              flexShrink: 0,
            }}
          />
          <span className="tabbar__tab-name">{tab.title}</span>
          {tab.isDirty && <span className="tabbar__tab-dot" />}
          <span
            className="tabbar__tab-close"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <XIcon size={12} />
          </span>
        </button>
      ))}
      <button className="tabbar__add" onClick={() => openTab()} title="New tab">
        <PlusIcon size={16} />
      </button>
    </div>
  );
}
