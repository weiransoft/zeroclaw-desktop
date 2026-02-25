import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform] = useState(window.zeroclaw?.platform || 'darwin');

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.zeroclaw.window.isMaximized();
        setIsMaximized(maximized);
      } catch (err) {
        console.error('Failed to check maximized state:', err);
      }
    };

    checkMaximized();

    const unsubscribe = window.zeroclaw.window.onMaximizeChange?.((maximized: boolean) => {
      setIsMaximized(maximized);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      await window.zeroclaw.window.minimize();
    } catch (err) {
      console.error('Failed to minimize:', err);
    }
  };

  const handleMaximize = async () => {
    try {
      await window.zeroclaw.window.maximize();
      setIsMaximized(!isMaximized);
    } catch (err) {
      console.error('Failed to maximize:', err);
    }
  };

  const handleClose = async () => {
    try {
      await window.zeroclaw.window.close();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  };

  if (platform === 'darwin') {
    return (
      <div 
        className="h-8 bg-dark-900 flex items-center justify-center select-none relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="text-xs text-dark-400 font-medium pointer-events-none">
          ZeroClaw Desktop
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-8 bg-dark-900 flex items-center justify-between px-2 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-xs text-dark-400 font-medium">ZeroClaw Desktop</span>
      </div>
      
      <div 
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center hover:bg-dark-700 transition-colors"
          title="最小化"
        >
          <Minus size={14} className="text-dark-300" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center hover:bg-dark-700 transition-colors"
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <Square size={12} className="text-dark-300" />
          ) : (
            <Maximize2 size={12} className="text-dark-300" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
          title="关闭"
        >
          <X size={14} className="text-dark-300" />
        </button>
      </div>
    </div>
  );
}
