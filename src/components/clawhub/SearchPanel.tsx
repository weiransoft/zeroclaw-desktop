import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SkillCard } from './SkillCard';
import { Skill, InstalledSkill } from './ClawHubPanel';
import { Search, X, Loader2, TrendingUp, Download, Star, Sparkles, Clock, BarChart3 } from 'lucide-react';

interface SearchResult {
  skills: Skill[];
  total: number;
  page: number;
  pageSize: number;
}

interface TrendingSkill {
  skill: Skill;
  rank: number;
  previousRank: number | null;
  downloadGrowth: number;
  ratingChange: number;
  period: string;
}

interface FeaturedSkill {
  skill: Skill;
  featuredAt: number;
  featuredReason: string;
  bannerUrl?: string;
}

interface SkillMarketStats {
  totalSkills: number;
  totalDownloads: number;
  totalAuthors: number;
  averageRating: number;
  recentAdditions: number;
}

const categories = [
  { value: '', label: '全部' },
  { value: 'memory', label: '记忆管理' },
  { value: 'analysis', label: '数据分析' },
  { value: 'automation', label: '自动化' },
  { value: 'integration', label: '系统集成' },
  { value: 'communication', label: '通信协作' },
  { value: 'development', label: '开发辅助' },
  { value: 'research', label: '研究探索' },
  { value: 'creative', label: '创意生成' },
];

type TabType = 'discover' | 'trending' | 'top-downloads' | 'top-rated' | 'new';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [downloadingSkills, setDownloadingSkills] = useState<Record<string, number>>({});
  
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [trendingSkills, setTrendingSkills] = useState<TrendingSkill[]>([]);
  const [topDownloadSkills, setTopDownloadSkills] = useState<Skill[]>([]);
  const [topRatedSkills, setTopRatedSkills] = useState<Skill[]>([]);
  const [newSkills, setNewSkills] = useState<Skill[]>([]);
  const [featuredSkills, setFeaturedSkills] = useState<FeaturedSkill[]>([]);
  const [stats, setStats] = useState<SkillMarketStats | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadInstalledSkills();
    loadInitialData();
    
    const cleanupProgress = window.electron?.on('clawhub:download-progress', (approval: any) => {
      setDownloadingSkills(prev => ({
        ...prev,
        [approval.request.skillId]: approval.downloadProgress || 0
      }));
    });

    const cleanupCompleted = window.electron?.on('clawhub:download-completed', (approval: any) => {
      setDownloadingSkills(prev => {
        const next = { ...prev };
        delete next[approval.request.skillId];
        return next;
      });
      loadInstalledSkills();
    });

    const cleanupFailed = window.electron?.on('clawhub:download-failed', (data: any) => {
      setDownloadingSkills(prev => {
        const next = { ...prev };
        delete next[data.approval.request.skillId];
        return next;
      });
    });

    return () => {
      cleanupProgress?.();
      cleanupCompleted?.();
      cleanupFailed?.();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'discover') {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      const statsData = await window.electron?.invoke('clawhub:stats');
      if (statsData) setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
    
    try {
      const featured = await window.electron?.invoke('clawhub:featured');
      if (featured) setFeaturedSkills(featured);
    } catch (error) {
      console.error('Failed to load featured:', error);
    }

    try {
      const defaultResult = await window.electron?.invoke('clawhub:search', '', { limit: 10 });
      if (defaultResult && defaultResult.skills.length > 0) {
        setResults(defaultResult);
      }
    } catch (error) {
      console.error('Failed to load default skills:', error);
    }
    setInitialLoading(false);
  };

  const loadTabData = async (tab: TabType) => {
    setTabLoading(true);
    try {
      switch (tab) {
        case 'trending':
          try {
            const trending = await window.electron?.invoke('clawhub:trending', 'week', 10);
            setTrendingSkills(trending || []);
          } catch (e) { setTrendingSkills([]); }
          break;
        case 'top-downloads':
          try {
            const topDownloads = await window.electron?.invoke('clawhub:top-downloads', 10);
            setTopDownloadSkills(topDownloads || []);
          } catch (e) { setTopDownloadSkills([]); }
          break;
        case 'top-rated':
          try {
            const topRated = await window.electron?.invoke('clawhub:top-rated', 10, 50);
            setTopRatedSkills(topRated || []);
          } catch (e) { setTopRatedSkills([]); }
          break;
        case 'new':
          try {
            const newSkillsData = await window.electron?.invoke('clawhub:new-skills', 10);
            setNewSkills(newSkillsData || []);
          } catch (e) { setNewSkills([]); }
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${tab} data:`, error);
    } finally {
      setTabLoading(false);
    }
  };

  const loadInstalledSkills = async () => {
    try {
      const skills: InstalledSkill[] = await window.electron?.invoke('clawhub:installed') || [];
      setInstalledSkills(skills);
    } catch (error) {
      console.error('Failed to load installed skills:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() && !category) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron?.invoke('clawhub:search', query, {
        category: category || undefined,
        limit: 20,
      });
      setResults(result || null);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (skill: Skill) => {
    try {
      await window.electron?.invoke('clawhub:request-download', {
        skillId: skill.id,
        requestedBy: 'user',
        reason: `Install skill: ${skill.name}`,
        priority: 'normal',
      });
      setDownloadingSkills(prev => ({
        ...prev,
        [skill.id]: 0
      }));
    } catch (error) {
      console.error('Failed to request download:', error);
    }
  };

  const handleUninstall = async (skillId: string) => {
    try {
      await window.electron?.invoke('clawhub:uninstall', skillId);
      loadInstalledSkills();
    } catch (error) {
      console.error('Failed to uninstall:', error);
    }
  };

  const isInstalled = (skillId: string) => {
    return installedSkills.some(s => s.id === skillId);
  };

  const isDownloading = (skillId: string) => {
    return skillId in downloadingSkills;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const tabs = [
    { id: 'discover' as TabType, label: '发现', icon: Sparkles },
    { id: 'trending' as TabType, label: '趋势榜', icon: TrendingUp },
    { id: 'top-downloads' as TabType, label: '下载榜', icon: Download },
    { id: 'top-rated' as TabType, label: '好评榜', icon: Star },
    { id: 'new' as TabType, label: '最新', icon: Clock },
  ];

  const renderTrendingSkill = (trending: TrendingSkill, index: number) => {
    const rankChange = trending.previousRank 
      ? trending.previousRank - trending.rank 
      : null;
    
    return (
      <div key={trending.skill.id} className="flex items-start gap-3 p-3 bg-dark-900 border border-dark-700 rounded-lg mb-2">
        <div className="flex flex-col items-center justify-center w-8">
          <span className={cn(
            'text-lg font-bold',
            index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-dark-400'
          )}>
            {trending.rank}
          </span>
          {rankChange !== null && (
            <span className={cn(
              'text-xs',
              rankChange > 0 ? 'text-green-400' : rankChange < 0 ? 'text-red-400' : 'text-dark-500'
            )}>
              {rankChange > 0 ? `↑${rankChange}` : rankChange < 0 ? `↓${Math.abs(rankChange)}` : '-'}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-dark-100 font-medium">{trending.skill.name}</span>
            {trending.skill.verified && (
              <span className="px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded">已验证</span>
            )}
          </div>
          <p className="text-dark-400 text-sm mt-1 line-clamp-1">{trending.skill.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <Download size={12} />
              +{formatNumber(trending.downloadGrowth)}
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} />
              {trending.skill.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <button
          onClick={() => isInstalled(trending.skill.id) ? handleUninstall(trending.skill.id) : handleInstall(trending.skill)}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            isInstalled(trending.skill.id)
              ? 'bg-dark-700 text-dark-400'
              : 'bg-primary-600 text-white hover:bg-primary-500'
          )}
        >
          {isInstalled(trending.skill.id) ? '已安装' : '安装'}
        </button>
      </div>
    );
  };

  const renderSkillList = (skills: Skill[]) => {
    if (skills.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-dark-500">
          暂无数据
        </div>
      );
    }
    
    return skills.map((skill, index) => (
      <div key={skill.id} className="flex items-start gap-3 p-3 bg-dark-900 border border-dark-700 rounded-lg mb-2">
        <div className="flex flex-col items-center justify-center w-8">
          <span className={cn(
            'text-lg font-bold',
            index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-dark-400'
          )}>
            {index + 1}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-dark-100 font-medium">{skill.name}</span>
            {skill.verified && (
              <span className="px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded">已验证</span>
            )}
          </div>
          <p className="text-dark-400 text-sm mt-1 line-clamp-1">{skill.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <Download size={12} />
              {formatNumber(skill.downloads)}
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} />
              {skill.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <button
          onClick={() => isInstalled(skill.id) ? handleUninstall(skill.id) : handleInstall(skill)}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            isInstalled(skill.id)
              ? 'bg-dark-700 text-dark-400'
              : 'bg-primary-600 text-white hover:bg-primary-500'
          )}
        >
          {isInstalled(skill.id) ? '已安装' : '安装'}
        </button>
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-dark-900 border border-dark-700 rounded-lg">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary-400" />
            <span className="text-dark-300 text-sm">
              <span className="text-dark-100 font-medium">{formatNumber(stats.totalSkills)}</span> 技能
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Download size={16} className="text-green-400" />
            <span className="text-dark-300 text-sm">
              <span className="text-dark-100 font-medium">{formatNumber(stats.totalDownloads)}</span> 下载
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-yellow-400" />
            <span className="text-dark-300 text-sm">
              <span className="text-dark-100 font-medium">{stats.averageRating.toFixed(1)}</span> 平均评分
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar (only in discover tab) */}
      {activeTab === 'discover' && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="搜索技能..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-10 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'discover' && (
          <>
            {/* Featured Skills */}
            {featuredSkills.length > 0 && !results && (
              <div className="mb-6">
                <h3 className="text-dark-100 font-medium mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400" />
                  精选推荐
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {featuredSkills.slice(0, 2).map((featured) => (
                    <div key={featured.skill.id} className="p-3 bg-gradient-to-br from-primary-900/50 to-dark-900 border border-primary-700/50 rounded-lg">
                      <div className="text-dark-100 font-medium">{featured.skill.name}</div>
                      <div className="text-dark-400 text-sm mt-1 line-clamp-2">{featured.featuredReason}</div>
                      <button
                        onClick={() => handleInstall(featured.skill)}
                        className="mt-2 px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors"
                      >
                        安装
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results && results.total > 0 && (
              <div className="mb-2 text-dark-400 text-sm">
                找到 {results.total} 个技能
              </div>
            )}

            {results ? (
              results.skills.length > 0 ? (
                results.skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    installed={isInstalled(skill.id)}
                    downloading={isDownloading(skill.id)}
                    downloadProgress={downloadingSkills[skill.id]}
                    onInstall={() => handleInstall(skill)}
                    onUninstall={() => handleUninstall(skill.id)}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-dark-500">
                  未找到匹配的技能
                </div>
              )
            ) : initialLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={24} className="animate-spin text-primary-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-dark-500">
                输入关键词搜索技能
              </div>
            )}
          </>
        )}

        {activeTab === 'trending' && (
          tabLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-primary-400" />
            </div>
          ) : (
            <>
              <div className="mb-3 text-dark-400 text-sm flex items-center gap-2">
                <TrendingUp size={14} />
                本周热门趋势
              </div>
              {trendingSkills.map((trending, index) => renderTrendingSkill(trending, index))}
            </>
          )
        )}

        {activeTab === 'top-downloads' && (
          tabLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-primary-400" />
            </div>
          ) : (
            <>
              <div className="mb-3 text-dark-400 text-sm flex items-center gap-2">
                <Download size={14} />
                下载量排行
              </div>
              {renderSkillList(topDownloadSkills)}
            </>
          )
        )}

        {activeTab === 'top-rated' && (
          tabLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-primary-400" />
            </div>
          ) : (
            <>
              <div className="mb-3 text-dark-400 text-sm flex items-center gap-2">
                <Star size={14} />
                好评排行
              </div>
              {renderSkillList(topRatedSkills)}
            </>
          )
        )}

        {activeTab === 'new' && (
          tabLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-primary-400" />
            </div>
          ) : (
            <>
              <div className="mb-3 text-dark-400 text-sm flex items-center gap-2">
                <Clock size={14} />
                最新上架
              </div>
              {renderSkillList(newSkills)}
            </>
          )
        )}
      </div>
    </div>
  );
}

export default SearchPanel;
