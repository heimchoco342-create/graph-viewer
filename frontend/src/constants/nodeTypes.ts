export interface NodeTypeOption {
  value: string;
  label: string;
}

export interface NodeTypeGroup {
  label: string;
  options: NodeTypeOption[];
}

export const NODE_TYPE_GROUPS: NodeTypeGroup[] = [
  {
    label: 'Organization',
    options: [
      { value: 'person', label: 'Person' },
      { value: 'team', label: 'Team' },
      { value: 'project', label: 'Project' },
      { value: 'tech', label: 'Tech' },
      { value: 'system', label: 'System' },
      { value: 'document', label: 'Document' },
    ],
  },
  {
    label: 'Kubernetes',
    options: [
      { value: 'k8s-pod', label: 'Pod' },
      { value: 'k8s-service', label: 'Service' },
      { value: 'k8s-deployment', label: 'Deployment' },
      { value: 'k8s-daemonset', label: 'DaemonSet' },
      { value: 'k8s-statefulset', label: 'StatefulSet' },
      { value: 'k8s-configmap', label: 'ConfigMap' },
      { value: 'k8s-secret', label: 'Secret' },
      { value: 'k8s-ingress', label: 'Ingress' },
      { value: 'k8s-namespace', label: 'Namespace' },
      { value: 'k8s-node', label: 'Node' },
      { value: 'k8s-pvc', label: 'PersistentVolumeClaim' },
      { value: 'k8s-cronjob', label: 'CronJob' },
      { value: 'k8s-job', label: 'Job' },
      { value: 'k8s-replicaset', label: 'ReplicaSet' },
      { value: 'k8s-hpa', label: 'HPA' },
    ],
  },
];

export const ALL_NODE_TYPE_OPTIONS: NodeTypeOption[] = NODE_TYPE_GROUPS.flatMap(
  (g) => g.options,
);

/** Color mapping by node type for graph visualization */
export const NODE_TYPE_COLORS: Record<string, string> = {
  // Organization
  person: '#3b82f6',
  team: '#8b5cf6',
  project: '#10b981',
  tech: '#f59e0b',
  system: '#ef4444',
  document: '#6b7280',
  // Kubernetes
  'k8s-pod': '#326ce5',
  'k8s-service': '#1d4ed8',
  'k8s-deployment': '#2563eb',
  'k8s-daemonset': '#7c3aed',
  'k8s-statefulset': '#6d28d9',
  'k8s-configmap': '#059669',
  'k8s-secret': '#dc2626',
  'k8s-ingress': '#0891b2',
  'k8s-namespace': '#475569',
  'k8s-node': '#64748b',
  'k8s-pvc': '#d97706',
  'k8s-cronjob': '#ca8a04',
  'k8s-job': '#eab308',
  'k8s-replicaset': '#4f46e5',
  'k8s-hpa': '#9333ea',
};

/** Badge color (Tailwind class) by node type */
export const NODE_TYPE_BADGE_COLORS: Record<string, string> = {
  person: 'bg-blue-500',
  team: 'bg-violet-500',
  project: 'bg-emerald-500',
  tech: 'bg-amber-500',
  system: 'bg-red-500',
  document: 'bg-gray-500',
  'k8s-pod': 'bg-blue-600',
  'k8s-service': 'bg-blue-700',
  'k8s-deployment': 'bg-blue-500',
  'k8s-daemonset': 'bg-violet-600',
  'k8s-statefulset': 'bg-violet-700',
  'k8s-configmap': 'bg-emerald-600',
  'k8s-secret': 'bg-red-600',
  'k8s-ingress': 'bg-cyan-600',
  'k8s-namespace': 'bg-slate-600',
  'k8s-node': 'bg-slate-500',
  'k8s-pvc': 'bg-amber-600',
  'k8s-cronjob': 'bg-yellow-600',
  'k8s-job': 'bg-yellow-500',
  'k8s-replicaset': 'bg-indigo-600',
  'k8s-hpa': 'bg-purple-600',
};
