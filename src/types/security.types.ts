/**
 * 安全相关的类型定义
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SecureToken {
  token: string;
  encrypted: boolean;
  createdAt: Date;
}

export interface SafeConfigPath {
  basePath: string;
  allowedSubdirs: string[];
  fullPath: string;
}