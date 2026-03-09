import { ipcMain, BrowserWindow, dialog } from 'electron';
import { ZeroClawBridge } from './zeroclaw-bridge';
import { Database } from '../store/database';
import { ClawHubService, SkillDownloadRequest, SkillSearchOptions, SkillListOptions } from '../services/clawhub';
import { localGUIExecutor } from '../services/gui-executor';

let clawHubService: ClawHubService | null = null;

// Input validation helpers
const MAX_MESSAGE_LENGTH = 100000; // 100KB
const MAX_SESSION_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 256;

function validateMessage(message: unknown): string | null {
  if (typeof message !== 'string') {
    return 'Message must be a string';
  }
  if (message.length === 0) {
    return 'Message cannot be empty';
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  }
  return null;
}

function validateSessionId(sessionId: unknown): string | null {
  if (sessionId === undefined || sessionId === null) {
    return null; // Optional
  }
  if (typeof sessionId !== 'string') {
    return 'Session ID must be a string';
  }
  if (sessionId.length > MAX_SESSION_ID_LENGTH) {
    return `Session ID too long (max ${MAX_SESSION_ID_LENGTH} characters)`;
  }
  // Strict UUID format check to prevent injection attacks
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return 'Invalid session ID format';
  }
  return null;
}

function validatePath(path: unknown): string | null {
  if (typeof path !== 'string') {
    return 'Path must be a string';
  }
  if (path.includes('../') || path.includes('..\\')) {
    return 'Path traversal detected';
  }
  // Additional path validation to prevent directory traversal
  const normalized = path.normalize();
  if (!normalized.startsWith('/') && !normalized.startsWith('~') && !normalized.match(/^[A-Za-z]:\\/)) {
    return 'Invalid path format';
  }
  return null;
}

function validateName(name: unknown): string | null {
  if (name === undefined || name === null) {
    return null; // Optional
  }
  if (typeof name !== 'string') {
    return 'Name must be a string';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name too long (max ${MAX_NAME_LENGTH} characters)`;
  }
  return null;
}

export function setupIpcHandlers(bridge: ZeroClawBridge, db: Database) {
  const workspaceDir = db.getDataDir();
  clawHubService = new ClawHubService(workspaceDir);

  clawHubService.on('approval:requested', (approval) => {
    broadcastToWindows('clawhub:approval-request', approval);
  });

  clawHubService.on('download:progress', (approval) => {
    broadcastToWindows('clawhub:download-progress', approval);
  });

  clawHubService.on('download:completed', (approval) => {
    broadcastToWindows('clawhub:download-completed', approval);
  });

  clawHubService.on('download:failed', (approval, error) => {
    broadcastToWindows('clawhub:download-failed', { approval, error: error?.message });
  });

  // ============ Chat API ============
  
  ipcMain.handle('chat:send', async (_, message: string, sessionId?: string) => {
    const msgError = validateMessage(message);
    if (msgError) {
      return { success: false, error: msgError };
    }
    
    const sessionError = validateSessionId(sessionId);
    if (sessionError) {
      return { success: false, error: sessionError };
    }
    
    return bridge.sendMessage(message, sessionId);
  });

  ipcMain.handle('chat:abort', async (_, sessionId: string) => {
    const sessionError = validateSessionId(sessionId);
    if (sessionError) {
      return { success: false, error: sessionError };
    }
    return bridge.abortSession(sessionId);
  });

  ipcMain.handle('chat:history', async (_, sessionId: string, limit?: number) => {
    const sessionError = validateSessionId(sessionId);
    if (sessionError) {
      return [];
    }
    return db.getChatHistory(sessionId, limit || 100);
  });

  ipcMain.handle('chat:sessions:list', async () => {
    return db.listSessions();
  });

  ipcMain.handle('chat:sessions:create', async (_, name?: string) => {
    const nameError = validateName(name);
    if (nameError) {
      return { success: false, error: nameError };
    }
    return db.createSession(name);
  });

  ipcMain.handle('chat:sessions:delete', async (_, sessionId: string) => {
    const sessionError = validateSessionId(sessionId);
    if (sessionError) {
      return { success: false, error: sessionError };
    }
    return db.deleteSession(sessionId);
  });

  ipcMain.handle('chat:sessions:rename', async (_, sessionId: string, name: string) => {
    const sessionError = validateSessionId(sessionId);
    if (sessionError) {
      return { success: false, error: sessionError };
    }
    const nameError = validateName(name);
    if (nameError) {
      return { success: false, error: nameError };
    }
    return db.renameSession(sessionId, name);
  });

  // ============ Swarm API ============
  
  ipcMain.handle('swarm:list', async () => {
    return bridge.listSwarmTasks();
  });

  ipcMain.handle('swarm:get', async (_, taskId: string) => {
    return bridge.getSwarmTask(taskId);
  });

  ipcMain.handle('swarm:messages', async (_, runId?: string, taskId?: string, limit?: number) => {
    if (!taskId) {
      return [];
    }
    return bridge.listSwarmMessages(taskId);
  });

  ipcMain.handle('swarm:consensus', async (_, taskId: string) => {
    return bridge.getSwarmConsensus(taskId);
  });

  // ============ Workflow API ============
  
  ipcMain.handle('workflow:list', async () => {
    return bridge.listWorkflows();
  });

  ipcMain.handle('workflow:get', async (_, id: string) => {
    return bridge.getWorkflow(id);
  });

  ipcMain.handle('workflow:create', async (_, config: any) => {
    return bridge.createWorkflow(config);
  });

  ipcMain.handle('workflow:auto-generate', async (_, prompt: string) => {
    return bridge.autoGenerateWorkflow(prompt);
  });

  ipcMain.handle('workflow:start', async (_, id: string) => {
    return bridge.startWorkflow(id);
  });

  ipcMain.handle('workflow:pause', async (_, id: string) => {
    return bridge.pauseWorkflow(id);
  });

  ipcMain.handle('workflow:resume', async (_, id: string) => {
    return bridge.resumeWorkflow(id);
  });

  ipcMain.handle('workflow:stop', async (_, id: string) => {
    return bridge.stopWorkflow(id);
  });

  ipcMain.handle('workflow:status', async (_, id: string) => {
    return bridge.getWorkflowStatus(id);
  });

  ipcMain.handle('workflow:templates:list', async () => {
    return bridge.listWorkflowTemplates();
  });

  ipcMain.handle('workflow:templates:get', async (_, id: string) => {
    return bridge.getWorkflowTemplate(id);
  });

  ipcMain.handle('workflow:roles', async () => {
    return db.getWorkflowRoles();
  });

  ipcMain.handle('workflow:phases', async () => {
    return db.getWorkflowPhases();
  });

  ipcMain.handle('workflow:team-members', async () => {
    return db.getTeamMembers();
  });

  // ============ ClawHub API ============

  ipcMain.handle('clawhub:search', async (_, query: string, options?: SkillSearchOptions) => {
    return clawHubService!.searchSkills(query, options);
  });

  ipcMain.handle('clawhub:list', async (_, options?: SkillListOptions) => {
    return clawHubService!.listSkills(options);
  });

  ipcMain.handle('clawhub:get', async (_, skillId: string) => {
    return clawHubService!.getSkillDetail(skillId);
  });

  ipcMain.handle('clawhub:categories', async () => {
    return clawHubService!.getCategories();
  });

  ipcMain.handle('clawhub:recommend', async (_, context?: string, currentSkills?: string[]) => {
    return clawHubService!.recommendSkills(context, currentSkills);
  });

  ipcMain.handle('clawhub:trending', async (_, period?: 'day' | 'week' | 'month', limit?: number) => {
    return clawHubService!.getTrendingSkills(period, limit);
  });

  ipcMain.handle('clawhub:top-downloads', async (_, limit?: number, category?: string) => {
    return clawHubService!.getTopDownloads(limit, category as any);
  });

  ipcMain.handle('clawhub:top-rated', async (_, limit?: number, minDownloads?: number) => {
    return clawHubService!.getTopRated(limit, minDownloads);
  });

  ipcMain.handle('clawhub:new-skills', async (_, limit?: number) => {
    return clawHubService!.getNewSkills(limit);
  });

  ipcMain.handle('clawhub:featured', async () => {
    return clawHubService!.getFeaturedSkills();
  });

  ipcMain.handle('clawhub:stats', async () => {
    return clawHubService!.getSkillStats();
  });

  ipcMain.handle('clawhub:request-download', async (_, request: SkillDownloadRequest) => {
    return clawHubService!.requestSkillDownload(request);
  });

  ipcMain.handle('clawhub:approve', async (_, approvalId: string, comment?: string) => {
    return clawHubService!.approveDownload(approvalId, comment);
  });

  ipcMain.handle('clawhub:reject', async (_, approvalId: string, reason: string) => {
    return clawHubService!.rejectDownload(approvalId, reason);
  });

  ipcMain.handle('clawhub:installed', async () => {
    return clawHubService!.getInstalledSkills();
  });

  ipcMain.handle('clawhub:pending', async () => {
    return clawHubService!.getPendingApprovals();
  });

  ipcMain.handle('clawhub:approvals', async () => {
    return clawHubService!.getAllApprovals();
  });

  ipcMain.handle('clawhub:uninstall', async (_, skillId: string) => {
    return clawHubService!.uninstallSkill(skillId);
  });

  ipcMain.handle('clawhub:is-installed', async (_, skillId: string) => {
    return clawHubService!.isSkillInstalled(skillId);
  });

  ipcMain.handle('clawhub:config', async () => {
    return clawHubService!.getConfig();
  });

  ipcMain.handle('clawhub:set-config', async (_, config: any) => {
    return clawHubService!.updateConfig(config);
  });

  ipcMain.handle('clawhub:clear-cache', async () => {
    clawHubService!.clearCache();
    return { success: true };
  });

  // ============ System API ============
  
  ipcMain.handle('system:status', async () => {
    return bridge.getStatus();
  });

  ipcMain.handle('system:config', async () => {
    return db.getConfig();
  });

  ipcMain.handle('system:setConfig', async (_, config: any) => {
    return db.setConfig(config);
  });

  ipcMain.handle('system:start', async () => {
    return bridge.start();
  });

  ipcMain.handle('system:stop', async () => {
    return bridge.stop();
  });

  ipcMain.handle('system:pair', async (_, pairingCode: string) => {
    return bridge.pair(pairingCode);
  });

  ipcMain.handle('system:pairing-status', async () => {
    return bridge.getPairingStatus();
  });

  ipcMain.handle('system:set-token', async (_, token: string) => {
    return bridge.setToken(token);
  });

  // ============ ZeroClaw Config API ============

  ipcMain.handle('zeroclaw:config', async () => {
    return db.getZeroclawConfig();
  });

  ipcMain.handle('zeroclaw:config-path', async () => {
    return db.getZeroclawConfigPath();
  });

  ipcMain.handle('zeroclaw:config-summary', async () => {
    return db.getZeroclawConfigSummary();
  });

  ipcMain.handle('zeroclaw:agents', async () => {
    return db.getAgents();
  });

  ipcMain.handle('zeroclaw:set-config-path', async (_, path: string) => {
    return db.setZeroclawConfigPath(path);
  });

  ipcMain.handle('zeroclaw:select-config', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 ZeroClaw 配置文件',
      filters: [
        { name: 'TOML', extensions: ['toml'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const pathError = validatePath(selectedPath);
      if (pathError) {
        return { success: false, path: null, error: pathError };
      }
      db.setZeroclawConfigPath(selectedPath);
      return { success: true, path: selectedPath };
    }

    return { success: false, path: null };
  });

  // ============ LLM Providers API ============

  ipcMain.handle('llm-providers:list', async () => {
    return db.getLLMProviders();
  });

  ipcMain.handle('llm-providers:set', async (_, providers: any[]) => {
    return db.setLLMProviders(providers);
  });

  ipcMain.handle('llm-providers:add', async (_, provider: any) => {
    return db.addLLMProvider(provider);
  });

  ipcMain.handle('llm-providers:update', async (_, id: string, data: any) => {
    return db.updateLLMProvider(id, data);
  });

  ipcMain.handle('llm-providers:remove', async (_, id: string) => {
    return db.removeLLMProvider(id);
  });

  // ============ Desktop Agents API ============

  ipcMain.handle('desktop-agents:list', async () => {
    return db.getDesktopAgents();
  });

  ipcMain.handle('desktop-agents:set', async (_, agents: any[]) => {
    return db.setDesktopAgents(agents);
  });

  ipcMain.handle('desktop-agents:add', async (_, agent: any) => {
    return db.addDesktopAgent(agent);
  });

  ipcMain.handle('desktop-agents:update', async (_, id: string, data: any) => {
    return db.updateDesktopAgent(id, data);
  });

  ipcMain.handle('desktop-agents:remove', async (_, id: string) => {
    return db.removeDesktopAgent(id);
  });

  // ============ Agent Groups API ============

  ipcMain.handle('agent-groups:list', async () => {
    const localGroups = db.getAgentGroups();
    try {
      const gatewayGroups = await bridge.listAgentGroups();
      if (gatewayGroups.length > 0) {
        return gatewayGroups;
      }
    } catch (e) {
      console.log('[IPC] Gateway agent-groups unavailable, using local');
    }
    return localGroups;
  });

  ipcMain.handle('agent-groups:set', async (_, groups: any[]) => {
    db.setAgentGroups(groups);
    for (const group of groups) {
      await bridge.createAgentGroup(group);
    }
    return { success: true };
  });

  ipcMain.handle('agent-groups:add', async (_, group: any) => {
    db.addAgentGroup(group);
    const result = await bridge.createAgentGroup(group);
    return result;
  });

  ipcMain.handle('agent-groups:update', async (_, id: string, data: any) => {
    db.updateAgentGroup(id, data);
    const result = await bridge.updateAgentGroup(id, data);
    return result;
  });

  ipcMain.handle('agent-groups:remove', async (_, id: string) => {
    db.removeAgentGroup(id);
    const result = await bridge.deleteAgentGroup(id);
    return result;
  });

  // ============ Role Mappings API ============

  ipcMain.handle('role-mappings:list', async () => {
    return bridge.listRoleMappings();
  });

  ipcMain.handle('role-mappings:create', async (_, mapping: any) => {
    return bridge.createRoleMapping(mapping);
  });

  ipcMain.handle('role-mappings:get', async (_, role: string) => {
    return bridge.getRoleMapping(role);
  });

  ipcMain.handle('role-mappings:update', async (_, role: string, data: any) => {
    return bridge.updateRoleMapping(role, data);
  });

  ipcMain.handle('role-mappings:delete', async (_, role: string) => {
    return bridge.deleteRoleMapping(role);
  });



  // ============ Prompt Optimization API ============

  ipcMain.handle('prompt:optimize', async (_, prompt: string, agentName?: string, requirements?: string) => {
    return bridge.optimizePrompt(prompt, agentName, requirements);
  });

  // 分析任务类型
  ipcMain.handle('prompt:analyze-task', async (_, message: string, tools?: string[]) => {
    return bridge.analyzeTask(message, tools || []);
  });

  // 获取 Prompt 优化配置
  ipcMain.handle('prompt:config', async () => {
    return bridge.getPromptOptimizerConfig();
  });

  // 设置 Prompt 优化配置
  ipcMain.handle('prompt:set-config', async (_, config: any) => {
    return bridge.setPromptOptimizerConfig(config);
  });

  // ============ Workflow Phase API ============

  // 获取工作流阶段详情
  ipcMain.handle('workflow:phases:get', async (_, workflowId: string) => {
    return bridge.getWorkflowPhases(workflowId);
  });

  // 阶段转换
  ipcMain.handle('workflow:phase-transition', async (_, workflowId: string, transition: any) => {
    return bridge.transitionPhase(workflowId, transition);
  });

  // 获取工作流上下文
  ipcMain.handle('workflow:context', async (_, workflowId: string) => {
    return bridge.getWorkflowContext(workflowId);
  });

  // 获取审批请求列表
  ipcMain.handle('workflow:approvals:list', async (_, workflowId?: string) => {
    return bridge.listApprovalRequests(workflowId);
  });

  // 响应审批请求
  ipcMain.handle('workflow:approval:respond', async (_, approvalId: string, approved: boolean, comment?: string) => {
    return bridge.respondToApproval(approvalId, approved, comment);
  });

  // ============ Soul Templates API ============

  ipcMain.handle('soul-templates:list', async () => {
    return bridge.getSoulTemplates();
  });

  ipcMain.handle('soul-templates:get', async (_, id: string) => {
    return bridge.getSoulTemplate(id);
  });

  ipcMain.handle('soul-templates:set', async (_, templates: any[]) => {
    return bridge.setSoulTemplates(templates);
  });

  ipcMain.handle('soul-templates:generate-prompt', async (_, soulId: string) => {
    return bridge.generateSoulPrompt(soulId);
  });

  // 获取 Soul 注入策略
  ipcMain.handle('soul:strategy', async () => {
    return bridge.getSoulInjectionStrategy();
  });

  // 设置 Soul 注入策略
  ipcMain.handle('soul:set-strategy', async (_, strategy: any) => {
    return bridge.setSoulInjectionStrategy(strategy);
  });

  // ============ MCP Server API ============

  ipcMain.handle('mcp:list', async () => {
    return bridge.listMCPServers();
  });

  ipcMain.handle('mcp:create', async (_, request: any) => {
    return bridge.createMCPServer(request);
  });

  ipcMain.handle('mcp:get', async (_, id: string) => {
    return bridge.getMCPServer(id);
  });

  ipcMain.handle('mcp:update', async (_, id: string, request: any) => {
    return bridge.updateMCPServer(id, request);
  });

  ipcMain.handle('mcp:delete', async (_, id: string) => {
    return bridge.deleteMCPServer(id);
  });

  ipcMain.handle('mcp:start', async (_, id: string) => {
    return bridge.startMCPServer(id);
  });

  ipcMain.handle('mcp:stop', async (_, id: string) => {
    return bridge.stopMCPServer(id);
  });

  ipcMain.handle('mcp:tools', async (_, id: string) => {
    return bridge.getMCPServerTools(id);
  });

  // ============ Cost Summary API ============

  ipcMain.handle('cost:summary', async () => {
    return bridge.getCostSummary();
  });

  ipcMain.handle('cost:daily', async () => {
    return bridge.getCostDaily();
  });

  // ============ Observability API ============

  /**
   * 获取轨迹列表
   */
  ipcMain.handle('observability:list-traces', async (_, query: any) => {
    return bridge.listTraces(query);
  });

  /**
   * 获取单条轨迹
   */
  ipcMain.handle('observability:get-trace', async (_, id: string) => {
    return bridge.getTrace(id);
  });

  /**
   * 获取轨迹的推理链
   */
  ipcMain.handle('observability:get-reasoning', async (_, traceId: string) => {
    return bridge.getReasoning(traceId);
  });

  /**
   * 获取轨迹的决策点
   */
  ipcMain.handle('observability:get-decisions', async (_, traceId: string) => {
    return bridge.getDecisions(traceId);
  });

  /**
   * 获取轨迹的评估结果
   */
  ipcMain.handle('observability:get-evaluation', async (_, traceId: string) => {
    return bridge.getEvaluation(traceId);
  });

  /**
   * 评估轨迹
   */
  ipcMain.handle('observability:evaluate-trace', async (_, traceId: string) => {
    return bridge.evaluateTrace(traceId);
  });

  /**
   * 聚合查询
   */
  ipcMain.handle('observability:aggregate', async (_, query: any) => {
    return bridge.aggregateObservability(query);
  });

  /**
   * 获取仪表板统计
   */
  ipcMain.handle('observability:dashboard-stats', async (_, timeRange: string) => {
    return bridge.getDashboardStats(timeRange);
  });

  /**
   * 获取告警列表
   */
  ipcMain.handle('observability:get-alerts', async (_, limit: number) => {
    return bridge.getAlerts(limit);
  });

  /**
   * 忽略告警
   */
  ipcMain.handle('observability:dismiss-alert', async (_, id: string) => {
    return bridge.dismissAlert(id);
  });

  /**
   * 获取失败模式
   */
  ipcMain.handle('observability:failure-patterns', async () => {
    return bridge.getFailurePatterns();
  });

  // ============ GUI Agent API ============

  /**
   * 获取窗口列表
   */
  ipcMain.handle('gui:windows:list', async () => {
    // 优先使用本地执行器
    return localGUIExecutor.listWindows();
  });

  /**
   * 获取前台窗口
   */
  ipcMain.handle('gui:windows:foreground', async () => {
    return localGUIExecutor.getForegroundWindow();
  });

  /**
   * 激活窗口
   */
  ipcMain.handle('gui:windows:activate', async (_, windowId: number) => {
    return localGUIExecutor.activateWindow(windowId);
  });

  /**
   * 关闭窗口
   */
  ipcMain.handle('gui:windows:close', async (_, windowId: number) => {
    return localGUIExecutor.closeWindow(windowId);
  });

  /**
   * 移动窗口
   */
  ipcMain.handle('gui:windows:move', async (_, windowId: number, x: number, y: number) => {
    return localGUIExecutor.moveWindow(windowId, x, y);
  });

  /**
   * 调整窗口大小
   */
  ipcMain.handle('gui:windows:resize', async (_, windowId: number, width: number, height: number) => {
    return localGUIExecutor.resizeWindow(windowId, width, height);
  });

  /**
   * 启动应用
   */
  ipcMain.handle('gui:app:launch', async (_, appPath: string, args?: string[]) => {
    return localGUIExecutor.launchApp(appPath, args);
  });

  /**
   * 检查应用是否已安装
   */
  ipcMain.handle('gui:app:is-installed', async (_, appName: string) => {
    return localGUIExecutor.isAppInstalled(appName);
  });

  /**
   * 执行鼠标点击
   */
  ipcMain.handle('gui:mouse:click', async (_, x: number, y: number, button?: string) => {
    return localGUIExecutor.mouseClick(x, y, button as any);
  });

  /**
   * 执行鼠标移动
   */
  ipcMain.handle('gui:mouse:move', async (_, x: number, y: number) => {
    return localGUIExecutor.mouseMove(x, y);
  });

  /**
   * 执行鼠标拖拽
   */
  ipcMain.handle('gui:mouse:drag', async (_, fromX: number, fromY: number, toX: number, toY: number) => {
    return localGUIExecutor.mouseDrag(fromX, fromY, toX, toY);
  });

  /**
   * 执行键盘输入
   */
  ipcMain.handle('gui:keyboard:type', async (_, text: string) => {
    return localGUIExecutor.keyboardType(text);
  });

  /**
   * 执行快捷键
   */
  ipcMain.handle('gui:keyboard:shortcut', async (_, keys: string[]) => {
    return localGUIExecutor.keyboardShortcut(keys);
  });

  /**
   * 执行 GUI 任务（通过网关）
   */
  ipcMain.handle('gui:task:execute', async (_, taskDescription: string) => {
    return bridge.executeGuiTask(taskDescription);
  });

  /**
   * 获取任务状态（通过网关）
   */
  ipcMain.handle('gui:task:status', async (_, taskId: string) => {
    return bridge.getGuiTaskStatus(taskId);
  });

  /**
   * 取消任务（通过网关）
   */
  ipcMain.handle('gui:task:cancel', async (_, taskId: string) => {
    return bridge.cancelGuiTask(taskId);
  });

  /**
   * 理解屏幕（通过网关）
   */
  ipcMain.handle('gui:screen:understand', async (_, screenImage: string, goal: string) => {
    return bridge.understandScreen(screenImage, goal);
  });

  /**
   * 查找 UI 元素（通过网关）
   */
  ipcMain.handle('gui:elements:find', async (_, screenImage: string, description: string) => {
    return bridge.findUiElements(screenImage, description);
  });
}

export function broadcastToWindows(event: string, data: any) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(event, data);
  });
}

export function getClawHubService(): ClawHubService | null {
  return clawHubService;
}

export function cleanupIpcHandlers(): void {
  if (clawHubService) {
    clawHubService.destroy();
    clawHubService = null;
  }
}
