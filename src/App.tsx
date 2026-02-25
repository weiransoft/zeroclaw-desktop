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
    const checkPairingStatus = async () => {
      try {
        if (!window.zeroclaw || !window.zeroclaw.system) {
          console.log('ZeroClaw API not ready yet');
          return;
        }
        
        const status = await window.zeroclaw.system.getPairingStatus();
        if (!isMountedRef.current) return;
        
        setGatewayAvailable(status.gatewayAvailable);
        setIsPaired(status.isPaired);
        
        if (status.gatewayAvailable && !status.isPaired) {
          setShowPairingDialog(true);
        }
      } catch (err) {
        console.error('Failed to check pairing status:', err);
      }
    };

    checkPairingStatus();
    
    const interval = setInterval(checkPairingStatus, 5000);
    
    // 监听配对成功事件
    let cleanupPairedListener: (() => void) | null = null;
    
    if (window.zeroclaw && window.zeroclaw.system && typeof window.zeroclaw.system.onPaired === 'function') {
      cleanupPairedListener = window.zeroclaw.system.onPaired((status) => {
        if (!isMountedRef.current) return;
        
        setIsPaired(status.isPaired);
        setShowPairingDialog(false);
      });
    } else {
      console.log('onPaired function not available yet');
    }
    
    return () => {
      clearInterval(interval);
      if (cleanupPairedListener) {
        cleanupPairedListener();
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
