/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Vertex, Edge } from '../types.ts';
import { Play, Terminal, CheckCircle2, AlertTriangle, Code, RefreshCw } from 'lucide-react';

let cachedPyodide: any = null;

const loadPyodideScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).loadPyodide) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('无法从 CDN 加载 Pyodide WebAssembly 脚本'));
    document.head.appendChild(script);
  });
};

interface PythonValidationProps {
  vertices: Vertex[];
  edges: Edge[];
  tsTotalWeight: number;
}

export default function PythonValidation({ vertices, edges, tsTotalWeight }: PythonValidationProps) {
  const [pythonCode, setPythonCode] = useState('');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    totalWeight: number;
    edgesCount: number;
    matches: boolean;
  } | null>(null);

  // Helper to map vertex IDs to names
  const getVertexName = (id: string) => {
    return vertices.find(v => v.id === id)?.name || id;
  };

  // Generate python code dynamically based on current vertices & edges
  const generatePythonCode = () => {
    const nodeNames = vertices.map(v => v.name);
    const formattedEdges = edges.map(e => ({
      source: getVertexName(e.source),
      target: getVertexName(e.target),
      weight: e.weight
    }));

    return `# =======================================================
# 最小生成树 (MST) Python 工业级算法验证程序
# 采用 避环定理 (Kruskal) 与 并查集 (Union-Find) 求解
# =======================================================
import json

class UnionFind:
    def __init__(self, elements):
        # 初始化并查集，每个节点的代表元是其自身
        self.parent = {el: el for el in elements}
        
    def find(self, x):
        # 路径压缩查找
        if self.parent[x] == x:
            return x
        self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
        
    def union(self, x, y):
        # 按秩或直接合并集合
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x != root_y:
            self.parent[root_x] = root_y
            return True
        return False

# 1. 动态绑定的拓扑顶点
nodes = ${JSON.stringify(nodeNames, null, 4)}

# 2. 动态绑定的备选带权边集
edge_list = ${JSON.stringify(formattedEdges, null, 4)}

def solve_mst(vertices_list, input_edges):
    # 按照边权重进行升序排序
    sorted_edges = sorted(input_edges, key=lambda x: x["weight"])
    uf = UnionFind(vertices_list)
    mst_edges = []
    total_weight = 0
    
    print("------- Python 验证算法执行日志 -------")
    print(f"输入节点规模: {len(vertices_list)} 个")
    print(f"备选物理链路: {len(input_edges)} 条\\n")
    
    for edge in sorted_edges:
        u, v, w = edge["source"], edge["target"], edge["weight"]
        # 检测两端点是否属于不同集合，若是则合并，避免形成环
        if uf.union(u, v):
            mst_edges.append(edge)
            total_weight += w
            print(f"✅ [选中] {u} <-> {v} (成本: {w}) -> 成功并入最小生成树")
        else:
            print(f"❌ [避环] {u} <-> {v} (成本: {w}) -> 两节点已连通，舍弃")
            
    print("\\n------- 验证计算结论 -------")
    print(f"最小生成树包含边数: {len(mst_edges)} 条")
    print(f"计算所得总成本 (Total Weight): {total_weight}")
    print("---------------------------------------")
    
    # 格式化输出结构化数据，以便前端直接读取比对
    result_data = {
        "total_weight": total_weight,
        "edges_count": len(mst_edges)
    }
    print("__JSON_RESULT__:" + json.dumps(result_data))

if __name__ == "__main__":
    solve_mst(nodes, edge_list)
`;
  };

  // Re-generate python code whenever vertices/edges change
  useEffect(() => {
    setPythonCode(generatePythonCode());
  }, [vertices, edges]);

  const handleRunPython = async () => {
    setIsRunning(true);
    setError(null);
    setStdout('');
    setStderr('');
    setVerificationResult(null);

    let ranSuccessfully = false;
    let pyStdout = '';
    let pyStderr = '';
    let executionError: string | null = null;

    // 1. 优先在浏览器本地运行 Pyodide WebAssembly，保障在 Netlify / GitHub Pages 等无后端环境正常可用
    try {
      await loadPyodideScript();
      
      if (!cachedPyodide) {
        cachedPyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/'
        });
      }

      // 重定向标准输出和标准错误
      cachedPyodide.setStdout({
        batched: (text: string) => {
          pyStdout += text + '\n';
        }
      });
      cachedPyodide.setStderr({
        batched: (text: string) => {
          pyStderr += text + '\n';
        }
      });

      await cachedPyodide.runPythonAsync(pythonCode);
      ranSuccessfully = true;
    } catch (browserErr: any) {
      console.warn("浏览器本地 Pyodide Wasm 运行失败，正在尝试切换到后端沙箱运行...", browserErr);
      executionError = browserErr.message || '加载 WebAssembly 运行环境超时或被拦截';
    }

    // 2. 如果浏览器运行不成功（如离线、CDN被屏蔽等），则回退调用 Express 后端 python3 执行器
    if (!ranSuccessfully) {
      try {
        const response = await fetch('/api/run-python', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: pythonCode }),
        });

        if (!response.ok) {
          throw new Error('网络请求异常，后端 Python 服务不可达（当前可能为无后端的 Netlify/GitHub Pages 静态托管）');
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }

        pyStdout = result.stdout || '';
        pyStderr = result.stderr || '';
        ranSuccessfully = true;
      } catch (serverErr: any) {
        console.error("后端 Python 执行回退也失败了:", serverErr);
        setError(
          `Python 验证引擎启动失败：\n1. 浏览器内 Wasm 本地引擎加载失败: ${executionError}\n2. 后端沙箱网络回退失败: ${serverErr.message}\n\n建议：请检查您的网络连接是否顺畅。`
        );
        setIsRunning(false);
        return;
      }
    }

    // 3. 统一解析并回显 Python 的输出数据
    try {
      setStderr(pyStderr);

      // 从标准输出中搜索 JSON 数据段
      const jsonToken = '__JSON_RESULT__:';
      const tokenIndex = pyStdout.indexOf(jsonToken);
      let displayStdout = pyStdout;
      
      if (tokenIndex !== -1) {
        const jsonStr = pyStdout.substring(tokenIndex + jsonToken.length).trim();
        displayStdout = pyStdout.substring(0, tokenIndex).trim(); // 移除隐藏的 JSON Token 用于回显
        
        try {
          const parsed = JSON.parse(jsonStr);
          setVerificationResult({
            totalWeight: parsed.total_weight,
            edgesCount: parsed.edges_count,
            matches: parsed.total_weight === tsTotalWeight
          });
        } catch (e) {
          console.error("解析 Python 返回的数据包 JSON 失败:", e);
        }
      }

      setStdout(displayStdout);
    } catch (err: any) {
      setError(`解析 Python 计算输出时发生异常: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6" id="python-validation-slice">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 04 // PYTHON 双通道微沙箱 (100% 浏览器运行兼容)</span>
        <h2 className="text-2xl font-serif italic font-black text-slate-900 flex items-center gap-2">
          Python 求解与验证
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          采用浏览器内 WebAssembly (Pyodide) 本地极速编译执行，并原生支持传统后端 Python3 动态回退。完美适配 Netlify 与 GitHub Pages 静态部署。
        </p>
      </div>

      {/* Code Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5 font-bold">
            <Code className="h-4 w-4 text-slate-700" />
            MST_VERIFICATION.PY (实时同步图数据)
          </span>
          <button
            onClick={() => setPythonCode(generatePythonCode())}
            className="hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            重置代码
          </button>
        </div>
        <div className="relative border-2 border-slate-900 rounded-2xl overflow-hidden shadow-sm">
          <textarea
            value={pythonCode}
            onChange={(e) => setPythonCode(e.target.value)}
            className="w-full h-[240px] p-4 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Trigger Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] text-slate-400 font-mono leading-tight">
          * 代码已自动注入当前 {vertices.length} 个顶点、{edges.length} 条边的最新数据。
        </div>
        <button
          onClick={handleRunPython}
          disabled={isRunning || vertices.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px] transition-all shadow-sm shrink-0 ${
            vertices.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>正在计算...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>运行 Python 验证</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Summary */}
      {verificationResult && (
        <div className={`p-4 border-2 rounded-2xl animate-fadeIn ${
          verificationResult.matches
            ? 'bg-emerald-50/40 border-emerald-500 text-slate-800'
            : 'bg-amber-50/40 border-amber-500 text-slate-800'
        }`}>
          <div className="flex items-start gap-3">
            {verificationResult.matches ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {verificationResult.matches ? 'Python 交叉验证通过 (SUCCESS)' : '数据不一致警示 (WARNING)'}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {verificationResult.matches 
                  ? `Python 算法得出的最小树总权重为 ${verificationResult.totalWeight}，与 TypeScript 求解引擎（${tsTotalWeight}）完全一致。包含 ${verificationResult.edgesCount} 条核心链路，系统数据一致性校验 100% 通过。`
                  : `Python 计算权重为 ${verificationResult.totalWeight}，而 TypeScript 求解引擎为 ${tsTotalWeight}。请检查代码逻辑或图数据。`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Console Output Terminal */}
      {(stdout || stderr || error) && (
        <div className="space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500">
            <Terminal className="h-4 w-4 text-slate-700" />
            TERMINAL_CONSOLE_OUTPUT
          </div>
          <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-2xl border border-slate-800 max-h-[180px] overflow-y-auto shadow-inner space-y-2">
            {stdout && (
              <pre className="whitespace-pre-wrap text-emerald-400/90">{stdout}</pre>
            )}
            {stderr && (
              <pre className="whitespace-pre-wrap text-rose-400">{stderr}</pre>
            )}
            {error && (
              <div className="text-rose-500 font-bold">
                [SYSTEM ERROR]: {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
