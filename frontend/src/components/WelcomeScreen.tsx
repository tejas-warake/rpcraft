
import { useAppStore } from '../stores/useAppStore';
import { PlusIcon, FolderIcon } from './Icons';

export default function WelcomeScreen() {
  const { openTab, addCollection } = useAppStore();

  return (
    <div className="welcome">
      <div className="welcome__logo">⚡</div>
      <h1 className="welcome__title">RPCraft</h1>
      <p className="welcome__subtitle">
        A universal, protocol-aware API client for Remote Procedure Calls.
        Debug gRPC, JSON-RPC, LSP, and MCP — all in one place.
      </p>
      <div className="welcome__actions">
        <button className="welcome__btn welcome__btn--primary" onClick={() => openTab()}>
          <PlusIcon size={14} />
          New Request
        </button>
        <button
          className="welcome__btn welcome__btn--secondary"
          onClick={() => addCollection('My Collection')}
        >
          <FolderIcon size={14} />
          New Collection
        </button>
      </div>
      <div className="welcome__shortcuts">
        <div className="welcome__shortcut">
          <span className="welcome__kbd">Ctrl+N</span>
          <span>New request tab</span>
        </div>
        <div className="welcome__shortcut">
          <span className="welcome__kbd">Ctrl+Enter</span>
          <span>Send request</span>
        </div>
        <div className="welcome__shortcut">
          <span className="welcome__kbd">Ctrl+W</span>
          <span>Close tab</span>
        </div>
      </div>
    </div>
  );
}
