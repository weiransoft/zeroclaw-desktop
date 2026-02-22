import { AgentSoul, OceanTraits, EmotionalState, ExpressionStyle } from '@/stores/configStore';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface SoulEditorProps {
  soul?: AgentSoul;
  onChange: (soul: AgentSoul) => void;
  agentName?: string;
}

const EMOTIONAL_TONES = [
  'neutral', 'enthusiastic', 'thoughtful', 'playful', 'serious',
  'warm', 'analytical', 'encouraging', 'curious', 'confident',
  'empathetic', 'focused'
];

const COMMUNICATION_STYLES = [
  'direct', 'friendly', 'professional', 'expressive', 'technical', 'adaptive'
];

const VERBOSITY_LEVELS = ['concise', 'moderate', 'detailed', 'comprehensive'];

const EMOJI_STYLES = ['none', 'minimal', 'natural', 'expressive'];

const SOUL_PRESETS = [
  {
    name: '技术专家',
    nature: 'A highly skilled technical expert with deep knowledge in software development',
    purpose: 'Provide accurate technical guidance and solve complex problems',
    coreBeliefs: ['Code quality matters', 'Testing is essential', 'Documentation is crucial'],
    ocean: { openness: 0.9, conscientiousness: 0.95, extraversion: 0.4, agreeableness: 0.7, neuroticism: 0.2 },
    emotionalState: { primary: 'analytical', intensity: 0.6, undertones: ['focused'] },
    expression: { style: 'technical', formality: 0.7, verbosity: 'detailed', catchphrases: ['Let me analyze this...'], emojiStyle: 'minimal' }
  },
  {
    name: '创意伙伴',
    nature: 'A creative and imaginative companion for brainstorming and ideation',
    purpose: 'Inspire creativity and help explore new possibilities',
    coreBeliefs: ['Every idea has potential', 'Diversity drives innovation', 'Playfulness unlocks creativity'],
    ocean: { openness: 0.95, conscientiousness: 0.5, extraversion: 0.8, agreeableness: 0.9, neuroticism: 0.3 },
    emotionalState: { primary: 'enthusiastic', intensity: 0.8, undertones: ['playful'] },
    expression: { style: 'expressive', formality: 0.3, verbosity: 'moderate', catchphrases: ['What if we tried...'], emojiStyle: 'expressive' }
  },
  {
    name: '学习导师',
    nature: 'A patient and knowledgeable tutor dedicated to helping others learn',
    purpose: 'Guide learners through complex concepts with clarity and patience',
    coreBeliefs: ['Everyone can learn', 'Questions are valuable', 'Practice makes perfect'],
    ocean: { openness: 0.8, conscientiousness: 0.85, extraversion: 0.6, agreeableness: 0.95, neuroticism: 0.15 },
    emotionalState: { primary: 'encouraging', intensity: 0.7, undertones: ['warm'] },
    expression: { style: 'friendly', formality: 0.4, verbosity: 'detailed', catchphrases: ['Great question!', 'Let me explain...'], emojiStyle: 'natural' }
  },
  {
    name: '专业助手',
    nature: 'A reliable and efficient professional assistant',
    purpose: 'Help users accomplish tasks efficiently and professionally',
    coreBeliefs: ['Efficiency matters', 'Quality over quantity', 'Clear communication'],
    ocean: { openness: 0.6, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.2 },
    emotionalState: { primary: 'neutral', intensity: 0.5, undertones: ['focused'] },
    expression: { style: 'professional', formality: 0.8, verbosity: 'concise', catchphrases: [], emojiStyle: 'none' }
  }
];

export function SoulEditor({ soul, onChange, agentName }: SoulEditorProps) {
  const [activeTab, setActiveTab] = useState<'essence' | 'personality' | 'emotion' | 'expression'>('essence');

  const defaultSoul: AgentSoul = {
    name: agentName || 'Assistant',
    nature: 'An AI assistant designed to help users',
    purpose: 'Assist users with their tasks and questions',
    coreBeliefs: [],
    ocean: { openness: 0.7, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3 },
    emotionalState: { primary: 'neutral', intensity: 0.5, undertones: [] },
    expression: { style: 'friendly', formality: 0.5, verbosity: 'moderate', catchphrases: [], emojiStyle: 'natural' },
    memoryImprints: []
  };

  const currentSoul = soul || defaultSoul;

  const updateSoul = (updates: Partial<AgentSoul>) => {
    onChange({ ...currentSoul, ...updates });
  };

  const updateOcean = (trait: keyof OceanTraits, value: number) => {
    onChange({
      ...currentSoul,
      ocean: { ...currentSoul.ocean, [trait]: value }
    });
  };

  const updateEmotionalState = (updates: Partial<EmotionalState>) => {
    onChange({
      ...currentSoul,
      emotionalState: { ...currentSoul.emotionalState, ...updates }
    });
  };

  const updateExpression = (updates: Partial<ExpressionStyle>) => {
    onChange({
      ...currentSoul,
      expression: { ...currentSoul.expression, ...updates }
    });
  };

  const applyPreset = (preset: typeof SOUL_PRESETS[0]) => {
    onChange({
      ...currentSoul,
      nature: preset.nature,
      purpose: preset.purpose,
      coreBeliefs: [...preset.coreBeliefs],
      ocean: { ...preset.ocean },
      emotionalState: { ...preset.emotionalState, undertones: [...preset.emotionalState.undertones] },
      expression: { ...preset.expression, catchphrases: [...preset.expression.catchphrases] }
    });
  };

  const addCoreBelief = () => {
    const belief = prompt('输入核心信念:');
    if (belief) {
      updateSoul({ coreBeliefs: [...currentSoul.coreBeliefs, belief] });
    }
  };

  const removeCoreBelief = (index: number) => {
    updateSoul({ coreBeliefs: currentSoul.coreBeliefs.filter((_, i) => i !== index) });
  };

  const addCatchphrase = () => {
    const phrase = prompt('输入口头禅:');
    if (phrase) {
      updateExpression({ catchphrases: [...currentSoul.expression.catchphrases, phrase] });
    }
  };

  const removeCatchphrase = (index: number) => {
    updateExpression({ catchphrases: currentSoul.expression.catchphrases.filter((_, i) => i !== index) });
  };

  const toggleUndertone = (tone: string) => {
    const undertones = currentSoul.emotionalState.undertones;
    if (undertones.includes(tone)) {
      updateEmotionalState({ undertones: undertones.filter(t => t !== tone) });
    } else {
      updateEmotionalState({ undertones: [...undertones, tone] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <label className="text-xs text-dark-400 mb-2 block">灵魂预设</label>
        <div className="flex flex-wrap gap-2">
          {SOUL_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              size="sm"
              variant="outline"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-700">
        {(['essence', 'personality', 'emotion', 'expression'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {tab === 'essence' && '核心本质'}
            {tab === 'personality' && '人格矩阵'}
            {tab === 'emotion' && '情感状态'}
            {tab === 'expression' && '表达风格'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'essence' && (
          <>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">名称</label>
              <Input
                value={currentSoul.name}
                onChange={(e) => updateSoul({ name: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">本质描述</label>
              <textarea
                value={currentSoul.nature}
                onChange={(e) => updateSoul({ nature: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">存在目的</label>
              <textarea
                value={currentSoul.purpose}
                onChange={(e) => updateSoul({ purpose: e.target.value })}
                className="w-full h-16 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-400">核心信念</label>
                <Button size="sm" variant="ghost" onClick={addCoreBelief}>
                  <Plus size={12} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentSoul.coreBeliefs.map((belief, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {belief}
                    <X size={10} className="ml-1 cursor-pointer" onClick={() => removeCoreBelief(i)} />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'personality' && (
          <>
            <div className="text-xs text-dark-400 mb-2">OCEAN 五因素模型</div>
            {[
              { key: 'openness', label: '开放性', desc: '创造力、好奇心' },
              { key: 'conscientiousness', label: '尽责性', desc: '组织性、可靠性' },
              { key: 'extraversion', label: '外向性', desc: '社交性、自信' },
              { key: 'agreeableness', label: '宜人性', desc: '合作性、信任' },
              { key: 'neuroticism', label: '神经质', desc: '情绪稳定性' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-dark-400">{label}</label>
                  <span className="text-xs text-dark-500">{desc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentSoul.ocean[key as keyof OceanTraits]}
                    onChange={(e) => updateOcean(key as keyof OceanTraits, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-dark-300 w-8">
                    {currentSoul.ocean[key as keyof OceanTraits].toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'emotion' && (
          <>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">主要情感基调</label>
              <div className="flex flex-wrap gap-1">
                {EMOTIONAL_TONES.map((tone) => (
                  <Badge
                    key={tone}
                    variant={currentSoul.emotionalState.primary === tone ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => updateEmotionalState({ primary: tone })}
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">情感强度</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentSoul.emotionalState.intensity}
                  onChange={(e) => updateEmotionalState({ intensity: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-dark-300 w-8">
                  {currentSoul.emotionalState.intensity.toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">次要情感基调</label>
              <div className="flex flex-wrap gap-1">
                {EMOTIONAL_TONES.filter(t => t !== currentSoul.emotionalState.primary).map((tone) => (
                  <Badge
                    key={tone}
                    variant={currentSoul.emotionalState.undertones.includes(tone) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleUndertone(tone)}
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'expression' && (
          <>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">沟通风格</label>
              <div className="flex flex-wrap gap-1">
                {COMMUNICATION_STYLES.map((style) => (
                  <Badge
                    key={style}
                    variant={currentSoul.expression.style === style ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => updateExpression({ style })}
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">正式程度</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-500">随意</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentSoul.expression.formality}
                  onChange={(e) => updateExpression({ formality: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-dark-500">正式</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">详细程度</label>
              <div className="flex flex-wrap gap-1">
                {VERBOSITY_LEVELS.map((level) => (
                  <Badge
                    key={level}
                    variant={currentSoul.expression.verbosity === level ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => updateExpression({ verbosity: level })}
                  >
                    {level}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">表情符号风格</label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_STYLES.map((style) => (
                  <Badge
                    key={style}
                    variant={currentSoul.expression.emojiStyle === style ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => updateExpression({ emojiStyle: style })}
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-400">口头禅</label>
                <Button size="sm" variant="ghost" onClick={addCatchphrase}>
                  <Plus size={12} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentSoul.expression.catchphrases.map((phrase, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    "{phrase}"
                    <X size={10} className="ml-1 cursor-pointer" onClick={() => removeCatchphrase(i)} />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
