import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TitleBar } from '@/components/layout/TitleBar';
import { ChatView } from '@/components/chat/ChatView';
import { SwarmView } from '@/components/swarm/SwarmView';
import { WorkflowView } from '@/components/workflow/WorkflowView';
import { SettingsView } from '@/components/settings/SettingsView';
import { PairingDialog } from '@/components/settings/PairingDialog';
import { ClawHubPanel } from '@/components/clawhub';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [gatewayAvailable, setGatewayAvailable] = useState(false);

  useEffect(() => {
    const checkPairingStatus = async () => {
      try {
        const status = await window.zeroclaw.system.getPairingStatus();
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
    return () => clearInterval(interval);
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
      case 'clawhub':
        return <ClawHubPanel />;
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
      />
    </div>
  );
}

export default App;
