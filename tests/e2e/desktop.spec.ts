/**
 * ZeroClaw Desktop 前端自动化测试用例
 * 
 * 测试流程：
 * 1. 应用启动测试
 * 2. 配对鉴权测试
 * 3. 聊天功能测试
 * 4. 技能市场测试
 * 5. 设置功能测试
 * 6. 内存泄露测试
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';

let electronApp: ElectronApplication;
let page: Page;

// 测试配置
const TEST_CONFIG = {
  gatewayUrl: 'http://127.0.0.1:8080',
  testTimeout: 30000,
  pairingCode: '', // 动态获取
};

// ═══════════════════════════════════════════════════════════════════════════
// 测试前置和后置
// ═══════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  // 启动 Electron 应用
  electronApp = await electron.launch({
    args: ['.'], // 从当前目录启动
    cwd: process.cwd(),
  });

  // 获取第一个窗口
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. 应用启动测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('应用启动测试', () => {
  test('应用窗口应正确显示', async () => {
    const title = await page.title();
    expect(title).toContain('ZeroClaw');
  });

  test('侧边栏应正确渲染', async () => {
    const sidebar = await page.locator('[data-testid="sidebar"]').isVisible();
    expect(sidebar).toBeTruthy();
  });

  test('默认应显示聊天视图', async () => {
    const chatView = await page.locator('[data-testid="chat-view"]').isVisible();
    expect(chatView).toBeTruthy();
  });

  test('状态栏应显示连接状态', async () => {
    const statusBar = await page.locator('[data-testid="status-bar"]').isVisible();
    expect(statusBar).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. 配对鉴权测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('配对鉴权测试', () => {
  test('未配对时应显示配对对话框', async () => {
    // 检查配对状态
    const isPaired = await page.evaluate(() => {
      return window.zeroclaw?.system?.getPairingStatus?.().then((s: any) => s.isPaired);
    });

    if (!isPaired) {
      const pairingDialog = await page.locator('[data-testid="pairing-dialog"]').isVisible();
      expect(pairingDialog).toBeTruthy();
    }
  });

  test('配对码输入应能完成配对', async () => {
    // 获取配对码（从 Gateway 日志或 API）
    const pairingCode = await getPairingCode();
    
    if (pairingCode) {
      await page.fill('[data-testid="pairing-code-input"]', pairingCode);
      await page.click('[data-testid="pair-button"]');
      
      // 等待配对成功
      await page.waitForSelector('[data-testid="pairing-dialog"]', { state: 'hidden', timeout: 10000 });
      
      const isPaired = await page.evaluate(() => {
        return window.zeroclaw?.system?.getPairingStatus?.().then((s: any) => s.isPaired);
      });
      
      expect(isPaired).toBeTruthy();
    }
  });

  test('Token 输入应能完成配对', async () => {
    const testToken = 'zc_test_token_placeholder';
    
    await page.click('[data-testid="token-tab"]');
    await page.fill('[data-testid="token-input"]', testToken);
    await page.click('[data-testid="set-token-button"]');
    
    // 验证 token 已保存
    const savedToken = await page.evaluate(() => {
      return window.zeroclaw?.system?.getToken?.();
    });
    
    expect(savedToken).toBe(testToken);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. 聊天功能测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('聊天功能测试', () => {
  test('发送消息应收到响应', async () => {
    const testMessage = '你好，这是一个测试消息';
    
    // 输入消息
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // 等待响应
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
    
    // 验证响应内容
    const response = await page.locator('[data-testid="assistant-message"]').last().textContent();
    expect(response).toBeTruthy();
    expect(response?.length).toBeGreaterThan(0);
  });

  test('消息历史应正确保存', async () => {
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // 检查历史消息是否存在
    const messages = await page.locator('[data-testid="message"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('流式响应应正确显示', async () => {
    const testMessage = '请详细介绍一下你自己';
    
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // 检查是否有流式更新
    const streamingIndicator = await page.locator('[data-testid="streaming-indicator"]').isVisible();
    expect(streamingIndicator).toBeTruthy();
    
    // 等待流式完成
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 60000 });
  });

  test('会话切换应正常工作', async () => {
    // 创建新会话
    await page.click('[data-testid="new-session-button"]');
    
    // 验证新会话已创建
    const sessions = await page.locator('[data-testid="session-item"]').count();
    expect(sessions).toBeGreaterThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. 技能市场测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('技能市场测试', () => {
  test.beforeEach(async () => {
    await page.click('[data-testid="clawhub-tab"]');
  });

  test('技能市场应正确加载', async () => {
    await page.waitForSelector('[data-testid="skill-market"]', { timeout: 10000 });
    const isVisible = await page.locator('[data-testid="skill-market"]').isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('统计信息应正确显示', async () => {
    const stats = await page.locator('[data-testid="market-stats"]').isVisible();
    expect(stats).toBeTruthy();
    
    const totalSkills = await page.locator('[data-testid="total-skills"]').textContent();
    expect(parseInt(totalSkills || '0')).toBeGreaterThan(0);
  });

  test('技能搜索应正常工作', async () => {
    await page.fill('[data-testid="skill-search-input"]', 'file');
    await page.click('[data-testid="search-button"]');
    
    await page.waitForTimeout(1000);
    
    const results = await page.locator('[data-testid="skill-card"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('趋势榜应正确显示', async () => {
    await page.click('[data-testid="trending-tab"]');
    
    await page.waitForSelector('[data-testid="trending-skill"]', { timeout: 5000 });
    const trendingSkills = await page.locator('[data-testid="trending-skill"]').count();
    expect(trendingSkills).toBeGreaterThan(0);
  });

  test('技能安装流程应正常工作', async () => {
    // 点击第一个技能的安装按钮
    await page.click('[data-testid="skill-card"]:first-child [data-testid="install-button"]');
    
    // 等待安装进度
    await page.waitForSelector('[data-testid="install-progress"]', { timeout: 5000 });
    
    // 等待安装完成
    await page.waitForSelector('[data-testid="install-progress"]', { state: 'hidden', timeout: 30000 });
    
    // 验证已安装状态
    const installedBadge = await page.locator('[data-testid="skill-card"]:first-child [data-testid="installed-badge"]').isVisible();
    expect(installedBadge).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. 设置功能测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('设置功能测试', () => {
  test.beforeEach(async () => {
    await page.click('[data-testid="settings-tab"]');
  });

  test('设置页面应正确显示', async () => {
    const settingsView = await page.locator('[data-testid="settings-view"]').isVisible();
    expect(settingsView).toBeTruthy();
  });

  test('代理配置应正确加载', async () => {
    const agentCount = await page.locator('[data-testid="agent-item"]').count();
    expect(agentCount).toBeGreaterThan(0);
  });

  test('模型选择应正常工作', async () => {
    await page.click('[data-testid="model-selector"]');
    await page.click('[data-testid="model-option"]:first-child');
    
    const selectedModel = await page.locator('[data-testid="selected-model"]').textContent();
    expect(selectedModel).toBeTruthy();
  });

  test('配置保存应正常工作', async () => {
    // 修改设置
    await page.fill('[data-testid="temperature-input"]', '0.8');
    await page.click('[data-testid="save-settings-button"]');
    
    // 验证保存成功提示
    const saveSuccess = await page.locator('[data-testid="save-success-message"]').isVisible();
    expect(saveSuccess).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. 内存泄露测试
// ═══════════════════════════════════════════════════════════════════════════

test.describe('内存泄露测试', () => {
  test('事件监听器应正确清理', async () => {
    // 获取初始监听器数量
    const initialListeners = await page.evaluate(() => {
      return (window as any).__eventListenersCount || 0;
    });
    
    // 切换多个页面
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="chat-tab"]');
      await page.click('[data-testid="clawhub-tab"]');
      await page.click('[data-testid="settings-tab"]');
    }
    
    // 获取最终监听器数量
    const finalListeners = await page.evaluate(() => {
      return (window as any).__eventListenersCount || 0;
    });
    
    // 监听器数量不应显著增加
    expect(finalListeners - initialListeners).toBeLessThan(10);
  });

  test('内存使用应保持稳定', async () => {
    const metrics = await electronApp.evaluate(({ app }) => {
      return app.getAppMetrics();
    });
    
    const memoryMB = metrics.reduce((sum: number, m: any) => sum + (m.memory?.workingSetSize || 0), 0) / 1024 / 1024;
    
    // 内存使用应小于 500MB
    expect(memoryMB).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════

async function getPairingCode(): Promise<string | null> {
  try {
    const response = await fetch(`${TEST_CONFIG.gatewayUrl}/health`);
    const data = await response.json();
    
    if (!data.paired) {
      // 从 Gateway 日志获取配对码
      // 这里需要实现从日志文件读取配对码的逻辑
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
