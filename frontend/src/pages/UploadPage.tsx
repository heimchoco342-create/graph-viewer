import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { UploadPanel } from '../components/ingestion/UploadPanel';
import { IngestionStatus } from '../components/ingestion/IngestionStatus';
import { useIngestionStore } from '../store/ingestionStore';
import { useAuthStore } from '../store/authStore';
import type { IngestionJob as UIJob } from '../components/ingestion/IngestionStatus';

export function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { jobs, upload, error } = useIngestionStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uiJobs: UIJob[] = jobs.map((j) => ({
    id: j.id,
    fileName: j.filename,
    status: j.status as UIJob['status'],
  }));

  const menuItems = [
    { label: '그래프', icon: '🔗', active: location.pathname === '/' },
    { label: '업로드', icon: '📤', active: location.pathname === '/upload' },
    { label: '탐색', icon: '🔍', active: location.pathname === '/query' },
    { label: '도움말', icon: '❓', active: location.pathname === '/help' },
  ];

  const handleMenuClick = (label: string) => {
    const routes: Record<string, string> = { '그래프': '/', '업로드': '/upload', '탐색': '/query', '도움말': '/help' };
    const route = routes[label];
    if (route) navigate(route);
  };

  return (
    <AppLayout sidebar={<Sidebar menuItems={menuItems} onMenuClick={handleMenuClick} />}>
      <Header title="파일 업로드" userName={user?.name ?? ''} />
      <div className="p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {error && (
          <div className="bg-danger text-white px-4 py-2 rounded-lg" role="alert">
            {error}
          </div>
        )}
        <UploadPanel
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
        <IngestionStatus jobs={uiJobs} />
      </div>
    </AppLayout>
  );
}
