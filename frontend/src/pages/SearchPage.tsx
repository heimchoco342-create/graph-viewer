import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { SearchBar } from '../components/search/SearchBar';
import { NodeDetail } from '../components/graph/NodeDetail';
import { useSearchStore } from '../store/searchStore';
import { useAuthStore } from '../store/authStore';
import { useGraphStore } from '../store/graphStore';
import type { SearchResult } from '../components/search/SearchBar';

export function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { query, results, search, setQuery, clearResults } = useSearchStore();
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  const searchResults: SearchResult[] = results.map((r) => ({
    id: r.id,
    label: r.name,
    type: r.type,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) {
      void search(val);
    } else {
      clearResults();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const node = results.find((r) => r.id === result.id);
    if (node) {
      setSelectedNode(node);
      navigate('/');
    }
  };

  const menuItems = [
    { label: '그래프', icon: '🔗', active: location.pathname === '/' },
    { label: '검색', icon: '🔍', active: location.pathname === '/search' },
    { label: '업로드', icon: '📤', active: location.pathname === '/upload' },
    { label: '경로', icon: '🗺️', active: location.pathname === '/path' },
    { label: '쿼리', icon: '🧪', active: location.pathname === '/query' },
  ];

  const handleMenuClick = (label: string) => {
    const routes: Record<string, string> = { '그래프': '/', '검색': '/search', '업로드': '/upload', '경로': '/path', '쿼리': '/query' };
    const route = routes[label];
    if (route) navigate(route);
  };

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <Header title="검색" userName={user?.name ?? ''} />
      <div className="p-6 max-w-2xl mx-auto w-full">
        <SearchBar
          value={query}
          results={searchResults}
          onChange={handleChange}
          onResultClick={handleResultClick}
        />
      </div>
    </AppLayout>
  );
}
