/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Vertex, Edge } from '../types.ts';
import { Download, FileText, Printer, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

interface ReportExportProps {
  vertices: Vertex[];
  edges: Edge[];
  mstEdges: Edge[];
  totalWeight: number;
  algorithm: 'kruskal' | 'prim';
  isDisconnected: boolean;
}

export default function ReportExport({
  vertices,
  edges,
  mstEdges,
  totalWeight,
  algorithm,
  isDisconnected,
}: ReportExportProps) {

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        algorithm,
        isDisconnected,
        totalWeight,
        vertices,
        edges,
        mstEdges,
      },
      null,
      2
    );
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `mst_topology_report_${algorithm}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header for edges CSV
    csvContent += '起点名称,终点名称,边权重,是否为最小生成树(MST)边\n';

    edges.forEach((edge) => {
      const srcNode = vertices.find((v) => v.id === edge.source);
      const tgtNode = vertices.find((v) => v.id === edge.target);
      const srcName = srcNode ? srcNode.name : edge.source;
      const tgtName = tgtNode ? tgtNode.name : edge.target;
      const isMst = mstEdges.some((me) => me.id === edge.id) ? '是' : '否';

      csvContent += `"${srcName}","${tgtName}",${edge.weight},"${isMst}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', encodedUri);
    linkElement.setAttribute('download', `mst_edges_export_${algorithm}.csv`);
    linkElement.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6" id="report-export-slice">
      {/* Header */}
      <div>
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 05 // 报告导出与数据共享</span>
        <h2 className="text-2xl font-serif italic font-black text-slate-900">报告导出与共享</h2>
        <p className="text-xs text-slate-500 mt-1">将生成的最小生成树拓扑及求解状态，转换为工业标准数据规范进行导出</p>
      </div>

      {/* Primary Export Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={handleExportJSON}
          disabled={vertices.length === 0}
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 hover:border-slate-900 bg-slate-50/50 hover:bg-white text-slate-800 transition-all text-center gap-3 group disabled:opacity-35 disabled:pointer-events-none"
        >
          <div className="p-3 bg-white border border-slate-200 rounded-full group-hover:border-slate-950 transition-all">
            <Download className="h-5 w-5 text-slate-800" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">导出 JSON 配置文件</span>
          <span className="text-[10px] text-slate-400">完整坐标与带权边集</span>
        </button>

        <button
          onClick={handleExportCSV}
          disabled={edges.length === 0}
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 hover:border-slate-900 bg-slate-50/50 hover:bg-white text-slate-800 transition-all text-center gap-3 group disabled:opacity-35 disabled:pointer-events-none"
        >
          <div className="p-3 bg-white border border-slate-200 rounded-full group-hover:border-slate-950 transition-all">
            <FileText className="h-5 w-5 text-slate-800" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">导出 CSV 边集清单</span>
          <span className="text-[10px] text-slate-400">支持 Excel 导入分析</span>
        </button>

        <button
          onClick={handlePrint}
          disabled={vertices.length === 0}
          className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 hover:border-slate-900 bg-slate-50/50 hover:bg-white text-slate-800 transition-all text-center gap-3 group disabled:opacity-35 disabled:pointer-events-none"
        >
          <div className="p-3 bg-white border border-slate-200 rounded-full group-hover:border-slate-950 transition-all">
            <Printer className="h-5 w-5 text-slate-800" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">另存为 PDF 报告</span>
          <span className="text-[10px] text-slate-400">调用浏览器排版打印</span>
        </button>
      </div>

      {/* Diagnostics Paper Preview (A4 Printable style) */}
      {vertices.length > 0 && (
        <div className="border-4 border-double border-slate-900 p-6 md:p-8 bg-[#fdfdfc] font-sans max-w-4xl mx-auto space-y-6 printable-report text-slate-800 shadow-sm">
          <div className="border-b-[3px] border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-[9px] text-slate-900 font-mono font-black uppercase tracking-widest border border-slate-900 px-2 py-0.5">
                TECHNICAL ASSESSMENTS // INTERNAL USE ONLY
              </span>
              <h3 className="text-3xl font-serif italic font-black text-slate-900 mt-3">最小生成树规划方案评定书</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">REPORT STAMP: {new Date().toISOString()}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest">SOLVING ALGORITHM</span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-350 px-3 py-1 rounded-full inline-block mt-1 font-mono uppercase tracking-wide">
                {algorithm === 'kruskal' ? 'Kruskal (避环)' : 'Prim (就近)'}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border border-slate-300 p-3.5 bg-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">顶点总数 / Nodes</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{vertices.length}</span>
            </div>
            <div className="border border-slate-300 p-3.5 bg-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">备选链路 / Edges</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{edges.length}</span>
            </div>
            <div className="border border-slate-300 p-3.5 bg-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">树含边数 / Tree Edges</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{mstEdges.length}</span>
            </div>
            <div className="border-2 border-slate-950 p-3.5 bg-white">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">项目总权重 / Total Cost</span>
              <span className="text-lg font-black text-blue-600 mt-1 block font-mono">{totalWeight}</span>
            </div>
          </div>

          {/* Status Alert */}
          {isDisconnected ? (
            <div className="p-4 border border-rose-300 text-rose-900 bg-rose-50/50 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold">拓扑非连通警示 (DISCONNECTED):</span>
                当前拓扑图本身属于<strong>非连通图</strong>。由于无法完全连通所有顶点，算法已退化产生“最小生成森林”。建议规划阶段增设备用线缆以确保全网物理畅通。
              </div>
            </div>
          ) : (
            <div className="p-4 border border-blue-200 text-slate-900 bg-blue-50/20 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">连通完整性评估 (OPTIMAL CONNECTIVITY):</span>
                无向拓扑满足强连通基本前提，算法已完美求解核心骨干连线，在彻底覆盖全网各节点的前提下确保了物理链路投资总权重绝对最低。
              </div>
            </div>
          )}

          {/* Details Table */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">最小生成树 (MST) 精确线路拓扑清单：</span>
            <div className="overflow-x-auto border border-slate-300">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5">线路编号</th>
                    <th className="p-2.5">顶点归属 / Path</th>
                    <th className="p-2.5">链路权重 / Cost</th>
                    <th className="p-2.5 text-right">属性</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {mstEdges.map((edge, index) => {
                    const src = vertices.find((v) => v.id === edge.source)?.name || edge.source;
                    const tgt = vertices.find((v) => v.id === edge.target)?.name || edge.target;
                    
                    return (
                      <tr key={edge.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400">#{(index + 1).toString().padStart(2, '0')}</td>
                        <td className="p-2.5 font-bold text-slate-800 font-serif italic">{src} ↔ {tgt}</td>
                        <td className="p-2.5 font-mono text-slate-900 font-bold">{edge.weight}</td>
                        <td className="p-2.5 text-right text-blue-600 font-bold text-[11px] uppercase tracking-wide">CORE-MST</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-5 flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-widest">
            <span>最小生成树 WebApp 切片化规划系统</span>
            <span>签发确认: 算法规划云端引擎认证</span>
          </div>
        </div>
      )}
    </div>
  );
}
