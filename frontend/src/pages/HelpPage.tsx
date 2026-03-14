import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';

const MCP_TOOLS = [
  {
    name: 'read_memory',
    description: '자연어로 메모리를 검색합니다. 벡터 유사도(또는 키워드 폴백)로 시드 노드를 찾고, 연결된 메모리를 자동 탐색합니다.',
    params: [
      { name: 'query', type: 'string', required: true, desc: '자연어 검색 쿼리' },
      { name: 'graph_id', type: 'string', required: false, desc: '특정 그래프로 검색 제한' },
    ],
  },
  {
    name: 'create_memory',
    description: '새 메모리 노드를 생성합니다.',
    params: [
      { name: 'name', type: 'string', required: true, desc: '메모리 이름' },
      { name: 'type', type: 'string', required: true, desc: '메모리 타입 (person, team, tech, task 등)' },
      { name: 'properties', type: 'object', required: false, desc: '추가 속성 (key-value)' },
      { name: 'graph_id', type: 'string', required: false, desc: '대상 그래프 네임스페이스' },
    ],
  },
  {
    name: 'update_memory',
    description: '기존 메모리 노드를 수정합니다.',
    params: [
      { name: 'node_id', type: 'string', required: true, desc: '수정할 메모리 UUID' },
      { name: 'name', type: 'string', required: false, desc: '새 이름' },
      { name: 'type', type: 'string', required: false, desc: '새 타입' },
      { name: 'properties', type: 'object', required: false, desc: '새 속성 (기존 속성 대체)' },
    ],
  },
  {
    name: 'delete_memory',
    description: '메모리 노드와 연결된 링크를 삭제합니다.',
    params: [
      { name: 'node_id', type: 'string', required: true, desc: '삭제할 메모리 UUID' },
    ],
  },
  {
    name: 'create_link',
    description: '두 메모리 간 연결을 생성합니다.',
    params: [
      { name: 'source_id', type: 'string', required: true, desc: '소스 메모리 UUID' },
      { name: 'target_id', type: 'string', required: true, desc: '타겟 메모리 UUID' },
      { name: 'type', type: 'string', required: true, desc: '관계 타입 (member_of, uses, depends_on 등)' },
      { name: 'graph_id', type: 'string', required: false, desc: '대상 그래프 네임스페이스' },
    ],
  },
  {
    name: 'delete_link',
    description: '두 메모리 간 연결을 삭제합니다.',
    params: [
      { name: 'edge_id', type: 'string', required: true, desc: '삭제할 연결 UUID' },
    ],
  },
];

export function HelpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: '그래프', icon: '🔗', active: location.pathname === '/' },
    { label: '업로드', icon: '📤', active: location.pathname === '/upload' },
    { label: '탐색', icon: '🔍', active: location.pathname === '/query' },
    { label: '로그', icon: '📋', active: location.pathname === '/logs' },
    { label: '도움말', icon: '❓', active: location.pathname === '/help' },
  ];

  const handleMenuClick = (label: string) => {
    const routes: Record<string, string> = {
      '그래프': '/', '업로드': '/upload', '탐색': '/query', '로그': '/logs', '도움말': '/help',
    };
    const route = routes[label];
    if (route) navigate(route);
  };

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-text-primary mb-6">MCP 도구 정의</h2>
        <p className="text-sm text-text-secondary mb-6">
          WNG MCP 서버가 제공하는 6개 도구입니다. AI 에이전트가 이 도구들을 호출하여 지식그래프를 읽고 씁니다.
        </p>

        <div className="flex flex-col gap-6">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="border border-border rounded-lg bg-bg-secondary overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary">
                <code className="text-accent font-bold text-base">{tool.name}</code>
                <p className="text-sm text-text-secondary mt-1">{tool.description}</p>
              </div>
              <div className="px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-secondary border-b border-border">
                      <th className="pb-2 pr-4 font-medium">파라미터</th>
                      <th className="pb-2 pr-4 font-medium">타입</th>
                      <th className="pb-2 pr-4 font-medium">필수</th>
                      <th className="pb-2 font-medium">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tool.params.map((p) => (
                      <tr key={p.name} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">
                          <code className="text-text-primary">{p.name}</code>
                        </td>
                        <td className="py-2 pr-4 text-text-secondary">
                          <code className="text-xs">{p.type}</code>
                        </td>
                        <td className="py-2 pr-4">
                          {p.required ? (
                            <span className="text-accent text-xs font-medium">필수</span>
                          ) : (
                            <span className="text-text-secondary text-xs">선택</span>
                          )}
                        </td>
                        <td className="py-2 text-text-secondary">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
