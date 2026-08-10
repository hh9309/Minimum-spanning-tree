/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vertex, Edge, AIInsightsResult } from '../types.ts';
import { 
  Sparkles, Brain, DollarSign, RefreshCw, Layers, ShieldAlert, Cpu, 
  CheckCircle, Settings, Send, MessageSquare, Eye, EyeOff, Terminal, HelpCircle 
} from 'lucide-react';

interface AIInsightsProps {
  vertices: Vertex[];
  edges: Edge[];
  mstEdges: Edge[];
  totalWeight: number;
  algorithm: 'kruskal' | 'prim';
}

export default function AIInsights({
  vertices,
  edges,
  mstEdges,
  totalWeight,
  algorithm,
}: AIInsightsProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<AIInsightsResult | null>(null);
  const [thinkingProcess, setThinkingProcess] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('mst_ai_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(() => {
    return (localStorage.getItem('mst_ai_selected_model') as 'gemini' | 'deepseek') || 'gemini';
  });
  const [geminiModelName, setGeminiModelName] = useState<string>(() => localStorage.getItem('mst_ai_gemini_model') || 'gemini-2.5-flash');
  const [deepseekModelName, setDeepseekModelName] = useState<string>(() => localStorage.getItem('mst_ai_deepseek_model') || 'deepseek-v4-pro');
  const [deepseekEndpoint, setDeepseekEndpoint] = useState<string>(() => localStorage.getItem('mst_ai_deepseek_endpoint') || 'https://api.deepseek.com/v1/chat/completions');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Q&A Dialog State
  const [chatHistory, setChatHistory] = useState<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    thinking?: string;
  }[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '您好！我是您的拓扑建设与造价优化专家。您可以向我提问任何关于当前网络设计、最小生成树、备选链路变动对预算的影响等问题，我将结合图论原理与工程经验为您进行深度解答。'
    }
  ]);
  const [userQuery, setUserQuery] = useState<string>('');
  const [qaLoading, setQaLoading] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, qaLoading]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mst_ai_api_key', apiKey);
    localStorage.setItem('mst_ai_selected_model', selectedModel);
    localStorage.setItem('mst_ai_gemini_model', geminiModelName);
    localStorage.setItem('mst_ai_deepseek_model', deepseekModelName);
    localStorage.setItem('mst_ai_deepseek_endpoint', deepseekEndpoint);
    setShowSettings(false);
  };

  const callGeminiDirectly = async (key: string, modelName: string, promptText: string, isJson: boolean) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        ...(isJson ? {
          generationConfig: {
            responseMimeType: "application/json"
          }
        } : {})
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || response.statusText;
      throw new Error(`Gemini API 错误: ${errMsg}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API 未返回有效内容');
    }
    return text;
  };

  const callDeepSeekDirectly = async (key: string, modelName: string, endpoint: string, promptText: string) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "你是一个专业的网络拓扑与工程造价分析助手。你必须严格使用简体中文输出，如果要求返回 JSON，请直接输出纯 JSON 字符串，不要添加 markdown 格式标记。"
          },
          {
            role: "user",
            content: promptText
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`DeepSeek API 错误 (HTTP ${response.status}): ${errText || response.statusText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('DeepSeek API 未返回有效内容');
    }
    return text;
  };

  const fetchAIInsights = async () => {
    if (!apiKey) {
      setError('所有大模型调用必须配置您的个人 API-Key。请点击右上角 ⚙️ 齿轮配置密钥后再试。');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError(null);
    setThinkingProcess('');
    
    try {
      const getVertexName = (id: string) => {
        return vertices.find(v => v.id === id)?.name || id;
      };

      const nodesStr = vertices.map((v) => `${v.name || v.id} (坐标:[${Math.round(v.x)}, ${Math.round(v.y)}])`).join(', ');
      const allEdgesStr = edges.map((e) => `${getVertexName(e.source)} - ${getVertexName(e.target)} (权重: ${e.weight})`).join(', ');
      const mstEdgesStr = mstEdges.map((e) => `${getVertexName(e.source)} - ${getVertexName(e.target)} (权重: ${e.weight})`).join(', ');

      const prompt = `
      你是一个图论和网络规划领域的资深高级工程专家。
      请针对以下输入的图拓扑结构以及求解出来的最小生成树（MST）进行深度分析。

      【输入图的顶点集合】：
      ${nodesStr}

      【输入图的所有备选边集合（边集列表）】：
      ${allEdgesStr}

      【当前求解出来的最小生成树（MST）包含的边集】：
      ${mstEdgesStr}

      【MST 总权重】：${totalWeight}
      【求解所用算法】：${algorithm}

      请给出专业的：
      1. 【一句话总结】：该拓扑在现实工程应用（如光纤、电网、管道铺设）中的高层价值。
      2. 【灵敏度分析】：指出其中 2~3 条关键边（哪怕微小变动就会让MST拓扑改变、或具有重要冗余替代作用的边），分析当这些边的权重变高、变低时的拓扑临界阈值和影响。
      3. 【工程造价测算】：评估网络建设的总预算。请从 "fiber" (光纤铺设), "grid" (电网规划), "road" (智慧交通) 中，选择一个最适合当前图拓扑规模与特性的场景（如节点多且密集适合光纤、长距离带状分布适合电网等），并制定详细的人民币造价科目明细。
      4. 【专家级优化建议】：给出至少 3 条深入、落地、无需技术堆砌的建设与优化建议。

      要求必须完全遵循指定的 JSON 格式。

      JSON 输出格式模板如下（确保字段名称与类型完全一致，不要包含任何 markdown 代码块标记，不要包含 \`\`\`json）：
      {
        "summary": "一句话核心价值总结",
        "sensitivityAnalysis": [
          {
            "source": "起点名",
            "target": "终点名",
            "currentWeight": 10,
            "criticalIncreaseThreshold": "> 12",
            "criticalDecreaseThreshold": "< 8",
            "impactDescription": "权重改变后的工程学和结构性演变影响"
          }
        ],
        "engineering造价": {
          "projectType": "fiber",
          "unitCost": 1.5,
          "totalCost": 125.0,
          "costBreakdown": [
            {
              "item": "材料费",
              "cost": 100.0,
              "description": "计算基数解释"
            }
          ]
        },
        "optimizationAdvice": [
          "优化建议一",
          "优化建议二",
          "优化建议三"
        ]
      }
      `;

      let text = '';
      if (selectedModel === 'gemini') {
        text = await callGeminiDirectly(apiKey, geminiModelName, prompt, true);
      } else {
        text = await callDeepSeekDirectly(apiKey, deepseekModelName, deepseekEndpoint, prompt);
      }

      let thinking = '';
      let cleanText = text;

      // Extract reasoning for DeepSeek R1 style outputs
      const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        cleanText = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }

      setThinkingProcess(thinking);

      // Clean up markdown markers if any
      let jsonString = cleanText.trim();
      if (jsonString.startsWith('```')) {
        const lines = jsonString.split('\n');
        if (lines[0].startsWith('```')) lines.shift();
        if (lines[lines.length - 1].startsWith('```')) lines.pop();
        jsonString = lines.join('\n').trim();
      }

      const parsedData = JSON.parse(jsonString);
      setInsights(parsedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '获取 AI 报告期间发生未知故障，请核对大模型配置及 API 密钥。');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || qaLoading) return;

    if (!apiKey) {
      setError('所有大模型调用必须配置您的个人 API-Key。请点击右上角 ⚙️ 齿轮配置密钥后再试。');
      setShowSettings(true);
      return;
    }

    const currentQuery = userQuery;
    setUserQuery('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: currentQuery }]);
    setQaLoading(true);
    setError(null);

    try {
      const getVertexName = (id: string) => {
        return vertices.find(v => v.id === id)?.name || id;
      };

      const nodesStr = vertices.map((v) => `${v.name || v.id} (坐标:[${Math.round(v.x)}, ${Math.round(v.y)}])`).join(', ');
      const allEdgesStr = edges.map((e) => `${getVertexName(e.source)} - ${getVertexName(e.target)} (权重: ${e.weight})`).join(', ');
      const mstEdgesStr = mstEdges.map((e) => `${getVertexName(e.source)} - ${getVertexName(e.target)} (权重: ${e.weight})`).join(', ');

      const qaPrompt = `
      你是一个图论和网络规划领域的资深高级工程专家。
      当前的网络拓扑数据如下：
      1. 顶点集合：${nodesStr}
      2. 备选链路集合：${allEdgesStr}
      3. 求解出的最小生成树（MST）：${mstEdgesStr}
      4. 求解算法：${algorithm}
      5. MST 总权重：${totalWeight}

      请基于以上数据，用专业、详实、接地气、生动的语言回答用户的以下工程学或算法提问：
      "${currentQuery}"
      `;

      let aiResponseText = '';
      let thinking = '';

      if (selectedModel === 'gemini') {
        aiResponseText = await callGeminiDirectly(apiKey, geminiModelName, qaPrompt, false);
      } else {
        aiResponseText = await callDeepSeekDirectly(apiKey, deepseekModelName, deepseekEndpoint, qaPrompt);
      }

      // Extract thinking block if DeepSeek R1
      const thinkMatch = aiResponseText.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        aiResponseText = aiResponseText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }

      setChatHistory(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiResponseText,
          thinking: thinking || undefined
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `大模型请求出错了: ${err.message || '获取回答时发生网络异常，请核对您的 API-Key 及服务端点配置。'}`
        }
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  const getProjectTypeName = (type?: string) => {
    switch (type) {
      case 'fiber': return '光纤骨干网铺设工程';
      case 'grid': return '智能高压电网规划工程';
      case 'road': return '智慧都市道路交通枢纽网络';
      default: return '网络拓扑铺设项目';
    }
  };

  const getProjectTypeIcon = (type?: string) => {
    switch (type) {
      case 'fiber': return '📶';
      case 'grid': return '⚡';
      case 'road': return '🛣️';
      default: return '📐';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="ai-insights-slice">
      {/* Launch Box - Editorial Style */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900" />
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 03 // 拓扑造价专家研判</span>
            <h2 className="text-2xl font-serif italic font-black text-slate-900 flex items-center gap-2">
              拓扑造价专家研判
              <span className="text-[9px] font-mono bg-slate-900 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                {selectedModel === 'gemini' ? 'Gemini 3 Flash' : 'DeepSeek-V4-Pro'}
              </span>
            </h2>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-full border-2 transition-all ${
              showSettings 
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
            }`}
            title="配置大模型与 API-Key"
          >
            <Settings className={`h-5 w-5 ${showSettings ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Model Configuration Slide Panel */}
        {showSettings && (
          <form onSubmit={handleSaveSettings} className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-5 mb-6 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-blue-600" />
                大模型调用设置 (Github 部署静态直连)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">SETTINGS</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
                1. 手工输入 API-Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="请输入您的大模型 API-Key (将安全保存在浏览器本地)"
                  className="w-full px-3.5 py-2 text-xs font-mono border-2 border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none bg-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                * 本地直连保障：密钥仅保存在您的浏览器 <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">localStorage</code> 中，绝不上传任何服务器。
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
                2. 选择大模型 (Model Select)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedModel('gemini')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedModel === 'gemini'
                      ? 'border-slate-900 bg-white font-bold text-slate-900 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-serif italic font-black text-xs">Gemini 3 Flash</div>
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">高速低成本、支持 JSON Schema</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModel('deepseek')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedModel === 'deepseek'
                      ? 'border-slate-900 bg-white font-bold text-slate-900 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-serif italic font-black text-xs">DeepSeek-V4-Pro</div>
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">最新旗舰高精度逻辑研判、综合多维分析</div>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced Parameters */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {selectedModel === 'gemini' ? (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Gemini 模型名称 ID:</span>
                    <input
                      type="text"
                      value={geminiModelName}
                      onChange={(e) => setGeminiModelName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">DeepSeek 模型名称 ID:</span>
                      <input
                        type="text"
                        value={deepseekModelName}
                        onChange={(e) => setDeepseekModelName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">DeepSeek API 端点:</span>
                      <input
                        type="text"
                        value={deepseekEndpoint}
                        onChange={(e) => setDeepseekEndpoint(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-slate-800 transition-all shadow-sm active:scale-95"
              >
                确认配置 (Save Settings)
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
            提取当前定制的拓扑点集与最小生成树，AI 将动态计算物理链路的扰动灵敏上限、多维度估算总造价预算并输出优化策略。
          </p>

          <button
            onClick={fetchAIInsights}
            disabled={loading || vertices.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px] transition-all shadow-sm shrink-0 ${
              vertices.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>计算中...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>生成诊断报告</span>
              </>
            )}
          </button>
        </div>

        {/* Warning if API key is not configured */}
        {!apiKey && (
          <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-start gap-2.5 animate-pulse text-xs text-amber-800">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">浏览器直接调用已激活 (待配置 API-Key):</strong> 
              <span className="ml-1">请点击右上方 ⚙️ 齿轮配置您个人的 Gemini 或 DeepSeek API-Key。本项目已适配 Github 静态部署，所有算法研判都将在您的浏览器端安全、即时运行。</span>
            </div>
          </div>
        )}

        {vertices.length === 0 && (
          <p className="text-[10px] uppercase tracking-wider text-rose-600 mt-4 font-black flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span>画布节点当前为空，请绘制拓扑或输入快速表达式后再启用研判</span>
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-xs text-rose-700 font-mono animate-fadeIn">
          <strong>大模型调用错误:</strong> {error}
        </div>
      )}

      {/* DeepSeek R1 Thinking Process visualization */}
      {thinkingProcess && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Terminal className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 font-mono">
              DeepSeek-R1 深度思考链 (Reasoning Process)
            </h3>
          </div>
          <div className="bg-slate-900 text-slate-300 font-mono text-xs p-4 rounded-2xl max-h-[160px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
            {thinkingProcess}
          </div>
        </div>
      )}

      {/* AI Output Content */}
      {insights && (
        <div className="space-y-6 animate-fadeIn">
          {/* High Level Value Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">高层工程价值总评</h3>
            <div className="relative pl-6 border-l-4 border-slate-900 py-1">
              <p className="text-slate-700 italic text-sm font-medium leading-relaxed font-serif">
                “ {insights.summary} ”
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sensitivity Analysis Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Cpu className="h-4.5 w-4.5 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">关键扰动链路灵敏度分析 (Sensitivity)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                AI 模拟链路成本变动，测算能够改变全局最小生成树拓扑的最微弱变化临界点 (Bottleneck Threshold)：
              </p>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {insights.sensitivityAnalysis.map((edgeInfo, index) => (
                  <div key={index} className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 font-serif italic">
                        🔗 链路 {edgeInfo.source} ↔ {edgeInfo.target}
                      </span>
                      <span className="text-[11px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold">
                        当前权重: {edgeInfo.currentWeight}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-rose-50/40 border border-rose-100/30 p-2.5 rounded-lg">
                        <span className="text-slate-400 block mb-0.5 font-bold uppercase text-[9px] tracking-wider">上调临界点:</span>
                        <span className="font-mono text-rose-700 font-bold">{edgeInfo.criticalIncreaseThreshold}</span>
                      </div>
                      <div className="bg-emerald-50/40 border border-emerald-100/30 p-2.5 rounded-lg">
                        <span className="text-slate-400 block mb-0.5 font-bold uppercase text-[9px] tracking-wider">下调临界点:</span>
                        <span className="font-mono text-emerald-700 font-bold">{edgeInfo.criticalDecreaseThreshold}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans mt-1">
                      {edgeInfo.impactDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Engineering Budget Estimate */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-slate-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">MST 数字化工程造价概算</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full border border-slate-200">
                  {getProjectTypeIcon(insights.engineering造价?.projectType)} {getProjectTypeName(insights.engineering造价?.projectType)}
                </span>
              </div>
              
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">项目总概算 (ESTIMATED TOTAL COST)</span>
                  <span className="text-2xl font-serif italic font-black mt-1 inline-block text-blue-400">
                    ¥ {insights.engineering造价?.totalCost?.toFixed(2)} 万元
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">单位权重单价</span>
                  <span className="text-xs font-mono font-bold mt-1 inline-block">
                    {insights.engineering造价?.unitCost} 万元/单位
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">费用科目细分表 (Cost Breakdown Table):</span>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[220px] overflow-y-auto font-sans">
                  <table className="w-full text-left text-[11px] text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 font-bold">造价科目类别</th>
                        <th className="p-2.5 font-bold text-right">额度 (万元)</th>
                        <th className="p-2.5 font-bold">科目解释</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60">
                      {insights.engineering造价?.costBreakdown?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">{item.item}</td>
                          <td className="p-2.5 font-mono font-bold text-right text-blue-600">{item.cost?.toFixed(2)}</td>
                          <td className="p-2.5 text-slate-500 leading-relaxed">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Expert Advice Block */}
          <div className="bg-slate-950 rounded-3xl p-6 md:p-8 shadow-md text-white space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider">资深专家级网络优化与抗灾防护策略 (Expert Advice)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {insights.optimizationAdvice.map((advice, idx) => (
                <div key={idx} className="bg-slate-900 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <span className="font-serif italic font-black text-blue-400 block mt-0.5">0{idx + 1}.</span>
                  <span>{advice}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Q&A Q&A专家研判室 */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl">
              <MessageSquare className="h-5 w-5 text-slate-800 animate-pulse" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Q&amp;A CHAT ENGINE</span>
              <h3 className="text-lg font-serif italic font-black text-slate-900">拓扑智能专家 Q&amp;A 研判室</h3>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            {chatHistory.length} 回话
          </span>
        </div>

        {/* Chat Stream History */}
        <div className="border-2 border-slate-200 rounded-2xl bg-slate-50/50 p-4 h-[320px] overflow-y-auto space-y-4 font-sans">
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase mb-1">
                {msg.sender === 'user' ? '您的问题 // USER' : `${selectedModel === 'gemini' ? 'GEMINI 3' : 'DEEPSEEK R1'} // EXPERT`}
              </span>
              
              {msg.thinking && (
                <div className="w-full bg-slate-800 text-slate-400 border border-slate-700/60 rounded-2xl p-3 mb-2 text-[10px] leading-relaxed font-mono">
                  <div className="text-[9px] font-bold text-slate-500 mb-1 font-mono">深度思维 (THINKING):</div>
                  <details className="cursor-pointer">
                    <summary className="hover:text-slate-200">点击展开查看 R1 推理链</summary>
                    <div className="mt-1 whitespace-pre-wrap">{msg.thinking}</div>
                  </details>
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white border-slate-900 rounded-tr-none'
                    : 'bg-white text-slate-800 border-slate-200 shadow-sm rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          ))}

          {qaLoading && (
            <div className="flex flex-col items-start max-w-[85%] mr-auto">
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase mb-1">EXPERT // THINKING...</span>
              <div className="p-4 rounded-2xl text-xs bg-white border border-slate-200 shadow-sm rounded-tl-none flex items-center gap-2">
                <RefreshCw className="h-4.5 w-4.5 text-blue-600 animate-spin" />
                <span className="text-slate-500">正在针对当前拓扑生成专家回复...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendQuery} className="flex gap-2.5">
          <input
            type="text"
            disabled={qaLoading || vertices.length === 0}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={
              vertices.length === 0 
                ? "请先在画布中添加节点以启用对话..." 
                : !apiKey 
                ? "请先点击上方齿轮设置 API-Key 启用问答..." 
                : "提问，例：哪个节点是脆弱点？/ 如何进一步缩减预算？"
            }
            className="flex-1 px-4 py-3 text-xs border-2 border-slate-900 rounded-2xl bg-white focus:outline-none placeholder:text-slate-400 focus:shadow-sm transition-all"
          />
          <button
            type="submit"
            disabled={qaLoading || !userQuery.trim() || vertices.length === 0}
            className={`px-5 py-3 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              !userQuery.trim() || qaLoading || vertices.length === 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>发送</span>
          </button>
        </form>
      </div>
    </div>
  );
}
