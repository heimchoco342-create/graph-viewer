import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDomainStore } from '../../store/domainStore';

export interface NodeOption {
  id: string;
  name: string;
  type: string;
}

interface NodeSearchInputProps {
  label?: string;
  placeholder?: string;
  nodes: NodeOption[];
  value: string; // selected node ID
  onChange: (nodeId: string) => void;
}

export function NodeSearchInput({
  label,
  placeholder = '노드 검색...',
  nodes,
  value,
  onChange,
}: NodeSearchInputProps) {
  const nodeTypeBadgeColors = useDomainStore((s) => s.nodeTypeBadgeColors)();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync display text when value changes externally
  const selectedNode = nodes.find((n) => n.id === value);
  useEffect(() => {
    if (selectedNode && !open) {
      setQuery(selectedNode.name);
    }
  }, [selectedNode, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false);
        if (selectedNode) setQuery(selectedNode.name);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedNode]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 20);
    const q = query.toLowerCase();
    const scored = nodes
      .map((n) => {
        const nameLower = n.name.toLowerCase();
        let score = 0;
        if (nameLower.startsWith(q)) score = 3;
        else if (nameLower.includes(q)) score = 2;
        else if (n.type.toLowerCase().includes(q)) score = 1;
        return { ...n, score };
      })
      .filter((n) => n.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 20);
  }, [query, nodes]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = useCallback((node: NodeOption) => {
    onChange(node.id);
    setQuery(node.name);
    setOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value.trim()) {
      onChange('');
    }
  };

  const handleFocus = () => {
    setOpen(true);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          handleSelect(suggestions[highlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        if (selectedNode) setQuery(selectedNode.name);
        break;
    }
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-bg-secondary shadow-lg max-h-48 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((node, idx) => {
            const badgeColor = nodeTypeBadgeColors[node.type] ?? 'bg-gray-500';
            const isHighlighted = idx === highlightIndex;
            return (
              <li key={node.id} role="option" aria-selected={isHighlighted}>
                <button
                  type="button"
                  onClick={() => handleSelect(node)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                    isHighlighted ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary'
                  }`}
                >
                  <span className={`${badgeColor} text-white text-xs px-1.5 py-0.5 rounded-full shrink-0`}>
                    {node.type}
                  </span>
                  <span className="text-text-primary truncate">{node.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && suggestions.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-bg-secondary shadow-lg px-3 py-2 text-sm text-text-secondary">
          결과 없음
        </div>
      )}
    </div>
  );
}
