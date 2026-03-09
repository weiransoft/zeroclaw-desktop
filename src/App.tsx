import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TitleBar } from '@/components/layout/TitleBar';
import { ChatView } from '@/components/chat/ChatView';
import { SwarmView } from '@/components/swarm/SwarmView';
import { WorkflowView } from '@/components/workflow/WorkflowView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ObservabilityDashboard } from '@/components/observability/ObservabilityDashboard';
import { PairingDialog } from '@/components/settings/PairingDialog';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [gatewayAvailable, setGatewayAvailable] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    /**
     * 检查配对状态
     * 包含完整的错误处理和未捕获的 Promise 拒绝处理
     */
    const checkPairingStatus = async () => {
      try {
        if (!window.zeroclaw || !window.zeroclaw.system) {
          console.log('ZeroClaw API not ready yet');
          return;
        }
        
        const status = await window.zeroclaw.system.getPairingStatus();
        
        // 检查组件是否已卸载
        if (!isMountedRef.current) return;
        
        setGatewayAvailable(status.gatewayAvailable);
        setIsPaired(status.isPaired);
        
        if (status.gatewayAvailable && !status.isPaired) {
          setShowPairingDialog(true);
        }
      } catch (err) {
        // 使用类型守卫处理错误
        if (err instanceof Error) {
          console.error('Failed to check pairing status:', err.message);
          // 可选：显示用户友好的错误提示
          if (isMountedRef.current) {
            // 可以在这里设置错误状态，显示给用户
            console.warn('Pairing status check failed, will retry...');
          }
        } else {
          console.error('Unknown error checking pairing status');
        }
      }
    };

    // 初始检查
    checkPairingStatus().catch(err => {
      console.error('Unhandled promise rejection in checkPairingStatus:', err);
    });
    
    const interval = setInterval(() => {
      checkPairingStatus().catch(err => {
        console.error('Unhandled promise rejection in interval check:', err);
      });
    }, 5000);
    
    // 监听配对成功事件
    let cleanupPairedListener: (() => void) | null = null;
    
    try {
      if (window.zeroclaw && window.zeroclaw.system && typeof window.zeroclaw.system.onPaired === 'function') {
        cleanupPairedListener = window.zeroclaw.system.onPaired((status) => {
          if (!isMountedRef.current) return;
          
          setIsPaired(status.isPaired);
          setShowPairingDialog(false);
        });
      } else {
        console.log('onPaired function not available yet');
      }
    } catch (err) {
      console.error('Error setting up paired listener:', err);
    }
    
    return () => {
      clearInterval(interval);
      if (cleanupPairedListener) {
        try {
          cleanupPairedListener();
        } catch (err) {
          console.error('Error cleaning up paired listener:', err);
        }
      }
    };
  }, []);

  const handlePaired = () => {
    setShowPairingDialog(false);
    setIsPaired(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatView />;
      case 'swarm':
        return <SwarmView />;
      case 'workflow':
        return <WorkflowView />;
      case 'observability':
        return <ObservabilityDashboard />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dark-950 text-dark-100 overflow-hidden">
      <TitleBar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </main>
      </div>

      <StatusBar />
      
      <PairingDialog 
        isOpen={showPairingDialog} 
        onPaired={handlePaired}
        onClose={() => setShowPairingDialog(false)}
      />
    </div>
  );
}

export default App;
