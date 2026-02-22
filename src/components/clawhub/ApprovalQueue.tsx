import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SkillApproval } from './ClawHubPanel';
import { Check, X, Download, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ApprovalQueueProps {
  onProcessed?: () => void;
}

export function ApprovalQueue({ onProcessed }: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<SkillApproval[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<SkillApproval | null>(null);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    loadApprovals();

    const cleanupRequest = window.electron?.on('clawhub:approval-request', (approval: SkillApproval) => {
      setApprovals(prev => [...prev, approval]);
    });

    const cleanupProgress = window.electron?.on('clawhub:download-progress', (approval: SkillApproval) => {
      setApprovals(prev => prev.map(a => 
        a.id === approval.id ? approval : a
      ));
    });

    const cleanupCompleted = window.electron?.on('clawhub:download-completed', (approval: SkillApproval) => {
      setApprovals(prev => prev.map(a => 
        a.id === approval.id ? approval : a
      ));
    });

    const cleanupFailed = window.electron?.on('clawhub:download-failed', (data: { approval: SkillApproval }) => {
      setApprovals(prev => prev.map(a => 
        a.id === data.approval.id ? data.approval : a
      ));
    });

    return () => {
      cleanupRequest?.();
      cleanupProgress?.();
      cleanupCompleted?.();
      cleanupFailed?.();
    };
  }, []);

  const loadApprovals = async () => {
    try {
      const allApprovals: SkillApproval[] = await window.electron?.invoke('clawhub:approvals') || [];
      setApprovals(allApprovals);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    try {
      await window.electron?.invoke('clawhub:approve', selectedApproval.id, comment);
      setDialogOpen(false);
      setComment('');
      onProcessed?.();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    try {
      await window.electron?.invoke('clawhub:reject', selectedApproval.id, comment);
      setDialogOpen(false);
      setComment('');
      onProcessed?.();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle size={18} className="text-yellow-400" />;
      case 'approved':
        return <Check size={18} className="text-green-400" />;
      case 'rejected':
        return <X size={18} className="text-red-400" />;
      case 'downloading':
        return <Loader2 size={18} className="text-primary-400 animate-spin" />;
      case 'completed':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'failed':
        return <XCircle size={18} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'approved':
        return 'bg-green-600/20 text-green-400';
      case 'rejected':
        return 'bg-red-600/20 text-red-400';
      case 'downloading':
        return 'bg-primary-600/20 text-primary-400';
      case 'completed':
        return 'bg-green-600/20 text-green-400';
      case 'failed':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-dark-700 text-dark-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      downloading: '下载中',
      completed: '已完成',
      failed: '失败',
    };
    return labels[status] || status;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const processedApprovals = approvals.filter(a => a.status !== 'pending');

  if (approvals.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-dark-500">
        暂无审批记录
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {pendingApprovals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-dark-100 font-medium mb-3">
            待处理 ({pendingApprovals.length})
          </h3>
          <div className="space-y-2">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start gap-3 p-3 bg-dark-900 border border-dark-700 rounded-lg"
              >
                <div className="mt-1">{getStatusIcon(approval.status)}</div>
                <div className="flex-1">
                  <div className="text-dark-100 font-medium">
                    {approval.skill?.name || approval.request.skillId}
                  </div>
                  <div className="text-dark-400 text-sm mt-1">
                    请求者: {approval.request.requestedBy}
                  </div>
                  <div className="text-dark-400 text-sm">
                    原因: {approval.request.reason}
                  </div>
                  <div className="text-dark-500 text-xs mt-1">
                    {formatDate(approval.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setAction('approve');
                      setDialogOpen(true);
                    }}
                    className="px-3 py-1.5 text-sm bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors"
                  >
                    批准
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setAction('reject');
                      setDialogOpen(true);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {processedApprovals.length > 0 && (
        <div>
          <h3 className="text-dark-100 font-medium mb-3">
            历史记录 ({processedApprovals.length})
          </h3>
          <div className="space-y-2">
            {processedApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start gap-3 p-3 bg-dark-900 border border-dark-700 rounded-lg"
              >
                <div className="mt-1">{getStatusIcon(approval.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-dark-100 font-medium">
                      {approval.skill?.name || approval.request.skillId}
                    </span>
                    <span className={cn('px-2 py-0.5 text-xs rounded', getStatusColor(approval.status))}>
                      {getStatusLabel(approval.status)}
                    </span>
                  </div>
                  {approval.status === 'downloading' && approval.downloadProgress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1 bg-dark-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all duration-300"
                          style={{ width: `${approval.downloadProgress}%` }}
                        />
                      </div>
                      <div className="text-dark-400 text-xs mt-1">
                        下载进度: {approval.downloadProgress}%
                      </div>
                    </div>
                  )}
                  {approval.error && (
                    <div className="text-red-400 text-sm mt-1">
                      错误: {approval.error}
                    </div>
                  )}
                  {approval.rejectReason && (
                    <div className="text-red-400 text-sm mt-1">
                      拒绝原因: {approval.rejectReason}
                    </div>
                  )}
                  <div className="text-dark-500 text-xs mt-1">
                    {formatDate(approval.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 w-96 max-w-full">
            <h3 className="text-dark-100 font-medium mb-4">
              {action === 'approve' ? '批准下载' : '拒绝下载'}
            </h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === 'approve' ? '备注 (可选)' : '拒绝原因'}
              className="w-full h-20 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 bg-dark-700 text-dark-100 rounded hover:bg-dark-600 transition-colors"
              >
                取消
              </button>
              {action === 'approve' ? (
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                >
                  确认批准
                </button>
              ) : (
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                >
                  确认拒绝
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalQueue;
