import type { KeyValue } from '../types';
import { PlusIcon, XIcon } from './Icons';

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const updateItem = (index: number, field: keyof KeyValue, value: string | boolean) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="kv-editor">
      {items.map((item, i) => (
        <div key={i} className="kv-editor__row">
          <input
            type="checkbox"
            className="kv-editor__checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(i, 'enabled', e.target.checked)}
          />
          <input
            className="kv-editor__key"
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => updateItem(i, 'key', e.target.value)}
          />
          <input
            className="kv-editor__value"
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => updateItem(i, 'value', e.target.value)}
          />
          <button className="kv-editor__remove" onClick={() => removeItem(i)}>
            <XIcon size={12} />
          </button>
        </div>
      ))}
      <button className="kv-editor__add" onClick={addItem}>
        <PlusIcon size={12} />
        Add {keyPlaceholder.toLowerCase()}
      </button>
    </div>
  );
}
