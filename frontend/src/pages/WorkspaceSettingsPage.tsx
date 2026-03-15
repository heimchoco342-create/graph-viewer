import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTemplateStore } from '../store/templateStore';
import { useAuthStore } from '../store/authStore';
import { createTemplate, updateTemplate, deleteTemplate } from '../api/templates';
import { getMenuItemsWithActive, navigateByLabel } from '../constants/navigation';
import type { WorkspaceTemplate, LevelDefinition, EdgeRule } from '../types';

const FIXED_LEVELS: LevelDefinition[] = [
  { level: 0, node_type: 'user', label: '사용자', color: '#6366f1', badge_color: '#818cf8', fixed: true },
  { level: 1, node_type: 'group', label: '그룹', color: '#3b82f6', badge_color: '#60a5fa', fixed: true },
];

export function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { templates, activeTemplate, fetchTemplates, setActiveTemplate } = useTemplateStore();

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLevels, setEditLevels] = useState<LevelDefinition[]>([]);
  const [editRules, setEditRules] = useState<EdgeRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (activeTemplate) {
      setEditName(activeTemplate.name);
      setEditDesc(activeTemplate.description ?? '');
      setEditLevels(activeTemplate.levels);
      setEditRules(activeTemplate.edge_rules);
    }
  }, [activeTemplate]);

  const customLevels = editLevels.filter((l) => !l.fixed);

  const handleAddLevel = useCallback(() => {
    const nextLevel = editLevels.length;
    setEditLevels([
      ...editLevels,
      {
        level: nextLevel,
        node_type: '',
        label: '',
        color: '#6b7280',
        badge_color: '#9ca3af',
        fixed: false,
      },
    ]);
  }, [editLevels]);

  const handleRemoveLevel = useCallback(
    (level: number) => {
      const filtered = editLevels.filter((l) => l.level !== level);
      // Re-number levels
      const renumbered = filtered.map((l, i) => ({ ...l, level: i }));
      setEditLevels(renumbered);
      // Remove edge rules referencing removed node_type
      const removedType = editLevels.find((l) => l.level === level)?.node_type;
      if (removedType) {
        setEditRules(editRules.filter((r) => r.source_type !== removedType && r.target_type !== removedType));
      }
    },
    [editLevels, editRules]
  );

  const handleUpdateLevel = useCallback(
    (level: number, field: keyof LevelDefinition, value: string) => {
      setEditLevels(
        editLevels.map((l) => (l.level === level ? { ...l, [field]: value } : l))
      );
    },
    [editLevels]
  );

  const handleAddRule = useCallback(() => {
    setEditRules([...editRules, { source_type: '', target_type: '' }]);
  }, [editRules]);

  const handleRemoveRule = useCallback(
    (idx: number) => {
      setEditRules(editRules.filter((_, i) => i !== idx));
    },
    [editRules]
  );

  const handleUpdateRule = useCallback(
    (idx: number, field: keyof EdgeRule, value: string) => {
      setEditRules(editRules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    },
    [editRules]
  );

  const handleSave = useCallback(async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: editName,
        description: editDesc || null,
        levels: editLevels,
        edge_rules: editRules.filter((r) => r.source_type && r.target_type),
      };
      if (activeTemplate) {
        const updated = await updateTemplate(activeTemplate.id, body);
        setActiveTemplate(updated);
      } else {
        const created = await createTemplate(body);
        setActiveTemplate(created);
      }
      // Refresh list
      useTemplateStore.setState({ templates: [] });
      await fetchTemplates();
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  }, [editName, editDesc, editLevels, editRules, activeTemplate, setActiveTemplate, fetchTemplates]);

  const handleDelete = useCallback(async () => {
    if (!activeTemplate) return;
    if (!confirm(`"${activeTemplate.name}" 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await deleteTemplate(activeTemplate.id);
      setActiveTemplate(null);
      useTemplateStore.setState({ templates: [] });
      await fetchTemplates();
    } catch (err) {
      alert(String(err));
    }
  }, [activeTemplate, setActiveTemplate, fetchTemplates]);

  const handleNew = useCallback(() => {
    setActiveTemplate(null);
    setEditName('');
    setEditDesc('');
    setEditLevels([...FIXED_LEVELS]);
    setEditRules([]);
  }, [setActiveTemplate]);

  const allNodeTypes = editLevels.map((l) => l.node_type).filter(Boolean);

  const sidebar = (
    <Sidebar
      menuItems={getMenuItemsWithActive(location.pathname)}
      onMenuClick={(label) => navigateByLabel(label, navigate)}
      bottomSlot={
        user && (
          <span className="text-xs text-text-secondary truncate px-3">
            {user.name}
          </span>
        )
      }
    />
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">워크스페이스 설정</h2>
            <Button variant="secondary" onClick={handleNew}>
              새 템플릿
            </Button>
          </div>

          {/* Template selector */}
          {templates.length > 0 && (
            <div className="mb-6 flex gap-2 flex-wrap">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t)}
                  className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                    activeTemplate?.id === t.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Template form */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="템플릿 이름"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Input
                label="설명"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>

            {/* Levels */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">레벨 구조</h3>
              <div className="space-y-2">
                {editLevels.map((lvl) => (
                  <div
                    key={lvl.level}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary"
                  >
                    <span className="text-xs text-text-secondary font-mono w-8">
                      L{lvl.level}
                    </span>
                    <input
                      value={lvl.node_type}
                      onChange={(e) => handleUpdateLevel(lvl.level, 'node_type', e.target.value)}
                      disabled={lvl.fixed}
                      placeholder="node_type"
                      className="flex-1 px-2 py-1 rounded border border-border bg-bg-primary text-text-primary text-sm disabled:opacity-50"
                    />
                    <input
                      value={lvl.label}
                      onChange={(e) => handleUpdateLevel(lvl.level, 'label', e.target.value)}
                      disabled={lvl.fixed}
                      placeholder="표시 이름"
                      className="flex-1 px-2 py-1 rounded border border-border bg-bg-primary text-text-primary text-sm disabled:opacity-50"
                    />
                    <input
                      type="color"
                      value={lvl.color}
                      onChange={(e) => handleUpdateLevel(lvl.level, 'color', e.target.value)}
                      disabled={lvl.fixed}
                      className="w-8 h-8 rounded border border-border cursor-pointer disabled:opacity-50"
                    />
                    {!lvl.fixed && (
                      <button
                        onClick={() => handleRemoveLevel(lvl.level)}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="레벨 삭제"
                      >
                        X
                      </button>
                    )}
                    {lvl.fixed && (
                      <span className="text-xs text-text-secondary">고정</span>
                    )}
                  </div>
                ))}
                <Button variant="secondary" onClick={handleAddLevel}>
                  + 레벨 추가
                </Button>
              </div>
            </div>

            {/* Edge Rules */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">엣지 규칙</h3>
              <p className="text-sm text-text-secondary mb-3">
                허용되는 노드 간 연결 방향을 정의합니다.
              </p>
              <div className="space-y-2">
                {editRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary"
                  >
                    <select
                      value={rule.source_type}
                      onChange={(e) => handleUpdateRule(idx, 'source_type', e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-border bg-bg-primary text-text-primary text-sm"
                    >
                      <option value="">source 선택</option>
                      {allNodeTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <span className="text-text-secondary">→</span>
                    <select
                      value={rule.target_type}
                      onChange={(e) => handleUpdateRule(idx, 'target_type', e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-border bg-bg-primary text-text-primary text-sm"
                    >
                      <option value="">target 선택</option>
                      {allNodeTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title="규칙 삭제"
                    >
                      X
                    </button>
                  </div>
                ))}
                <Button variant="secondary" onClick={handleAddRule}>
                  + 규칙 추가
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
              {activeTemplate && (
                <Button variant="secondary" onClick={handleDelete}>
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
