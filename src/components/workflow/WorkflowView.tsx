import { useWorkflow } from '@/hooks/useWorkflow';
import { WorkflowList } from './WorkflowList';
import { WorkflowDetail } from './WorkflowDetail';
import { WorkflowCreator } from './WorkflowCreator';
import { Plus, RefreshCw, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';

export function WorkflowView() {
  const {
    workflows,
    templates,
    selectedWorkflowId,
    loading,
    loadWorkflows,
    createWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
    selectWorkflow,
    refreshWorkflows,
  } = useWorkflow();

  const [showCreator, setShowCreator] = useState(false);

  const selectedWorkflow = useMemo(() => {
    return workflows.find(w => w.id === selectedWorkflowId) || null;
  }, [workflows, selectedWorkflowId]);

  const handleCreate = async (config: any) => {
    const workflow = await createWorkflow(config);
    if (workflow) {
      selectWorkflow(workflow.id);
    }
    setShowCreator(false);
  };

  return (
    <div className="flex h-full">
      {/* Workflow List Sidebar */}
      <div className="w-72 border-r border-dark-700 flex flex-col bg-dark-900">
        {/* Header */}
        <div className="p-3 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-dark-400" />
            <span className="font-medium text-dark-100">工作流</span>
            <span className="text-xs text-dark-500">({workflows.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshWorkflows}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCreator(true)}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Workflow List */}
        <WorkflowList
          workflows={workflows}
          selectedWorkflowId={selectedWorkflowId}
          onSelect={selectWorkflow}
          loading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {showCreator ? (
          <WorkflowCreator
            templates={templates}
            onCreate={handleCreate}
            onClose={() => setShowCreator(false)}
          />
        ) : selectedWorkflow ? (
          <WorkflowDetail
            workflow={selectedWorkflow}
            onStart={() => startWorkflow(selectedWorkflow.id)}
            onPause={() => pauseWorkflow(selectedWorkflow.id)}
            onResume={() => resumeWorkflow(selectedWorkflow.id)}
            onStop={() => stopWorkflow(selectedWorkflow.id)}
          />
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              工作流管理
            </h3>
            <p className="text-sm text-dark-400 mb-4">
              创建和管理自动化工作流
            </p>
            <Button onClick={() => setShowCreator(true)}>
              <Plus size={16} className="mr-2" />
              创建工作流
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
