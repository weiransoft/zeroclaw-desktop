/**
 * 安全工具函数
 */

/**
 * 验证UUID格式
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 清理和验证路径，防止路径遍历攻击
 */
export function sanitizePath(inputPath: string, allowedBasePath?: string): string | null {
  // 移除危险字符
  if (inputPath.includes('../') || inputPath.includes('..\\') || 
      inputPath.includes('/..') || inputPath.includes('\\..')) {
    return null;
  }

  // 规范化路径
  const normalizedPath = require('path').normalize(inputPath);

  // 如果提供了允许的基础路径，验证路径是否在其子目录下
  if (allowedBasePath) {
    const resolvedPath = require('path').resolve(normalizedPath);
    const resolvedBase = require('path').resolve(allowedBasePath);

    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }
  }

  return normalizedPath;
}

/**
 * 验证路径是否安全，防止路径遍历
 */
export function isPathTraversalSafe(inputPath: string, allowedBasePath: string): boolean {
  if (inputPath.includes('../') || inputPath.includes('..\\') || 
      inputPath.includes('/..') || inputPath.includes('\\..')) {
    return false;
  }

  const resolvedPath = require('path').resolve(inputPath);
  const resolvedBase = require('path').resolve(allowedBasePath);

  return resolvedPath.startsWith(resolvedBase);
}

/**
 * 验证API令牌格式
 */
export function isValidApiToken(token: string): boolean {
  // 检查基本格式 - 通常以特定前缀开头
  if (!token || typeof token !== 'string') {
    return false;
  }

  // 检查长度
  if (token.length < 10 || token.length > 200) {
    return false;
  }

  // 检查是否包含允许的字符
  const tokenRegex = /^zc_[a-zA-Z0-9_-]+$/;
  return tokenRegex.test(token);
}

/**
 * 清理用户输入，防止XSS
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // 移除潜在的危险字符
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 验证URL安全性
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // 只允许 http 和 https 协议
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 限制字符串长度
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength);
}