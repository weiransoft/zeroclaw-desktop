import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SearchPanel } from './SearchPanel';
import { InstalledSkills } from './InstalledSkills';
import { ApprovalQueue } from './ApprovalQueue';
import { Package, Download, CheckCircle } from 'lucide-react';

export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  capabilities: string[];
  rating: number;
  downloads: number;
  verified: boolean;
}

export interface InstalledSkill {
  id: string;
  name: string;
  version: string;
  installedAt: number;
  enabled: boolean;
  path: string;
}

export interface SkillApproval {
  id: string;
  request: {
    skillId: string;
    version?: string;
    requestedBy: string;
    reason: string;
    priority: string;
  };
  skill?: Skill;
  status: string;
  createdAt: number;
  updatedAt: number;
  approvedBy?: string;
  approvedAt?: number;
  comment?: string;
  rejectReason?: string;
  downloadProgress?: number;
  error?: string;
}

const tabs = [
  { id: 'search', label: '发现技能', icon: Package },
  { id: 'installed', label: '已安装', icon: CheckCircle },
  { id: 'approvals', label: '待审批', icon: Download },
];

export function ClawHubPanel() {
  const [activeTab, setActiveTab] = useState('search');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const pending: SkillApproval[] = await window.electron?.invoke('clawhub:pending') || [];
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Failed to fetch pending count:', error);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);

    const cleanupApproval = window.electron?.on('clawhub:approval-request', () => {
      fetchPendingCount();
    });

    return () => {
      clearInterval(interval);
      cleanupApproval?.();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-dark-950">
      <div className="flex border-b border-dark-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'approvals' && pendingCount > 0;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-dark-200'
              )}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {showBadge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'search' && <SearchPanel />}
        {activeTab === 'installed' && <InstalledSkills />}
        {activeTab === 'approvals' && <ApprovalQueue onProcessed={() => setPendingCount(Math.max(0, pendingCount - 1))} />}
      </div>
    </div>
  );
}

export default ClawHubPanel;
