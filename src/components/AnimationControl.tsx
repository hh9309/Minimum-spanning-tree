/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { KruskalStep, PrimStep, Vertex } from '../types.ts';
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, RotateCcw, FastForward, PlayCircle } from 'lucide-react';

interface AnimationControlProps {
  algorithm: 'kruskal' | 'prim';
  onAlgorithmChange: (alg: 'kruskal' | 'prim') => void;
  startVertexId: string;
  onStartVertexIdChange: (id: string) => void;
  vertices: Vertex[];
  steps: (KruskalStep | PrimStep)[];
  currentStepIndex: number;
  onStepIndexChange: (idx: number) => void;
  isPlaying: boolean;
  onIsPlayingChange: (playing: boolean) => void;
}

export default function AnimationControl({
  algorithm,
  onAlgorithmChange,
  startVertexId,
  onStartVertexIdChange,
  vertices,
  steps,
  currentStepIndex,
  onStepIndexChange,
  isPlaying,
  onIsPlayingChange,
}: AnimationControlProps) {
  const [speed, setSpeed] = useState<number>(1000); // Step interval in ms
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance loop when isPlaying is true
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (currentStepIndex < steps.length - 1) {
          onStepIndexChange(currentStepIndex + 1);
        } else {
          // Finished, pause
          onIsPlayingChange(false);
        }
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps.length, speed, onStepIndexChange, onIsPlayingChange]);

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1) {
      // Loop back to start if playing at the end
      onStepIndexChange(0);
      onIsPlayingChange(true);
    } else {
      onIsPlayingChange(!isPlaying);
    }
  };

  const handleStepBack = () => {
    onIsPlayingChange(false);
    if (currentStepIndex > 0) {
      onStepIndexChange(currentStepIndex - 1);
    }
  };

  const handleStepForward = () => {
    onIsPlayingChange(false);
    if (currentStepIndex < steps.length - 1) {
      onStepIndexChange(currentStepIndex + 1);
    }
  };

  const handleReset = () => {
    onIsPlayingChange(false);
    onStepIndexChange(0);
  };

  const currentStep = steps[currentStepIndex];

  // Percentage calculations for progress ring animation
  const progressPercent = steps.length > 1 ? Math.round((currentStepIndex / (steps.length - 1)) * 100) : 0;
  const radius = 16;
  const stroke = 2.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Helper to determine color theme based on step status
  const getStatusColorClass = () => {
    if (!currentStep) return 'text-slate-500 bg-slate-100';
    
    // Check if step has Kruskal's 'status' or Prim's 'status'
    if (currentStep.status === 'complete') {
      return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }
    if (currentStep.status === 'cycle') {
      return 'text-rose-700 bg-rose-50 border-rose-100';
    }
    if (currentStep.status === 'safe' || currentStep.status === 'expanding') {
      return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
    return 'text-blue-700 bg-blue-50 border-blue-100'; // examining
  };

  const getStatusLabel = () => {
    if (!currentStep) return '准备绪';
    switch (currentStep.status) {
      case 'complete': return '求解完成 ✅';
      case 'cycle': return '成环警示 ❌';
      case 'safe': return '安全合并 🔒';
      case 'expanding': return '合并扩充 ➕';
      case 'examining': return '探寻考察 🔍';
      default: return '进行中';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/85 p-6 md:p-8 shadow-sm space-y-6" id="animation-slice">
      {/* Slice Label */}
      <div>
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 02 // 自动求解与动画控制</span>
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-serif italic font-black text-slate-900">求解与动画演示</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Alg Selector */}
            <div className="flex bg-slate-100/60 border border-slate-200/80 p-1 rounded-full">
              <button
                onClick={() => {
                  onIsPlayingChange(false);
                  onAlgorithmChange('kruskal');
                }}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all ${
                  algorithm === 'kruskal'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Kruskal (避环优先)
              </button>
              <button
                onClick={() => {
                  onIsPlayingChange(false);
                  onAlgorithmChange('prim');
                }}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all ${
                  algorithm === 'prim'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Prim (割边生长)
              </button>
            </div>

            {/* Prim starting vertex selector */}
            {algorithm === 'prim' && vertices.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">起点:</span>
                <select
                  value={startVertexId}
                  onChange={(e) => {
                    onIsPlayingChange(false);
                    onStartVertexIdChange(e.target.value);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-1 px-2.5 rounded-full text-[11px] font-bold cursor-pointer focus:outline-none"
                >
                  {vertices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Play Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="重置到步骤 0"
            className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleStepBack}
            disabled={currentStepIndex === 0}
            title="上一步"
            className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:hover:bg-white shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className={`pl-4 pr-6 py-1.5 rounded-full text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {/* Elegant SVG Progress Ring with nested micro-icon */}
            <div className="relative flex items-center justify-center h-8 w-8 bg-white/10 rounded-full shrink-0">
              <svg
                height={radius * 2}
                width={radius * 2}
                className="absolute transform -rotate-90"
              >
                {/* Inner background circle */}
                <circle
                  stroke="rgba(255, 255, 255, 0.15)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                {/* Animated progress stroke circle */}
                <circle
                  stroke="#ffffff"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s ease-in-out' }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
              </svg>
              
              {/* Nested interactive state icon */}
              {isPlaying ? (
                <Pause className="h-3 w-3 fill-current text-white relative z-10" />
              ) : (
                <Play className="h-3 w-3 fill-current text-white translate-x-[1px] relative z-10" />
              )}
            </div>

            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[10px] uppercase font-black tracking-widest">
                {isPlaying ? '暂停演示' : '自动求解'}
              </span>
              <span className="text-[8px] font-mono font-bold opacity-75">
                进度 {progressPercent}%
              </span>
            </div>
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStepIndex === steps.length - 1}
            title="下一步"
            className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:hover:bg-white shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200 text-xs shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2">播放倍速:</span>
          <button
            onClick={() => setSpeed(2000)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
              speed === 2000 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            0.5x
          </button>
          <button
            onClick={() => setSpeed(1000)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
              speed === 1000 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            1.0x
          </button>
          <button
            onClick={() => setSpeed(400)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
              speed === 400 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            2.5x
          </button>
        </div>
      </div>

      {/* Progress Slider */}
      {steps.length > 1 && (
        <div className="space-y-1.5 bg-slate-50/30 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            <span>演示进度控制</span>
            <span className="font-mono text-slate-800 font-black">
              第 {currentStepIndex} / {steps.length - 1} 步
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={steps.length - 1}
              value={currentStepIndex}
              onChange={(e) => {
                onIsPlayingChange(false);
                onStepIndexChange(parseInt(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Snapshot Details Viewer */}
      {currentStep ? (
        <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest">
              STEP {currentStepIndex} : {algorithm.toUpperCase()}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColorClass()}`}>
              {getStatusLabel()}
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm min-h-[80px]">
            <p className="text-slate-700 text-xs leading-relaxed font-sans font-medium">
              {currentStep.explanation}
            </p>
          </div>

          {/* DSU Parent Representation (Only for Kruskal) */}
          {algorithm === 'kruskal' && 'subsets' in currentStep && (
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                并查集森林代表元状态 (Union-Find):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(currentStep.subsets).map(([nodeId, rootId]) => {
                  const nodeObj = vertices.find((v) => v.id === nodeId);
                  const rootObj = vertices.find((v) => v.id === rootId);
                  const nodeName = nodeObj ? nodeObj.name : nodeId;
                  const rootName = rootObj ? rootObj.name : rootId;
                  
                  return (
                    <div
                      key={nodeId}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md border ${
                        nodeId === rootId
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-blue-50/40 text-blue-700 border-blue-100 font-bold'
                      }`}
                    >
                      {nodeName} → <span className="font-bold">{rootName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
          请在上方绘制节点和连线，然后选择算法开启自动求解
        </div>
      )}
    </div>
  );
}
