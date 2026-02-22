import { ConsensusState } from '@/types';
import { cn } from '@/lib/utils';
import { ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsensusPanelProps {
  consensus: ConsensusState;
}

export function ConsensusPanel({ consensus }: ConsensusPanelProps) {
  const hasDisagreement = consensus.disagreements.length > 0;
  const isResolved = consensus.status === 'agreed';

  return (
    <div className="border-t border-dark-700 p-4 bg-dark-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isResolved ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <AlertTriangle size={16} className="text-yellow-400" />
            )}
            <span className="text-sm font-medium text-dark-100">
              共识状态: {isResolved ? '已达成' : hasDisagreement ? '存在分歧' : '等待中'}
            </span>
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-4 mb-3">
          {/* Agreements */}
          <div className="flex items-center gap-2">
            <ThumbsUp size={14} className="text-green-400" />
            <span className="text-xs text-dark-400">同意:</span>
            <div className="flex -space-x-1">
              {consensus.agreements.map((participant, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs text-white border-2 border-dark-900"
                  title={participant}
                >
                  {participant.charAt(0).toUpperCase()}
                </div>
              ))}
              {consensus.agreements.length === 0 && (
                <span className="text-xs text-dark-500">无</span>
              )}
            </div>
          </div>

          {/* Disagreements */}
          <div className="flex items-center gap-2">
            <ThumbsDown size={14} className="text-red-400" />
            <span className="text-xs text-dark-400">异议:</span>
            <div className="flex -space-x-1">
              {consensus.disagreements.map((participant, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs text-white border-2 border-dark-900"
                  title={participant}
                >
                  {participant.charAt(0).toUpperCase()}
                </div>
              ))}
              {consensus.disagreements.length === 0 && (
                <span className="text-xs text-dark-500">无</span>
              )}
            </div>
          </div>
        </div>

        {/* Resolution */}
        {consensus.resolution && (
          <div className="bg-dark-800 rounded-lg p-3 text-sm text-dark-200">
            <span className="text-dark-400">决议: </span>
            {consensus.resolution}
          </div>
        )}

        {/* Actions */}
        {hasDisagreement && !isResolved && (
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline">
              自动解决
            </Button>
            <Button size="sm" variant="outline">
              人工介入
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
