import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PairingDialogProps {
  isOpen: boolean;
  onPaired: () => void;
  onClose: () => void;
}

export function PairingDialog({ isOpen, onPaired, onClose }: PairingDialogProps) {
  const [mode, setMode] = useState<'code' | 'token'>('code');
  const [pairingCode, setPairingCode] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPairingCode('');
      setToken('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePairWithCode = async () => {
    if (!pairingCode.trim()) {
      setError('请输入配对码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.zeroclaw.system.pair(pairingCode.trim());
      if (result.success) {
        onPaired();
      } else {
        setError(result.error || '配对失败');
      }
    } catch (err: any) {
      setError(err.message || '配对失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSetToken = async () => {
    if (!token.trim()) {
      setError('请输入 Token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.zeroclaw.system.setToken(token.trim());
      if (result.success) {
        onPaired();
      } else {
        setError(result.message || '设置 Token 失败');
      }
    } catch (err: any) {
      // 安全：不输出敏感错误信息
      setError(err.message || '设置 Token 失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'code') {
        handlePairWithCode();
      } else {
        handleSetToken();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white pr-8">
          配对 ZeroClaw Gateway
        </h2>
        
        <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 text-sm font-medium ${mode === 'code' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setMode('code')}
          >
            配对码
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${mode === 'token' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setMode('token')}
          >
            Token
          </button>
        </div>

        {mode === 'code' ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              请在终端中查看 ZeroClaw Gateway 显示的配对码，输入后点击配对按钮。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  配对码
                </label>
                <Input
                  type="text"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入 6 位配对码"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                onClick={handlePairWithCode}
                disabled={loading || !pairingCode.trim()}
                className="w-full"
              >
                {loading ? '配对中...' : '配对'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              如果已有 Token，可以直接输入完成配对。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bearer Token
                </label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="zc_xxxxx"
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleSetToken}
                disabled={loading || !token.trim()}
                className="w-full"
              >
                {loading ? '设置中...' : '设置 Token'}
              </Button>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mt-2">
            {error}
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
          Gateway 地址: http://127.0.0.1:8080
        </p>
      </div>
    </div>
  );
}
