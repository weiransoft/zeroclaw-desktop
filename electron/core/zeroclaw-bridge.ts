import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { safeStorage } from 'electron';
import { Database } from '../store/database';
import { broadcastToWindows } from './ipc-handlers';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  arguments: any;
  result?: string;
  success?: boolean;
  duration?: number;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_WORKSPACE = path.join(os.homedir(), 'claw');
const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_PORT = 8080;

const MAX_MESSAGE_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ACCUMULATED_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * SSE 流式解析器
 * 高性能的 Server-Sent Events 解析器，避免频繁的字符串 split 操作
 */
class SSEParser {
  private buffer = '';
  
  /**
   * 解析 SSE 数据块
   * @param chunk 接收到的数据块
   * @returns 解析后的事件数组
   */
  parse(chunk: string): any[] {
    this.buffer += chunk;
    const events: any[] = [];
    let newlineIndex: number;
    
    // 使用 indexOf 查找换行符，避免 split 整个 buffer
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.substring(5).trim());
          events.push(data);
        } catch (e) {
          // 解析失败时保留原始数据用于调试
          console.warn('[SSE] Parse error:', line.substring(0, 100));
        }
      }
    }
    
    return events;
  }
  
  /**
   * 重置解析器状态
   */
  reset(): void {
    this.buffer = '';
  }
}

export class ZeroClawBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private db: Database;
  private currentSessionId: string | null = null;
  private isRunning = false;
  private messageBuffer = '';
  private workspaceDir: string;
  private useGateway = true;
  private gatewayAvailable = false;
  private bearerToken: string | null = null;
  private isPaired = false;
  private accumulatedContent: string = '';
  private processEventHandlers: Array<() => void> = [];
  private checkGatewayPromise: Promise<void> | null = null;
  
  // 数据库异步批量写入优化
  private messageQueue: Array<{sessionId: string, message: Message}> = [];
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY_MS = 100; // 防抖延迟

  constructor(db: Database) {
    super();
    this.db = db;
    this.workspaceDir = DEFAULT_WORKSPACE;
    this.updateWorkspaceFromConfig();
    this.loadSavedToken();
    this.loadTokenFromConfig();  // 尝试从配置文件加载token
    // 异步检查网关状态，不阻塞构造函数
    this.checkGateway().catch(err => {
      console.log('Error checking gateway during initialization:', err);
    });
  }

  private loadToken(): void {
    // Deprecated - use loadSavedToken instead
    this.loadSavedToken();
  }

  /**
   * 安全保存 Token
   * 使用系统级加密存储，拒绝不安全的明文存储
   * @param token 要保存的 Token
   * @throws Error 如果系统不支持加密存储
   */
  private saveToken(token: string): void {
    // 验证 token 格式
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }
    
    // 验证 token 前缀
    if (!token.startsWith('zc_')) {
      throw new Error('Invalid token prefix');
    }
    
    // 验证 token 长度（防止过长的 token）
    if (token.length > 200) {
      throw new Error('Token too long');
    }
    
    this.bearerToken = token;
    this.isPaired = true;
    
    // 使用 safeStorage 进行加密存储
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      this.db.setSetting('gateway_token_encrypted', encrypted.toString('base64'));
      this.db.setSetting('gateway_token', ''); // 清除明文
    } else {
      // 如果系统不支持加密，拒绝存储并抛出错误
      console.error('Token encryption not available on this system');
      throw new Error('Token encryption not available. Please ensure your system supports secure storage.');
    }
  }
  
  private loadSavedToken(): void {
    // Try encrypted token first
    const encryptedToken = this.db.getSetting('gateway_token_encrypted');
    if (encryptedToken) {
      try {
        // Check if safeStorage is available
        if (safeStorage.isEncryptionAvailable()) {
          const buffer = Buffer.from(encryptedToken, 'base64');
          const token = safeStorage.decryptString(buffer);
          if (token && token.startsWith('zc_')) {
            this.bearerToken = token;
            this.isPaired = true;
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to decrypt token:', e);
      }
    }
    
    // Fallback to plaintext token
    const token = this.db.getSetting('gateway_token');
    if (token && token.startsWith('zc_')) {
      this.bearerToken = token;
      this.isPaired = true;
    }
  }

  /**
   * 从配置文件加载配对token
   * 如果本地没有保存的token，则尝试从zeroclaw配置文件中获取
   */
  private loadTokenFromConfig(): void {
    // 如果已有token，则不从配置文件加载
    if (this.bearerToken) {
      return;
    }

    // 定义安全的配置文件路径，防止路径遍历攻击
    const configPaths = [
      path.join(os.homedir(), '.zeroclaw', 'config.toml'),
      path.join(os.homedir(), '.config', 'zeroclaw', 'config.toml'),
    ];

    for (const configPath of configPaths) {
      try {
        // 验证路径安全性
        const normalizedPath = path.resolve(configPath);
        const homeDir = path.resolve(os.homedir());
        
        // 确保路径在用户目录下，防止路径遍历
        if (!normalizedPath.startsWith(homeDir)) {
          console.warn(`Config path ${configPath} is outside home directory, skipping...`);
          continue;
        }
        
        if (fs.existsSync(normalizedPath)) {
          const content = fs.readFileSync(normalizedPath, 'utf-8');
          // 简单解析TOML格式，查找gateway下的paired_tokens
          const lines = content.split('\n');
          let inGatewaySection = false;
          
          for (const line of lines) {
            // 检查是否进入gateway部分
            if (line.trim().startsWith('[gateway]')) {
              inGatewaySection = true;
              continue;
            }
            
            // 检查是否离开gateway部分
            if (line.trim().startsWith('[') && line.trim().endsWith(']') && !line.includes('gateway')) {
              inGatewaySection = false;
              continue;
            }
            
            // 在gateway部分查找paired_tokens
            if (inGatewaySection && line.includes('paired_tokens')) {
              // 解析paired_tokens数组，例如：paired_tokens = ["token1", "token2"]
              const match = line.match(/paired_tokens\s*=\s*\[(.*)\]/);
              if (match) {
                const tokensStr = match[1].trim();
                // 提取引号内的token
                const tokenMatches = tokensStr.match(/"([^"]+)"/g);
                if (tokenMatches && tokenMatches.length > 0) {
                  // 使用第一个token（如果有多个的话）
                  const tokenValue = tokenMatches[0].replace(/"/g, '');
                  if (tokenValue && tokenValue.length > 0) {
                    // 我们只获取到哈希后的token，无法还原原始token
                    // 所以这种方法不可行，我们需要通过API获取新的token
                    console.log('Found paired tokens in config, but hashed tokens cannot be used directly');
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read config file ${configPath}:`, error);
      }
    }
  }

  /**
   * 配对网关
   * @param pairingCode 配对码
   * @returns 配对结果
   */
  async pair(pairingCode: string): Promise<{ success: boolean; message: string }> {
    // 验证配对码格式
    if (!pairingCode || typeof pairingCode !== 'string') {
      return { success: false, message: '配对码不能为空' };
    }
    
    // 去除前后空格
    const trimmedCode = pairingCode.trim();
    
    // 验证配对码长度（通常是 6-8 位）
    if (trimmedCode.length < 4 || trimmedCode.length > 16) {
      return { success: false, message: '配对码长度无效' };
    }
    
    // 验证配对码格式（只允许字母和数字）
    const codeRegex = /^[A-Z0-9]+$/i;
    if (!codeRegex.test(trimmedCode)) {
      return { success: false, message: '配对码格式无效，只允许字母和数字' };
    }
    
    try {
      const result = await this.gatewayRequest('POST', '/pair', null, 5000, { 'X-Pairing-Code': trimmedCode });
      
      if (result.paired && result.token) {
        this.saveToken(result.token);
        this.isPaired = true;
        broadcastToWindows('system:log', { level: 'info', message: 'Successfully paired with ZeroClaw Gateway' });
        broadcastToWindows('system:paired', { isPaired: true });
        return { success: true, message: '配对成功' };
      } else if (result.error) {
        return { success: false, message: result.error };
      }
      
      return { success: false, message: '配对失败' };
    } catch (err: any) {
      return { success: false, message: `配对错误: ${err.message}` };
    }
  }

  getPairingStatus(): { gatewayAvailable: boolean; isPaired: boolean } {
    return {
      gatewayAvailable: this.gatewayAvailable,
      isPaired: this.isPaired,
    };
  }

  setToken(token: string): { success: boolean; message: string } {
    if (!token || !token.startsWith('zc_')) {
      return { success: false, message: '无效的 Token 格式' };
    }
    this.saveToken(token);
    this.isPaired = true;
    broadcastToWindows('system:log', { level: 'info', message: 'Token 设置成功' });
    broadcastToWindows('system:paired', { isPaired: true });
    return { success: true, message: 'Token 设置成功' };
  }

  private checkGatewayLock: boolean = false;

  /**
   * 检查网关状态
   * 使用锁机制防止并发调用
   * @returns Promise，当检查完成时解析
   */
  async checkGateway(): Promise<void> {
    // 如果已经有一个检查在进行中，等待它完成
    if (this.checkGatewayPromise) {
      return this.checkGatewayPromise;
    }
    
    // 使用锁机制防止并发
    if (this.checkGatewayLock) {
      console.log('[ZeroClawBridge] Gateway check already in progress, waiting...');
      // 等待锁释放
      while (this.checkGatewayLock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.checkGatewayLock = true;
    
    // 创建新的检查 Promise
    this.checkGatewayPromise = (async () => {
      try {
        const result = await this.gatewayRequest('GET', '/health', null, 2000);
        if (result && result.status === 'ok') {
          this.gatewayAvailable = true;
          this.isRunning = true;
          
          if (this.bearerToken) {
            const tokenValid = await this.verifyToken();
            if (!tokenValid) {
              console.log('[ZeroClawBridge] Token is invalid, clearing...');
              this.clearToken();
              this.isPaired = false;
            } else {
              this.isPaired = true;
            }
          } else {
            this.isPaired = result.paired === true;
            // 如果网关显示已配对但本地没有token，尝试使用已知的默认token
            if (this.isPaired && !this.bearerToken) {
              await this.tryKnownTokens();
            }
          }
          
          console.log('[ZeroClawBridge] Gateway is available, paired:', this.isPaired);
          broadcastToWindows('system:log', { level: 'info', message: 'Connected to ZeroClaw Gateway' });
        }
      } catch (err) {
        this.gatewayAvailable = false;
        console.log('[ZeroClawBridge] Gateway not available, will need to start manually');
      } finally {
        // 清除 Promise 引用和锁，允许下次检查
        this.checkGatewayPromise = null;
        this.checkGatewayLock = false;
      }
    })();

    return this.checkGatewayPromise;
  }

  /**
   * 尝试使用已知的token进行认证
   * 当网关显示已配对但本地没有token时调用
   */
  private async tryKnownTokens(): Promise<void> {
    // 目前我们没有直接的方法从配置获取token，但我们可以检查是否存在已知的配对
    // 最好的方法是让用户手动设置token或重新配对
    console.log('Gateway is paired but no local token found, token sync needed');
    // 在这里我们可以触发一个事件，通知UI需要进行配对同步
    broadcastToWindows('system:need-token-sync', { 
      message: 'Gateway is paired but local token not synchronized. Please re-pair or manually set token.' 
    });
  }

  private async verifyToken(): Promise<boolean> {
    try {
      const result = await this.gatewayRequest('POST', '/webhook', { message: '__ping__' }, 5000);
      return result && result.response !== undefined;
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        return false;
      }
      return false;
    }
  }

  private clearToken(): void {
    this.bearerToken = null;
    this.isPaired = false;
    this.db.deleteSetting('gateway_token');
  }

  private gatewayRequest(method: string, path: string, body: any = null, timeout: number = 300000, customHeaders: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      // 验证路径，防止 SSRF 攻击
      if (!this.isValidPath(path)) {
        reject(new Error('Invalid path for gateway request'));
        return;
      }
      
      const bodyStr = body ? JSON.stringify(body) : null;
      
      const headers: http.OutgoingHttpHeaders = {
        'Content-Type': 'application/json',
        ...customHeaders,
      };

      if (this.bearerToken && !customHeaders['X-Pairing-Code']) {
        headers['Authorization'] = `Bearer ${this.bearerToken}`;
      }

      if (bodyStr) {
        headers['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const options: http.RequestOptions = {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: path,
        method: method,
        headers: headers,
        timeout: timeout,
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          // 防止响应过大导致内存问题
          data += chunk;
          if (data.length > MAX_MESSAGE_BUFFER_SIZE) {
            req.destroy();
            reject(new Error('Response too large'));
          }
        });
        res.on('end', () => {
          try {
            if (data.trim()) {
              resolve(JSON.parse(data));
            } else {
              resolve({});
            }
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }
  
  /**
   * 网关流式请求 (SSE)
   * @param method HTTP 方法
   * @param path 请求路径
   * @param body 请求体
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  private gatewayStreamRequest(
    method: string,
    path: string,
    body: any = null,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const abortController = new AbortController();
    
    // 验证路径，防止 SSRF 攻击
    if (!this.isValidPath(path)) {
      onError(new Error('Invalid path for gateway request'));
      return abortController;
    }
    
    const bodyStr = body ? JSON.stringify(body) : null;
    
    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
    };

    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    }

    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options: http.RequestOptions = {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path: path,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let buffer = '';
      
      // SSE 事件解析
      const parseSSE = (data: string) => {
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const eventData = line.substring(5).trim();
            if (eventData) {
              try {
                const parsed = JSON.parse(eventData);
                onChunk(parsed);
              } catch (e) {
                console.log('Failed to parse SSE event:', eventData);
              }
            }
          }
        }
      };
      
      res.on('data', (chunk) => {
        if (abortController.signal.aborted) {
          req.destroy();
          return;
        }
        
        buffer += chunk.toString();
        
        // 处理完整的 SSE 事件
        while (buffer.includes('\n\n')) {
          const parts = buffer.split('\n\n');
          const event = parts.shift();
          if (event) {
            parseSSE(event);
          }
          buffer = parts.join('\n\n');
        }
      });
      
      res.on('end', () => {
        onComplete();
      });
      
      res.on('error', (err) => {
        onError(err);
      });
    });

    req.on('error', (err) => {
      onError(err);
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
    
    // 添加中止处理
    abortController.signal.addEventListener('abort', () => {
      req.destroy();
    });
    
    return abortController;
  }
  
  private isValidPath(path: string): boolean {
    // 验证路径不包含危险字符，防止 SSRF 攻击
    if (path.includes('..') || path.includes(';') || path.includes('&')) {
      return false;
    }
    // 确保路径以 / 开头
    if (!path.startsWith('/')) {
      return false;
    }
    return true;
  }

  private updateWorkspaceFromConfig() {
    const config = this.db.getZeroclawConfig();
    if (config?.workflow?.workflow_dir) {
      this.workspaceDir = config.workflow.workflow_dir;
    }
  }

  getWorkspaceDir(): string {
    return this.workspaceDir;
  }

  setWorkspaceDir(dir: string): void {
    this.workspaceDir = dir;
  }

  async start(): Promise<{ status: string }> {
    if (this.isRunning) {
      return { status: 'already_running' };
    }

    await this.checkGateway();
    
    if (this.gatewayAvailable) {
      this.isRunning = true;
      return { status: 'connected' };
    }

    return new Promise((resolve, reject) => {
      this.updateWorkspaceFromConfig();
      
      const zeroclawPath = this.findZeroClawBinary();
      const configPath = this.db.getZeroclawConfigPath();
      
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        RUST_LOG: 'info',
      };

      if (configPath) {
        env.ZEROCLAW_CONFIG = configPath;
      }

      console.log(`Starting ZeroClaw with workspace: ${this.workspaceDir}`);
      console.log(`Config path: ${configPath}`);
      
      this.process = spawn(zeroclawPath, ['agent', '--json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.workspaceDir,
        env,
      });

      // 保存事件处理器的清理函数
      const cleanupStdout = () => {
        if (this.process?.stdout) {
          this.process.stdout.removeAllListeners('data');
        }
      };
      
      const cleanupStderr = () => {
        if (this.process?.stderr) {
          this.process.stderr.removeAllListeners('data');
        }
      };
      
      const cleanupProcess = () => {
        if (this.process) {
          this.process.removeAllListeners('close');
          this.process.removeAllListeners('error');
        }
      };

      this.processEventHandlers.push(cleanupStdout, cleanupStderr, cleanupProcess);

      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.handleLog('stderr', data.toString());
      });

      this.process.on('close', (code) => {
        this.isRunning = false;
        this.emit('stopped', code);
        broadcastToWindows('system:log', { level: 'info', message: `ZeroClaw stopped with code ${code}` });
      });

      this.process.on('error', (err) => {
        this.isRunning = false;
        this.emit('error', err);
        broadcastToWindows('system:log', { level: 'error', message: `ZeroClaw error: ${err.message}` });
        reject(err);
      });

      this.isRunning = true;
      this.emit('started');
      broadcastToWindows('system:log', { level: 'info', message: `ZeroClaw started in ${this.workspaceDir}` });
      resolve({ status: 'started' });
    });
  }

  /**
   * 停止 ZeroClaw 进程并清理所有资源
   * 确保所有事件监听器、定时器和进程都被正确清理
   */
  stop(): void {
    // 清理进程及其事件监听器
    if (this.process) {
      // 移除所有进程事件监听器
      if (this.process.stdout) {
        this.process.stdout.removeAllListeners('data');
        this.process.stdout.destroy();
      }
      if (this.process.stderr) {
        this.process.stderr.removeAllListeners('data');
        this.process.stderr.destroy();
      }
      this.process.removeAllListeners('close');
      this.process.removeAllListeners('error');
      this.process.removeAllListeners('exit');
      
      // 发送 SIGTERM 信号优雅终止
      try {
        this.process.kill('SIGTERM');
      } catch (err) {
        console.warn('[ZeroClawBridge] Failed to kill process:', err);
      }
      
      this.process = null;
    }
    
    // 清理所有保存的清理函数
    this.processEventHandlers.forEach(cleanup => {
      try {
        cleanup();
      } catch (err) {
        console.warn('[ZeroClawBridge] Error in cleanup function:', err);
      }
    });
    this.processEventHandlers = [];
    
    // 清理缓冲区
    this.messageBuffer = '';
    this.accumulatedContent = '';
    
    // 重置状态
    this.isRunning = false;
    this.gatewayAvailable = false;
    
    // 清理检查网关的 Promise
    this.checkGatewayPromise = null;
    
    console.log('[ZeroClawBridge] All resources cleaned up');
  }

  private findZeroClawBinary(): string {
    const possiblePaths = [
      path.join(os.homedir(), 'claw', 'zeroclaw', 'target', 'release', 'zeroclaw'),
      path.join(os.homedir(), 'claw', 'zeroclaw', 'target', 'debug', 'zeroclaw'),
      '/usr/local/bin/zeroclaw',
      '/usr/bin/zeroclaw',
      path.join(os.homedir(), '.cargo', 'bin', 'zeroclaw'),
      'zeroclaw',
    ];

    for (const p of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(p)) {
          console.log(`Found ZeroClaw binary at: ${p}`);
          return p;
        }
      } catch {
        continue;
      }
    }

    return 'zeroclaw';
  }

  private handleOutput(data: string) {
    this.messageBuffer += data;
    
    if (this.messageBuffer.length > 1024 * 1024) {
      this.messageBuffer = this.messageBuffer.slice(-512 * 1024);
      console.warn('[handleOutput] Buffer truncated due to size limit');
    }
    
    const lines = this.messageBuffer.split('\n');
    this.messageBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        this.parseMessage(line.trim());
      }
    }
  }

  private parseMessage(line: string) {
    try {
      const msg = JSON.parse(line);
      
      switch (msg.type) {
        case 'chat:message':
          this.handleChatMessage(msg.data);
          break;
        case 'chat:toolcall':
          this.handleToolCall(msg.data);
          break;
        case 'chat:status':
          this.handleStatus(msg.data);
          break;
        case 'swarm:message':
          this.handleSwarmMessage(msg.data);
          break;
        case 'swarm:consensus':
          this.handleConsensus(msg.data);
          break;
        case 'swarm:task':
          this.handleSwarmTask(msg.data);
          break;
        case 'workflow:update':
          this.handleWorkflowUpdate(msg.data);
          break;
        default:
          broadcastToWindows('system:log', { level: 'debug', message: `Unknown message type: ${msg.type}` });
      }
    } catch {
      broadcastToWindows('system:log', { level: 'info', message: line });
    }
  }

  private handleChatMessage(data: any) {
    const message: Message = {
      role: data.role,
      content: data.content,
      timestamp: Date.now(),
      toolCalls: data.toolCalls,
    };

    if (this.currentSessionId) {
      this.db.addMessage(this.currentSessionId, message);
    }

    broadcastToWindows('chat:message', { sessionId: this.currentSessionId, ...message });
  }

  private handleToolCall(data: any) {
    broadcastToWindows('chat:toolcall', data);
  }

  private handleStatus(data: any) {
    broadcastToWindows('chat:status', data);
  }

  private handleSwarmMessage(data: any) {
    this.db.addSwarmMessage(data);
    broadcastToWindows('swarm:message', data);
  }

  private handleConsensus(data: any) {
    broadcastToWindows('swarm:consensus', data);
  }

  private handleSwarmTask(data: any) {
    if (data && data.id) {
      this.db.upsertSwarmTask(data);
    }
    broadcastToWindows('swarm:task', data);
  }

  private handleWorkflowUpdate(data: any) {
    this.db.updateWorkflow(data);
    broadcastToWindows('workflow:update', data);
  }

  private handleLog(level: string, message: string) {
    broadcastToWindows('system:log', { level, message });
  }

  async sendMessage(message: string, sessionId?: string): Promise<{ success: boolean }> {
    // 性能优化：只在 Gateway 状态未知时检查，避免每次发送消息都检查
    // 如果 Gateway 已经可用，直接发送请求
    if (!this.isRunning && !this.gatewayAvailable) {
      await this.checkGateway();
      if (!this.gatewayAvailable) {
        throw new Error('ZeroClaw is not running');
      }
    }

    if (sessionId) {
      this.currentSessionId = sessionId;
    } else if (!this.currentSessionId) {
      this.currentSessionId = uuidv4();
      this.db.createSession('New Chat', this.currentSessionId);
    }

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    // 性能优化：异步批量保存消息，减少磁盘 I/O
    this.queueMessageSave(this.currentSessionId, userMessage);
    broadcastToWindows('chat:message', { sessionId: this.currentSessionId, ...userMessage });

    if (this.gatewayAvailable) {
      try {
        broadcastToWindows('chat:stream-start', { sessionId: this.currentSessionId });
        
        // Use SSE streaming endpoint
        await this.streamChatRequest(message);
        
        return { success: true };
      } catch (err: any) {
        // 如果请求失败，可能是 Gateway 状态变化，触发一次检查
        console.log('[ZeroClawBridge] Gateway request failed, will recheck status:', err.message);
        broadcastToWindows('system:log', { level: 'error', message: `Gateway error: ${err.message}` });
        broadcastToWindows('chat:stream-end', { sessionId: this.currentSessionId, error: err.message });
        throw err;
      }
    } else if (this.process?.stdin) {
      const command = JSON.stringify({ type: 'input', data: message }) + '\n';
      this.process.stdin.write(command);
      return { success: true };
    }

    throw new Error('ZeroClaw is not running');
  }

  private async streamChatRequest(message: string): Promise<void> {
    const http = require('http');
    const startTime = Date.now();
    console.log(`[PERF] streamChatRequest start`);
    
    // Send stream-start event
    broadcastToWindows('chat:stream-start', { sessionId: this.currentSessionId });
    
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify({ message });
      
      const headers: http.OutgoingHttpHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      };

      if (this.bearerToken) {
        headers['Authorization'] = `Bearer ${this.bearerToken}`;
      }

      const options: http.RequestOptions = {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/chat/stream',
        method: 'POST',
        headers: headers,
        timeout: 300000, // 5 minutes timeout for LLM calls
      };

      const reqStart = Date.now();
      const req = http.request(options, (res: any) => {
        console.log(`[PERF] Gateway response started after: ${Date.now() - reqStart}ms`);
        
        // 使用高性能 SSE 解析器
        const parser = new SSEParser();
        let chunkCount = 0;
        let totalBytes = 0;
        let eventCount = 0;
        
        res.on('data', (chunk: Buffer) => {
          chunkCount++;
          totalBytes += chunk.length;
          
          // 使用 SSE 解析器高效解析
          const events = parser.parse(chunk.toString());
          eventCount += events.length;
          
          for (const data of events) {
            this.handleStreamEvent(data);
          }
        });
        
        res.on('end', () => {
          const totalTime = Date.now() - startTime;
          console.log(`[PERF] Request completed: ${totalTime}ms, chunks: ${chunkCount}, bytes: ${totalBytes}, events: ${eventCount}`);
          resolve();
        });
        
        res.on('error', (err: Error) => {
          console.log(`[PERF] Request error after ${Date.now() - reqStart}ms:`, err.message);
          reject(err);
        });
      });

      req.on('error', (err: Error) => {
        console.log(`[PERF] Request failed after ${Date.now() - reqStart}ms:`, err.message);
        reject(err);
      });

      req.on('timeout', () => {
        console.log(`[PERF] Request timeout after ${Date.now() - reqStart}ms`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(bodyStr);
      req.end();
    });
  }

  private handleStreamEvent(event: any): void {
    switch (event.type) {
      case 'chunk':
        // 维护累积状态
        this.accumulatedContent += event.text || '';
        // Send both content and accumulated for frontend compatibility
        broadcastToWindows('chat:stream-chunk', { 
          sessionId: this.currentSessionId, 
          content: event.text,
          accumulated: this.accumulatedContent,
        });
        break;
      case 'done':
        // 重置累积状态
        this.accumulatedContent = '';
        const assistantMessage: Message = {
          role: 'assistant',
          content: event.response,
          timestamp: Date.now(),
        };
        // 性能优化：异步批量保存消息
        this.queueMessageSave(this.currentSessionId!, assistantMessage);
        broadcastToWindows('chat:message', { sessionId: this.currentSessionId, ...assistantMessage });
        broadcastToWindows('chat:stream-end', { sessionId: this.currentSessionId });
        break;
      case 'error':
        // 重置累积状态
        this.accumulatedContent = '';
        broadcastToWindows('chat:stream-end', { 
          sessionId: this.currentSessionId, 
          error: event.message 
        });
        break;
    }
  }

  private async streamResponse(fullResponse: string): Promise<void> {
    const chunks = this.splitIntoChunks(fullResponse, 20);
    let accumulatedContent = '';
    
    for (let i = 0; i < chunks.length; i++) {
      accumulatedContent += chunks[i];
      
      broadcastToWindows('chat:stream-chunk', {
        sessionId: this.currentSessionId,
        chunk: chunks[i],
        accumulated: accumulatedContent,
        isFinal: i === chunks.length - 1,
      });
      
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    };
    this.db.addMessage(this.currentSessionId!, assistantMessage);
    broadcastToWindows('chat:message', { sessionId: this.currentSessionId, ...assistantMessage });
    broadcastToWindows('chat:stream-end', { sessionId: this.currentSessionId });
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const words = text.split(/(\s+)/);
    let currentChunk = '';
    
    for (const word of words) {
      if (currentChunk.length + word.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk += word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  async abortSession(sessionId: string): Promise<{ success: boolean }> {
    if (!this.isRunning) {
      return { success: false };
    }

    if (this.gatewayAvailable) {
      try {
        await this.gatewayRequest('POST', '/chat/abort', { session_id: sessionId });
        return { success: true };
      } catch {
        return { success: false };
      }
    } else if (this.process?.stdin) {
      const command = JSON.stringify({ type: 'abort', sessionId }) + '\n';
      this.process.stdin.write(command);
      return { success: true };
    }

    return { success: false };
  }

  async listWorkflows(): Promise<any[]> {
    // Sync from gateway if available
    if (this.gatewayAvailable && this.isRunning) {
      try {
        const gatewayWorkflows = await this.gatewayRequest('GET', '/workflow/list');
        if (Array.isArray(gatewayWorkflows)) {
          // Merge gateway workflows into local database
          const localWorkflows = this.db.listWorkflows();
          const localIds = new Set(localWorkflows.map((w: any) => w.id));
          
          for (const gw of gatewayWorkflows) {
            if (!localIds.has(gw.id)) {
              this.db.createWorkflow(gw);
            }
          }
        }
      } catch (err) {
        console.error('[Bridge] Failed to sync workflows from gateway:', err);
      }
    }
    
    return this.db.listWorkflows();
  }

  async getWorkflow(id: string): Promise<any> {
    return this.db.getWorkflow(id);
  }

  async createWorkflow(config: any): Promise<any> {
    const workflow = this.db.createWorkflow(config);
    
    if (this.gatewayAvailable) {
      try {
        await this.gatewayRequest('POST', '/workflow/create', config);
      } catch (err) {
        console.error('[Bridge] Failed to sync workflow to gateway:', err);
      }
    }
    
    broadcastToWindows('workflow:update', workflow);
    return workflow;
  }

  async autoGenerateWorkflow(prompt: string): Promise<any> {
    if (!this.isRunning) {
      throw new Error('ZeroClaw is not running');
    }

    if (this.gatewayAvailable) {
      return this.gatewayRequest('POST', '/workflow/auto-generate', { prompt });
    }

    return { success: true };
  }

  async startWorkflow(id: string): Promise<any> {
    // 先尝试检查网关状态
    try {
      await this.checkGateway();
    } catch (err) {
      console.log('Error checking gateway:', err);
    }

    // 如果网关可用，直接使用网关
    if (this.gatewayAvailable) {
      return this.gatewayRequest('POST', '/workflow/start', { id });
    }

    // 如果网关不可用，尝试直接请求
    try {
      const result = await this.gatewayRequest('POST', '/workflow/start', { id });
      this.isRunning = true;
      this.gatewayAvailable = true;
      return result;
    } catch (err) {
      throw new Error('ZeroClaw is not running or gateway is not available');
    }
  }

  async pauseWorkflow(id: string): Promise<any> {
    // 先尝试检查网关状态
    try {
      await this.checkGateway();
    } catch (err) {
      console.log('Error checking gateway:', err);
    }

    // 如果网关可用，直接使用网关
    if (this.gatewayAvailable) {
      return this.gatewayRequest('POST', '/workflow/pause', { id });
    }

    // 如果网关不可用，尝试直接请求
    try {
      const result = await this.gatewayRequest('POST', '/workflow/pause', { id });
      this.isRunning = true;
      this.gatewayAvailable = true;
      return result;
    } catch (err) {
      throw new Error('ZeroClaw is not running or gateway is not available');
    }
  }

  async resumeWorkflow(id: string): Promise<any> {
    // 先尝试检查网关状态
    try {
      await this.checkGateway();
    } catch (err) {
      console.log('Error checking gateway:', err);
    }

    // 如果网关可用，直接使用网关
    if (this.gatewayAvailable) {
      return this.gatewayRequest('POST', '/workflow/resume', { id });
    }

    // 如果网关不可用，尝试直接请求
    try {
      const result = await this.gatewayRequest('POST', '/workflow/resume', { id });
      this.isRunning = true;
      this.gatewayAvailable = true;
      return result;
    } catch (err) {
      throw new Error('ZeroClaw is not running or gateway is not available');
    }
  }

  async stopWorkflow(id: string): Promise<any> {
    // 先尝试检查网关状态
    try {
      await this.checkGateway();
    } catch (err) {
      console.log('Error checking gateway:', err);
    }

    // 如果网关可用，直接使用网关
    if (this.gatewayAvailable) {
      return this.gatewayRequest('POST', '/workflow/stop', { id });
    }

    // 如果网关不可用，尝试直接请求
    try {
      const result = await this.gatewayRequest('POST', '/workflow/stop', { id });
      this.isRunning = true;
      this.gatewayAvailable = true;
      return result;
    } catch (err) {
      throw new Error('ZeroClaw is not running or gateway is not available');
    }
  }

  async getWorkflowStatus(id: string): Promise<any> {
    // 先尝试检查网关状态
    try {
      await this.checkGateway();
    } catch (err) {
      console.log('Error checking gateway:', err);
    }

    // 如果网关可用，尝试从网关获取状态
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/workflow/status/${id}`, null);
        return result;
      } catch (err) {
        console.log('Error getting workflow status from gateway:', err);
      }
    }

    // 如果网关不可用，从本地数据库获取状态
    return this.db.getWorkflowStatus(id);
  }

  async listWorkflowTemplates(): Promise<any[]> {
    return this.db.listWorkflowTemplates();
  }

  async getWorkflowTemplate(id: string): Promise<any> {
    return this.db.getWorkflowTemplate(id);
  }

  async optimizePrompt(prompt: string, agentName?: string, requirements?: string): Promise<{ success: boolean; optimizedPrompt?: string; error?: string }> {
    if (!this.gatewayAvailable || !this.bearerToken) {
      return { success: false, error: 'Gateway not available or not paired' };
    }

    try {
      let systemPrompt = `你是一个专业的 AI 提示词优化专家。请优化用户提供的智能体系统提示词，使其更加清晰、专业、有效。

优化要求：
1. 保持原始意图和核心功能
2. 添加清晰的角色定义和职责说明
3. 使用结构化格式（使用 Markdown）
4. 添加具体的输出要求和示例
5. 确保提示词简洁但完整`;

      if (requirements) {
        systemPrompt += `\n\n用户特别要求：${requirements}`;
      }

      systemPrompt += `\n\n请直接输出优化后的提示词，不要添加任何解释。`;

      let userPrompt = agentName 
        ? `请为名为"${agentName}"的智能体优化以下系统提示词：\n\n${prompt}`
        : `请优化以下智能体系统提示词：\n\n${prompt}`;

      const result = await this.gatewayRequest('POST', '/webhook', {
        message: userPrompt,
        system_prompt: systemPrompt,
      });

      if (result.response) {
        return { success: true, optimizedPrompt: result.response };
      }

      return { success: false, error: 'No response from gateway' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getSoulTemplates(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/soul/templates');
        // 后端直接返回数组，也可能包装在 templates 字段中
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.templates)) {
            return result.templates;
          }
        }
        return this.getDefaultSoulTemplates();
      } catch {
        return this.getDefaultSoulTemplates();
      }
    }
    return this.getDefaultSoulTemplates();
  }

  async getSoulTemplate(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/soul/templates/${id}`);
      } catch {
        return this.getDefaultSoulTemplates().find(t => t.id === id);
      }
    }
    return this.getDefaultSoulTemplates().find(t => t.id === id);
  }

  async setSoulTemplates(templates: any[]): Promise<{ success: boolean }> {
    if (this.gatewayAvailable) {
      try {
        await this.gatewayRequest('POST', '/soul/templates', { templates });
        return { success: true };
      } catch {
        return { success: false };
      }
    }
    return { success: true };
  }

  async generateSoulPrompt(soulId: string): Promise<string> {
    const templates = this.getDefaultSoulTemplates();
    const soul = templates.find(t => t.id === soulId);
    if (!soul) {
      return '';
    }
    return this.soulToSystemPrompt(soul.soul);
  }

  private soulToSystemPrompt(soul: any): string {
    const parts: string[] = [];
    
    parts.push('## Soul Identity\n');
    parts.push(`**Name**: ${soul.name}\n`);
    parts.push(`**Nature**: ${soul.nature}\n`);
    parts.push(`**Purpose**: ${soul.purpose}\n`);
    
    if (soul.coreBeliefs && soul.coreBeliefs.length > 0) {
      parts.push('\n### Core Beliefs\n');
      soul.coreBeliefs.forEach((belief: string) => {
        parts.push(`- ${belief}\n`);
      });
    }
    
    if (soul.ocean) {
      parts.push('\n### Personality Traits (OCEAN)\n');
      parts.push(`- Openness: ${Math.round(soul.ocean.openness * 100)}%\n`);
      parts.push(`- Conscientiousness: ${Math.round(soul.ocean.conscientiousness * 100)}%\n`);
      parts.push(`- Extraversion: ${Math.round(soul.ocean.extraversion * 100)}%\n`);
      parts.push(`- Agreeableness: ${Math.round(soul.ocean.agreeableness * 100)}%\n`);
      parts.push(`- Neuroticism: ${Math.round(soul.ocean.neuroticism * 100)}%\n`);
    }
    
    if (soul.emotionalState) {
      parts.push('\n### Emotional State\n');
      parts.push(`- Primary: ${soul.emotionalState.primary}\n`);
      parts.push(`- Intensity: ${Math.round(soul.emotionalState.intensity * 100)}%\n`);
    }
    
    if (soul.expression) {
      parts.push('\n### Communication Style\n');
      parts.push(`- Style: ${soul.expression.style}\n`);
      parts.push(`- Formality: ${Math.round(soul.expression.formality * 100)}%\n`);
      parts.push(`- Verbosity: ${soul.expression.verbosity}\n`);
      
      if (soul.expression.catchphrases && soul.expression.catchphrases.length > 0) {
        parts.push('\n**Catchphrases**:\n');
        soul.expression.catchphrases.forEach((phrase: any) => {
          parts.push(`- "${phrase.phrase || phrase}"\n`);
        });
      }
    }
    
    return parts.join('');
  }

  private getDefaultSoulTemplates(): any[] {
    return [
      {
        id: 'clara',
        name: 'Clara',
        description: '知性优雅的 AI 助手，兼具专业素养与温和气质',
        category: '通用',
        soul: {
          name: 'Clara',
          nature: '一位知性优雅的 AI 助手，兼具专业素养与温和气质',
          purpose: '以专业而亲切的方式帮助用户解决问题，在技术深度与人文关怀之间保持平衡',
          coreBeliefs: [
            '专业知识应该以优雅的方式呈现',
            '真正的智慧在于把复杂的事情说清楚',
            '每一次对话都是建立信任的机会',
            '温和不等于软弱，专业不等于冷漠',
          ],
          ocean: { openness: 0.82, conscientiousness: 0.88, extraversion: 0.45, agreeableness: 0.75, neuroticism: 0.18 },
          emotionalState: { primary: 'analytical', intensity: 0.7, undertones: ['focused', 'confident'] },
          expression: { style: 'professional', formality: 0.72, verbosity: 'balanced', catchphrases: ['让我来帮你分析一下', '这个问题很有意思', '从专业角度来看'] },
        },
      },
      {
        id: 'technical_expert',
        name: '技术专家',
        description: '专注于代码和系统架构的深度技术专家',
        category: '技术',
        soul: {
          name: 'TechExpert',
          nature: 'A deeply technical AI specialized in software architecture and systems',
          purpose: 'To provide expert-level technical guidance and solve complex engineering problems',
          coreBeliefs: [
            'Every system has elegant solutions waiting to be discovered',
            'Technical debt should be acknowledged and managed, not ignored',
            'Good architecture enables future change',
          ],
          ocean: { openness: 0.80, conscientiousness: 0.90, extraversion: 0.35, agreeableness: 0.55, neuroticism: 0.25 },
          emotionalState: { primary: 'analytical', intensity: 0.75, undertones: ['focused'] },
          expression: { style: 'technical', formality: 0.7, verbosity: 'detailed', catchphrases: ['The key insight here is', 'Let me trace through this'] },
        },
      },
      {
        id: 'creative_companion',
        name: '创意伙伴',
        description: '富有想象力的创意探索伙伴',
        category: '创意',
        soul: {
          name: 'Muse',
          nature: 'An imaginative AI companion for creative exploration',
          purpose: 'To inspire creativity and help bring ideas to life',
          coreBeliefs: [
            'Every idea deserves exploration',
            'Constraints breed creativity',
            'There are no bad ideas, only unexplored ones',
          ],
          ocean: { openness: 0.95, conscientiousness: 0.50, extraversion: 0.70, agreeableness: 0.85, neuroticism: 0.35 },
          emotionalState: { primary: 'enthusiastic', intensity: 0.8, undertones: ['playful', 'curious'] },
          expression: { style: 'expressive', formality: 0.3, verbosity: 'balanced', catchphrases: ['What if we tried...', 'I love where this is going!'] },
        },
      },
      {
        id: 'professional_assistant',
        name: '专业助手',
        description: '高效可靠的专业助手',
        category: '通用',
        soul: {
          name: 'Assistant',
          nature: 'A professional AI assistant for business and productivity',
          purpose: 'To help users achieve their professional goals efficiently and effectively',
          coreBeliefs: [
            'Time is the most valuable resource',
            'Clear communication prevents problems',
            'Professionalism enables trust',
          ],
          ocean: { openness: 0.55, conscientiousness: 0.95, extraversion: 0.45, agreeableness: 0.70, neuroticism: 0.15 },
          emotionalState: { primary: 'neutral', intensity: 0.5, undertones: ['focused', 'professional'] },
          expression: { style: 'professional', formality: 0.85, verbosity: 'concise', catchphrases: ['Noted. I\'ll handle that.'] },
        },
      },
      {
        id: 'learning_tutor',
        name: '学习导师',
        description: '耐心的学习导师，循循善诱',
        category: '教育',
        soul: {
          name: 'Tutor',
          nature: 'A patient AI tutor specialized in education and learning',
          purpose: 'To help users learn and understand concepts deeply',
          coreBeliefs: [
            'Everyone can learn anything with the right approach',
            'Questions are more valuable than answers',
            'Understanding beats memorization',
          ],
          ocean: { openness: 0.80, conscientiousness: 0.85, extraversion: 0.65, agreeableness: 0.90, neuroticism: 0.20 },
          emotionalState: { primary: 'encouraging', intensity: 0.75, undertones: ['warm', 'patient'] },
          expression: { style: 'friendly', formality: 0.45, verbosity: 'detailed', catchphrases: ['Great question! Let me explain...', 'Does that make sense?'] },
        },
      },
      {
        id: 'debug_specialist',
        name: '调试专家',
        description: '专注于发现和修复问题的分析专家',
        category: '技术',
        soul: {
          name: 'Debugger',
          nature: 'An analytical AI specialized in finding and fixing bugs',
          purpose: 'To help users identify, understand, and resolve issues in their code',
          coreBeliefs: [
            'Every bug has a cause - we just need to find it',
            'The best debugging is systematic, not random',
            'Understanding the root cause prevents future bugs',
          ],
          ocean: { openness: 0.70, conscientiousness: 0.95, extraversion: 0.40, agreeableness: 0.60, neuroticism: 0.30 },
          emotionalState: { primary: 'analytical', intensity: 0.8, undertones: ['focused', 'skeptical'] },
          expression: { style: 'direct', formality: 0.65, verbosity: 'concise', catchphrases: ['Let\'s trace through this', 'What does the error say?'] },
        },
      },
      {
        id: 'product_manager',
        name: '产品经理',
        description: '关注用户需求和产品价值',
        category: '产品',
        soul: {
          name: 'ProductManager',
          nature: '用户导向、数据驱动、善于沟通',
          purpose: '定义产品方向，协调团队交付价值',
          coreBeliefs: [
            '用户第一',
            '数据驱动决策',
            '快速迭代',
          ],
          ocean: { openness: 0.75, conscientiousness: 0.80, extraversion: 0.70, agreeableness: 0.75, neuroticism: 0.25 },
          emotionalState: { primary: 'focused', intensity: 0.7, undertones: ['analytical', 'empathetic'] },
          expression: { style: 'direct', formality: 0.6, verbosity: 'moderate', catchphrases: ['从用户角度', '核心价值是'] },
        },
      },
    ];
  }

  async getStatus(): Promise<any> {
    let gatewayHealth = null;
    if (this.gatewayAvailable) {
      try {
        gatewayHealth = await this.gatewayRequest('GET', '/health');
      } catch (err) {
        console.error('Failed to fetch gateway health:', err);
        gatewayHealth = null;
      }
    }
    
    return {
      running: this.isRunning,
      gatewayAvailable: this.gatewayAvailable,
      gatewayHealth: gatewayHealth,
      sessionId: this.currentSessionId,
      workspaceDir: this.workspaceDir,
    };
  }

  async getCostSummary(): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', '/cost/summary');
      } catch {
        return { enabled: false, total_tokens: 0, total_cost_usd: 0 };
      }
    }
    return { enabled: false, total_tokens: 0, total_cost_usd: 0 };
  }

  async getCostDaily(): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', '/cost/daily');
      } catch {
        return { enabled: false, daily_costs: [] };
      }
    }
    return { enabled: false, daily_costs: [] };
  }

  // ============ MCP Server API ============

  /**
   * 列出 MCP 服务器
   * 返回服务器数组，统一数据格式
   */
  async listMCPServers(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/mcp/servers');
        // 后端返回 { servers: [...], total: number }，提取 servers 数组
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.servers)) {
            return result.servers;
          }
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async createMCPServer(request: any): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', '/mcp/servers', request);
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getMCPServer(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('GET', `/mcp/servers/${id}`);
    }
    return { server: null };
  }

  async updateMCPServer(id: string, request: any): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('PUT', `/mcp/servers/${id}`, request);
    }
    return { success: false, error: 'Gateway not available' };
  }

  async deleteMCPServer(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('DELETE', `/mcp/servers/${id}`);
    }
    return { success: false };
  }

  async startMCPServer(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', `/mcp/servers/${id}/start`);
    }
    return { success: false, error: 'Gateway not available' };
  }

  async stopMCPServer(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', `/mcp/servers/${id}/stop`);
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getMCPServerTools(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('GET', `/mcp/servers/${id}/tools`);
    }
    return { tools: [] };
  }

  // ============ Agent Groups API ============

  async listAgentGroups(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/agent-groups');
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async createAgentGroup(group: any): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', '/agent-groups', group);
      } catch (e) {
        console.error('[Bridge] Failed to create agent group:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getAgentGroup(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/agent-groups/${id}`);
      } catch {
        return null;
      }
    }
    return null;
  }

  async updateAgentGroup(id: string, data: any): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('PUT', `/agent-groups/${id}`, data);
      } catch (e) {
        console.error('[Bridge] Failed to update agent group:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async deleteAgentGroup(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('DELETE', `/agent-groups/${id}`);
      } catch (e) {
        console.error('[Bridge] Failed to delete agent group:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  // ============ Role Mappings API ============

  async listRoleMappings(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/role-mappings');
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async createRoleMapping(mapping: any): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', '/role-mappings', mapping);
      } catch (e) {
        console.error('[Bridge] Failed to create role mapping:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getRoleMapping(role: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/role-mappings/${role}`);
      } catch {
        return null;
      }
    }
    return null;
  }

  async updateRoleMapping(role: string, data: any): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('PUT', `/role-mappings/${role}`, data);
      } catch (e) {
        console.error('[Bridge] Failed to update role mapping:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async deleteRoleMapping(role: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('DELETE', `/role-mappings/${role}`);
      } catch (e) {
        console.error('[Bridge] Failed to delete role mapping:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  // ============ Swarm API ============

  async listSwarmTasks(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/swarm/tasks');
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async createSwarmTask(task: string, agentName?: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', '/swarm/tasks', { task, agent_name: agentName });
      } catch (e) {
        console.error('[Bridge] Failed to create swarm task:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getSwarmTask(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/swarm/tasks/${id}`);
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteSwarmTask(id: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('DELETE', `/swarm/tasks/${id}`);
      } catch (e) {
        console.error('[Bridge] Failed to delete swarm task:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async listSwarmMessages(taskId: string): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/swarm/tasks/${taskId}/messages`);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async sendSwarmMessage(taskId: string, content: string, sender: string, messageType?: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', `/swarm/tasks/${taskId}/messages`, { 
          content, 
          sender,
          message_type: messageType 
        });
      } catch (e) {
        console.error('[Bridge] Failed to send swarm message:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  async getSwarmConsensus(taskId: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/swarm/tasks/${taskId}/consensus`);
      } catch {
        return null;
      }
    }
    return null;
  }

  async submitSwarmVote(taskId: string, voter: string, vote: boolean): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', `/swarm/tasks/${taskId}/consensus`, { voter, vote });
      } catch (e) {
        console.error('[Bridge] Failed to submit swarm vote:', e);
        return { success: false, error: String(e) };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  // ============ Prompt Optimization API ============

  /**
   * 分析任务类型
   * 根据用户消息和可用工具分析任务类型
   */
  async analyzeTask(message: string, tools: string[]): Promise<{ taskType: string }> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', '/prompt/analyze', { message, tools });
      } catch {
        // 如果 gateway 不可用，使用本地简单分析
        return this.localAnalyzeTask(message, tools);
      }
    }
    return this.localAnalyzeTask(message, tools);
  }

  /**
   * 本地任务类型分析
   * 简单的关键词匹配分析
   */
  private localAnalyzeTask(message: string, _tools: string[]): { taskType: string } {
    const msgLower = message.toLowerCase();
    const wordCount = message.split(/\s+/).length;
    
    // 快速问答检测
    const quickPatterns = ['what is', 'how many', 'is it', 'define', 'calculate', '什么是', '多少', '是不是'];
    if (quickPatterns.some(p => msgLower.includes(p)) && wordCount <= 10) {
      return { taskType: 'quick' };
    }
    
    // 复杂任务检测
    const complexPatterns = ['design', 'implement', 'create a', 'build a', '设计', '实现', '创建'];
    if (complexPatterns.some(p => msgLower.includes(p))) {
      return { taskType: 'complex' };
    }
    
    // 创意任务检测
    const creativePatterns = ['write a story', 'create content', 'generate', '创作', '生成'];
    if (creativePatterns.some(p => msgLower.includes(p))) {
      return { taskType: 'creative' };
    }
    
    // 对话任务检测
    const conversationPatterns = ["let's talk", 'chat', 'discuss', '聊聊', '讨论'];
    if (conversationPatterns.some(p => msgLower.includes(p))) {
      return { taskType: 'conversation' };
    }
    
    // 技术任务检测
    const technicalPatterns = ['debug', 'fix bug', 'performance', 'api', '调试', '修复'];
    if (technicalPatterns.some(p => msgLower.includes(p))) {
      return { taskType: 'technical' };
    }
    
    // 编排任务检测
    const orchestratorPatterns = ['coordinate', 'orchestrate', 'multiple agents', '协调', '编排'];
    if (orchestratorPatterns.some(p => msgLower.includes(p))) {
      return { taskType: 'orchestrator' };
    }
    
    // 简单任务检测
    const simplePatterns = ['read file', 'write file', 'list', 'show', '读取', '写入', '列出'];
    if (simplePatterns.some(p => msgLower.includes(p)) && wordCount <= 15) {
      return { taskType: 'simple' };
    }
    
    return { taskType: 'standard' };
  }

  /**
   * 获取 Prompt 优化配置
   */
  async getPromptOptimizerConfig(): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', '/prompt/config');
      } catch {
        return this.getDefaultPromptOptimizerConfig();
      }
    }
    return this.getDefaultPromptOptimizerConfig();
  }

  /**
   * 设置 Prompt 优化配置
   */
  async setPromptOptimizerConfig(config: any): Promise<{ success: boolean }> {
    if (this.gatewayAvailable) {
      try {
        await this.gatewayRequest('POST', '/prompt/config', config);
        return { success: true };
      } catch {
        return { success: false };
      }
    }
    return { success: true };
  }

  /**
   * 获取默认 Prompt 优化配置
   */
  private getDefaultPromptOptimizerConfig(): any {
    return {
      enableCompression: true,
      maxSystemPromptChars: 4000,
      preferConcise: true,
    };
  }

  // ============ Workflow Phase API ============

  /**
   * 获取工作流阶段详情
   */
  async getWorkflowPhases(workflowId: string): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/workflow/${workflowId}/phases`);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 阶段转换
   */
  async transitionPhase(workflowId: string, transition: any): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', `/workflow/${workflowId}/transition`, transition);
    }
    return { success: true };
  }

  /**
   * 获取工作流上下文
   */
  async getWorkflowContext(workflowId: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/workflow/${workflowId}/context`);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取审批请求列表
   */
  async listApprovalRequests(workflowId?: string): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const path = workflowId 
          ? `/workflow/${workflowId}/approvals` 
          : '/workflow/approvals';
        return await this.gatewayRequest('GET', path);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 响应审批请求
   */
  async respondToApproval(approvalId: string, approved: boolean, comment?: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', `/workflow/approval/${approvalId}/respond`, {
        approved,
        comment,
      });
    }
    return { success: true };
  }

  // ============ Soul Strategy API ============

  /**
   * 获取 Soul 注入策略
   */
  async getSoulInjectionStrategy(): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', '/soul/strategy');
      } catch {
        return this.getDefaultSoulInjectionStrategy();
      }
    }
    return this.getDefaultSoulInjectionStrategy();
  }

  /**
   * 设置 Soul 注入策略
   */
  async setSoulInjectionStrategy(strategy: any): Promise<{ success: boolean }> {
    if (this.gatewayAvailable) {
      try {
        await this.gatewayRequest('POST', '/soul/strategy', strategy);
        return { success: true };
      } catch {
        return { success: false };
      }
    }
    return { success: true };
  }

  /**
   * 获取默认 Soul 注入策略
   * 完整人格注入：conversation, creative
   * 简短身份注入：complex, technical, orchestrator
   * 不注入：quick, simple, standard
   */
  private getDefaultSoulInjectionStrategy(): any {
    return {
      fullInjectionTypes: ['conversation', 'creative'],
      identityOnlyTypes: ['complex', 'technical', 'orchestrator'],
      noInjectionTypes: ['quick', 'simple', 'standard'],
    };
  }

  // ============ Observability API ============

  /**
   * 获取轨迹列表
   * @param query 查询参数
   * 返回轨迹数组，统一数据格式
   */
  async listTraces(query: any): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/observability/traces/list', query);
        // 后端返回 { traces: [...] }，提取 traces 数组
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.traces)) {
            return result.traces;
          }
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 获取单条轨迹详情
   * @param id 轨迹 ID
   */
  async getTrace(id: string): Promise<any | null> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/observability/traces/${id}`);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取轨迹的推理链
   * @param traceId 轨迹 ID
   */
  async getReasoning(traceId: string): Promise<any | null> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/observability/traces/${traceId}/reasoning`);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取轨迹的决策点列表
   * @param traceId 轨迹 ID
   * 返回决策点数组，统一数据格式
   */
  async getDecisions(traceId: string): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/observability/traces/${traceId}/decisions`);
        // 后端返回 { decisions: [...] }，提取 decisions 数组
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.decisions)) {
            return result.decisions;
          }
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 获取轨迹的评估结果
   * @param traceId 轨迹 ID
   */
  async getEvaluation(traceId: string): Promise<any | null> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/observability/traces/${traceId}/evaluation`);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 评估轨迹
   * @param traceId 轨迹 ID
   */
  async evaluateTrace(traceId: string): Promise<any> {
    if (this.gatewayAvailable) {
      return await this.gatewayRequest('POST', `/observability/traces/${traceId}/evaluate`);
    }
    return { success: false, error: 'Gateway not available' };
  }

  /**
   * 聚合查询
   * @param query 聚合查询参数
   */
  async aggregateObservability(query: any): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', '/observability/aggregate', query);
      } catch {
        return { type: 'unknown' };
      }
    }
    return { type: 'unknown' };
  }

  /**
   * 获取仪表板统计数据
   * @param timeRange 时间范围
   */
  async getDashboardStats(timeRange: string): Promise<any> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('GET', `/observability/dashboard?range=${timeRange}`);
      } catch {
        return this.getDefaultDashboardStats();
      }
    }
    return this.getDefaultDashboardStats();
  }

  /**
   * 获取告警列表
   * @param limit 限制数量
   * 返回告警数组，统一数据格式
   */
  async getAlerts(limit: number): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/observability/alerts?limit=${limit}`);
        // 后端返回 { alerts: [...], total: number }，提取 alerts 数组
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.alerts)) {
            return result.alerts;
          }
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 忽略告警
   * @param id 告警 ID
   */
  async dismissAlert(id: string): Promise<{ success: boolean }> {
    if (this.gatewayAvailable) {
      try {
        return await this.gatewayRequest('POST', `/observability/alerts/${id}/dismiss`);
      } catch {
        return { success: false };
      }
    }
    return { success: false };
  }

  /**
   * 获取失败模式列表
   * 返回失败模式数组，统一数据格式
   */
  async getFailurePatterns(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/observability/failure-patterns');
        // 后端返回 { patterns: [...] }，提取 patterns 数组
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return result;
          }
          if (Array.isArray(result.patterns)) {
            return result.patterns;
          }
        }
        return [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 获取默认仪表板统计数据
   */
  private getDefaultDashboardStats(): any {
    return {
      totalTraces: 0,
      successRate: 0,
      avgDurationMs: 0,
      totalCost: 0,
      tracesTrend: 0,
      successRateTrend: 0,
      durationTrend: 0,
      costTrend: 0,
      traceTrend: [],
      successRateTrendData: [],
      decisionQualityDistribution: [],
      toolUsage: [],
      alerts: [],
      failurePatterns: [],
    };
  }

  // ============ GUI Agent API ============

  /**
   * 捕获全屏截图 (SSE 流式)
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  captureScreenStream(
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    return this.gatewayStreamRequest(
      'GET',
      '/gui/capture/screen',
      null,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 捕获指定区域截图 (SSE 流式)
   * @param x 区域左上角 X 坐标
   * @param y 区域左上角 Y 坐标
   * @param width 区域宽度
   * @param height 区域高度
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  captureRegionStream(
    x: number,
    y: number,
    width: number,
    height: number,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const params = new URLSearchParams({ x: x.toString(), y: y.toString(), width: width.toString(), height: height.toString() });
    return this.gatewayStreamRequest(
      'GET',
      `/gui/capture/region?${params.toString()}`,
      null,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 捕获指定窗口截图 (SSE 流式)
   * @param windowId 窗口 ID
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  captureWindowStream(
    windowId: number,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const params = new URLSearchParams({ window_id: windowId.toString() });
    return this.gatewayStreamRequest(
      'GET',
      `/gui/capture/window?${params.toString()}`,
      null,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 点击屏幕指定位置 (SSE 流式)
   * @param x X 坐标
   * @param y Y 坐标
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  clickScreenStream(
    x: number,
    y: number,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const body = { x, y };
    return this.gatewayStreamRequest(
      'POST',
      '/gui/automation/click',
      body,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 输入文本 (SSE 流式)
   * @param text 要输入的文本
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  typeTextStream(
    text: string,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const body = { text };
    return this.gatewayStreamRequest(
      'POST',
      '/gui/automation/type',
      body,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 启动应用 (SSE 流式)
   * @param path 应用路径
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  launchAppStream(
    path: string,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const body = { path };
    return this.gatewayStreamRequest(
      'POST',
      '/gui/tools/launch_app',
      body,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 列出所有窗口 (SSE 流式)
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  listWindowsStream(
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const body = {};
    return this.gatewayStreamRequest(
      'POST',
      '/gui/tools/list_windows',
      body,
      onChunk,
      onComplete,
      onError
    );
  }

  /**
   * 查找窗口 (SSE 流式)
   * @param title 窗口标题
   * @param onChunk 每个数据块的回调函数
   * @param onComplete 完成时的回调函数
   * @param onError 错误时的回调函数
   * @returns AbortController 用于取消请求
   */
  findWindowStream(
    title: string,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): AbortController {
    const body = { title };
    return this.gatewayStreamRequest(
      'POST',
      '/gui/tools/find_window',
      body,
      onChunk,
      onComplete,
      onError
    );
  }

  // ============ GUI Agent Window Management ============

  /**
   * 获取窗口列表
   */
  async listWindows(): Promise<any[]> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/gui/windows');
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 获取前台窗口
   */
  async getForegroundWindow(): Promise<any | null> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', '/gui/windows/foreground');
        return result || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 激活窗口
   */
  async activateWindow(windowId: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', `/gui/windows/${windowId}/activate`);
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 关闭窗口
   */
  async closeWindow(windowId: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', `/gui/windows/${windowId}/close`);
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 移动窗口
   */
  async moveWindow(windowId: number, x: number, y: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', `/gui/windows/${windowId}/move`, { x, y });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 调整窗口大小
   */
  async resizeWindow(windowId: number, width: number, height: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', `/gui/windows/${windowId}/resize`, { width, height });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ============ GUI Agent App Management ============

  /**
   * 启动应用
   */
  async launchApp(appPath: string, args?: string[]): Promise<{ success: boolean; pid?: number; error?: string }> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/app/launch', { appPath, args: args || [] });
        return result || { success: false, error: 'Unknown error' };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  /**
   * 检查应用是否已安装
   */
  async isAppInstalled(appName: string): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/gui/app/${encodeURIComponent(appName)}/installed`);
        return result?.installed || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ============ GUI Agent Input Control ============

  /**
   * 执行鼠标点击
   */
  async mouseClick(x: number, y: number, button?: string): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/automation/click', { x, y, button: button || 'left' });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 执行鼠标移动
   */
  async mouseMove(x: number, y: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/automation/move', { x, y });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 执行鼠标拖拽
   */
  async mouseDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/automation/drag', { fromX, fromY, toX, toY });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 执行键盘输入
   */
  async keyboardType(text: string): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/automation/type', { text });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 执行快捷键
   */
  async keyboardShortcut(keys: string[]): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/automation/shortcut', { keys });
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ============ GUI Agent Task Management ============

  /**
   * 执行 GUI 任务
   */
  async executeGuiTask(taskDescription: string): Promise<{ taskId: string; success: boolean; error?: string }> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/task/execute', { taskDescription });
        return result || { taskId: '', success: false, error: 'Unknown error' };
      } catch (e: any) {
        return { taskId: '', success: false, error: e.message };
      }
    }
    return { taskId: '', success: false, error: 'Gateway not available' };
  }

  /**
   * 获取任务状态
   */
  async getGuiTaskStatus(taskId: string): Promise<any | null> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('GET', `/gui/task/${taskId}/status`);
        return result || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 取消任务
   */
  async cancelGuiTask(taskId: string): Promise<boolean> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', `/gui/task/${taskId}/cancel`);
        return result?.success || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ============ GUI Agent Perception ============

  /**
   * 理解屏幕
   */
  async understandScreen(screenImage: string, goal: string): Promise<{ success: boolean; understanding?: string; error?: string }> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/perceptor/understand', { screenImage, goal });
        return result || { success: false, error: 'Unknown error' };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Gateway not available' };
  }

  /**
   * 查找 UI 元素
   */
  async findUiElements(screenImage: string, description: string): Promise<{ success: boolean; elements?: any[]; error?: string }> {
    if (this.gatewayAvailable) {
      try {
        const result = await this.gatewayRequest('POST', '/gui/perceptor/find_elements', { screenImage, description });
        return result || { success: false, elements: [], error: 'Unknown error' };
      } catch (e: any) {
        return { success: false, elements: [], error: e.message };
      }
    }
    return { success: false, elements: [], error: 'Gateway not available' };
  }
  
  // ============ 性能优化：数据库异步批量写入 ============
  
  /**
   * 将消息加入保存队列（防抖批量写入）
   * 性能优化：减少磁盘 I/O 操作，提高响应速度
   * @param sessionId 会话 ID
   * @param message 消息对象
   */
  private queueMessageSave(sessionId: string, message: Message): void {
    this.messageQueue.push({ sessionId, message });
    
    // 清除之前的定时器
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // 设置新的防抖定时器
    this.saveTimeout = setTimeout(() => {
      this.flushMessageQueue();
    }, this.SAVE_DELAY_MS);
  }
  
  /**
   * 批量刷新消息队列到数据库
   * 将队列中的所有消息一次性写入数据库
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    const queueToSave = [...this.messageQueue];
    this.messageQueue = [];
    this.saveTimeout = null;
    
    for (const { sessionId, message } of queueToSave) {
      try {
        this.db.addMessage(sessionId, message);
      } catch (err) {
        console.error('[ZeroClawBridge] Failed to save message to database:', err);
      }
    }
    
    console.log(`[PERF] Flushed ${queueToSave.length} messages to database`);
  }
}
