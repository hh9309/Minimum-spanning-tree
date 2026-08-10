/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Vertex, Edge } from '../types.ts';
import { Trash2, Edit3, Grid, List, AlertCircle } from 'lucide-react';

interface DataMatrixProps {
  vertices: Vertex[];
  edges: Edge[];
  onVerticesChange: (v: Vertex[]) => void;
  onEdgesChange: (e: Edge[]) => void;
  isAnimationActive: boolean;
}

export default function DataMatrix({
  vertices,
  edges,
  onVerticesChange,
  onEdgesChange,
  isAnimationActive,
}: DataMatrixProps) {
  const [tab, setTab] = useState<'matrix' | 'edgeList'>('matrix');

  // Find edge between two vertices
  const findEdge = (vId1: string, vId2: string): Edge | undefined => {
    return edges.find(
      (e) =>
        (e.source === vId1 && e.target === vId2) ||
        (e.source === vId2 && e.target === vId1)
    );
  };

  // Handle cell weight change in Adjacency Matrix
  const handleMatrixCellChange = (rowId: string, colId: string, valStr: string) => {
    if (isAnimationActive) return;
    if (rowId === colId) return; // Diagonal is invariant

    const parsedWeight = parseInt(valStr);
    const existingEdge = findEdge(rowId, colId);

    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      // If cleared or set to <= 0, remove edge if it exists
      if (existingEdge) {
        onEdgesChange(edges.filter((e) => e.id !== existingEdge.id));
      }
    } else {
      if (existingEdge) {
        // Update existing weight
        onEdgesChange(
          edges.map((e) => {
            if (e.id === existingEdge.id) {
              return { ...e, weight: parsedWeight };
            }
            return e;
          })
        );
      } else {
        // Create new edge
        const newEdge: Edge = {
          id: `edge_${Date.now()}`,
          source: rowId,
          target: colId,
          weight: parsedWeight,
        };
        onEdgesChange([...edges, newEdge]);
      }
    }
  };

  // Handle edge delete in Edge List
  const handleDeleteEdge = (edgeId: string) => {
    if (isAnimationActive) return;
    onEdgesChange(edges.filter((e) => e.id !== edgeId));
  };

  // Handle weight change in Edge List row
  const handleEdgeWeightChange = (edgeId: string, valStr: string) => {
    if (isAnimationActive) return;
    const parsedWeight = parseInt(valStr);
    if (isNaN(parsedWeight) || parsedWeight <= 0) return;

    onEdgesChange(
      edges.map((e) => {
        if (e.id === edgeId) {
          return { ...e, weight: parsedWeight };
        }
        return e;
      })
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm" id="data-matrix-slice">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-slate-250/60 pb-4 mb-4 gap-4">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 06 // 拓扑矩阵与边集绑定</span>
          <h2 className="text-2xl font-serif italic font-black text-slate-900">双向绑定数据面板</h2>
          <p className="text-xs text-slate-500 mt-1">毫秒级数据同步，修改后立即重新绘制拓扑</p>
        </div>
        <div className="flex bg-slate-100/60 border border-slate-200/80 p-1 rounded-full self-start md:self-auto">
          <button
            onClick={() => setTab('matrix')}
            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all ${
              tab === 'matrix'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Grid className="h-3 w-3" />
            邻接矩阵
          </button>
          <button
            onClick={() => setTab('edgeList')}
            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all ${
              tab === 'edgeList'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <List className="h-3 w-3" />
            边集列表 ({edges.length})
          </button>
        </div>
      </div>

      {isAnimationActive && (
        <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium rounded-2xl">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
          <span>正在演示 MST 求解，输入和编辑功能已锁定，演示结束后可重新编辑。</span>
        </div>
      )}

      {/* MATRIX VIEW */}
      {tab === 'matrix' && (
        <div className="space-y-3">
          {vertices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              请先在左侧画布创建节点以生成矩阵。
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-[#fdfdfb]/30 max-h-[340px]">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 sticky top-0 border-b border-slate-200">
                    <th className="p-3 font-bold text-slate-700 bg-slate-100/50 w-[70px] border-r border-slate-200/60 font-mono">NODE</th>
                    {vertices.map((v) => (
                      <th key={v.id} className="p-3 font-serif font-black italic text-slate-900 min-w-[50px] max-w-[70px] border-r border-slate-200/60">
                        {v.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {vertices.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fbfbf9]/60">
                      <td className="p-3 font-serif font-black italic text-slate-900 bg-slate-50/50 sticky left-0 border-r border-slate-200">
                        {row.name}
                      </td>
                      {vertices.map((col) => {
                        const isSelf = row.id === col.id;
                        const edge = findEdge(row.id, col.id);
                        
                        return (
                          <td key={col.id} className="p-1.5 min-w-[50px] border-r border-slate-200/40">
                            {isSelf ? (
                              <div className="p-2 text-slate-300 font-mono select-none bg-slate-50/50 rounded-xl">
                                0
                              </div>
                            ) : (
                              <input
                                type="text"
                                pattern="[0-9]*"
                                disabled={isAnimationActive}
                                value={edge ? edge.weight : ''}
                                placeholder="∞"
                                onChange={(e) => handleMatrixCellChange(row.id, col.id, e.target.value)}
                                className={`w-full text-center p-2 rounded-xl font-mono font-bold transition-all text-xs border ${
                                  edge
                                    ? 'border-blue-200 bg-blue-50/10 text-blue-800 focus:border-slate-900'
                                    : 'border-slate-200 bg-transparent text-slate-400 focus:bg-white focus:border-slate-900'
                                } focus:outline-none focus:ring-0`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-slate-400 leading-relaxed font-mono uppercase tracking-wider">
            * DIAGONAL CELLS REPRESENT ZERO // BLANK INDICATES INFINITY (NO LINK) // ENTER NUMBER TO ADD LINK IMMEDIATELY.
          </p>
        </div>
      )}

      {/* EDGE LIST VIEW */}
      {tab === 'edgeList' && (
        <div className="space-y-3">
          {edges.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              当前图中没有任何连线边。
            </div>
          ) : (
            <div className="overflow-y-auto border border-slate-200 rounded-2xl max-h-[340px]">
              <table className="w-full text-xs text-left text-slate-650 border-collapse">
                <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">起点</th>
                    <th className="p-3 font-bold">终点</th>
                    <th className="p-3 font-bold">权重 (Cost)</th>
                    {!isAnimationActive && <th className="p-3 font-bold text-right">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {edges.map((edge) => {
                    const srcNode = vertices.find((v) => v.id === edge.source);
                    const tgtNode = vertices.find((v) => v.id === edge.target);
                    if (!srcNode || !tgtNode) return null;

                    return (
                      <tr key={edge.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-serif font-black italic text-slate-900 text-sm">{srcNode.name}</td>
                        <td className="p-3 font-serif font-black italic text-slate-900 text-sm">{tgtNode.name}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            disabled={isAnimationActive}
                            value={edge.weight}
                            onChange={(e) => handleEdgeWeightChange(edge.id, e.target.value)}
                            className="w-16 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 px-2.5 py-1 rounded-xl font-mono text-xs font-bold text-slate-850 focus:outline-none"
                          />
                        </td>
                        {!isAnimationActive && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteEdge(edge.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
