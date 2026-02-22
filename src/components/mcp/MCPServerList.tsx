import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Edit, Trash2, Plus, RefreshCw, Server } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  disabled: boolean;
  status: string;
  last_error: string | null;
  tools_count: number;
  resources_count: number;
  prompts_count: number;
  created_at: string;
  updated_at: string;
}

interface MCPServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
  disabled: boolean;
}

const MCP_TEMPLATES = [
  {
    name: 'filesystem',
    displayName: '文件系统',
    description: '文件和目录操作',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-filesystem /tmp',
  },
  {
    name: 'git',
    displayName: 'Git',
    description: 'Git 仓库操作',
    command: 'uvx',
    args: 'mcp-server-git',
  },
  {
    name: 'sqlite',
    displayName: 'SQLite',
    description: 'SQLite 数据库',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-sqlite',
  },
  {
    name: 'brave-search',
    displayName: 'Brave Search',
    description: 'Brave 搜索引擎',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-brave-search',
    envTemplate: 'BRAVE_API_KEY=your-api-key',
  },
];

export function MCPServerList() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [formData, setFormData] = useState<MCPServerFormData>({
    name: '',
    command: '',
    args: '',
    env: '',
    disabled: false,
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const result = await window.zeroclaw.mcp.list();
      setServers(result.servers || []);
    } catch (err) {
      console.error('Failed to load MCP servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingServer(null);
    setFormData({ name: '', command: '', args: '', env: '', disabled: false });
    setDialogOpen(true);
  };

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      command: server.command,
      args: server.args.join(' '),
      env: Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n'),
      disabled: server.disabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const request = {
      name: formData.name,
      command: formData.command,
      args: formData.args.split(' ').filter(Boolean),
      env: formData.env.split('\n').reduce((acc, line) => {
        const [key, ...values] = line.split('=');
        if (key && values.length) {
          acc[key.trim()] = values.join('=').trim();
        }
        return acc;
      }, {} as Record<string, string>),
      disabled: formData.disabled,
    };

    try {
      if (editingServer) {
        await window.zeroclaw.mcp.update(editingServer.id, request);
      } else {
        await window.zeroclaw.mcp.create(request);
      }
      setDialogOpen(false);
      loadServers();
    } catch (err) {
      console.error('Failed to save MCP server:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此服务器吗？')) {
      try {
        await window.zeroclaw.mcp.delete(id);
        loadServers();
      } catch (err) {
        console.error('Failed to delete MCP server:', err);
      }
    }
  };

  const handleStart = async (id: string) => {
    try {
      await window.zeroclaw.mcp.start(id);
      loadServers();
    } catch (err) {
      console.error('Failed to start MCP server:', err);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await window.zeroclaw.mcp.stop(id);
      loadServers();
    } catch (err) {
      console.error('Failed to stop MCP server:', err);
    }
  };

  const handleTemplateSelect = (template: typeof MCP_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      command: template.command,
      args: template.args,
      env: template.envTemplate || '',
      disabled: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '已停止';
      case 'error': return '错误';
      default: return '未启动';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Server size={20} />
          <h2 className="text-lg font-semibold">MCP 服务器管理</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadServers}>
            <RefreshCw size={16} className="mr-1" />
            刷新
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            添加服务器
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-dark-400">加载中...</div>
      ) : servers.length === 0 ? (
        <Card className="bg-dark-800 border-dark-700">
          <CardContent className="py-8 text-center text-dark-400">
            <Server size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无 MCP 服务器</p>
            <p className="text-sm mt-2">点击"添加服务器"开始配置</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {servers.map((server) => (
            <Card key={server.id} className="bg-dark-800 border-dark-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{server.name}</h3>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(server.status)} text-white border-0 text-xs`}
                      >
                        {getStatusLabel(server.status)}
                      </Badge>
                      {server.disabled && (
                        <Badge variant="outline" className="text-xs">已禁用</Badge>
                      )}
                    </div>
                    <p className="text-sm text-dark-400 font-mono">
                      {server.command} {server.args.join(' ')}
                    </p>
                    {server.last_error && (
                      <p className="text-sm text-red-400 mt-1">{server.last_error}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {server.tools_count} 工具
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {server.resources_count} 资源
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {server.prompts_count} 提示
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {server.status === 'running' ? (
                      <Button variant="ghost" size="icon" onClick={() => handleStop(server.id)}>
                        <Square size={16} />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleStart(server.id)}>
                        <Play size={16} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(server)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(server.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingServer ? '编辑服务器' : '添加服务器'}
            </h2>

            {!editingServer && (
              <div className="mb-4">
                <label className="text-sm text-dark-400 mb-2 block">快速选择模板</label>
                <div className="grid grid-cols-2 gap-2">
                  {MCP_TEMPLATES.map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{template.displayName}</div>
                        <div className="text-xs text-dark-400">{template.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-dark-400 mb-1 block">名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="filesystem"
                />
              </div>
              <div>
                <label className="text-sm text-dark-400 mb-1 block">命令</label>
                <Input
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="npx"
                />
              </div>
              <div>
                <label className="text-sm text-dark-400 mb-1 block">参数 (空格分隔)</label>
                <Input
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                />
              </div>
              <div>
                <label className="text-sm text-dark-400 mb-1 block">环境变量 (每行 KEY=VALUE)</label>
                <textarea
                  className="w-full bg-dark-900 border border-dark-700 rounded-md p-2 text-sm"
                  rows={3}
                  value={formData.env}
                  onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                  placeholder="API_KEY=xxx&#10;DEBUG=true"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="disabled"
                  checked={formData.disabled}
                  onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })}
                />
                <label htmlFor="disabled" className="text-sm">禁用此服务器</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
