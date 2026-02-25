/**
 * 可观测性模块导出
 * 
 * 导出所有可观测性相关的组件、hooks 和类型
 */

// 组件
export { TraceBrowserView } from './TraceBrowserView';
export { ReasoningVisualization } from './ReasoningVisualization';
export { DecisionAnalysisPanel } from './DecisionAnalysisPanel';
export { ObservabilityDashboard } from './ObservabilityDashboard';

// Hooks
export {
  useTraces,
  useTrace,
  useReasoning,
  useDecisions,
  useEvaluation,
  useAggregation,
  useDashboardStats,
  useAlerts,
  useFailurePatterns,
  useTraceSubscription,
} from './hooks';

// 类型从 global.d.ts 导出
export type {
  TraceType,
  TraceInput,
  TraceOutput,
  AgentTrace,
  ReasoningStep,
  ReasoningChain,
  DecisionAlternative,
  DecisionQuality,
  DecisionPoint,
  EvaluationResult,
  TraceQuery,
  Alert,
  FailurePattern,
  DashboardStats,
  ObservabilityAPI,
} from '@/types/global';
