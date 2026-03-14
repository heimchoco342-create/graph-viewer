import { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';

const MAX_LINES = 1000;

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: 'text-gray-400',
  INFO: 'text-blue-400',
  WARNING: 'text-yellow-400',
  ERROR: 'text-red-400',
  CRITICAL: 'text-red-500 font-bold',
};

function getLogLevelClass(line: string): string {
  for (const [level, cls] of Object.entries(LEVEL_COLORS)) {
    if (line.includes(level)) return cls;
  }
  return 'text-text-secondary';
}

export function LogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // In dev, backend is on port 8000; in prod, same host
    const port = import.meta.env.DEV ? '8000' : window.location.port;
    const url = `${protocol}//${host}:${port}/ws/logs`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      setLines((prev) => {
        const next = [...prev, e.data];
        return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
      });
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  const filteredLines = filter
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  const menuItems = [
    { label: '그래프', icon: '🔗', active: location.pathname === '/' },
    { label: '업로드', icon: '📤', active: location.pathname === '/upload' },
    { label: '탐색', icon: '🔍', active: location.pathname === '/query' },
    { label: '로그', icon: '📋', active: location.pathname === '/logs' },
    { label: '도움말', icon: '❓', active: location.pathname === '/help' },
  ];

  const handleMenuClick = (label: string) => {
    const routes: Record<string, string> = {
      '그래프': '/',
      '업로드': '/upload',
      '탐색': '/query',
      '로그': '/logs',
      '도움말': '/help',
    };
    const route = routes[label];
    if (route) navigate(route);
  };

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-text-secondary">
              {connected ? '연결됨' : '재연결 중...'}
            </span>
          </div>
          <input
            type="text"
            placeholder="필터..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent w-48"
          />
          <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-blue-500"
            />
            자동 스크롤
          </label>
          <span className="text-xs text-text-secondary ml-auto">
            {filteredLines.length}줄
          </span>
          <button
            onClick={() => setLines([])}
            className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded border border-border hover:border-text-secondary transition-colors"
          >
            지우기
          </button>
        </div>

        {/* Log output */}
        <div className="flex-1 overflow-auto bg-[#0d1117] p-3 font-mono text-xs leading-5">
          {filteredLines.length === 0 ? (
            <div className="text-text-secondary text-center mt-12">
              {connected ? '로그를 기다리는 중...' : '서버에 연결할 수 없습니다'}
            </div>
          ) : (
            filteredLines.map((line, i) => (
              <div key={i} className={`whitespace-pre-wrap break-all ${getLogLevelClass(line)}`}>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </AppLayout>
  );
}
