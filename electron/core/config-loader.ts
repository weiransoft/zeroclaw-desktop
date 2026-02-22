import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ZeroClawConfig {
  api_key?: string;
  default_provider?: string;
  default_model?: string;
  default_temperature?: number;
  observability?: {
    backend?: string;
    enabled?: boolean;
    export_interval_seconds?: number;
  };
  autonomy?: {
    level?: string;
    workspace_only?: boolean;
    allowed_commands?: string[];
    forbidden_paths?: string[];
    max_actions_per_hour?: number;
    max_cost_per_day_cents?: number;
    require_approval_for_medium_risk?: boolean;
    block_high_risk_commands?: boolean;
  };
  runtime?: {
    timeout_seconds?: number;
    max_retries?: number;
  };
  reliability?: {
    retry_delay_ms?: number;
    max_retries?: number;
  };
  scheduler?: {
    enabled?: boolean;
    max_tasks?: number;
    max_concurrent?: number;
  };
  heartbeat?: {
    enabled?: boolean;
    interval_minutes?: number;
  };
  memory?: {
    backend?: string;
    auto_save?: boolean;
    hygiene_enabled?: boolean;
    archive_after_days?: number;
    max_entries?: number;
  };
  swarm?: {
    subagent_max_concurrent?: number;
    orchestrator_prompt?: {
      system_prompt?: string;
    };
  };
  agent?: {
    compact_context?: boolean;
    max_tool_iterations?: number;
  };
  agents?: Record<string, {
    provider?: string;
    model?: string;
    system_prompt?: string;
    temperature?: number;
    max_depth?: number;
  }>;
  workflow?: {
    enabled?: boolean;
    templates_dir?: string;
    workflow_dir?: string;
    workflow?: {
      default_roles?: string[];
      default_phases?: string[];
    };
    default_roles?: string[];
    default_phases?: string[];
    scrum_config?: {
      enabled?: boolean;
      sprint_duration?: number;
      standup_time?: string;
      planning_time?: string;
      review_time?: string;
      retro_time?: string;
    };
    dev_team_config?: {
      enabled?: boolean;
      process?: string;
      code_review_policy?: string;
      testing_strategy?: string;
      team_members?: Array<{
        name: string;
        role: string;
        responsibilities: string[];
        skills: string[];
      }>;
    };
  };
}

const DEFAULT_CONFIG_PATHS = [
  path.join(os.homedir(), 'claw', 'zeroclaw', 'config.toml'),
  path.join(os.homedir(), '.zeroclaw', 'config.toml'),
  path.join(os.homedir(), '.config', 'zeroclaw', 'config.toml'),
  path.join(process.cwd(), 'config.toml'),
];

export function findConfigFile(customPath?: string): string | null {
  const searchPaths = customPath 
    ? [customPath, ...DEFAULT_CONFIG_PATHS] 
    : DEFAULT_CONFIG_PATHS;

  for (const configPath of searchPaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

export async function loadZeroClawConfig(customPath?: string): Promise<ZeroClawConfig | null> {
  const configPath = findConfigFile(customPath);
  
  if (!configPath) {
    console.log('ZeroClaw config file not found, searched paths:', DEFAULT_CONFIG_PATHS);
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    
    const smolToml = await import('smol-toml');
    const config = smolToml.parse(content) as ZeroClawConfig;
    
    console.log(`Loaded ZeroClaw config from: ${configPath}`);
    return config;
  } catch (error) {
    console.error('Failed to parse ZeroClaw config:', error);
    return null;
  }
}

export function getDefaultWorkspace(): string {
  return path.join(os.homedir(), '.zeroclaw', 'workspace');
}

export function getConfigSummary(config: ZeroClawConfig | null): {
  provider: string;
  model: string;
  hasApiKey: boolean;
  agentCount: number;
  workflowEnabled: boolean;
} {
  return {
    provider: config?.default_provider || 'not set',
    model: config?.default_model || 'not set',
    hasApiKey: !!config?.api_key,
    agentCount: config?.agents ? Object.keys(config.agents).length : 0,
    workflowEnabled: config?.workflow?.enabled ?? false,
  };
}
