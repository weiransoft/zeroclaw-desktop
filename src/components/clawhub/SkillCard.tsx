import React from 'react';
import { cn } from '@/lib/utils';
import { Skill } from './ClawHubPanel';
import { Star, Download, Check, Trash2, Loader2 } from 'lucide-react';

interface SkillCardProps {
  skill: Skill;
  onInstall?: () => void;
  onUninstall?: () => void;
  installed?: boolean;
  downloading?: boolean;
  downloadProgress?: number;
}

export function SkillCard({ skill, onInstall, onUninstall, installed, downloading, downloadProgress = 0 }: SkillCardProps) {
  return (
    <div className="bg-dark-900 rounded-lg border border-dark-700 p-4 mb-3 relative overflow-hidden">
      {downloading && (
        <div 
          className="absolute top-0 left-0 h-1 bg-primary-500 transition-all duration-300"
          style={{ width: `${downloadProgress}%` }}
        />
      )}
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-dark-100 font-medium">{skill.name}</h3>
            {skill.verified && (
              <span className="px-2 py-0.5 text-xs bg-primary-600 text-white rounded">
                已验证
              </span>
            )}
          </div>
          <p className="text-dark-400 text-sm mt-1">
            by {skill.author} · v{skill.version}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-400">
            <Star size={14} fill="currentColor" />
            <span className="text-sm">{skill.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-dark-400 text-sm mt-1">
            <Download size={12} />
            <span>{skill.downloads.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <p className="text-dark-300 text-sm mt-2 line-clamp-2">
        {skill.description}
      </p>
      
      <div className="flex flex-wrap gap-1 mt-2">
        {skill.tags.slice(0, 5).map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-dark-800 text-dark-300 rounded">
            {tag}
          </span>
        ))}
        {skill.tags.length > 5 && (
          <span className="px-2 py-0.5 text-xs bg-dark-800 text-dark-300 rounded">
            +{skill.tags.length - 5}
          </span>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-3">
        {installed ? (
          <>
            <button
              className="px-3 py-1.5 text-sm bg-dark-700 text-dark-400 rounded cursor-not-allowed"
              disabled
            >
              已安装
            </button>
            <button
              onClick={onUninstall}
              className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} />
              卸载
            </button>
          </>
        ) : downloading ? (
          <button
            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded flex items-center gap-2"
            disabled
          >
            <Loader2 size={14} className="animate-spin" />
            下载中... {downloadProgress}%
          </button>
        ) : (
          <button
            onClick={onInstall}
            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            安装
          </button>
        )}
      </div>
    </div>
  );
}

export default SkillCard;
