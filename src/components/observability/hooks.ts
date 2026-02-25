/**
 * 可观测性数据 hooks
 * 
 * 提供获取轨迹、推理链、决策点等数据的 React hooks
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  AgentTrace,
  TraceQuery,
  ReasoningChain,
  DecisionPoint,
  EvaluationResult,
  AggregationQuery,
  AggregationResult,
  DashboardStats,
  Alert,
  FailurePattern,
  TimeRange,
} from '@/types/global';

/**
 * 检查可观测性 API 是否可用
 */
function isObservabilityAvailable(): boolean {
  return !!(window.zeroclaw?.observability);
}

/**
 * 轨迹列表 hook
 * 获取和搜索轨迹列表
 */
export function useTraces(initialQuery?: TraceQuery) {
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const queryRef = useRef<TraceQuery>(initialQuery || {});

  const fetchTraces = useCallback(async (query: TraceQuery, append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!isObservabilityAvailable()) {
        setTraces([]);
        setHasMore(false);
        return;
      }
      const result = await window.zeroclaw.observability.listTraces(query);
      const tracesList = Array.isArray(result) ? result : [];
      
      if (append) {
        setTraces(prev => [...prev, ...tracesList]);
      } else {
        setTraces(tracesList);
      }
      
      setHasMore(tracesList.length === (query.limit || 50));
      queryRef.current = query;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch traces');
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const currentQuery = queryRef.current;
    await fetchTraces(
      {
        ...currentQuery,
        offset: (currentQuery.offset || 0) + (currentQuery.limit || 50),
      },
      true
    );
  }, [hasMore, loading, fetchTraces]);

  const search = useCallback(async (query: TraceQuery) => {
    await fetchTraces({ ...query, offset: 0 });
  }, [fetchTraces]);

  useEffect(() => {
    fetchTraces(initialQuery || {});
  }, []);

  return {
    traces,
    loading,
    error,
    hasMore,
    search,
    loadMore,
    refresh: () => fetchTraces(queryRef.current),
  };
}

/**
 * 单条轨迹 hook
 * 获取轨迹详情
 */
export function useTrace(traceId: string | null) {
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setTrace(null);
      return;
    }

    if (!isObservabilityAvailable()) {
      setTrace(null);
      return;
    }

    setLoading(true);
    setError(null);

    window.zeroclaw.observability.getTrace(traceId)
      .then(setTrace)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch trace'))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { trace, loading, error };
}

/**
 * 推理链 hook
 * 获取轨迹的推理链
 */
export function useReasoning(traceId: string | null) {
  const [reasoning, setReasoning] = useState<ReasoningChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setReasoning(null);
      return;
    }

    if (!isObservabilityAvailable()) {
      setReasoning(null);
      return;
    }

    setLoading(true);
    setError(null);

    window.zeroclaw.observability.getReasoning(traceId)
      .then(setReasoning)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch reasoning'))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { reasoning, loading, error };
}

/**
 * 决策点 hook
 * 获取轨迹的决策点列表
 */
export function useDecisions(traceId: string | null) {
  const [decisions, setDecisions] = useState<DecisionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setDecisions([]);
      return;
    }

    if (!isObservabilityAvailable()) {
      setDecisions([]);
      return;
    }

    setLoading(true);
    setError(null);

    window.zeroclaw.observability.getDecisions(traceId)
      .then(result => setDecisions(Array.isArray(result) ? result : []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch decisions'))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { decisions, loading, error };
}

/**
 * 评估结果 hook
 * 获取轨迹的评估结果
 */
export function useEvaluation(traceId: string | null) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    if (!traceId || !isObservabilityAvailable()) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await window.zeroclaw.observability.evaluateTrace(traceId);
      setEvaluation(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to evaluate trace';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [traceId]);

  useEffect(() => {
    if (!traceId) {
      setEvaluation(null);
      return;
    }

    if (!isObservabilityAvailable()) {
      setEvaluation(null);
      return;
    }

    setLoading(true);
    window.zeroclaw.observability.getEvaluation(traceId)
      .then(setEvaluation)
      .catch(() => setEvaluation(null))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { evaluation, loading, error, evaluate };
}

/**
 * 聚合查询 hook
 */
export function useAggregation(query: AggregationQuery | null) {
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 JSON.stringify 但缓存结果避免不必要的重新渲染
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    if (!query) {
      setResult(null);
      return;
    }

    if (!isObservabilityAvailable()) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    window.zeroclaw.observability.aggregate(query)
      .then(setResult)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to aggregate'))
      .finally(() => setLoading(false));
  }, [queryKey]);

  return { result, loading, error };
}

/**
 * 仪表板统计 hook
 */
export function useDashboardStats(timeRange: TimeRange) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 检查 API 是否存在
      if (!window.zeroclaw?.observability?.getDashboardStats) {
        // 返回默认数据
        setStats({
          totalTraces: 0,
          successRate: 0,
          avgDurationMs: 0,
          totalCost: 0,
          tracesTrend: 0,
          successRateTrend: 0,
          durationTrend: 0,
          costTrend: 0,
          traceTrend: [],
          successRateTrendData: [],
          decisionQualityDistribution: [],
          toolUsage: [],
          alerts: [],
          failurePatterns: [],
        });
        return;
      }
      const result = await window.zeroclaw.observability.getDashboardStats(timeRange);
      // 确保返回有效数据，提供默认值
      setStats(result || {
        totalTraces: 0,
        successRate: 0,
        avgDurationMs: 0,
        totalCost: 0,
        tracesTrend: 0,
        successRateTrend: 0,
        durationTrend: 0,
        costTrend: 0,
        traceTrend: [],
        successRateTrendData: [],
        decisionQualityDistribution: [],
        toolUsage: [],
        alerts: [],
        failurePatterns: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

/**
 * 告警列表 hook
 */
export function useAlerts(limit = 20) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 检查 API 是否存在
      if (!window.zeroclaw?.observability?.getAlerts) {
        setAlerts([]);
        return;
      }
      const result = await window.zeroclaw.observability.getAlerts(limit);
      // 确保 result 是数组
      setAlerts(Array.isArray(result) ? result : (result as any)?.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      if (!window.zeroclaw?.observability?.dismissAlert) return;
      await window.zeroclaw.observability.dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh: fetchAlerts, dismissAlert };
}

/**
 * 失败模式 hook
 */
export function useFailurePatterns() {
  const [patterns, setPatterns] = useState<FailurePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isObservabilityAvailable()) {
        setPatterns([]);
        return;
      }
      const result = await window.zeroclaw.observability.getFailurePatterns();
      setPatterns(Array.isArray(result) ? result : (result as any)?.patterns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patterns');
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return { patterns, loading, error, refresh: fetchPatterns };
}

/**
 * 实时轨迹订阅 hook
 * 用于实时监控新产生的轨迹
 */
export function useTraceSubscription(onNewTrace?: (trace: AgentTrace) => void) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // 使用 ref 存储回调，避免依赖变化导致重复订阅
  const onNewTraceRef = useRef(onNewTrace);

  // 保持 ref 与最新回调同步
  useEffect(() => {
    onNewTraceRef.current = onNewTrace;
  }, [onNewTrace]);

  useEffect(() => {
    // 检查 API 是否可用
    if (!window.zeroclaw.observability?.onNewTrace) {
      console.warn('Trace subscription not available');
      return;
    }

    const unsubscribe = window.zeroclaw.observability.onNewTrace((trace) => {
      // 通过 ref 调用最新回调
      onNewTraceRef.current?.(trace);
    });

    unsubscribeRef.current = unsubscribe;
    setIsSubscribed(true);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, []); // 空依赖数组，只在挂载时订阅一次

  return { isSubscribed };
}
