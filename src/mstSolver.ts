/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vertex, Edge, KruskalStep, PrimStep, MSTSolveResult } from './types.ts';

class DSU {
  parent: { [id: string]: string };

  constructor(vertexIds: string[]) {
    this.parent = {};
    for (const id of vertexIds) {
      this.parent[id] = id;
    }
  }

  find(id: string): string {
    // Check if the vertex exists in DSU
    if (!(id in this.parent)) {
      this.parent[id] = id;
    }
    if (this.parent[id] === id) {
      return id;
    }
    // Path compression
    this.parent[id] = this.find(this.parent[id]);
    return this.parent[id];
  }

  union(id1: string, id2: string): boolean {
    const root1 = this.find(id1);
    const root2 = this.find(id2);
    if (root1 !== root2) {
      this.parent[root1] = root2;
      return true;
    }
    return false;
  }

  getMapping(vertexIds: string[]): { [id: string]: string } {
    const mapping: { [id: string]: string } = {};
    for (const id of vertexIds) {
      mapping[id] = this.find(id);
    }
    return mapping;
  }
}

export function solveKruskal(vertices: Vertex[], edges: Edge[]): MSTSolveResult {
  const steps: KruskalStep[] = [];
  const vertexIds = vertices.map(v => v.id);
  const dsu = new DSU(vertexIds);
  const mstEdgeIds: string[] = [];
  const mstEdges: Edge[] = [];
  
  const nodeNameMap = new Map<string, string>();
  vertices.forEach(v => nodeNameMap.set(v.id, v.name || `节点_${v.id.substring(0,4)}`));

  // Sort edges by weight
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);

  // If there are no edges, return empty result
  if (vertices.length === 0) {
    return {
      algorithm: 'kruskal',
      totalWeight: 0,
      mstEdges: [],
      steps: [],
      isStepListComplete: true,
      isDisconnected: false,
    };
  }

  // Step 0: Initial state
  steps.push({
    stepIndex: 0,
    activeEdgeId: null,
    mstEdgeIds: [],
    explanation: 'Kruskal 算法启动。所有边已按照权重从低到高排序。初始并查集森林中每个节点自成一个连通分量（避免成环的前提）。',
    status: 'examining',
    subsets: dsu.getMapping(vertexIds),
  });

  let stepIdx = 1;
  for (const edge of sortedEdges) {
    const u = edge.source;
    const v = edge.target;
    const uName = nodeNameMap.get(u) || u;
    const vName = nodeNameMap.get(v) || v;

    const rootU = dsu.find(u);
    const rootV = dsu.find(v);

    if (rootU === rootV) {
      // Cycle detected
      steps.push({
        stepIndex: stepIdx++,
        activeEdgeId: edge.id,
        mstEdgeIds: [...mstEdgeIds],
        explanation: `考察边 ${uName} - ${vName} (权重 ${edge.weight})。节点 ${uName} 与 ${vName} 已经属于同一个分量 (代表元: ${nodeNameMap.get(rootU) || rootU})。如果加入该边，将形成回路 (成环)，因此舍弃该边！`,
        status: 'cycle',
        subsets: dsu.getMapping(vertexIds),
      });
    } else {
      // Safe to add
      dsu.union(u, v);
      mstEdgeIds.push(edge.id);
      mstEdges.push(edge);
      
      const newRoot = dsu.find(u);
      steps.push({
        stepIndex: stepIdx++,
        activeEdgeId: edge.id,
        mstEdgeIds: [...mstEdgeIds],
        explanation: `考察边 ${uName} - ${vName} (权重 ${edge.weight})。两端节点处于不同分量，加入该边安全，并归并它们的分量 (统一代表元: ${nodeNameMap.get(newRoot) || newRoot})。`,
        status: 'safe',
        subsets: dsu.getMapping(vertexIds),
      });
    }
  }

  // Check if disconnected
  let isDisconnected = false;
  if (vertices.length > 1) {
    const firstRoot = dsu.find(vertexIds[0]);
    for (let i = 1; i < vertexIds.length; i++) {
      if (dsu.find(vertexIds[i]) !== firstRoot) {
        isDisconnected = true;
        break;
      }
    }
  }

  const totalWeight = mstEdges.reduce((acc, e) => acc + e.weight, 0);

  // Final step
  steps.push({
    stepIndex: stepIdx,
    activeEdgeId: null,
    mstEdgeIds: [...mstEdgeIds],
    explanation: isDisconnected
      ? `Kruskal 算法执行完毕。由于图本身不连通，我们得到了一个最小生成森林。森林共包含 ${mstEdges.length} 条边，总权重为 ${totalWeight}。`
      : `Kruskal 算法执行完毕。我们已成功建立完整的最小生成树！树共包含 ${mstEdges.length} 条边，总权重为 ${totalWeight}。`,
    status: 'complete',
    subsets: dsu.getMapping(vertexIds),
  });

  return {
    algorithm: 'kruskal',
    totalWeight,
    mstEdges,
    steps,
    isStepListComplete: true,
    isDisconnected,
  };
}

export function solvePrim(vertices: Vertex[], edges: Edge[], startVertexId?: string): MSTSolveResult {
  const steps: PrimStep[] = [];
  const mstEdgeIds: string[] = [];
  const mstEdges: Edge[] = [];

  if (vertices.length === 0) {
    return {
      algorithm: 'prim',
      totalWeight: 0,
      mstEdges: [],
      steps: [],
      isStepListComplete: true,
      isDisconnected: false,
    };
  }

  const nodeNameMap = new Map<string, string>();
  vertices.forEach(v => nodeNameMap.set(v.id, v.name || `节点_${v.id.substring(0,4)}`));

  // Determine starting vertex
  const startId = startVertexId && vertices.some(v => v.id === startVertexId)
    ? startVertexId
    : vertices[0].id;
  const startName = nodeNameMap.get(startId) || startId;

  const visited = new Set<string>();
  visited.add(startId);

  // Step 0: Starting Prim
  steps.push({
    stepIndex: 0,
    activeEdgeId: null,
    visitedNodeIds: [startId],
    candidateEdgeIds: [],
    mstEdgeIds: [],
    explanation: `Prim 算法启动。选择起始源节点 ${startName}。以此节点为基准向外进行“蓝色涟漪”状的割边探测与扩散。`,
    status: 'examining',
  });

  let stepIdx = 1;
  let isDisconnected = false;

  while (visited.size < vertices.length) {
    // Find all candidate edges (cross-cut edges: one endpoint visited, one unvisited)
    const candidates = edges.filter(edge => {
      const sourceVisited = visited.has(edge.source);
      const targetVisited = visited.has(edge.target);
      return (sourceVisited && !targetVisited) || (!sourceVisited && targetVisited);
    });

    if (candidates.length === 0) {
      // Unreachable remaining nodes -> graph is disconnected
      isDisconnected = true;
      break;
    }

    const candidateIds = candidates.map(c => c.id);

    // Sort candidates to find the minimum
    candidates.sort((a, b) => a.weight - b.weight);
    const bestEdge = candidates[0];

    const u = bestEdge.source;
    const v = bestEdge.target;
    const nextNodeId = visited.has(u) ? v : u;
    const nextNodeName = nodeNameMap.get(nextNodeId) || nextNodeId;
    const anchorNodeId = visited.has(u) ? u : v;
    const anchorNodeName = nodeNameMap.get(anchorNodeId) || anchorNodeId;

    // Log the examination of cut
    const cutDescriptionList = candidates.slice(0, 4).map(c => {
      const sN = nodeNameMap.get(c.source) || c.source;
      const tN = nodeNameMap.get(c.target) || c.target;
      return `${sN}-${tN} (权重:${c.weight})`;
    }).join(', ');
    const extraCutCount = candidates.length > 4 ? ` 等共 ${candidates.length} 条` : '';

    steps.push({
      stepIndex: stepIdx++,
      activeEdgeId: bestEdge.id,
      visitedNodeIds: Array.from(visited),
      candidateEdgeIds: candidateIds,
      mstEdgeIds: [...mstEdgeIds],
      explanation: `当前已访问节点集为 { ${Array.from(visited).map(id => nodeNameMap.get(id)).join(', ')} }。此时图的割集（跨越已访问与未访问的候选边）包含: [ ${cutDescriptionList}${extraCutCount} ]。在所有跨越割的候选边中，边 ${anchorNodeName} - ${nextNodeName} 的权重最小 (${bestEdge.weight})。`,
      status: 'examining',
    });

    // Add node and edge
    visited.add(nextNodeId);
    mstEdgeIds.push(bestEdge.id);
    mstEdges.push(bestEdge);

    steps.push({
      stepIndex: stepIdx++,
      activeEdgeId: bestEdge.id,
      visitedNodeIds: Array.from(visited),
      candidateEdgeIds: candidateIds.filter(id => id !== bestEdge.id),
      mstEdgeIds: [...mstEdgeIds],
      explanation: `根据割边定理，选择权重最小的边 ${anchorNodeName} - ${nextNodeName} (权重 ${bestEdge.weight})。将节点 ${nextNodeName} 标为已访问，并安全锁死该边将其归并入最小生成树。`,
      status: 'expanding',
    });
  }

  const totalWeight = mstEdges.reduce((acc, e) => acc + e.weight, 0);

  steps.push({
    stepIndex: stepIdx,
    activeEdgeId: null,
    visitedNodeIds: Array.from(visited),
    candidateEdgeIds: [],
    mstEdgeIds: [...mstEdgeIds],
    explanation: isDisconnected
      ? `Prim 算法执行结束。由于图本身不连通，仅生成了当前分量的最小生成树。共访问了 ${visited.size}/${vertices.length} 个节点，包含 ${mstEdges.length} 条边，总权重为 ${totalWeight}。`
      : `Prim 算法执行结束。所有 ${vertices.length} 个节点已被成功访问覆盖。生成了一棵包含 ${mstEdges.length} 条边、总权重为 ${totalWeight} 的最小生成树。`,
    status: 'complete',
  });

  return {
    algorithm: 'prim',
    totalWeight,
    mstEdges,
    steps,
    isStepListComplete: true,
    isDisconnected,
  };
}
