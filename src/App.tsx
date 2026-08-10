/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { solveKruskal, solvePrim } from './mstSolver.ts';
import { Vertex, Edge } from './types.ts';
import GraphCanvas from './components/GraphCanvas.tsx';
import DataMatrix from './components/DataMatrix.tsx';
import AnimationControl from './components/AnimationControl.tsx';
import KnowledgeGuide from './components/KnowledgeGuide.tsx';
import AIInsights from './components/AIInsights.tsx';
import ReportExport from './components/ReportExport.tsx';
import PythonValidation from './components/PythonValidation.tsx';
import { Sparkles, Network, BookOpen, Layers, Brain, FileOutput } from 'lucide-react';

export default function App() {
  // Preset vertices & edges for immediate exploration
  const [vertices, setVertices] = useState<Vertex[]>([
    { id: 'n1', name: 'A', x: 200, y: 100 },
    { id: 'n2', name: 'B', x: 100, y: 220 },
    { id: 'n3', name: 'C', x: 300, y: 220 },
    { id: 'n4', name: 'D', x: 100, y: 380 },
    { id: 'n5', name: 'E', x: 300, y: 380 },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1', source: 'n1', target: 'n2', weight: 4 },
    { id: 'e2', source: 'n1', target: 'n3', weight: 3 },
    { id: 'e3', source: 'n2', target: 'n3', weight: 6 },
    { id: 'e4', source: 'n2', target: 'n4', weight: 2 },
    { id: 'e5', source: 'n3', target: 'n5', weight: 7 },
    { id: 'e6', source: 'n4', target: 'n5', weight: 5 },
    { id: 'e7', source: 'n2', target: 'n5', weight: 1 },
  ]);

  const [algorithm, setAlgorithm] = useState<'kruskal' | 'prim'>('kruskal');
  const [startVertexId, setStartVertexId] = useState<string>('n1');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeRightTab, setActiveRightTab] = useState<'guide' | 'matrix' | 'ai' | 'export' | 'python'>('guide');

  // Sync startVertexId to ensure it points to an existing node
  useEffect(() => {
    if (vertices.length > 0) {
      const exists = vertices.some((v) => v.id === startVertexId);
      if (!exists) {
        setStartVertexId(vertices[0].id);
      }
    }
  }, [vertices, startVertexId]);

  // Compute solver steps on-the-fly
  const solveResult = useMemo(() => {
    if (algorithm === 'prim') {
      return solvePrim(vertices, edges, startVertexId);
    } else {
      return solveKruskal(vertices, edges);
    }
  }, [vertices, edges, algorithm, startVertexId]);

  // Reset animation index when steps list changes size or algorithm switches
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [solveResult.steps.length, algorithm, startVertexId]);

  // Extract visual cues corresponding to the selected animation step
  const currentStep = solveResult.steps[currentStepIndex];

  const activeEdgeId = currentStep?.activeEdgeId || null;
  const mstEdgeIds = currentStep?.mstEdgeIds || [];
  const candidateEdgeIds = currentStep && 'candidateEdgeIds' in currentStep ? currentStep.candidateEdgeIds : [];
  const visitedNodeIds = currentStep && 'visitedNodeIds' in currentStep ? currentStep.visitedNodeIds : [];
  const animationStatus = currentStep?.status || 'idle';

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-slate-800 font-sans flex flex-col antialiased selection:bg-slate-200 selection:text-slate-900 border-[12px] md:border-[16px] border-white shadow-inner relative">
      
      {/* Editorial Polished Top Header */}
      <header className="px-6 py-8 md:py-10 max-w-7xl w-full mx-auto border-b-[3px] border-slate-900 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="shrink-0">
            <h1 className="text-4xl md:text-5xl font-serif italic font-black tracking-tighter text-slate-900">
              最小树问题
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] mt-2 font-bold opacity-60 font-mono">
              最小生成树算法云平台 // 图论建模与造价研判引擎
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
              SYSTEM DIAGNOSTICS // ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Split Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 print:p-0">
        
        {/* Left Column (Canvas & Animations Console) - Always Visible */}
        <section className="lg:col-span-6 space-y-6 print:hidden">
          <GraphCanvas
            vertices={vertices}
            edges={edges}
            onVerticesChange={setVertices}
            onEdgesChange={setEdges}
            activeEdgeId={activeEdgeId}
            mstEdgeIds={mstEdgeIds}
            candidateEdgeIds={candidateEdgeIds}
            visitedNodeIds={visitedNodeIds}
            animationStatus={animationStatus}
            isAnimationActive={isPlaying || currentStepIndex > 0}
            onStartVertexIdChange={setStartVertexId}
          />

          <AnimationControl
            algorithm={algorithm}
            onAlgorithmChange={setAlgorithm}
            startVertexId={startVertexId}
            onStartVertexIdChange={setStartVertexId}
            vertices={vertices}
            steps={solveResult.steps}
            currentStepIndex={currentStepIndex}
            onStepIndexChange={setCurrentStepIndex}
            isPlaying={isPlaying}
            onIsPlayingChange={setIsPlaying}
          />
        </section>

        {/* Right Column (Tabs with the interactive slices) */}
        <section className="lg:col-span-6 flex flex-col space-y-6 print:col-span-12 print:space-y-0">
          
          {/* Slices Navigator Tab Bar - Editorial Aesthetic */}
          <nav className="flex gap-6 md:gap-8 border-b-2 border-slate-900/10 pb-3 mb-4 select-none print:hidden overflow-x-auto">
            <button
              onClick={() => setActiveRightTab('guide')}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1.5 transition-all text-left whitespace-nowrap ${
                activeRightTab === 'guide'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              01 知识导引
            </button>
            <button
              onClick={() => setActiveRightTab('matrix')}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1.5 transition-all text-left whitespace-nowrap ${
                activeRightTab === 'matrix'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              02 数据矩阵
            </button>
            <button
              onClick={() => setActiveRightTab('ai')}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1.5 transition-all text-left whitespace-nowrap ${
                activeRightTab === 'ai'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              03 AI 专家研判
            </button>
            <button
              onClick={() => setActiveRightTab('python')}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1.5 transition-all text-left whitespace-nowrap ${
                activeRightTab === 'python'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              04 Python 验证
            </button>
            <button
              onClick={() => setActiveRightTab('export')}
              className={`text-[11px] font-bold uppercase tracking-widest pb-1.5 transition-all text-left whitespace-nowrap ${
                activeRightTab === 'export'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              05 报告导出
            </button>
          </nav>

          {/* Slices Panels Container */}
          <div className="flex-1 print:block">
            {activeRightTab === 'guide' && (
              <div className="print:hidden">
                <KnowledgeGuide />
              </div>
            )}
            
            {activeRightTab === 'matrix' && (
              <div className="print:hidden">
                <DataMatrix
                  vertices={vertices}
                  edges={edges}
                  onVerticesChange={setVertices}
                  onEdgesChange={setEdges}
                  isAnimationActive={isPlaying || currentStepIndex > 0}
                />
              </div>
            )}

            {activeRightTab === 'ai' && (
              <div className="print:hidden">
                <AIInsights
                  vertices={vertices}
                  edges={edges}
                  mstEdges={solveResult.mstEdges}
                  totalWeight={solveResult.totalWeight}
                  algorithm={algorithm}
                />
              </div>
            )}

            {activeRightTab === 'python' && (
              <div className="print:hidden">
                <PythonValidation
                  vertices={vertices}
                  edges={edges}
                  tsTotalWeight={solveResult.totalWeight}
                />
              </div>
            )}

            {activeRightTab === 'export' && (
              <div className="print:block">
                <ReportExport
                  vertices={vertices}
                  edges={edges}
                  mstEdges={solveResult.mstEdges}
                  totalWeight={solveResult.totalWeight}
                  algorithm={algorithm}
                  isDisconnected={solveResult.isDisconnected}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Editorial Styled Footer */}
      <footer className="max-w-7xl w-full mx-auto mt-auto pt-6 pb-10 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold gap-3 print:hidden px-6">
        <div>
          算法云平台 // TOTAL NODES: <span className="text-slate-900 font-mono">{vertices.length}</span>
        </div>
        <div>
          ENGINE: <span className="text-slate-900 font-mono">TS-SOLVER-X64</span>
        </div>
        <div>
          ESTIMATED WEIGHT: <span className="text-slate-900 font-mono">{solveResult.totalWeight}</span>
        </div>
      </footer>
    </div>
  );
}
