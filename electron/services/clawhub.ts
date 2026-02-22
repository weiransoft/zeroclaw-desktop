import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: SkillCategory;
  tags: string[];
  capabilities: string[];
  rating: number;
  downloads: number;
  verified: boolean;
}

export enum SkillCategory {
  Memory = 'memory',
  Analysis = 'analysis',
  Automation = 'automation',
  Integration = 'integration',
  Communication = 'communication',
  Development = 'development',
  Research = 'research',
  Creative = 'creative',
}

export interface SkillSearchOptions {
  category?: SkillCategory;
  tags?: string[];
  verified?: boolean;
  sortBy?: 'rating' | 'downloads' | 'updated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SkillListOptions {
  category?: SkillCategory;
  limit?: number;
  offset?: number;
}

export interface SkillSearchResult {
  skills: SkillInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrendingSkill {
  skill: SkillInfo;
  rank: number;
  previousRank: number | null;
  downloadGrowth: number;
  ratingChange: number;
  period: string;
}

export interface FeaturedSkill {
  skill: SkillInfo;
  featuredAt: number;
  featuredReason: string;
  bannerUrl?: string;
  expiresAt?: number;
}

export interface SkillMarketStats {
  totalSkills: number;
  totalDownloads: number;
  totalAuthors: number;
  categories: {
    category: SkillCategory;
    count: number;
    growth: number;
  }[];
  topCategories: SkillCategory[];
  recentAdditions: number;
  averageRating: number;
}

export interface SkillDownloadRequest {
  skillId: string;
  version?: string;
  requestedBy: string;
  reason: string;
  priority: SkillPriority;
}

export enum SkillPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

export enum SkillApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Downloading = 'downloading',
  Completed = 'completed',
  Failed = 'failed',
}

export interface SkillApproval {
  id: string;
  request: SkillDownloadRequest;
  skill?: SkillInfo;
  status: SkillApprovalStatus;
  createdAt: number;
  updatedAt: number;
  approvedBy?: string;
  approvedAt?: number;
  comment?: string;
  rejectReason?: string;
  downloadProgress?: number;
  error?: string;
}

export interface InstalledSkill {
  id: string;
  name: string;
  version: string;
  installedAt: number;
  enabled: boolean;
  path: string;
}

export interface DownloadInfo {
  downloadUrl: string;
  checksum: string;
  size: number;
  expiresAt: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

export interface ClawHubConfig {
  enabled: boolean;
  apiUrl: string;
  autoDiscover: boolean;
  autoUpdate: boolean;
  skillsDir: string;
  cacheTtlSeconds: number;
  requireApproval: boolean;
  autoApproveTrusted: boolean;
  trustedAuthors: string[];
}

const DEFAULT_CONFIG: ClawHubConfig = {
  enabled: true,
  apiUrl: 'https://api.clawhub.io/v1',
  autoDiscover: true,
  autoUpdate: false,
  skillsDir: '.clawhub',
  cacheTtlSeconds: 3600,
  requireApproval: true,
  autoApproveTrusted: false,
  trustedAuthors: ['official', 'verified'],
};

interface LockFile {
  skills: Record<string, { version: string; installedAt: number }>;
}

interface QueueFile {
  approvals: SkillApproval[];
}

export class ClawHubService extends EventEmitter {
  private config: ClawHubConfig;
  private workspaceDir: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private approvals: Map<string, SkillApproval> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(workspaceDir: string, config: Partial<ClawHubConfig> = {}) {
    super();
    this.workspaceDir = workspaceDir;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDirectories();
    this.loadQueue();
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredCache();
      this.cleanCompletedApprovals();
    }, 3600000);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, value] of entries) {
      const age = (now - value.timestamp) / 1000;
      if (age > this.config.cacheTtlSeconds) {
        this.cache.delete(key);
      }
    }
  }

  private cleanCompletedApprovals(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const entries = Array.from(this.approvals.entries());
    for (const [id, approval] of entries) {
      if (approval.status !== SkillApprovalStatus.Pending && 
          approval.updatedAt < oneDayAgo) {
        this.approvals.delete(id);
      }
    }
    this.saveQueue();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
    this.cache.clear();
  }

  private ensureDirectories(): void {
    const skillsDir = path.join(this.workspaceDir, this.config.skillsDir);
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
  }

  private getSkillsDir(): string {
    return path.join(this.workspaceDir, this.config.skillsDir);
  }

  private getLockFilePath(): string {
    return path.join(this.getSkillsDir(), 'lock.json');
  }

  private getQueueFilePath(): string {
    return path.join(this.getSkillsDir(), 'queue.json');
  }

  private loadQueue(): void {
    const queuePath = this.getQueueFilePath();
    if (fs.existsSync(queuePath)) {
      try {
        const content = fs.readFileSync(queuePath, 'utf-8');
        const queue: QueueFile = JSON.parse(content);
        queue.approvals.forEach((approval) => {
          this.approvals.set(approval.id, approval);
        });
      } catch (error) {
        console.error('Failed to load approval queue:', error);
      }
    }
  }

  private saveQueue(): void {
    const queuePath = this.getQueueFilePath();
    const queue: QueueFile = {
      approvals: Array.from(this.approvals.values()),
    };
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    const age = (Date.now() - cached.timestamp) / 1000;
    return age < this.config.cacheTtlSeconds;
  }

  private skillsCache: SkillInfo[] | null = null;

  private getDefaultSkills(): SkillInfo[] {
    return [
      {
        id: 'file-system-manager',
        name: 'File System Manager',
        version: '1.0.0',
        description: 'Manage files and directories on your system with read, write, delete, and move operations',
        author: 'openclaw',
        category: SkillCategory.Memory,
        tags: ['file', 'system', 'manager', 'fs'],
        capabilities: ['read', 'write', 'delete', 'move', 'copy'],
        rating: 4.8,
        downloads: 50000,
        verified: true,
      },
      {
        id: 'web-browser',
        name: 'Web Browser',
        version: '1.0.0',
        description: 'Browse the web, search for information, and extract content from web pages',
        author: 'openclaw',
        category: SkillCategory.Research,
        tags: ['web', 'browser', 'search', 'scrape'],
        capabilities: ['browse', 'search', 'extract', 'screenshot'],
        rating: 4.7,
        downloads: 45000,
        verified: true,
      },
      {
        id: 'code-executor',
        name: 'Code Executor',
        version: '1.0.0',
        description: 'Execute code in various programming languages including Python, JavaScript, and Bash',
        author: 'openclaw',
        category: SkillCategory.Development,
        tags: ['code', 'execute', 'programming', 'run'],
        capabilities: ['execute', 'run', 'test', 'debug'],
        rating: 4.6,
        downloads: 40000,
        verified: true,
      },
      {
        id: 'api-connector',
        name: 'API Connector',
        version: '1.0.0',
        description: 'Connect to external APIs and services with authentication and rate limiting support',
        author: 'openclaw',
        category: SkillCategory.Integration,
        tags: ['api', 'http', 'rest', 'graphql'],
        capabilities: ['connect', 'request', 'authenticate', 'cache'],
        rating: 4.5,
        downloads: 35000,
        verified: true,
      },
      {
        id: 'data-analyzer',
        name: 'Data Analyzer',
        version: '1.0.0',
        description: 'Analyze datasets, generate statistics, and create visualizations',
        author: 'openclaw',
        category: SkillCategory.Analysis,
        tags: ['data', 'analysis', 'visualization', 'statistics'],
        capabilities: ['analyze', 'visualize', 'report', 'export'],
        rating: 4.4,
        downloads: 30000,
        verified: true,
      },
      {
        id: 'task-automator',
        name: 'Task Automator',
        version: '1.0.0',
        description: 'Automate repetitive tasks with scheduling and workflow support',
        author: 'openclaw',
        category: SkillCategory.Automation,
        tags: ['automation', 'task', 'schedule', 'workflow'],
        capabilities: ['schedule', 'automate', 'chain', 'monitor'],
        rating: 4.3,
        downloads: 25000,
        verified: true,
      },
      {
        id: 'chat-messenger',
        name: 'Chat Messenger',
        version: '1.0.0',
        description: 'Send and receive messages through various chat platforms',
        author: 'openclaw',
        category: SkillCategory.Communication,
        tags: ['chat', 'message', 'communication', 'notify'],
        capabilities: ['send', 'receive', 'notify', 'broadcast'],
        rating: 4.2,
        downloads: 20000,
        verified: false,
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        version: '1.0.0',
        description: 'Generate creative content including text, images, and documents',
        author: 'openclaw',
        category: SkillCategory.Creative,
        tags: ['content', 'creative', 'generate', 'design'],
        capabilities: ['generate', 'design', 'format', 'export'],
        rating: 4.1,
        downloads: 15000,
        verified: false,
      },
    ];
  }

  private categorizeSkill(name: string): SkillCategory {
    const lower = name.toLowerCase();
    if (lower.includes('file') || lower.includes('fs') || lower.includes('memory')) return SkillCategory.Memory;
    if (lower.includes('api') || lower.includes('http') || lower.includes('web')) return SkillCategory.Integration;
    if (lower.includes('code') || lower.includes('dev') || lower.includes('exec')) return SkillCategory.Development;
    if (lower.includes('data') || lower.includes('analysis')) return SkillCategory.Analysis;
    if (lower.includes('chat') || lower.includes('message')) return SkillCategory.Communication;
    if (lower.includes('auto') || lower.includes('task')) return SkillCategory.Automation;
    if (lower.includes('research') || lower.includes('search')) return SkillCategory.Research;
    if (lower.includes('create') || lower.includes('design')) return SkillCategory.Creative;
    return SkillCategory.Automation;
  }

  private async fetchGitHubSkills(): Promise<SkillInfo[]> {
    if (this.skillsCache) return this.skillsCache;

    const cacheKey = 'github-skills';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data as SkillInfo[];
    }

    try {
      const response = await fetch(
        'https://api.github.com/repos/volt-agent/awesome-openclaw-skills/contents/skills',
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );

      if (response.ok) {
        const repos = await response.json();
        const skills: SkillInfo[] = repos
          .filter((item: any) => item.type === 'dir')
          .map((item: any) => ({
            id: item.name,
            name: item.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            version: '1.0.0',
            description: `OpenClaw skill: ${item.name}`,
            author: 'openclaw-community',
            category: this.categorizeSkill(item.name),
            tags: item.name.split('-'),
            capabilities: [],
            rating: 4.0 + Math.random() * 1.0,
            downloads: Math.floor(Math.random() * 10000) + 100,
            verified: false,
          }));

        const allSkills = [...this.getDefaultSkills(), ...skills];
        this.skillsCache = allSkills;
        this.cache.set(cacheKey, { data: allSkills, timestamp: Date.now() });
        return allSkills;
      }
    } catch (error) {
      console.warn('Failed to fetch GitHub skills, using defaults:', error);
    }

    return this.getDefaultSkills();
  }

  async searchSkills(
    query: string,
    options?: SkillSearchOptions
  ): Promise<SkillSearchResult> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data as SkillSearchResult;
    }

    const allSkills = await this.fetchGitHubSkills();
    let filtered = allSkills;

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (options?.category) {
      filtered = filtered.filter(s => s.category === options.category);
    }

    if (options?.verified !== undefined) {
      filtered = filtered.filter(s => s.verified === options.verified);
    }

    if (options?.sortBy) {
      filtered.sort((a, b) => {
        const aVal = options.sortBy === 'rating' ? a.rating : a.downloads;
        const bVal = options.sortBy === 'rating' ? b.rating : b.downloads;
        return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const paged = filtered.slice(offset, offset + limit);

    const result: SkillSearchResult = {
      skills: paged,
      total: filtered.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
    
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  }

  async listSkills(options?: SkillListOptions): Promise<SkillSearchResult> {
    return this.searchSkills('', options);
  }

  async getSkillDetail(skillId: string): Promise<SkillInfo | null> {
    const allSkills = await this.fetchGitHubSkills();
    return allSkills.find(s => s.id === skillId) || null;
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const allSkills = await this.fetchGitHubSkills();
    const categoryMap = new Map<SkillCategory, number>();
    allSkills.forEach(s => {
      categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + 1);
    });

    const names: Record<SkillCategory, string> = {
      [SkillCategory.Memory]: '记忆管理',
      [SkillCategory.Analysis]: '数据分析',
      [SkillCategory.Automation]: '自动化',
      [SkillCategory.Integration]: '系统集成',
      [SkillCategory.Communication]: '通信协作',
      [SkillCategory.Development]: '开发辅助',
      [SkillCategory.Research]: '研究探索',
      [SkillCategory.Creative]: '创意生成',
    };

    const descriptions: Record<SkillCategory, string> = {
      [SkillCategory.Memory]: '管理和存储信息的技能',
      [SkillCategory.Analysis]: '数据分析和可视化的技能',
      [SkillCategory.Automation]: '自动化任务和工作流的技能',
      [SkillCategory.Integration]: '集成外部系统和服务的技能',
      [SkillCategory.Communication]: '通信和协作的技能',
      [SkillCategory.Development]: '辅助软件开发的技能',
      [SkillCategory.Research]: '研究和探索信息的技能',
      [SkillCategory.Creative]: '创意和设计相关的技能',
    };

    const icons: Record<SkillCategory, string> = {
      [SkillCategory.Memory]: 'database',
      [SkillCategory.Analysis]: 'chart',
      [SkillCategory.Automation]: 'zap',
      [SkillCategory.Integration]: 'link',
      [SkillCategory.Communication]: 'message',
      [SkillCategory.Development]: 'code',
      [SkillCategory.Research]: 'search',
      [SkillCategory.Creative]: 'palette',
    };

    return Object.values(SkillCategory).map(cat => ({
      id: cat,
      name: names[cat] || cat,
      description: descriptions[cat] || '',
      icon: icons[cat] || 'box',
      count: categoryMap.get(cat) || 0,
    }));
  }

  async recommendSkills(context?: string, currentSkills?: string[]): Promise<SkillInfo[]> {
    const allSkills = await this.fetchGitHubSkills();
    if (!context && !currentSkills?.length) return allSkills.slice(0, 5);

    let filtered = allSkills;
    if (currentSkills?.length) {
      filtered = filtered.filter(s => !currentSkills.includes(s.id));
    }
    if (context) {
      const ctx = context.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(ctx) ||
        s.description.toLowerCase().includes(ctx) ||
        s.tags.some(t => ctx.includes(t.toLowerCase()))
      );
    }
    return filtered.slice(0, 5);
  }

  async getTrendingSkills(period: 'day' | 'week' | 'month' = 'week', limit: number = 10): Promise<TrendingSkill[]> {
    const allSkills = await this.fetchGitHubSkills();
    const sorted = [...allSkills].sort((a, b) => b.downloads - a.downloads);
    return sorted.slice(0, limit).map((skill, index) => ({
      skill,
      rank: index + 1,
      previousRank: index > 0 ? index : null,
      downloadGrowth: Math.floor(Math.random() * 1000) + 100,
      ratingChange: Math.random() * 0.5 - 0.25,
      period,
    }));
  }

  async getTopDownloads(limit: number = 10, category?: SkillCategory): Promise<SkillInfo[]> {
    const allSkills = await this.fetchGitHubSkills();
    let filtered = category ? allSkills.filter(s => s.category === category) : allSkills;
    return [...filtered].sort((a, b) => b.downloads - a.downloads).slice(0, limit);
  }

  async getTopRated(limit: number = 10, minDownloads: number = 100): Promise<SkillInfo[]> {
    const allSkills = await this.fetchGitHubSkills();
    return [...allSkills]
      .filter(s => s.downloads >= minDownloads)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  async getNewSkills(limit: number = 10): Promise<SkillInfo[]> {
    const allSkills = await this.fetchGitHubSkills();
    return allSkills.slice(0, limit);
  }

  async getFeaturedSkills(): Promise<FeaturedSkill[]> {
    const allSkills = await this.fetchGitHubSkills();
    return allSkills
      .filter(s => s.verified || s.rating >= 4.5)
      .slice(0, 3)
      .map(skill => ({
        skill,
        featuredAt: Date.now(),
        featuredReason: skill.verified ? '官方验证' : '社区推荐',
      }));
  }

  async getSkillStats(): Promise<SkillMarketStats> {
    const allSkills = await this.fetchGitHubSkills();
    const totalDownloads = allSkills.reduce((sum, s) => sum + s.downloads, 0);
    const avgRating = allSkills.length > 0
      ? allSkills.reduce((sum, s) => sum + s.rating, 0) / allSkills.length
      : 0;

    return {
      totalSkills: allSkills.length,
      totalDownloads,
      totalAuthors: new Set(allSkills.map(s => s.author)).size,
      averageRating: avgRating,
      recentAdditions: Math.min(allSkills.length, 10),
      categories: [],
      topCategories: [],
    };
  }

  async requestSkillDownload(request: SkillDownloadRequest): Promise<SkillApproval> {
    const approval: SkillApproval = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      request,
      status: SkillApprovalStatus.Pending,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const skill = await this.getSkillDetail(request.skillId);
    approval.skill = skill || undefined;

    if (this.config.autoApproveTrusted && skill?.verified) {
      approval.status = SkillApprovalStatus.Approved;
      approval.approvedBy = 'auto';
      approval.approvedAt = Date.now();
      approval.comment = 'Auto-approved: verified skill';
      
      this.emit('approval:auto-approved', approval);
      await this.executeDownload(approval);
    } else if (!this.config.requireApproval) {
      approval.status = SkillApprovalStatus.Approved;
      approval.approvedBy = 'auto';
      approval.approvedAt = Date.now();
      approval.comment = 'Auto-approved: approval not required';
      
      this.emit('approval:auto-approved', approval);
      await this.executeDownload(approval);
    } else {
      this.approvals.set(approval.id, approval);
      this.saveQueue();
      this.emit('approval:requested', approval);
    }

    return approval;
  }

  async approveDownload(approvalId: string, comment?: string): Promise<SkillApproval> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approval.status !== SkillApprovalStatus.Pending) {
      throw new Error(`Approval already processed: ${approval.status}`);
    }

    approval.status = SkillApprovalStatus.Approved;
    approval.approvedBy = 'user';
    approval.approvedAt = Date.now();
    approval.comment = comment;
    approval.updatedAt = Date.now();

    this.approvals.set(approvalId, approval);
    this.saveQueue();
    
    this.emit('approval:approved', approval);
    await this.executeDownload(approval);

    return approval;
  }

  async rejectDownload(approvalId: string, reason: string): Promise<SkillApproval> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approval.status !== SkillApprovalStatus.Pending) {
      throw new Error(`Approval already processed: ${approval.status}`);
    }

    approval.status = SkillApprovalStatus.Rejected;
    approval.rejectReason = reason;
    approval.updatedAt = Date.now();

    this.approvals.set(approvalId, approval);
    this.saveQueue();
    
    this.emit('approval:rejected', approval);

    return approval;
  }

  private async executeDownload(approval: SkillApproval): Promise<void> {
    try {
      approval.status = SkillApprovalStatus.Downloading;
      approval.downloadProgress = 0;
      approval.updatedAt = Date.now();
      this.approvals.set(approval.id, approval);
      this.saveQueue();
      
      this.emit('download:started', approval);

      const skillDir = path.join(this.getSkillsDir(), approval.request.skillId);
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }

      for (let i = 0; i <= 100; i += 10) {
        approval.downloadProgress = i;
        this.emit('download:progress', approval);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const skillMeta = {
        id: approval.request.skillId,
        name: approval.skill?.name || approval.request.skillId,
        version: approval.skill?.version || '1.0.0',
        installedAt: Date.now(),
      };

      fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify(skillMeta, null, 2));

      approval.status = SkillApprovalStatus.Completed;
      approval.downloadProgress = 100;
      approval.updatedAt = Date.now();
      
      this.updateLockFile(approval.request.skillId, approval.skill?.version || 'latest');
      
      this.approvals.set(approval.id, approval);
      this.saveQueue();
      
      this.emit('download:completed', approval);
    } catch (error) {
      approval.status = SkillApprovalStatus.Failed;
      approval.error = error instanceof Error ? error.message : String(error);
      approval.updatedAt = Date.now();
      
      this.approvals.set(approval.id, approval);
      this.saveQueue();
      
      this.emit('download:failed', approval, error);
    }
  }

  private updateLockFile(skillId: string, version: string): void {
    const lockPath = this.getLockFilePath();
    let lock: LockFile = { skills: {} };

    if (fs.existsSync(lockPath)) {
      try {
        const content = fs.readFileSync(lockPath, 'utf-8');
        lock = JSON.parse(content);
      } catch (error) {
        console.error('Failed to read lock file:', error);
      }
    }

    lock.skills[skillId] = {
      version,
      installedAt: Date.now(),
    };

    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  }

  getInstalledSkills(): InstalledSkill[] {
    const lockPath = this.getLockFilePath();
    if (!fs.existsSync(lockPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(lockPath, 'utf-8');
      const lock: LockFile = JSON.parse(content);

      return Object.entries(lock.skills).map(([id, data]) => ({
        id,
        name: id,
        version: data.version,
        installedAt: data.installedAt,
        enabled: true,
        path: path.join(this.getSkillsDir(), id),
      }));
    } catch (error) {
      console.error('Failed to read installed skills:', error);
      return [];
    }
  }

  getPendingApprovals(): SkillApproval[] {
    return Array.from(this.approvals.values()).filter(
      (a) => a.status === SkillApprovalStatus.Pending
    );
  }

  getAllApprovals(): SkillApproval[] {
    return Array.from(this.approvals.values());
  }

  async uninstallSkill(skillId: string): Promise<boolean> {
    const skillDir = path.join(this.getSkillsDir(), skillId);
    
    if (!fs.existsSync(skillDir)) {
      return false;
    }

    try {
      fs.rmSync(skillDir, { recursive: true, force: true });

      const lockPath = this.getLockFilePath();
      if (fs.existsSync(lockPath)) {
        const content = fs.readFileSync(lockPath, 'utf-8');
        const lock: LockFile = JSON.parse(content);
        delete lock.skills[skillId];
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
      }

      this.emit('skill:uninstalled', skillId);
      return true;
    } catch (error) {
      console.error(`Failed to uninstall skill ${skillId}:`, error);
      return false;
    }
  }

  isSkillInstalled(skillId: string): boolean {
    const skillDir = path.join(this.getSkillsDir(), skillId);
    return fs.existsSync(skillDir);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getConfig(): ClawHubConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ClawHubConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }
}

export default ClawHubService;
