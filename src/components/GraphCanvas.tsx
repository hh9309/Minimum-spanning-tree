/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Vertex, Edge } from '../types.ts';
import { Plus, Link as LinkIcon, Move, Trash2, RotateCcw, AlertCircle } from 'lucide-react';

interface GraphCanvasProps {
  vertices: Vertex[];
  edges: Edge[];
  onVerticesChange: (v: Vertex[]) => void;
  onEdgesChange: (e: Edge[]) => void;
  // Animation state props
  activeEdgeId: string | null;
  mstEdgeIds: string[];
  candidateEdgeIds: string[]; // For Prim cut set
  visitedNodeIds: string[];   // For Prim visited
  animationStatus: 'examining' | 'cycle' | 'safe' | 'expanding' | 'complete' | 'idle';
  isAnimationActive: boolean;
  onStartVertexIdChange?: (id: string) => void;
}

export default function GraphCanvas({
  vertices,
  edges,
  onVerticesChange,
  onEdgesChange,
  activeEdgeId,
  mstEdgeIds,
  candidateEdgeIds,
  visitedNodeIds,
  animationStatus,
  isAnimationActive,
  onStartVertexIdChange,
}: GraphCanvasProps) {
  const [mode, setMode] = useState<'addNode' | 'addEdge' | 'drag' | 'delete'>('addNode');
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<number | null>(null);

  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [parseStatus, setParseStatus] = useState<'valid' | 'invalid' | 'empty'>('valid');
  const [genNodeCount, setGenNodeCount] = useState<number>(6);

  // Parser helper function
  const parseGraphString = (str: string) => {
    const regex = /([A-Za-z0-9_]+)\s*(?:-|->|--)\s*([A-Za-z0-9_]+)\s*[:=]\s*(\d+)/g;
    const parsedEdges: { source: string; target: string; weight: number }[] = [];
    const nodeNames = new Set<string>();
    
    let match;
    while ((match = regex.exec(str)) !== null) {
      const [, src, tgt, weightStr] = match;
      const weight = parseInt(weightStr, 10);
      if (src !== tgt && !isNaN(weight)) { // avoid self loops
        parsedEdges.push({ source: src.toUpperCase(), target: tgt.toUpperCase(), weight });
        nodeNames.add(src.toUpperCase());
        nodeNames.add(tgt.toUpperCase());
      }
    }
    
    return { parsedEdges, nodeNames: Array.from(nodeNames) };
  };

  // Sync global graph changes to text input
  useEffect(() => {
    if (!isInputFocused) {
      const serialized = edges.map(e => {
        const srcName = vertices.find(v => v.id === e.source)?.name || e.source;
        const tgtName = vertices.find(v => v.id === e.target)?.name || e.target;
        return `${srcName}-${tgtName}:${e.weight}`;
      }).join(', ');
      setInputText(serialized);
      setParseStatus(serialized.trim() === '' ? 'empty' : 'valid');
    }
  }, [vertices, edges, isInputFocused]);

  // Handle typing to parse in real-time
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const { parsedEdges, nodeNames } = parseGraphString(val);
    if (parsedEdges.length > 0) {
      const newVertices: Vertex[] = [];
      const existingVerticesMap = new Map<string, Vertex>(vertices.map(v => [v.name.toUpperCase(), v]));
      
      nodeNames.forEach((name, idx) => {
        const existing = existingVerticesMap.get(name);
        if (existing) {
          newVertices.push(existing);
        } else {
          // Circle placement
          const angle = (idx / Math.max(1, nodeNames.length)) * 2 * Math.PI;
          const x = 200 + 110 * Math.cos(angle);
          const y = 240 + 110 * Math.sin(angle);
          newVertices.push({
            id: `n_new_${name}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            x,
            y
          });
        }
      });

      const existingEdgesMap = new Map<string, Edge>();
      edges.forEach(e => {
        const srcName = vertices.find(v => v.id === e.source)?.name?.toUpperCase();
        const tgtName = vertices.find(v => v.id === e.target)?.name?.toUpperCase();
        if (srcName && tgtName) {
          existingEdgesMap.set(`${srcName}-${tgtName}`, e);
          existingEdgesMap.set(`${tgtName}-${srcName}`, e);
        }
      });

      const newEdges: Edge[] = parsedEdges.map((pe, idx) => {
        const sourceVertex = newVertices.find(v => v.name.toUpperCase() === pe.source)!;
        const targetVertex = newVertices.find(v => v.name.toUpperCase() === pe.target)!;
        
        const existing = existingEdgesMap.get(`${pe.source}-${pe.target}`);
        if (existing) {
          return {
            ...existing,
            weight: pe.weight,
            source: existing.source === sourceVertex.id ? sourceVertex.id : targetVertex.id,
            target: existing.target === targetVertex.id ? targetVertex.id : sourceVertex.id,
          };
        }
        
        return {
          id: `e_new_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          source: sourceVertex.id,
          target: targetVertex.id,
          weight: pe.weight
        };
      });

      onVerticesChange(newVertices);
      onEdgesChange(newEdges);
      setParseStatus('valid');
    } else {
      setParseStatus(val.trim() === '' ? 'empty' : 'invalid');
    }
  };

  // Automatically generate a connected network graph with a selected node count
  const handleAutoGenerateGraph = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newVertices: Vertex[] = [];
    const newEdges: Edge[] = [];
    
    // 1. Generate Vertices placed beautifully in a circle
    for (let i = 0; i < genNodeCount; i++) {
      const name = i < 26 ? letters[i] : letters[i % 26] + Math.floor(i / 26);
      const angle = (i / genNodeCount) * 2 * Math.PI - Math.PI / 2; // top center start
      const x = Math.round(200 + 115 * Math.cos(angle));
      const y = Math.round(240 + 115 * Math.sin(angle));
      newVertices.push({
        id: `n_gen_${i + 1}_${Math.random().toString(36).substr(2, 5)}`,
        name,
        x,
        y
      });
    }

    // 2. Add cycle edges to guarantee connectivity
    for (let i = 0; i < genNodeCount; i++) {
      const u = newVertices[i];
      const v = newVertices[(i + 1) % genNodeCount];
      const weight = Math.floor(Math.random() * 12) + 2; // weights 2 to 13
      newEdges.push({
        id: `e_gen_cycle_${i}_${Math.random().toString(36).substr(2, 5)}`,
        source: u.id,
        target: v.id,
        weight
      });
    }

    // 3. Add random extra cross edges (chords) with reasonable density
    const chordProbability = 1.5 / genNodeCount;
    for (let i = 0; i < genNodeCount; i++) {
      for (let j = i + 2; j < genNodeCount; j++) {
        // Avoid cycle-wrapping duplicate (like 0 and N-1)
        if (i === 0 && j === genNodeCount - 1) continue;
        
        if (Math.random() < chordProbability) {
          const weight = Math.floor(Math.random() * 12) + 2;
          newEdges.push({
            id: `e_gen_chord_${i}_${j}_${Math.random().toString(36).substr(2, 5)}`,
            source: newVertices[i].id,
            target: newVertices[j].id,
            weight
          });
        }
      }
    }

    onVerticesChange(newVertices);
    onEdgesChange(newEdges);
    
    // Set starting vertex to the first node
    if (newVertices.length > 0 && onStartVertexIdChange) {
      onStartVertexIdChange(newVertices[0].id);
    }
  };

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Clean selection if mode changes
  useEffect(() => {
    setSelectedNodeForEdge(null);
  }, [mode]);

  // Generate next node name (A, B, C...)
  const getNextNodeName = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const count = vertices.length;
    if (count < 26) return letters[count];
    return letters[count % 26] + Math.floor(count / 26);
  };

  // SVG Mouse Click Handler (for adding nodes)
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'addNode' || isAnimationActive) return;
    if (e.target !== svgRef.current) return; // Only trigger on background click

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNodeId = `node_${Date.now()}`;
    const newVertex: Vertex = {
      id: newNodeId,
      name: getNextNodeName(),
      x,
      y,
    };

    onVerticesChange([...vertices, newVertex]);
  };

  // Vertex Click Handler (for building edges / deleting nodes)
  const handleVertexClick = (vertexId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimationActive) return;

    if (mode === 'delete') {
      // Remove vertex
      const newVertices = vertices.filter(v => v.id !== vertexId);
      // Remove associated edges
      const newEdges = edges.filter(edge => edge.source !== vertexId && edge.target !== vertexId);
      onVerticesChange(newVertices);
      onEdgesChange(newEdges);
      if (selectedNodeForEdge === vertexId) setSelectedNodeForEdge(null);
    } else if (mode === 'addEdge') {
      if (selectedNodeForEdge === null) {
        setSelectedNodeForEdge(vertexId);
      } else {
        if (selectedNodeForEdge === vertexId) {
          // Cancel selection
          setSelectedNodeForEdge(null);
          return;
        }

        // Check if edge already exists
        const edgeExists = edges.some(
          edge =>
            (edge.source === selectedNodeForEdge && edge.target === vertexId) ||
            (edge.source === vertexId && edge.target === selectedNodeForEdge)
        );

        if (!edgeExists) {
          const newEdge: Edge = {
            id: `edge_${Date.now()}`,
            source: selectedNodeForEdge,
            target: vertexId,
            weight: 5, // Default weight
          };
          onEdgesChange([...edges, newEdge]);
        }

        setSelectedNodeForEdge(null);
      }
    }
  };

  // Vertex Drag Handlers
  const handleVertexMouseDown = (vertexId: string, e: React.MouseEvent) => {
    if (mode !== 'drag' || isAnimationActive) return;
    e.stopPropagation();
    setDraggedNodeId(vertexId);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || mode !== 'drag' || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Constrain inside bounds
    const boundedX = Math.max(20, Math.min(rect.width - 20, x));
    const boundedY = Math.max(20, Math.min(rect.height - 20, y));

    const updatedVertices = vertices.map(v => {
      if (v.id === draggedNodeId) {
        return { ...v, x: boundedX, y: boundedY };
      }
      return v;
    });

    onVerticesChange(updatedVertices);
  };

  const handleSvgMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Edge Click Handler (for deleting / selecting weight)
  const handleEdgeClick = (edgeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimationActive) return;

    if (mode === 'delete') {
      const newEdges = edges.filter(edge => edge.id !== edgeId);
      onEdgesChange(newEdges);
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
        setEditingWeight(null);
      }
    } else {
      setSelectedEdgeId(edgeId);
      const edge = edges.find(ed => ed.id === edgeId);
      if (edge) {
        setEditingWeight(edge.weight);
      }
    }
  };

  // Update edge weight
  const saveEdgeWeight = () => {
    if (!selectedEdgeId || editingWeight === null) return;
    const updatedEdges = edges.map(ed => {
      if (ed.id === selectedEdgeId) {
        return { ...ed, weight: Math.max(1, editingWeight) };
      }
      return ed;
    });
    onEdgesChange(updatedEdges);
    setSelectedEdgeId(null);
    setEditingWeight(null);
  };

  // Preset Topology Graphs to let users play instantly
  const loadPreset = (type: 'house' | 'ring' | 'disconnected') => {
    if (isAnimationActive) return;

    if (type === 'house') {
      const pNodes: Vertex[] = [
        { id: 'n1', name: 'A', x: 200, y: 100 },
        { id: 'n2', name: 'B', x: 100, y: 220 },
        { id: 'n3', name: 'C', x: 300, y: 220 },
        { id: 'n4', name: 'D', x: 100, y: 380 },
        { id: 'n5', name: 'E', x: 300, y: 380 },
      ];
      const pEdges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2', weight: 4 },
        { id: 'e2', source: 'n1', target: 'n3', weight: 3 },
        { id: 'e3', source: 'n2', target: 'n3', weight: 6 },
        { id: 'e4', source: 'n2', target: 'n4', weight: 2 },
        { id: 'e5', source: 'n3', target: 'n5', weight: 7 },
        { id: 'e6', source: 'n4', target: 'n5', weight: 5 },
        { id: 'e7', source: 'n2', target: 'n5', weight: 1 },
      ];
      onVerticesChange(pNodes);
      onEdgesChange(pEdges);
    } else if (type === 'ring') {
      const pNodes: Vertex[] = [
        { id: 'n1', name: 'A', x: 200, y: 90 },
        { id: 'n2', name: 'B', x: 320, y: 180 },
        { id: 'n3', name: 'C', x: 320, y: 320 },
        { id: 'n4', name: 'D', x: 200, y: 410 },
        { id: 'n5', name: 'E', x: 80, y: 320 },
        { id: 'n6', name: 'F', x: 80, y: 180 },
      ];
      const pEdges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2', weight: 3 },
        { id: 'e2', source: 'n2', target: 'n3', weight: 8 },
        { id: 'e3', source: 'n3', target: 'n4', weight: 2 },
        { id: 'e4', source: 'n4', target: 'n5', weight: 6 },
        { id: 'e5', source: 'n5', target: 'n6', weight: 4 },
        { id: 'e6', source: 'n6', target: 'n1', weight: 5 },
        { id: 'e7', source: 'n1', target: 'n4', weight: 10 },
        { id: 'e8', source: 'n6', target: 'n3', weight: 1 },
      ];
      onVerticesChange(pNodes);
      onEdgesChange(pEdges);
    } else if (type === 'disconnected') {
      const pNodes: Vertex[] = [
        { id: 'n1', name: 'A', x: 120, y: 150 },
        { id: 'n2', name: 'B', x: 280, y: 150 },
        { id: 'n3', name: 'C', x: 200, y: 280 },
        { id: 'n4', name: 'X', x: 120, y: 380 },
        { id: 'n5', name: 'Y', x: 280, y: 380 },
      ];
      const pEdges: Edge[] = [
        { id: 'e1', source: 'n1', target: 'n2', weight: 2 },
        { id: 'e2', source: 'n2', target: 'n3', weight: 4 },
        { id: 'e3', source: 'n1', target: 'n3', weight: 5 },
        { id: 'e4', source: 'n4', target: 'n5', weight: 1 },
      ];
      onVerticesChange(pNodes);
      onEdgesChange(pEdges);
    }
    // Clear selections
    setSelectedNodeForEdge(null);
    setSelectedEdgeId(null);
    setEditingWeight(null);
  };

  const clearCanvas = () => {
    if (isAnimationActive) return;
    onVerticesChange([]);
    onEdgesChange([]);
    setSelectedNodeForEdge(null);
    setSelectedEdgeId(null);
    setEditingWeight(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/85 p-6 md:p-8 shadow-sm space-y-6" id="modeling-slice">
      {/* Slice Label */}
      <div>
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">SLICE 01 // 动态拓扑建模</span>
        {/* Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-4">
          <h2 className="text-2xl font-serif italic font-black text-slate-900">建模与拓扑输入</h2>
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/60 border border-slate-200/80 p-1 rounded-full">
            <button
              onClick={() => loadPreset('house')}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-white px-3 py-1 rounded-full transition-all"
              disabled={isAnimationActive}
            >
              经典拓扑
            </button>
            <button
              onClick={() => loadPreset('ring')}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-white px-3 py-1 rounded-full transition-all"
              disabled={isAnimationActive}
            >
              环形拓扑
            </button>
            <button
              onClick={() => loadPreset('disconnected')}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-white px-3 py-1 rounded-full transition-all"
              disabled={isAnimationActive}
            >
              非连通图
            </button>
            <button
              onClick={clearCanvas}
              className="text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-full transition-all flex items-center gap-1"
              disabled={isAnimationActive}
            >
              <RotateCcw className="h-3 w-3" />
              清空
            </button>
          </div>
        </div>
      </div>

      {/* 快捷拓扑与随机生成双控制面板 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
        {/* 快速拓扑表达式录入 */}
        <div className="md:col-span-7 space-y-1.5">
          <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 font-mono">
            ⚡ 快速拓扑表达式录入 (双向毫秒级数据绑定)
          </span>
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={handleInputChange}
              disabled={isAnimationActive}
              placeholder="输入链路, 如: A-B:4, B-C:3, A-C:6"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl focus:outline-none placeholder:text-slate-400 focus:shadow-sm transition-all text-slate-800 disabled:opacity-60"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none">
              <span className={`h-1.5 w-1.5 rounded-full ${parseStatus === 'valid' ? 'bg-emerald-500 animate-pulse' : parseStatus === 'empty' ? 'bg-slate-300' : 'bg-rose-500'}`} />
              <span className="text-[8px] font-mono font-black uppercase text-slate-400">
                {parseStatus === 'valid' ? 'SYNC' : parseStatus === 'empty' ? 'EMPTY' : 'ERROR'}
              </span>
            </div>
          </div>
        </div>

        {/* 自动生成网络图 */}
        <div className="md:col-span-5 space-y-1.5">
          <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 font-mono">
            🎲 随机拓扑生成器 (Auto-Generator)
          </span>
          <div className="flex gap-2">
            <select
              value={genNodeCount}
              onChange={(e) => setGenNodeCount(Number(e.target.value))}
              disabled={isAnimationActive}
              className="px-3 py-2 text-xs font-mono font-bold bg-white border-2 border-slate-200 rounded-xl focus:outline-none text-slate-800 cursor-pointer disabled:opacity-60"
            >
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={num}>
                  {num} 节点
                </option>
              ))}
            </select>
            <button
              onClick={handleAutoGenerateGraph}
              disabled={isAnimationActive}
              className="flex-1 px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-900 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap"
            >
              生成网络图
            </button>
          </div>
        </div>
      </div>

      {/* Control Toolbox */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setMode('addNode')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
            mode === 'addNode'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
          }`}
          disabled={isAnimationActive}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>添加节点 (A-Z)</span>
        </button>
        <button
          onClick={() => setMode('addEdge')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
            mode === 'addEdge'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
          }`}
          disabled={isAnimationActive}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>建立带权边</span>
        </button>
        <button
          onClick={() => setMode('drag')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
            mode === 'drag'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
          }`}
          disabled={isAnimationActive}
        >
          <Move className="h-3.5 w-3.5" />
          <span>拖动节点</span>
        </button>
        <button
          onClick={() => setMode('delete')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
            mode === 'delete'
              ? 'bg-rose-950 text-white shadow-sm'
              : 'border border-rose-200 text-rose-700 bg-white hover:bg-rose-50'
          }`}
          disabled={isAnimationActive}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>删除元素</span>
        </button>

        {isAnimationActive && (
          <div className="ml-auto flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>求解演示期间，编辑已锁</span>
          </div>
        )}
      </div>

      {/* SVG Stage */}
      <div className="relative border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden h-[460px] select-none shadow-inner">
        {/* Graticule dot patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none opacity-80" />

        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair relative z-10"
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          {/* 1. EDGES RENDER */}
          {edges.map((edge) => {
            const srcNode = vertices.find((v) => v.id === edge.source);
            const tgtNode = vertices.find((v) => v.id === edge.target);
            if (!srcNode || !tgtNode) return null;

            const isMstEdge = mstEdgeIds.includes(edge.id);
            const isActiveEdge = activeEdgeId === edge.id;
            const isCandidate = candidateEdgeIds.includes(edge.id);

            // Calculate exact midpoint for edge weight labels
            const midX = (srcNode.x + tgtNode.x) / 2;
            const midY = (srcNode.y + tgtNode.y) / 2;

            // Compute line styles based on state - Editorial Blue Accent
            let strokeColor = '#94a3b8'; // default grey
            let strokeWidth = '2';
            let strokeDash = undefined;

            if (isMstEdge) {
              // Part of MST -> Solid Slate-900 or Editorial Blue
              strokeColor = '#2563eb';
              strokeWidth = '4';
            } else if (isActiveEdge) {
              if (animationStatus === 'cycle') {
                strokeColor = '#ef4444'; // Red alarm for loop
                strokeWidth = '5';
              } else if (animationStatus === 'safe' || animationStatus === 'expanding') {
                strokeColor = '#2563eb'; // Deep blue accept
                strokeWidth = '4';
              } else {
                strokeColor = '#475569'; // slate-600 examining
                strokeWidth = '4';
              }
            } else if (isCandidate) {
              strokeColor = '#2563eb'; // Cut set candidates
              strokeWidth = '1.5';
              strokeDash = '3,3'; // dashed
            }

            const isSelected = selectedEdgeId === edge.id;

            return (
              <g key={edge.id} className="group cursor-pointer">
                {/* Invisible wider path to make clicking easier */}
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={tgtNode.x}
                  y2={tgtNode.y}
                  stroke="transparent"
                  strokeWidth="12"
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                />

                {/* Visible path */}
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={tgtNode.x}
                  y2={tgtNode.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  className={`${isActiveEdge ? 'animate-pulse' : ''} transition-all duration-300`}
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                />

                {/* Selected Edge Highlight Ring */}
                {isSelected && (
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke="#93c5fd"
                    strokeWidth="6"
                    strokeOpacity="0.4"
                    className="pointer-events-none"
                  />
                )}

                {/* Weight Label Background Card */}
                <rect
                  x={midX - 12}
                  y={midY - 10}
                  width="24"
                  height="20"
                  rx="4"
                  fill="white"
                  stroke={isSelected ? '#2563eb' : isMstEdge ? '#2563eb' : isActiveEdge ? strokeColor : '#cbd5e1'}
                  strokeWidth={isSelected ? '2' : '1'}
                  className="transition-all"
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                />

                {/* Weight Text */}
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  className={`text-[11px] font-mono font-bold select-none ${
                    isSelected ? 'fill-blue-600' : isMstEdge ? 'fill-blue-600' : 'fill-slate-600'
                  }`}
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                >
                  {edge.weight}
                </text>
              </g>
            );
          })}

          {/* 2. VERTICES RENDER */}
          {vertices.map((vertex) => {
            const isVisited = visitedNodeIds.includes(vertex.id);
            const isSelectedForEdge = selectedNodeForEdge === vertex.id;

            // Node colors in active animation - Editorial High Contrast
            let fillColor = '#ffffff';
            let strokeColor = '#0f172a'; // Bold slate-900 border
            let strokeWidth = '2';
            let textColor = 'fill-slate-800';

            if (isVisited) {
              // Prim visited set -> solid slate-900
              fillColor = '#0f172a';
              strokeColor = '#0f172a';
              strokeWidth = '2';
              textColor = 'fill-white';
            }

            if (isSelectedForEdge) {
              strokeColor = '#2563eb';
              strokeWidth = '3';
            }

            return (
              <g
                key={vertex.id}
                transform={`translate(${vertex.x}, ${vertex.y})`}
                onMouseDown={(e) => handleVertexMouseDown(vertex.id, e)}
                onClick={(e) => handleVertexClick(vertex.id, e)}
                className="cursor-pointer group select-none"
              >
                {/* Glowing ripple wrapper for Prim active set or hovered state */}
                {isVisited && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                    className="animate-ping opacity-25"
                  />
                )}

                {/* Outer selection indicator */}
                {isSelectedForEdge && (
                  <circle
                    r="22"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Core Circle */}
                <circle
                  r="16"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className="transition-all duration-300 shadow-sm"
                />

                {/* Label Text */}
                <text
                  y="4"
                  textAnchor="middle"
                  className={`text-xs font-bold font-sans ${textColor} select-none pointer-events-none`}
                >
                  {vertex.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Empty Canvas Prompt Overlay */}
        {vertices.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 z-0">
            <AlertCircle className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
            <span className="text-xs font-medium text-slate-500">画布当前为空</span>
            <span className="text-[11px] text-slate-400 mt-1">选择左上方“添加节点”并在画布中点击创建！</span>
          </div>
        )}
      </div>

      {/* Inline Edge Weight Modification panel */}
      {selectedEdgeId && editingWeight !== null && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-900">
              修改选中的边：
              {(() => {
                const ed = edges.find((e) => e.id === selectedEdgeId);
                if (ed) {
                  const src = vertices.find((v) => v.id === ed.source)?.name || ed.source;
                  const tgt = vertices.find((v) => v.id === ed.target)?.name || ed.target;
                  return `${src} - ${tgt}`;
                }
                return '';
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-700">边权重 (1-99):</span>
            <input
              type="number"
              min="1"
              max="99"
              value={editingWeight}
              onChange={(e) => setEditingWeight(parseInt(e.target.value) || 1)}
              className="w-16 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-mono font-bold text-slate-800"
            />
            <button
              onClick={saveEdgeWeight}
              className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-md font-medium hover:bg-indigo-700 transition-all"
            >
              保存
            </button>
            <button
              onClick={() => {
                setSelectedEdgeId(null);
                setEditingWeight(null);
              }}
              className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
