export interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { label: '그래프', icon: '🔗', path: '/' },
  { label: '업로드', icon: '📤', path: '/upload' },
  { label: '탐색', icon: '🔍', path: '/query' },
  { label: '설정', icon: '⚙', path: '/settings' },
  { label: '로그', icon: '📋', path: '/logs' },
  { label: '도움말', icon: '❓', path: '/help' },
];

export function getMenuItemsWithActive(currentPath: string) {
  return MENU_ITEMS.map((item) => ({
    label: item.label,
    icon: item.icon,
    active: currentPath === item.path,
  }));
}

export function navigateByLabel(label: string, navigate: (path: string) => void) {
  const item = MENU_ITEMS.find((m) => m.label === label);
  if (item) navigate(item.path);
}
