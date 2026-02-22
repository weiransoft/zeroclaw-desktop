# ZeroClaw Desktop ClawHub 集成与 Memory 系统升级设计文档

## 1. 概述

本文档详细设计 ZeroClaw Desktop 的两大核心功能升级：
1. **ClawHub 集成**：智能体自动发现、学习、下载技能
2. **Memory 系统升级**：整合 daxian-memory-skill 特性，实现智能记忆管理

## 2. ClawHub 集成设计

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ZeroClaw Desktop                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ClawHub Integration                          │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │ Skill        │  │ Skill        │  │ Auto         │             │   │
│  │  │ Discovery    │──│ Manager      │──│ Download     │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │         │                 │                  │                     │   │
│  │         ▼                 ▼                  ▼                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Boss Approval System                       │ │   │
│  │  │                                                               │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │   │
│  │  │  │ Request     │  │ Approval    │  │ Execution   │          │ │   │
│  │  │  │ Queue       │──│ Dialog      │──│ Engine      │          │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │   │
│  │  └──────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ClawHub Server API                             │   │
│  │                                                                     │   │
│  │  GET  /api/v1/skills              # 列出所有技能                    │   │
│  │  GET  /api/v1/skills/{id}         # 获取技能详情                    │   │
│  │  GET  /api/v1/skills/search       # 搜索技能                        │   │
│  │  POST /api/v1/skills/download     # 下载技能                        │   │
│  │  GET  /api/v1/skills/categories   # 获取技能分类                    │   │
│  │  GET  /api/v1/skills/recommend    # 推荐技能                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Skill 数据结构

```typescript
interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: SkillCategory;
  tags: string[];
  dependencies: string[];
  capabilities: string[];
  rating: number;
  downloads: number;
  createdAt: number;
  updatedAt: number;
  repository?: string;
  documentation?: string;
  examples: SkillExample[];
}

interface SkillExample {
  title: string;
  description: string;
  usage: string;
  expectedOutput?: string;
}

type SkillCategory = 
  | 'memory'        // 记忆管理
  | 'analysis'      // 数据分析
  | 'automation'    // 自动化
  | 'integration'   // 系统集成
  | 'communication' // 通信协作
  | 'development'   // 开发辅助
  | 'research'      // 研究探索
  | 'creative';     // 创意生成

interface SkillDownloadRequest {
  skillId: string;
  version?: string;
  targetPath?: string;
  requestedBy: string;  // 智能体名称
  reason: string;       // 请求原因
  priority: 'low' | 'medium' | 'high';
}

interface SkillApproval {
  id: string;
  request: SkillDownloadRequest;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;  // Boss 用户
  reviewedAt?: number;
  comment?: string;
}
```

### 2.3 智能体 Skill 发现流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        智能体 Skill 发现与学习流程                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 任务分析                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Agent: "我需要处理 PDF 文档，但我没有相关技能..."                      │    │
│  │                                                                      │    │
│  │ 分析当前任务需求:                                                     │    │
│  │ - 任务类型: 文档处理                                                  │    │
│  │ - 所需能力: PDF 解析、文本提取                                        │    │
│  │ - 当前技能: 无                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  2. 技能搜索                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 调用 ClawHub API:                                                    │    │
│  │ GET /api/v1/skills/search?capabilities=pdf,parsing,text-extraction   │    │
│  │                                                                      │    │
│  │ 返回结果:                                                            │    │
│  │ [                                                                    │    │
│  │   { name: "pdf-master", rating: 4.8, downloads: 1523 },             │    │
│  │   { name: "doc-processor", rating: 4.5, downloads: 892 }            │    │
│  │ ]                                                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  3. 评估与选择                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Agent 评估:                                                          │    │
│  │ - pdf-master: 高评分，高下载量，功能匹配                              │    │
│  │ - 依赖检查: 无冲突                                                   │    │
│  │ - 安全检查: 已验证作者                                               │    │
│  │                                                                      │    │
│  │ 决定: 请求下载 pdf-master                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  4. Boss 审批请求                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ 🔔 技能下载请求                                                   │ │    │
│  │ │                                                                  │ │    │
│  │ │ 智能体: backend_developer                                        │ │    │
│  │ │ 技能: pdf-master v2.1.0                                          │ │    │
│  │ │ 原因: 需要处理用户上传的 PDF 文档                                 │ │    │
│  │ │                                                                  │ │    │
│  │ │ 技能信息:                                                        │ │    │
│  │ │ - 作者: @skillmaster (已验证)                                    │ │    │
│  │ │ - 评分: ⭐ 4.8/5.0                                               │ │    │
│  │ │ - 下载量: 1,523                                                  │ │    │
│  │ │ - 大小: 2.3 MB                                                   │ │    │
│  │ │                                                                  │ │    │
│  │ │ [查看详情] [批准下载] [拒绝] [稍后决定]                           │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│              ┌───────────────┼───────────────┐                              │
│              ▼               ▼               ▼                              │
│         [批准]          [拒绝]         [稍后]                               │
│              │               │               │                              │
│              ▼               ▼               ▼                              │
│  5. 执行下载          记录原因         加入队列                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 ClawHub API 设计

#### 2.4.1 服务端 API

```yaml
# ClawHub Server API 规范
openapi: 3.0.0
info:
  title: ClawHub API
  version: 1.0.0

paths:
  /api/v1/skills:
    get:
      summary: 列出所有技能
      parameters:
        - name: category
          in: query
          schema:
            $ref: '#/components/schemas/SkillCategory'
        - name: sort
          in: query
          schema:
            type: string
            enum: [rating, downloads, updated, name]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        200:
          description: 技能列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  skills:
                    type: array
                    items:
                      $ref: '#/components/schemas/Skill'
                  total:
                    type: integer
                  page:
                    type: integer

  /api/v1/skills/search:
    get:
      summary: 搜索技能
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
        - name: capabilities
          in: query
          schema:
            type: array
            items:
              type: string
        - name: tags
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        200:
          description: 搜索结果

  /api/v1/skills/{skillId}:
    get:
      summary: 获取技能详情
      parameters:
        - name: skillId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: 技能详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillDetail'

  /api/v1/skills/{skillId}/download:
    post:
      summary: 下载技能
      parameters:
        - name: skillId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                version:
                  type: string
      responses:
        200:
          description: 下载链接
          content:
            application/json:
              schema:
                type: object
                properties:
                  downloadUrl:
                    type: string
                  checksum:
                    type: string
                  size:
                    type: integer

  /api/v1/skills/recommend:
    get:
      summary: 推荐技能
      parameters:
        - name: context
          in: query
          schema:
            type: string
        - name: currentSkills
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        200:
          description: 推荐列表

components:
  schemas:
    Skill:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        version:
          type: string
        description:
          type: string
        author:
          type: string
        category:
          $ref: '#/components/schemas/SkillCategory'
        tags:
          type: array
          items:
            type: string
        rating:
          type: number
        downloads:
          type: integer

    SkillDetail:
      allOf:
        - $ref: '#/components/schemas/Skill'
        - type: object
          properties:
            dependencies:
              type: array
              items:
                type: string
            capabilities:
              type: array
              items:
                type: string
            examples:
              type: array
              items:
                $ref: '#/components/schemas/SkillExample'
            documentation:
              type: string
            repository:
              type: string

    SkillCategory:
      type: string
      enum:
        - memory
        - analysis
        - automation
        - integration
        - communication
        - development
        - research
        - creative

    SkillExample:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        usage:
          type: string
        expectedOutput:
          type: string
```

### 2.5 Desktop 客户端实现

#### 2.5.1 ClawHub 服务模块

```typescript
// electron/services/clawhub.ts

import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const CLAWHUB_API_BASE = 'https://api.clawhub.io/v1';

interface SkillDownloadQueue {
  pending: SkillApproval[];
  completed: SkillApproval[];
}

export class ClawHubService {
  private workspaceDir: string;
  private skillsDir: string;
  private queue: SkillDownloadQueue;
  private installedSkills: Map<string, Skill>;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.skillsDir = path.join(workspaceDir, '.skills');
    this.queue = { pending: [], completed: [] };
    this.installedSkills = new Map();
    this.ensureSkillsDir();
    this.loadInstalledSkills();
  }

  private ensureSkillsDir(): void {
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  private loadInstalledSkills(): void {
    const manifestPath = path.join(this.skillsDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      for (const skill of manifest.skills || []) {
        this.installedSkills.set(skill.id, skill);
      }
    }
  }

  async searchSkills(query: string, options?: {
    capabilities?: string[];
    category?: string;
  }): Promise<Skill[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.capabilities) {
      params.set('capabilities', options.capabilities.join(','));
    }
    if (options?.category) {
      params.set('category', options.category);
    }

    const response = await this.fetch(`${CLAWHUB_API_BASE}/skills/search?${params}`);
    return response.skills || [];
  }

  async getSkillDetail(skillId: string): Promise<SkillDetail> {
    return this.fetch(`${CLAWHUB_API_BASE}/skills/${skillId}`);
  }

  async requestSkillDownload(request: SkillDownloadRequest): Promise<SkillApproval> {
    const approval: SkillApproval = {
      id: uuidv4(),
      request,
      status: 'pending',
    };

    this.queue.pending.push(approval);
    this.notifyBoss(approval);

    return approval;
  }

  private async notifyBoss(approval: SkillApproval): Promise<void> {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('clawhub:approval-request', approval);
    });
  }

  async approveDownload(approvalId: string, comment?: string): Promise<void> {
    const approval = this.queue.pending.find(a => a.id === approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.status = 'approved';
    approval.reviewedAt = Date.now();
    approval.comment = comment;

    await this.downloadSkill(approval.request.skillId, approval.request.version);
    
    this.queue.pending = this.queue.pending.filter(a => a.id !== approvalId);
    this.queue.completed.push(approval);

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('clawhub:download-complete', approval);
    });
  }

  async rejectDownload(approvalId: string, reason: string): Promise<void> {
    const approval = this.queue.pending.find(a => a.id === approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.status = 'rejected';
    approval.reviewedAt = Date.now();
    approval.comment = reason;

    this.queue.pending = this.queue.pending.filter(a => a.id !== approvalId);
    this.queue.completed.push(approval);
  }

  private async downloadSkill(skillId: string, version?: string): Promise<void> {
    const detail = await this.getSkillDetail(skillId);
    const targetVersion = version || detail.version;
    
    const downloadInfo = await this.fetch(
      `${CLAWHUB_API_BASE}/skills/${skillId}/download`,
      { method: 'POST', body: JSON.stringify({ version: targetVersion }) }
    );

    const skillPath = path.join(this.skillsDir, skillId);
    await this.downloadAndExtract(downloadInfo.downloadUrl, skillPath);
    
    this.installedSkills.set(skillId, detail);
    this.saveManifest();
  }

  private async downloadAndExtract(url: string, targetPath: string): Promise<void> {
    // 下载并解压技能包
    const tmpPath = `${targetPath}.tmp`;
    
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpPath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(undefined);
        });
      }).on('error', (err) => {
        fs.unlinkSync(tmpPath);
        reject(err);
      });
    });

    // 解压并安装
    // ... 解压逻辑
  }

  private saveManifest(): void {
    const manifestPath = path.join(this.skillsDir, 'manifest.json');
    const manifest = {
      version: '1.0',
      updatedAt: Date.now(),
      skills: Array.from(this.installedSkills.values()),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  getInstalledSkills(): Skill[] {
    return Array.from(this.installedSkills.values());
  }

  getPendingApprovals(): SkillApproval[] {
    return this.queue.pending;
  }

  private async fetch(url: string, options?: any): Promise<any> {
    // HTTP 请求实现
  }
}
```

#### 2.5.2 IPC 处理器

```typescript
// electron/core/clawhub-handlers.ts

import { ipcMain } from 'electron';
import { ClawHubService } from '../services/clawhub';

export function setupClawHubHandlers(clawhub: ClawHubService) {
  // 搜索技能
  ipcMain.handle('clawhub:search', async (_, query: string, options?: any) => {
    return clawhub.searchSkills(query, options);
  });

  // 获取技能详情
  ipcMain.handle('clawhub:get-skill', async (_, skillId: string) => {
    return clawhub.getSkillDetail(skillId);
  });

  // 请求下载技能
  ipcMain.handle('clawhub:request-download', async (_, request: SkillDownloadRequest) => {
    return clawhub.requestSkillDownload(request);
  });

  // 批准下载
  ipcMain.handle('clawhub:approve', async (_, approvalId: string, comment?: string) => {
    return clawhub.approveDownload(approvalId, comment);
  });

  // 拒绝下载
  ipcMain.handle('clawhub:reject', async (_, approvalId: string, reason: string) => {
    return clawhub.rejectDownload(approvalId, reason);
  });

  // 获取已安装技能
  ipcMain.handle('clawhub:installed', async () => {
    return clawhub.getInstalledSkills();
  });

  // 获取待审批列表
  ipcMain.handle('clawhub:pending-approvals', async () => {
    return clawhub.getPendingApprovals();
  });
}
```

### 2.6 UI 组件设计

#### 2.6.1 技能市场视图

```tsx
// src/components/clawhub/SkillMarketView.tsx

import { useState, useEffect } from 'react';
import { Search, Download, Star, Users, Check } from 'lucide-react';

export function SkillMarketView() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'memory', name: '记忆管理', icon: '🧠' },
    { id: 'analysis', name: '数据分析', icon: '📊' },
    { id: 'automation', name: '自动化', icon: '⚡' },
    { id: 'integration', name: '系统集成', icon: '🔗' },
    { id: 'development', name: '开发辅助', icon: '💻' },
    { id: 'research', name: '研究探索', icon: '🔍' },
  ];

  const handleSearch = async () => {
    const results = await window.zeroclaw.clawhub.search(searchQuery, {
      category: selectedCategory || undefined,
    });
    setSkills(results);
  };

  const handleInstall = async (skill: Skill) => {
    await window.zeroclaw.clawhub.requestDownload({
      skillId: skill.id,
      requestedBy: 'user',
      reason: '手动安装',
      priority: 'medium',
    });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 rounded-lg"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 rounded-lg">
            搜索
          </button>
        </div>

        {/* 分类标签 */}
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 技能列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isInstalled={installedSkills.has(skill.id)}
              onInstall={() => handleInstall(skill)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkillCard({ skill, isInstalled, onInstall }: {
  skill: Skill;
  isInstalled: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="bg-dark-800 rounded-lg p-4 hover:bg-dark-750 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-dark-100">{skill.name}</h3>
          <p className="text-sm text-dark-400 mt-1">{skill.description}</p>
        </div>
        {isInstalled ? (
          <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
            <Check className="w-3 h-3 inline mr-1" />
            已安装
          </span>
        ) : (
          <button
            onClick={onInstall}
            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-dark-500">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {skill.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {skill.downloads}
        </span>
        <span>v{skill.version}</span>
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {skill.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

#### 2.6.2 审批对话框

```tsx
// src/components/clawhub/ApprovalDialog.tsx

import { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Clock, ExternalLink } from 'lucide-react';

export function ApprovalDialog() {
  const [approvals, setApprovals] = useState<SkillApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<SkillApproval | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadPendingApprovals();

    const unsubscribe = window.zeroclaw.clawhub.onApprovalRequest((approval) => {
      setApprovals((prev) => [...prev, approval]);
      // 显示通知
      showNotification(approval);
    });

    return unsubscribe;
  }, []);

  const loadPendingApprovals = async () => {
    const pending = await window.zeroclaw.clawhub.getPendingApprovals();
    setApprovals(pending);
  };

  const handleApprove = async (approvalId: string) => {
    await window.zeroclaw.clawhub.approve(approvalId, comment);
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    setSelectedApproval(null);
    setComment('');
  };

  const handleReject = async (approvalId: string, reason: string) => {
    await window.zeroclaw.clawhub.reject(approvalId, reason);
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    setSelectedApproval(null);
    setComment('');
  };

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 待审批数量徽章 */}
      <div className="relative">
        <button className="p-3 bg-orange-600 rounded-full shadow-lg hover:bg-orange-500">
          <AlertCircle className="w-5 h-5" />
        </button>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
          {approvals.length}
        </span>
      </div>

      {/* 审批面板 */}
      {selectedApproval && (
        <div className="absolute bottom-14 right-0 w-96 bg-dark-800 rounded-lg shadow-xl border border-dark-700">
          <div className="p-4 border-b border-dark-700">
            <h3 className="font-medium">技能下载请求</h3>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <span className="text-dark-500 text-sm">请求者</span>
              <p className="text-dark-100">{selectedApproval.request.requestedBy}</p>
            </div>

            <div>
              <span className="text-dark-500 text-sm">技能</span>
              <p className="text-dark-100">{selectedApproval.request.skillId}</p>
            </div>

            <div>
              <span className="text-dark-500 text-sm">原因</span>
              <p className="text-dark-100">{selectedApproval.request.reason}</p>
            </div>

            <div>
              <span className="text-dark-500 text-sm">备注</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full mt-1 p-2 bg-dark-700 rounded border border-dark-600"
                rows={2}
                placeholder="添加备注（可选）"
              />
            </div>
          </div>

          <div className="p-4 border-t border-dark-700 flex gap-2">
            <button
              onClick={() => handleApprove(selectedApproval.id)}
              className="flex-1 py-2 bg-green-600 rounded-lg hover:bg-green-500 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              批准
            </button>
            <button
              onClick={() => handleReject(selectedApproval.id, comment || '被拒绝')}
              className="flex-1 py-2 bg-red-600 rounded-lg hover:bg-red-500 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              拒绝
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 3. Memory 系统升级设计

### 3.1 整合 daxian-memory-skill 特性

基于 daxian-memory-skill 的特性，升级 ZeroClaw 的 Memory 系统：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Memory 系统升级架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  当前 ZeroClaw Memory:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - MemoryCategory: Core, Daily, Conversation, Custom                │   │
│  │ - Backend: sqlite, markdown, lucid, none                           │   │
│  │ - 基础操作: store, recall, get, list, forget, count                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  新增 daxian-memory 特性:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - MemoryType: Episodic, Semantic, Procedural, Strategic            │   │
│  │ - 智能分类: 自动识别记忆类型                                         │   │
│  │ - 重要性评估: 0-1 评分                                              │   │
│  │ - 概念提取: 自动提取关键词                                          │   │
│  │ - 自学习: 根据使用模式优化                                          │   │
│  │ - 会话反思: 自动生成会话总结                                        │   │
│  │ - 聊天历史处理: 从对话中提取结构化记忆                               │   │
│  │ - 重复检测: 避免存储重复内容                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  整合后的 Memory 系统:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Enhanced Memory System                         │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │ Memory       │  │ Memory       │  │ Memory       │             │   │
│  │  │ Store        │  │ Recall       │  │ Reflect      │             │   │
│  │  │ (增强存储)   │  │ (智能检索)   │  │ (会话反思)   │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │         │                 │                  │                     │   │
│  │         ▼                 ▼                  ▼                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Memory Intelligence Layer                  │ │   │
│  │  │                                                              │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │   │
│  │  │  │ Auto        │  │ Importance  │  │ Concept     │          │ │   │
│  │  │  │ Classifier  │  │ Evaluator   │  │ Extractor   │          │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │   │
│  │  │                                                              │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │   │
│  │  │  │ Duplicate   │  │ Learning    │  │ Session     │          │ │   │
│  │  │  │ Detector    │  │ Adapter     │  │ Summarizer  │          │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │   │
│  │  └──────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Storage Backends                           │ │   │
│  │  │                                                              │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │   │
│  │  │  │ SQLite      │  │ Markdown    │  │ Lucid       │          │ │   │
│  │  │  │ (向量搜索)  │  │ (人类可读)  │  │ (混合)      │          │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │   │
│  │  └──────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 扩展的记忆类型

```rust
// src/memory/types.rs

use serde::{Deserialize, Serialize};

/// 记忆类型 - 整合 daxian-memory 分类
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryType {
    /// 事件型记忆 - 事件和经历
    /// "我们决定...", "在会议期间..."
    Episodic,
    
    /// 语义型记忆 - 事实和知识
    /// "API使用...", "法国的首都是..."
    Semantic,
    
    /// 程序型记忆 - 操作方法信息
    /// "部署时，运行...", "步骤是..."
    Procedural,
    
    /// 战略型记忆 - 计划和决策
    /// "我们选择X是因为...", "下个季度我们将..."
    Strategic,
}

/// 记忆来源
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MemorySource {
    /// 直接输入
    Direct,
    /// 从对话中提取
    Conversation,
    /// 从文档中提取
    Document,
    /// 从代码中提取
    Code,
    /// 自动推断
    Inferred,
}

/// 增强的记忆条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedMemoryEntry {
    /// 唯一标识
    pub id: String,
    
    /// 记忆键
    pub key: String,
    
    /// 记忆内容
    pub content: String,
    
    /// 记忆类型
    pub memory_type: MemoryType,
    
    /// 原有分类（兼容）
    pub category: MemoryCategory,
    
    /// 重要性评分 (0.0 - 1.0)
    pub importance: f32,
    
    /// 提取的概念/关键词
    pub concepts: Vec<String>,
    
    /// 记忆来源
    pub source: MemorySource,
    
    /// 时间戳
    pub timestamp: String,
    
    /// 会话ID
    pub session_id: Option<String>,
    
    /// 关联的其他记忆ID
    pub related_memories: Vec<String>,
    
    /// 访问次数
    pub access_count: u32,
    
    /// 最后访问时间
    pub last_accessed: Option<String>,
    
    /// 搜索评分
    pub score: Option<f64>,
}

/// 记忆统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    /// 总记忆数
    pub total_count: usize,
    
    /// 按类型分布
    pub by_type: std::collections::HashMap<String, usize>,
    
    /// 按来源分布
    pub by_source: std::collections::HashMap<String, usize>,
    
    /// 平均重要性
    pub avg_importance: f32,
    
    /// 学习数据统计
    pub learning_stats: LearningStats,
    
    /// 最近活动
    pub recent_activity: Vec<MemoryActivity>,
}

/// 学习统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningStats {
    /// 总交互次数
    pub total_interactions: u32,
    
    /// 成功检索次数
    pub successful_recalls: u32,
    
    /// 概念使用频率
    pub concept_frequency: std::collections::HashMap<String, u32>,
    
    /// 类型偏好
    pub type_preferences: std::collections::HashMap<String, f32>,
}

/// 记忆活动记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryActivity {
    pub memory_id: String,
    pub memory_type: MemoryType,
    pub action: String,
    pub timestamp: String,
}
```

### 3.3 智能记忆处理

```rust
// src/memory/intelligence.rs

use crate::memory::types::*;
use async_trait::async_trait;

/// 记忆智能处理器
#[async_trait]
pub trait MemoryIntelligence: Send + Sync {
    /// 自动分类记忆类型
    async fn classify_memory(&self, content: &str) -> MemoryType;
    
    /// 评估记忆重要性
    async fn evaluate_importance(&self, content: &str, context: &str) -> f32;
    
    /// 提取概念/关键词
    async fn extract_concepts(&self, content: &str) -> Vec<String>;
    
    /// 检测重复记忆
    async fn detect_duplicate(&self, content: &str, existing: &[EnhancedMemoryEntry]) -> Option<String>;
    
    /// 生成会话总结
    async fn reflect_session(&self, messages: &[ChatMessage]) -> SessionReflection;
    
    /// 从聊天历史提取记忆
    async fn extract_from_chat(&self, history: &[ChatMessage]) -> Vec<EnhancedMemoryEntry>;
    
    /// 智能搜索
    async fn smart_recall(&self, query: &str, context: &RecallContext) -> Vec<EnhancedMemoryEntry>;
}

/// 搜索上下文
#[derive(Debug, Clone)]
pub struct RecallContext {
    /// 当前会话ID
    pub session_id: Option<String>,
    
    /// 时间范围
    pub time_range: Option<(i64, i64)>,
    
    /// 类型过滤
    pub memory_types: Option<Vec<MemoryType>>,
    
    /// 重要性阈值
    pub min_importance: Option<f32>,
    
    /// 最大结果数
    pub limit: usize,
}

/// 会话反思结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionReflection {
    /// 会话ID
    pub session_id: String,
    
    /// 关键决策
    pub key_decisions: Vec<String>,
    
    /// 重要发现
    pub important_findings: Vec<String>,
    
    /// 待办事项
    pub action_items: Vec<String>,
    
    /// 技术概念
    pub technical_concepts: Vec<String>,
    
    /// 总结文本
    pub summary: String,
    
    /// 时间戳
    pub timestamp: String,
}

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: Option<String>,
}

/// 默认实现
pub struct DefaultMemoryIntelligence {
    // 可以注入 LLM 客户端或其他服务
}

#[async_trait]
impl MemoryIntelligence for DefaultMemoryIntelligence {
    async fn classify_memory(&self, content: &str) -> MemoryType {
        let content_lower = content.to_lowercase();
        
        // 基于关键词的简单分类
        if content_lower.contains("决定") || content_lower.contains("选择") || 
           content_lower.contains("计划") || content_lower.contains("策略") {
            return MemoryType::Strategic;
        }
        
        if content_lower.contains("步骤") || content_lower.contains("如何") || 
           content_lower.contains("方法") || content_lower.contains("运行") {
            return MemoryType::Procedural;
        }
        
        if content_lower.contains("我们") || content_lower.contains("会议") || 
           content_lower.contains("讨论") || content_lower.contains("发生") {
            return MemoryType::Episodic;
        }
        
        MemoryType::Semantic
    }
    
    async fn evaluate_importance(&self, content: &str, context: &str) -> f32 {
        let mut score = 0.5;
        
        // 基于关键词调整重要性
        let important_keywords = ["重要", "关键", "必须", "决定", "安全", "密码"];
        for keyword in important_keywords {
            if content.contains(keyword) {
                score += 0.1;
            }
        }
        
        // 基于上下文调整
        if context.contains("用户询问") || context.contains("需要记住") {
            score += 0.15;
        }
        
        score.clamp(0.0, 1.0)
    }
    
    async fn extract_concepts(&self, content: &str) -> Vec<String> {
        let mut concepts = Vec::new();
        
        // 提取技术术语
        let tech_patterns = [
            r"\b[A-Z]{2,}\b",  // 大写缩写
            r"\b\w+_\w+\b",    // 下划线命名
            r"\b\w+\.\w+\b",   // 点分隔
        ];
        
        for pattern in tech_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.find_iter(content) {
                    concepts.push(cap.as_str().to_string());
                }
            }
        }
        
        // 提取中文关键词（简单实现）
        let keyword_patterns = [
            "API", "数据库", "配置", "部署", "测试", "代码",
            "功能", "模块", "接口", "服务", "安全", "性能",
        ];
        
        for keyword in keyword_patterns {
            if content.contains(keyword) {
                concepts.push(keyword.to_string());
            }
        }
        
        concepts.sort();
        concepts.dedup();
        concepts
    }
    
    async fn detect_duplicate(
        &self, 
        content: &str, 
        existing: &[EnhancedMemoryEntry]
    ) -> Option<String> {
        let content_normalized = content.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "");
        
        for entry in existing {
            let entry_normalized = entry.content.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "");
            
            // 简单的相似度检测
            let similarity = calculate_similarity(&content_normalized, &entry_normalized);
            if similarity > 0.85 {
                return Some(entry.id.clone());
            }
        }
        
        None
    }
    
    async fn reflect_session(&self, messages: &[ChatMessage]) -> SessionReflection {
        // 实现会话反思逻辑
        // ...
        SessionReflection {
            session_id: uuid::Uuid::new_v4().to_string(),
            key_decisions: vec![],
            important_findings: vec![],
            action_items: vec![],
            technical_concepts: vec![],
            summary: String::new(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
    
    async fn extract_from_chat(&self, history: &[ChatMessage]) -> Vec<EnhancedMemoryEntry> {
        let mut memories = Vec::new();
        
        for msg in history {
            // 分析消息内容
            let memory_type = self.classify_memory(&msg.content).await;
            let importance = self.evaluate_importance(&msg.content, "").await;
            let concepts = self.extract_concepts(&msg.content).await;
            
            // 如果重要性足够高，创建记忆
            if importance > 0.3 {
                memories.push(EnhancedMemoryEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    key: format!("chat_{}", chrono::Utc::now().timestamp()),
                    content: msg.content.clone(),
                    memory_type,
                    category: MemoryCategory::Conversation,
                    importance,
                    concepts,
                    source: MemorySource::Conversation,
                    timestamp: msg.timestamp.clone().unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                    session_id: None,
                    related_memories: vec![],
                    access_count: 0,
                    last_accessed: None,
                    score: None,
                });
            }
        }
        
        memories
    }
    
    async fn smart_recall(
        &self, 
        query: &str, 
        context: &RecallContext
    ) -> Vec<EnhancedMemoryEntry> {
        // 实现智能搜索逻辑
        vec![]
    }
}

fn calculate_similarity(a: &str, b: &str) -> f32 {
    // 简单的 Levenshtein 距离相似度
    if a == b {
        return 1.0;
    }
    
    let len_a = a.chars().count();
    let len_b = b.chars().count();
    
    if len_a == 0 || len_b == 0 {
        return 0.0;
    }
    
    // 简化实现
    let common = a.chars().filter(|c| b.contains(*c)).count();
    common as f32 / (len_a.max(len_b)) as f32
}
```

### 3.4 Desktop Memory 管理界面

```tsx
// src/components/memory/MemoryView.tsx

import { useState, useEffect } from 'react';
import { Brain, Search, Plus, Trash2, BarChart3, RefreshCw, Lightbulb } from 'lucide-react';

export function MemoryView() {
  const [memories, setMemories] = useState<EnhancedMemoryEntry[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryType | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadMemories();
    loadStats();
  }, []);

  const loadMemories = async () => {
    const result = await window.zeroclaw.memory.list({
      memoryType: selectedType || undefined,
    });
    setMemories(result);
  };

  const loadStats = async () => {
    const result = await window.zeroclaw.memory.stats();
    setStats(result);
  };

  const handleSearch = async () => {
    const results = await window.zeroclaw.memory.smartRecall(searchQuery, {
      memoryTypes: selectedType ? [selectedType] : undefined,
      limit: 20,
    });
    setMemories(results);
  };

  const handleReflect = async () => {
    // 获取当前会话消息并生成反思
    const reflection = await window.zeroclaw.memory.reflect();
    // 显示反思结果
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-medium">记忆管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReflect}
              className="px-3 py-1.5 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 flex items-center gap-1"
            >
              <Lightbulb className="w-4 h-4" />
              会话反思
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-3 py-1.5 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加记忆
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="智能搜索记忆..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 rounded-lg"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-dark-700 rounded-lg hover:bg-dark-600">
            搜索
          </button>
        </div>

        {/* 类型过滤 */}
        <div className="flex gap-2 mt-3">
          {[
            { type: null, label: '全部', icon: '📋' },
            { type: MemoryType.Episodic, label: '事件型', icon: '📅' },
            { type: MemoryType.Semantic, label: '语义型', icon: '📚' },
            { type: MemoryType.Procedural, label: '程序型', icon: '⚙️' },
            { type: MemoryType.Strategic, label: '战略型', icon: '🎯' },
          ].map(({ type, label, icon }) => (
            <button
              key={label}
              onClick={() => {
                setSelectedType(type);
                loadMemories();
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="p-4 border-b border-dark-800 bg-dark-850">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-dark-400" />
              <span className="text-sm text-dark-400">总记忆:</span>
              <span className="text-sm font-medium">{stats.total_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">平均重要性:</span>
              <span className="text-sm font-medium">{stats.avg_importance.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">交互次数:</span>
              <span className="text-sm font-medium">{stats.learning_stats.total_interactions}</span>
            </div>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onDelete={loadMemories} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryCard({ memory, onDelete }: { memory: EnhancedMemoryEntry; onDelete: () => void }) {
  const typeColors = {
    [MemoryType.Episodic]: 'bg-blue-600/20 text-blue-400',
    [MemoryType.Semantic]: 'bg-green-600/20 text-green-400',
    [MemoryType.Procedural]: 'bg-yellow-600/20 text-yellow-400',
    [MemoryType.Strategic]: 'bg-purple-600/20 text-purple-400',
  };

  const typeLabels = {
    [MemoryType.Episodic]: '事件型',
    [MemoryType.Semantic]: '语义型',
    [MemoryType.Procedural]: '程序型',
    [MemoryType.Strategic]: '战略型',
  };

  return (
    <div className="bg-dark-800 rounded-lg p-4 hover:bg-dark-750 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs ${typeColors[memory.memory_type]}`}>
              {typeLabels[memory.memory_type]}
            </span>
            <span className="text-xs text-dark-500">
              重要性: {(memory.importance * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-dark-500">
              访问: {memory.access_count}次
            </span>
          </div>
          <p className="text-dark-100">{memory.content}</p>
          {memory.concepts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memory.concepts.map((concept) => (
                <span key={concept} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
                  {concept}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={async () => {
            await window.zeroclaw.memory.forget(memory.id);
            onDelete();
          }}
          className="p-1.5 hover:bg-dark-700 rounded"
        >
          <Trash2 className="w-4 h-4 text-dark-500" />
        </button>
      </div>
      <div className="text-xs text-dark-500 mt-2">
        {new Date(memory.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
```

## 4. 配置更新

### 4.1 config.toml 扩展

```toml
# ClawHub 配置
[clawhub]
enabled = true
api_url = "https://api.clawhub.io/v1"
auto_discover = true
auto_update = false
skills_dir = ".skills"
cache_ttl_seconds = 3600

# ClawHub 审批设置
[clawhub.approval]
require_approval = true
auto_approve_trusted = false
trusted_authors = ["official", "verified"]
notification_enabled = true

# Memory 系统扩展配置
[memory]
backend = "sqlite"
auto_save = true
hygiene_enabled = true
archive_after_days = 30
max_entries = 1000

# 新增: 智能特性
[memory.intelligence]
auto_classify = true
auto_extract_concepts = true
importance_threshold = 0.3
duplicate_detection = true

# 新增: 学习设置
[memory.learning]
enabled = true
adapt_to_patterns = true
concept_frequency_tracking = true

# 新增: 会话反思
[memory.reflection]
auto_reflect = true
reflection_interval_minutes = 30
max_reflection_length = 1000
```

## 5. 实施计划

### 5.1 阶段一：ClawHub 基础集成（2周）

1. **Week 1**
   - 实现 ClawHub API 客户端
   - 创建技能搜索和详情获取功能
   - 设计技能下载和安装流程

2. **Week 2**
   - 实现 Boss 审批系统
   - 创建审批 UI 组件
   - 集成到 Desktop 主界面

### 5.2 阶段二：Memory 系统升级（3周）

1. **Week 1**
   - 扩展 Memory 类型定义
   - 实现智能分类器
   - 实现重要性评估器

2. **Week 2**
   - 实现概念提取器
   - 实现重复检测器
   - 实现会话反思功能

3. **Week 3**
   - 创建 Memory 管理 UI
   - 集成智能搜索
   - 添加统计和学习可视化

### 5.3 阶段三：集成测试和优化（1周）

- 端到端测试
- 性能优化
- 文档完善

## 6. 总结

本设计文档详细描述了 ZeroClaw Desktop 的两大核心功能升级：

1. **ClawHub 集成**
   - 智能体自动发现和学习技能
   - Boss 审批机制确保安全
   - 完整的技能生命周期管理

2. **Memory 系统升级**
   - 整合 daxian-memory-skill 的智能特性
   - 四种记忆类型：事件型、语义型、程序型、战略型
   - 自动分类、重要性评估、概念提取
   - 会话反思和学习适应
