import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, RefreshCw, Clock, Zap, TrendingUp } from 'lucide-react';

interface CostSummary {
  enabled: boolean;
  session_cost_usd: number;
  daily_cost_usd: number;
  monthly_cost_usd: number;
  total_tokens: number;
  request_count: number;
  session_duration_secs: number;
  by_model: Record<string, number>;
  daily_data?: Array<{
    date: string;
    cost: number;
    tokens: number;
  }>;
}

export function TokenUsageStats() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const [summaryData, dailyData] = await Promise.all([
        window.zeroclaw.cost.summary(),
        window.zeroclaw.cost.daily()
      ]);
      
      // 合并数据
      const combinedData = {
        ...summaryData,
        daily_data: dailyData?.daily_costs || []
      };
      
      setSummary(combinedData);
    } catch (err) {
      console.error('Failed to load cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatCost = (cost: number | undefined | null) => {
    if (cost === undefined || cost === null) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number | undefined | null) => {
    if (tokens === undefined || tokens === null) return '0';
    if (tokens < 1000) return tokens.toString();
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(2)}M`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Token 消耗统计</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadSummary}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-xs text-dark-400">
                  <Coins size={12} className="mr-1" />
                  会话成本
                </div>
                <div className="text-lg font-semibold text-dark-100">
                  {formatCost(summary.session_cost_usd)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-dark-400">
                  <Zap size={12} className="mr-1" />
                  总 Tokens
                </div>
                <div className="text-lg font-semibold text-dark-100">
                  {formatTokens(summary.total_tokens)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-dark-400">
                  <TrendingUp size={12} className="mr-1" />
                  请求数
                </div>
                <div className="text-lg font-semibold text-dark-100">
                  {summary.request_count}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-dark-400">
                  <Clock size={12} className="mr-1" />
                  会话时长
                </div>
                <div className="text-lg font-semibold text-dark-100">
                  {formatDuration(summary.session_duration_secs || 0)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-dark-700">
              <div className="text-xs text-dark-400 mb-2">成本明细</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-dark-400">今日</span>
                  <span className="text-dark-200">{formatCost(summary.daily_cost_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">本月</span>
                  <span className="text-dark-200">{formatCost(summary.monthly_cost_usd)}</span>
                </div>
              </div>
            </div>

            {Object.keys(summary.by_model || {}).length > 0 && (
              <div className="pt-2 border-t border-dark-700">
                <div className="text-xs text-dark-400 mb-2">按模型统计</div>
                <div className="space-y-1">
                  {Object.entries(summary.by_model).map(([model, cost]) => (
                    <div key={model} className="flex justify-between text-xs">
                      <span className="text-dark-400">{model}</span>
                      <span className="text-dark-200">{formatCost(cost as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.daily_data && summary.daily_data.length > 0 && (
              <div className="pt-2 border-t border-dark-700">
                <div className="text-xs text-dark-400 mb-2">每日成本趋势</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {summary.daily_data.slice(0, 7).map((day, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-dark-400">{day.date}</span>
                      <div className="text-right">
                        <div className="text-dark-200">{formatCost(day.cost)}</div>
                        <div className="text-xs text-dark-500">{formatTokens(day.tokens)} tokens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-dark-400">
            <Coins size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无消耗数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
