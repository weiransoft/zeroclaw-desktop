import { useChat } from '@/hooks/useChat';
import { useConfigStore } from '@/stores/configStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { SessionList } from './SessionList';
import { NewChatDialog } from './NewChatDialog';
import { Plus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChatView() {
  const {
    messages,
    sessions,
    currentSessionId,
    loading,
    streaming,
    streamingContent,
    status,
    inputValue,
    setInputValue,
    sendMessage,
    abort,
    loadHistory,
    createSession,
    deleteSession,
    renameSession,
    setCurrentSession,
  } = useChat();

  const { agents, agentGroups } = useConfigStore();

  const assistantName = useMemo(() => {
    const enabledAgent = agents.find(a => a.enabled);
    return enabledAgent?.displayName || enabledAgent?.name || '助手';
  }, [agents]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    setShowNewChatDialog(true);
  };

  const handleCreateSession = async (options: {
    type: 'agent' | 'group';
    agentId?: string;
    groupId?: string;
    name?: string;
  }) => {
    const session = await createSession(options.name);
    
    if (session) {
      if (options.type === 'agent' && options.agentId) {
        console.log('[ChatView] Created session with agent:', options.agentId);
      } else if (options.type === 'group' && options.groupId) {
        console.log('[ChatView] Created session with group:', options.groupId);
      }
    }
  };

  return (
    <div className="flex h-full">
      {/* Session List Sidebar */}
      <div className="w-64 border-r border-dark-700 flex flex-col bg-dark-900">
        {/* Search & New */}
        <div className="p-3 space-y-2 border-b border-dark-700">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            size="sm"
          >
            <Plus size={16} />
            新建对话
          </Button>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
            />
            <Input
              placeholder="搜索会话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        {/* Session List */}
        <SessionList
          sessions={filteredSessions}
          currentSessionId={currentSessionId}
          onSelect={loadHistory}
          onDelete={deleteSession}
          onRename={renameSession}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSessionId ? (
          <>
            {/* Messages */}
            <MessageList
              messages={messages}
              loading={loading}
              streaming={streaming}
              streamingContent={streamingContent}
              status={status}
              assistantName={assistantName}
            />

            {/* Input */}
            <InputBar
              value={inputValue}
              onChange={setInputValue}
              onSend={sendMessage}
              onAbort={abort}
              loading={loading}
              streaming={streaming}
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              开始新对话
            </h3>
            <p className="text-sm text-dark-400 mb-4">
              选择一个现有会话或创建新会话
            </p>
            <Button onClick={handleNewChat}>
              <Plus size={16} className="mr-2" />
              新建对话
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onCreateSession={handleCreateSession}
      />
    </div>
  );
}
