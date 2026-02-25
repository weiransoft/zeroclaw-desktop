/**
 * 审批管理界面
 * 显示和处理工作流审批请求
 */
import { useState, useEffect } from 'react';
import { ApprovalRequest, ApprovalType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 获取审批类型文本
 */
function getApprovalTypeText(type: ApprovalType): string {
  const typeMap: Record<ApprovalType, string> = {
    boss_approval: 'Boss 审批',
    peer_review: '同行评审',
    stakeholder: '利益相关者',
    automated: '自动审批',
  };
  return typeMap[type] || type;
}

/**
 * 获取审批状态样式
 */
function getStatusStyle(status: string) {
  switch (status) {
    case 'approved':
      return { bg: 'bg-green-600', text: '已批准', icon: <CheckCircle size={14} /> };
    case 'rejected':
      return { bg: 'bg-red-600', text: '已拒绝', icon: <XCircle size={14} /> };
    default:
      return { bg: 'bg-yellow-600', text: '待处理', icon: <Clock size={14} /> };
  }
}

/**
 * 审批请求卡片
 */
function ApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  onApprove: (comment?: string) => void;
  onReject: (reason: string) => void;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const statusStyle = getStatusStyle(request.status);
  const isPending = request.status === 'pending';

  return (
    <Card className={cn('transition-all', isPending && 'border-yellow-600')}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getApprovalTypeText(request.type)}</Badge>
            <Badge className={statusStyle.bg}>
              <span className="flex items-center gap-1">
                {statusStyle.icon}
                {statusStyle.text}
              </span>
            </Badge>
          </div>
          <span className="text-xs text-dark-500">
            {new Date(request.createdAt).toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="py-3 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-dark-400" />
            <span className="text-dark-400">请求者:</span>
            <span className="text-dark-100">{request.requester}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-dark-400" />
            <span className="text-dark-400">审批者:</span>
            <span className="text-dark-100">{request.approver}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle size={14} className="text-dark-400" />
            <span className="text-dark-400">阶段:</span>
            <span className="text-dark-100">{request.phase}</span>
          </div>
          <div className="mt-2 p-2 bg-dark-800 rounded text-sm text-dark-200">
            {request.reason}
          </div>

          {/* 审批意见 */}
          {request.comment && (
            <div className="mt-2 p-2 bg-dark-800 rounded text-sm">
              <div className="text-xs text-dark-400 mb-1">审批意见:</div>
              <div className="text-dark-200">{request.comment}</div>
            </div>
          )}

          {/* 响应时间 */}
          {request.respondedAt && (
            <div className="text-xs text-dark-500">
              响应时间: {new Date(request.respondedAt).toLocaleString()}
            </div>
          )}

          {/* 操作按钮 */}
          {isPending && (
            <div className="mt-4 pt-3 border-t border-dark-700">
              {!showComment ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onApprove()}
                    className="flex-1"
                  >
                    <ThumbsUp size={14} className="mr-1" />
                    批准
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowComment(true)}
                    className="flex-1"
                  >
                    <ThumbsDown size={14} className="mr-1" />
                    拒绝
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="请输入拒绝原因..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(comment)}
                      disabled={!comment.trim()}
                      className="flex-1"
                    >
                      确认拒绝
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowComment(false);
                        setComment('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 审批管理主组件
 */
export function ApprovalManager() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const result = await window.zeroclaw.workflow.listApprovals();
      setApprovals(result || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, comment?: string) => {
    try {
      await window.zeroclaw.workflow.respondToApproval(approvalId, true, comment);
      loadApprovals();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (approvalId: string, reason: string) => {
    try {
      await window.zeroclaw.workflow.respondToApproval(approvalId, false, reason);
      loadApprovals();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const filteredApprovals = Array.isArray(approvals) ? approvals.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  }) : [];

  const pendingCount = Array.isArray(approvals) ? approvals.filter((a) => a.status === 'pending').length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw size={24} className="text-dark-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-dark-100">审批管理</h2>
          {pendingCount > 0 && (
            <Badge variant="default" className="bg-yellow-600">
              {pendingCount} 待处理
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadApprovals}>
          <RefreshCw size={14} className="mr-1" />
          刷新
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-dark-400" />
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors',
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          全部 ({approvals.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors',
            filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          待处理 ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors',
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          已批准 ({Array.isArray(approvals) ? approvals.filter((a) => a.status === 'approved').length : 0})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors',
            filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          已拒绝 ({Array.isArray(approvals) ? approvals.filter((a) => a.status === 'rejected').length : 0})
        </button>
      </div>

      {/* 审批列表 */}
      {filteredApprovals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-dark-500">
          <MessageSquare size={32} className="mb-2" />
          <span>暂无审批请求</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApprovals.map((request) => (
            <ApprovalCard
              key={request.id}
              request={request}
              onApprove={(comment) => handleApprove(request.id, comment)}
              onReject={(reason) => handleReject(request.id, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 审批队列小组件（用于侧边栏或状态栏）
 */
export function ApprovalQueueBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const result = await window.zeroclaw.workflow.listApprovals();
        const pending = (result || []).filter((a: ApprovalRequest) => a.status === 'pending');
        setCount(pending.length);
      } catch (err) {
        console.error('Failed to load approval count:', err);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-600 rounded text-xs text-white">
      <Clock size={12} />
      <span>{count} 个待审批</span>
    </div>
  );
}
