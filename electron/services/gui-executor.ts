/**
 * GUI Agent 本地执行器
 * 
 * 提供跨平台的鼠标键盘控制能力，不依赖外部网关
 * 使用 Electron 的 robotjs 或 node-native 模块实现
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface MousePosition {
  x: number;
  y: number;
}

export interface WindowInfo {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isForeground: boolean;
}

export class LocalGUIExecutor {
  private platform: string;
  private currentMousePos: MousePosition = { x: 0, y: 0 };

  constructor() {
    this.platform = os.platform();
    console.log(`[LocalGUIExecutor] 初始化完成，平台：${this.platform}`);
  }

  // ============ 鼠标控制 ============

  /**
   * 移动鼠标到指定位置
   */
  async mouseMove(x: number, y: number): Promise<boolean> {
    try {
      this.currentMousePos = { x, y };
      
      if (this.platform === 'darwin') {
        // macOS - 使用 AppleScript
        await execAsync(`osascript -e 'tell application "System Events" to set mouse position to {${x}, ${y}}'`);
      } else if (this.platform === 'win32') {
        // Windows - 使用 PowerShell
        await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x},${y})"`);
      } else if (this.platform === 'linux') {
        // Linux - 使用 xdotool
        await execAsync(`xdotool mousemove ${x} ${y}`);
      } else {
        console.warn(`[LocalGUIExecutor] 不支持的平台：${this.platform}`);
        return false;
      }
      
      console.log(`[LocalGUIExecutor] 鼠标移动到 (${x}, ${y})`);
      return true;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 鼠标移动失败：${error.message}`);
      return false;
    }
  }

  /**
   * 鼠标点击
   */
  async mouseClick(x?: number, y?: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    try {
      // 如果提供了坐标，先移动过去
      if (x !== undefined && y !== undefined) {
        await this.mouseMove(x, y);
      }

      if (this.platform === 'darwin') {
        await this.macOSClick(button);
      } else if (this.platform === 'win32') {
        await this.windowsClick(button);
      } else if (this.platform === 'linux') {
        await this.linuxClick(button);
      } else {
        return false;
      }
      
      console.log(`[LocalGUIExecutor] 鼠标点击：${button}`);
      return true;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 鼠标点击失败：${error.message}`);
      return false;
    }
  }

  private async macOSClick(button: string): Promise<void> {
    const clickType = button === 'right' ? 'secondary click' : 'click';
    await execAsync(`osascript -e 'tell application "System Events" to ${clickType}'`);
  }

  private async windowsClick(button: string): Promise<void> {
    const buttonMap: Record<string, string> = {
      left: 'left',
      right: 'right',
      middle: 'middle'
    };
    await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${buttonMap[button]}')"`);
  }

  private async linuxClick(button: string): Promise<void> {
    const buttonMap: Record<string, string> = {
      left: '1',
      right: '3',
      middle: '2'
    };
    await execAsync(`xdotool click ${buttonMap[button]}`);
  }

  /**
   * 鼠标拖拽
   */
  async mouseDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<boolean> {
    try {
      // 移动到起始位置
      await this.mouseMove(fromX, fromY);
      
      // 按下鼠标
      await this.mouseDown();
      
      // 移动到目标位置
      await this.mouseMove(toX, toY);
      
      // 释放鼠标
      await this.mouseUp();
      
      console.log(`[LocalGUIExecutor] 鼠标拖拽：(${fromX},${fromY}) -> (${toX},${toY})`);
      return true;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 鼠标拖拽失败：${error.message}`);
      return false;
    }
  }

  private async mouseDown(): Promise<void> {
    if (this.platform === 'darwin') {
      await execAsync(`osascript -e 'tell application "System Events" to click'`);
    } else if (this.platform === 'linux') {
      await execAsync(`xdotool mousedown 1`);
    }
    // Windows 需要更复杂的实现
  }

  private async mouseUp(): Promise<void> {
    if (this.platform === 'darwin') {
      await execAsync(`osascript -e 'tell application "System Events" to click'`);
    } else if (this.platform === 'linux') {
      await execAsync(`xdotool mouseup 1`);
    }
    // Windows 需要更复杂的实现
  }

  // ============ 键盘控制 ============

  /**
   * 键盘输入文本
   */
  async keyboardType(text: string): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        // macOS - 需要转义特殊字符
        const escapedText = text.replace(/'/g, "'\\''");
        await execAsync(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`);
      } else if (this.platform === 'win32') {
        // Windows
        await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${text.replace(/[^a-zA-Z0-9]/g, '{$&}')}')"`);
      } else if (this.platform === 'linux') {
        // Linux
        await execAsync(`xdotool type "${text.replace(/"/g, '\\\\"')}"`);
      } else {
        return false;
      }
      
      console.log(`[LocalGUIExecutor] 键盘输入：${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      return true;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 键盘输入失败：${error.message}`);
      return false;
    }
  }

  /**
   * 执行快捷键
   */
  async keyboardShortcut(keys: string[]): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        await this.macOSShortcut(keys);
      } else if (this.platform === 'win32') {
        await this.windowsShortcut(keys);
      } else if (this.platform === 'linux') {
        await this.linuxShortcut(keys);
      } else {
        return false;
      }
      
      console.log(`[LocalGUIExecutor] 快捷键：${keys.join('+')}`);
      return true;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 快捷键失败：${error.message}`);
      return false;
    }
  }

  private async macOSShortcut(keys: string[]): Promise<void> {
    const keyMap: Record<string, string> = {
      'ctrl': 'control',
      'cmd': 'command',
      'alt': 'option',
      'shift': 'shift',
      'enter': 'return',
      'tab': 'tab',
      'space': 'space'
    };

    const mappedKeys = keys.map(k => keyMap[k.toLowerCase()] || k);
    const keystroke = mappedKeys.slice(0, -1).join(' down ') + (mappedKeys.length > 1 ? ' down ' : '');
    const lastKey = mappedKeys[mappedKeys.length - 1];
    
    if (keystroke) {
      await execAsync(`osascript -e 'tell application "System Events" to key down "${keystroke.trim()}"'`);
    }
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "${lastKey}"'`);
    if (keystroke) {
      await execAsync(`osascript -e 'tell application "System Events" to key up "${keystroke.trim()}"'`);
    }
  }

  private async windowsShortcut(keys: string[]): Promise<void> {
    const keyMap: Record<string, string> = {
      'ctrl': '^',
      'alt': '%',
      'shift': '+',
      'win': '#',
      'enter': '~',
      'tab': '{TAB}',
      'space': ' '
    };

    const shortcut = keys.map(k => keyMap[k.toLowerCase()] || k.toUpperCase()).join('');
    await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${shortcut}')"`);
  }

  private async linuxShortcut(keys: string[]): Promise<void> {
    const keyMap: Record<string, string> = {
      'ctrl': 'Control_L',
      'alt': 'Alt_L',
      'shift': 'Shift_L',
      'enter': 'Return',
      'tab': 'Tab',
      'space': 'space'
    };

    const mappedKeys = keys.map(k => keyMap[k.toLowerCase()] || k);
    await execAsync(`xdotool keydown ${mappedKeys.slice(0, -1).join(' ')} key ${mappedKeys[mappedKeys.length - 1]}`);
  }

  // ============ 窗口管理 ============

  /**
   * 获取窗口列表
   */
  async listWindows(): Promise<WindowInfo[]> {
    try {
      if (this.platform === 'darwin') {
        return await this.listMacOSWindows();
      } else if (this.platform === 'win32') {
        return await this.listWindowsWindows();
      } else if (this.platform === 'linux') {
        return await this.listLinuxWindows();
      }
      return [];
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 获取窗口列表失败：${error.message}`);
      return [];
    }
  }

  private async listMacOSWindows(): Promise<WindowInfo[]> {
    const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of every process whose background only is false'`);
    // 简化的实现，实际需要更复杂的 AppleScript
    return [];
  }

  private async listWindowsWindows(): Promise<WindowInfo[]> {
    const { stdout } = await execAsync(`powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Id, MainWindowTitle | ConvertTo-Json"`);
    // 简化的实现
    return [];
  }

  private async listLinuxWindows(): Promise<WindowInfo[]> {
    const { stdout } = await execAsync('wmctrl -l');
    // 简化的实现
    return [];
  }

  /**
   * 获取前台窗口
   */
  async getForegroundWindow(): Promise<WindowInfo | null> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
        return {
          id: 0,
          title: stdout.trim(),
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          isForeground: true
        };
      }
      return null;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 获取前台窗口失败：${error.message}`);
      return null;
    }
  }

  /**
   * 激活窗口
   */
  async activateWindow(windowId: number): Promise<boolean> {
    try {
      // macOS 实现
      if (this.platform === 'darwin') {
        await execAsync(`osascript -e 'tell application "System Events" to set frontmost of first application process whose id is ${windowId} to true'`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 激活窗口失败：${error.message}`);
      return false;
    }
  }

  /**
   * 关闭窗口
   */
  async closeWindow(windowId: number): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        await execAsync(`osascript -e 'tell application "System Events" to close window 1 of first application process whose id is ${windowId}'`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 关闭窗口失败：${error.message}`);
      return false;
    }
  }

  // ============ 应用启动 ============

  /**
   * 启动应用
   */
  async launchApp(appPath: string, args: string[] = []): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      if (this.platform === 'darwin') {
        // macOS - 打开 .app 应用
        const argsStr = args.map(a => `"${a}"`).join(' ');
        const { stdout } = await execAsync(`open "${appPath}" ${argsStr}`);
        console.log(`[LocalGUIExecutor] 启动应用：${appPath}`);
        return { success: true };
      } else if (this.platform === 'win32') {
        // Windows - 启动可执行文件
        const argsStr = args.join(' ');
        const { stdout } = await execAsync(`start "" "${appPath}" ${argsStr}`);
        console.log(`[LocalGUIExecutor] 启动应用：${appPath}`);
        return { success: true };
      } else if (this.platform === 'linux') {
        // Linux - 启动应用
        const argsStr = args.join(' ');
        const { stdout } = await execAsync(`${appPath} ${argsStr} &`);
        console.log(`[LocalGUIExecutor] 启动应用：${appPath}`);
        return { success: true };
      }
      
      return { success: false, error: 'Unsupported platform' };
    } catch (error: any) {
      console.error(`[LocalGUIExecutor] 启动应用失败：${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查应用是否已安装
   */
  async isAppInstalled(appName: string): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await execAsync(`mdfind "kMDItemCFName == '${appName}.app'"`);
        return stdout.trim().length > 0;
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(`where ${appName}.exe`);
        return stdout.trim().length > 0;
      } else if (this.platform === 'linux') {
        const { stdout } = await execAsync(`which ${appName}`);
        return stdout.trim().length > 0;
      }
      return false;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * 获取当前鼠标位置
   */
  getMousePosition(): MousePosition {
    return this.currentMousePos;
  }

  /**
   * 获取平台信息
   */
  getPlatform(): string {
    return this.platform;
  }
}

// 导出单例
export const localGUIExecutor = new LocalGUIExecutor();
