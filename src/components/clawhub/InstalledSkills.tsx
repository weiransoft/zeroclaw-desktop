import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { InstalledSkill } from './ClawHubPanel';
import { Trash2, Info, X } from 'lucide-react';

export function InstalledSkills() {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<InstalledSkill | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const installed: InstalledSkill[] = await window.electron?.invoke('clawhub:installed') || [];
      setSkills(installed);
    } catch (error) {
      console.error('Failed to load installed skills:', error);
    }
  };

  const handleUninstall = async (skillId: string) => {
    try {
      const success = await window.electron?.invoke('clawhub:uninstall', skillId);
      if (success) {
        loadSkills();
      }
    } catch (error) {
      console.error('Failed to uninstall skill:', error);
    }
  };

  const handleToggle = async (skillId: string, enabled: boolean) => {
    console.log(`Toggle skill ${skillId}: ${enabled}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-dark-500">
        <p>暂无已安装的技能</p>
        <p className="text-sm mt-1">前往"发现技能"页面搜索并安装技能</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <h3 className="text-dark-100 font-medium mb-3">
        已安装技能 ({skills.length})
      </h3>
      <div className="space-y-2">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center justify-between p-3 bg-dark-900 border border-dark-700 rounded-lg"
          >
            <div className="flex-1">
              <div className="text-dark-100 font-medium">{skill.name}</div>
              <div className="text-dark-400 text-sm">
                v{skill.version} · 安装于 {formatDate(skill.installedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={skill.enabled}
                  onChange={(e) => handleToggle(skill.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
              <button
                onClick={() => setSelectedSkill(skill)}
                className="p-1.5 text-dark-400 hover:text-dark-200 transition-colors"
              >
                <Info size={16} />
              </button>
              <button
                onClick={() => handleUninstall(skill.id)}
                className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 w-96 max-w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-dark-100 font-medium">技能详情</h3>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-dark-400 hover:text-dark-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-dark-400">ID</div>
                <div className="text-dark-100">{selectedSkill.id}</div>
              </div>
              <div>
                <div className="text-dark-400">名称</div>
                <div className="text-dark-100">{selectedSkill.name}</div>
              </div>
              <div>
                <div className="text-dark-400">版本</div>
                <div className="text-dark-100">{selectedSkill.version}</div>
              </div>
              <div>
                <div className="text-dark-400">安装时间</div>
                <div className="text-dark-100">
                  {new Date(selectedSkill.installedAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div>
                <div className="text-dark-400">路径</div>
                <div className="text-dark-100 break-all">{selectedSkill.path}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedSkill(null)}
              className="mt-4 w-full py-2 bg-dark-700 text-dark-100 rounded hover:bg-dark-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstalledSkills;
