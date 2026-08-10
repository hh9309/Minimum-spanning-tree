/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, GitBranch, Shield, Zap, Sparkles, HelpCircle } from 'lucide-react';

export default function KnowledgeGuide() {
  const [selectedScenario, setSelectedScenario] = useState<'dense' | 'sparse' | 'distributed' | 'none'>('none');

  const scenarios = [
    {
      id: 'sparse' as const,
      title: '稀疏网络 (边数较少)',
      description: '例如：连接偏远乡村的光纤铺设、跨国输油管道。',
      recommendation: '推荐 Kruskal 算法',
      reason: 'Kruskal 算法的复杂度主要取决于边的排序 (O(E log E))。在边数远远小于点数平方的稀疏图上，表现更为敏捷优越。',
      color: 'border-amber-200 bg-amber-50/40 text-amber-900',
    },
    {
      id: 'dense' as const,
      title: '稠密网络 (边数极多)',
      description: '例如：城市市中心地下电网、数据中心机柜间超高并发链路。',
      recommendation: '推荐 Prim 算法',
      reason: 'Prim 算法采用节点向外涟漪状扩散，在基于邻接矩阵和优先队列优化下，复杂度接近 O(E + V log V)，在稠密图下运行性能常优于 Kruskal。',
      color: 'border-blue-200 bg-blue-50/40 text-blue-900',
    },
    {
      id: 'distributed' as const,
      title: '动态拓扑/单源拓展',
      description: '例如：从指定发电站向外建设变电所网、以枢纽机场为核心构建配送航线。',
      recommendation: '推荐 Prim 算法',
      reason: 'Prim 算法具有清晰的“生长根源节点”，适合从一个已经建成的母网开始，逐步、物理上连续地向外拉线建网。',
      color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
    },
  ];

  return (
    <div className="space-y-6" id="knowledge-guide-slice">
      {/* Introduction Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 05 // MST 知识微课堂</span>
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div>
            <h2 className="text-2xl font-serif italic font-black text-slate-900">图论核心原理</h2>
            <p className="text-xs text-slate-500 mt-1">解构避环定理与割边定理在最小生成树中的核心价值</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Loop Avoidance Property */}
          <div className="bg-[#fcfbf9] border border-slate-200 rounded-2xl p-5 md:p-6 hover:border-slate-400 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                KRUSKAL
              </span>
              <h3 className="font-serif italic font-black text-slate-900 text-base">避环定理 (Cycle Avoidance)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              <strong>直观理解：</strong>在连接网络时，我们只挑最便宜的线路。但在加入每条线路前，先核查两个端点是否已经连通。若早已连通，则加入只会形成<strong>多余回路与造价损耗</strong>。只有不构成回路的便宜电缆才能安全“锁死”并入。
            </p>
            <div className="mt-4 pt-3 border-t border-slate-250/50 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              策略：全局边排序、并查集检测环
            </div>
          </div>

          {/* Cut Property */}
          <div className="bg-[#fafafa] border border-slate-200 rounded-2xl p-5 md:p-6 hover:border-slate-400 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase font-mono tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                PRIM
              </span>
              <h3 className="font-serif italic font-black text-slate-900 text-base">割边定理 (Cut Property)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              <strong>直观理解：</strong>先划定一个“已开通节点圈”（已访问集），圈外是“待连通圈”。将横跨圈内外的所有边界备选电缆拉出来，挑选其中<strong>造价最低（权重最小）的那一条</strong>安全锁死，并将新节点拉入圈中，触发新一轮的涟漪探测。
            </p>
            <div className="mt-4 pt-3 border-t border-slate-250/50 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              策略：点就近生长、优先队列向外扩张
            </div>
          </div>
        </div>
      </div>

      {/* Recommender Engine */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-slate-800" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">智能算法推荐器</h3>
        </div>
        <h2 className="text-xl font-serif italic font-black text-slate-900 mb-4">工程形态适配决策</h2>
        <p className="text-xs text-slate-500 mb-5">
          选择您当前规划的网络工程的物理形态，智能策略库将即刻推荐契合的 MST 算法模型：
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setSelectedScenario(scene.id)}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedScenario === scene.id
                  ? 'border-slate-900 bg-[#fbfbf9] border-2 shadow-sm'
                  : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 bg-white'
              }`}
            >
              <div className="font-serif italic font-black text-slate-900 text-sm mb-1">{scene.title}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{scene.description}</p>
            </button>
          ))}
        </div>

        {selectedScenario !== 'none' && (
          <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 animate-fadeIn text-xs">
            {scenarios.map((scene) => {
              if (scene.id !== selectedScenario) return null;
              return (
                <div key={scene.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span>决策建议: {scene.recommendation}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans">
                    {scene.reason}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">多维对比评估</h3>
        <h2 className="text-xl font-serif italic font-black text-slate-900 mb-5">算法全方位异同对比</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-left text-slate-650 border-collapse">
            <thead className="bg-slate-900 text-white font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 font-bold">对比维度</th>
                <th className="p-3.5 font-bold">Kruskal (克鲁斯卡尔) 算法</th>
                <th className="p-3.5 font-bold">Prim (普里姆) 算法</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">思想基础</td>
                <td className="p-3.5 leading-relaxed">边贪心。寻找全局最便宜的边，成环就淘汰。</td>
                <td className="p-3.5 leading-relaxed">点贪心。从指定源点出发，向外就近生长节点。</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">核心数学定理</td>
                <td className="p-3.5 text-rose-800 font-medium">避环定理 (Cycle Avoidance)</td>
                <td className="p-3.5 text-blue-800 font-medium">割边定理 (Cut Property)</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">辅助数据结构</td>
                <td className="p-3.5 font-mono text-slate-600 bg-[#fdfdfb] font-bold">Disjoint Set (并查集)</td>
                <td className="p-3.5 font-mono text-slate-600 bg-[#fdfdfb] font-bold">Priority Queue (最小堆)</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">时间复杂度</td>
                <td className="p-3.5 font-mono text-slate-800">O(E log E) (主要开销在边排序)</td>
                <td className="p-3.5 font-mono text-slate-800">O(E + V log V) (堆优化) 或 O(V²)</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">物理工程直觉</td>
                <td className="p-3.5 leading-relaxed">像拼图。从各地同时挑选最便宜的分支逐渐拼接。</td>
                <td className="p-3.5 leading-relaxed">像铺路。有一座大本营，不断向邻近城市外扩。</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 bg-slate-50/40">最适形态</td>
                <td className="p-3.5 font-bold text-slate-900 font-serif italic">稀疏图 (点多边少，如光纤链路)</td>
                <td className="p-3.5 font-bold text-slate-900 font-serif italic">稠密图 (边多点少，如密集电网)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
