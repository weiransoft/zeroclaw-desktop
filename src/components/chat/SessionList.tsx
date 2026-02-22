import { Session } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MessageSquare, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SessionListProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRename: (sessionId: string, name: string) => void;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
  onRename,
}: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleRename = (sessionId: string) => {
    if (editName.trim()) {
      onRename(sessionId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500 text-sm p-4">
        暂无会话
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={cn(
            'group relative flex items-start gap-2 p-3 cursor-pointer hover:bg-dark-800 transition-colors',
            currentSessionId === session.id && 'bg-dark-800'
          )}
          onClick={() => !editingId && onSelect(session.id)}
        >
          <MessageSquare size={16} className="mt-0.5 text-dark-400 shrink-0" />
          
          <div className="flex-1 min-w-0">
            {editingId === session.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(session.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(session.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="text-sm font-medium text-dark-100 truncate">
                  {session.name}
                </div>
                <div className="text-xs text-dark-500 mt-0.5">
                  {session.updatedAt && !isNaN(new Date(session.updatedAt).getTime())
                    ? formatDistanceToNow(session.updatedAt, {
                        addSuffix: true,
                        locale: zhCN,
                      })
                    : '刚刚'}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1',
              showMenu === session.id && 'opacity-100'
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(session.id);
                setEditName(session.name);
                setShowMenu(null);
              }}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-100"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
                setShowMenu(null);
              }}
              className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
