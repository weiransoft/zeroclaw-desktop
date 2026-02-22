import { WorkflowTemplate, WorkflowStep } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Wand2, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface WorkflowCreatorProps {
  templates: WorkflowTemplate[];
  onCreate: (config: any) => void;
  onClose: () => void;
}

export function WorkflowCreator({
  templates,
  onCreate,
  onClose,
}: WorkflowCreatorProps) {
  const [mode, setMode] = useState<'manual' | 'template'>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<string[]>(['']);
  const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([{}]);

  const addRole = () => setRoles([...roles, '']);
  const updateRole = (index: number, value: string) => {
    const newRoles = [...roles];
    newRoles[index] = value;
    setRoles(newRoles);
  };
  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const addStep = () => setSteps([...steps, {}]);
  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    onCreate({
      name,
      description,
      roles: roles.filter((r) => r.trim()),
      steps: steps.map((s) => ({
        name: s.name || '',
        description: s.description || '',
        assignedTo: s.assignedTo || '',
        dependencies: s.dependencies || [],
        status: 'pending' as const,
      })),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-dark-700 p-4 bg-dark-900 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark-100">创建工作流</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>

      {/* Mode selector */}
      <div className="border-b border-dark-700 p-4 bg-dark-900">
        <div className="flex gap-2">
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('manual')}
          >
            <FileText size={14} className="mr-2" />
            手动创建
          </Button>
          <Button
            variant={mode === 'template' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('template')}
          >
            <Sparkles size={14} className="mr-2" />
            从模板
          </Button>
        </div>
      </div>

      <div className="p-4">
        {mode === 'manual' && (
          <div className="space-y-6 max-w-2xl">
            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  工作流名称
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入工作流名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入工作流描述"
                  className="w-full h-20 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 placeholder:text-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Roles */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                角色
              </label>
              <div className="space-y-2">
                {roles.map((role, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={role}
                      onChange={(e) => updateRole(index, e.target.value)}
                      placeholder="角色名称"
                    />
                    {roles.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRole(index)}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRole}>
                  <Plus size={14} className="mr-2" />
                  添加角色
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                步骤
              </label>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">步骤 {index + 1}</CardTitle>
                        {steps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(index)}
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={step.name || ''}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        placeholder="步骤名称"
                      />
                      <textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="步骤描述"
                        className="w-full h-16 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-dark-100 placeholder:text-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <Input
                        value={step.assignedTo || ''}
                        onChange={(e) => updateStep(index, 'assignedTo', e.target.value)}
                        placeholder="负责人"
                      />
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus size={14} className="mr-2" />
                  添加步骤
                </Button>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={!name.trim()}>
              创建工作流
            </Button>
          </div>
        )}

        {mode === 'template' && (
          <div className="grid grid-cols-2 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-2 text-center text-dark-400 py-8">
                暂无模板
              </div>
            ) : (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary-500 transition-colors"
                  onClick={() => {
                    setName(template.name);
                    setDescription(template.description || '');
                    if (template.roles) {
                      setRoles(template.roles);
                    }
                    if (template.steps) {
                      setSteps(template.steps);
                    }
                    setMode('manual');
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-dark-400">{template.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{template.author}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
