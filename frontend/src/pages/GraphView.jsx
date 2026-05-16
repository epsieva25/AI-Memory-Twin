import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import { Share2, ZoomIn, ZoomOut, Maximize, RefreshCw, Info } from 'lucide-react';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { graphService } from '../services/index';

/* ─── Fallback rich mock data ────────────────────────────────────────────── */
const FALLBACK_GRAPH = {
  nodes: [
    { id: 'Student', group: 1, val: 22, name: 'You (Student)' },
    { id: 'AI',      group: 2, val: 16, name: 'Artificial Intelligence' },
    { id: 'OS',      group: 2, val: 16, name: 'Operating Systems' },
    { id: 'DB',      group: 2, val: 16, name: 'Database Systems' },
    { id: 'NET',     group: 2, val: 16, name: 'Computer Networks' },
    { id: 'MATH',    group: 2, val: 16, name: 'Mathematics' },
    { id: 'NeuralNet',  group: 3, val: 10, name: 'Neural Networks (Weak)' },
    { id: 'ML',         group: 3, val: 10, name: 'Machine Learning' },
    { id: 'MemMgmt',    group: 3, val: 10, name: 'Memory Management' },
    { id: 'SQL',        group: 3, val: 10, name: 'SQL Queries' },
    { id: 'Normalize',  group: 3, val: 10, name: 'Normalization (Weak)' },
    { id: 'TCPIP',      group: 3, val: 10, name: 'TCP/IP (Weak)' },
    { id: 'Stress',     group: 4, val: 13, name: '⚠️ High Stress' },
    { id: 'Productive', group: 4, val: 13, name: '✅ Productivity' },
    { id: 'Burnout',    group: 4, val: 11, name: '🔥 Burnout Risk' },
  ],
  links: [
    { source: 'Student', target: 'AI',      value: 3 },
    { source: 'Student', target: 'OS',      value: 3 },
    { source: 'Student', target: 'DB',      value: 3 },
    { source: 'Student', target: 'NET',     value: 3 },
    { source: 'Student', target: 'MATH',    value: 3 },
    { source: 'AI',      target: 'NeuralNet', value: 2 },
    { source: 'AI',      target: 'ML',        value: 2 },
    { source: 'OS',      target: 'MemMgmt',   value: 2 },
    { source: 'DB',      target: 'SQL',        value: 2 },
    { source: 'DB',      target: 'Normalize',  value: 2 },
    { source: 'NET',     target: 'TCPIP',      value: 2 },
    { source: 'Student', target: 'Stress',     value: 2 },
    { source: 'Student', target: 'Productive', value: 2 },
    { source: 'Stress',  target: 'NeuralNet',  value: 1 },
    { source: 'Stress',  target: 'Normalize',  value: 1 },
    { source: 'Stress',  target: 'TCPIP',      value: 1 },
    { source: 'Stress',  target: 'Burnout',    value: 1 },
  ]
};

/* ─── Node color scheme by group ────────────────────────────────────────── */
const getNodeColor = (node) => {
  if (node.group === 1) return '#3b82f6';  // blue — student
  if (node.group === 2) return '#a855f7';  // purple — subjects
  if (node.group === 3) return node.name.toLowerCase().includes('weak') ? '#ef4444' : '#10b981';
  if (node.group === 4) return node.id === 'Burnout' ? '#ef4444' : node.id === 'Stress' ? '#f59e0b' : '#06b6d4';
  return '#94a3b8';
};

const paintNode = (node, ctx, globalScale) => {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
  const label = node.name?.length > 20 ? node.name.slice(0, 18) + '…' : (node.name || 'Unknown');
  const fontSize = Math.max(10, 14 / globalScale);
  
  // ensure valid values before math
  const validVal = Number.isFinite(node.val) ? node.val : 10;
  const r = Math.sqrt(validVal) * 3;
  const color = getNodeColor(node);

  // Glow for student node
  if (node.group === 1) {
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2.5);
    gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
    gradient.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = gradient;
    ctx.arc(node.x, node.y, r * 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Node circle
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color + '33'; // semi-transparent fill
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = node.group === 1 ? 2.5 : 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(node.x, node.y, r * 0.4, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  // Label
  if (globalScale > 0.6) {
    ctx.font = `${node.group === 1 ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(226,232,240,0.95)';
    ctx.fillText(label, node.x, node.y + r + fontSize * 0.9);
  }
};

const LEGEND = [
  { label: 'You (Student)', color: '#3b82f6' },
  { label: 'Subjects', color: '#a855f7' },
  { label: 'Strong Concepts', color: '#10b981' },
  { label: 'Weak Concepts', color: '#ef4444' },
  { label: 'Metrics', color: '#f59e0b' },
];

const GraphView = () => {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState(FALLBACK_GRAPH);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /* Responsive sizing */
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    update();
    return () => obs.disconnect();
  }, []);

  /* Fetch live graph from backend */
  const fetchGraph = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await graphService.getStudentMap();
      
      const safeGraphData = {
        nodes: (data.nodes || []).map(node => ({
          ...node,
          val: Number.isFinite(node.val) ? node.val : 10,
          group: Number.isFinite(node.group) ? node.group : 1,
          name: node.name || 'Unknown',
          id: node.id || `node-${Math.random()}`
        })),
        links: (data.links || []).filter(
          link => link.source && link.target
        )
      };

      if (safeGraphData.nodes.length > 0) {
        setGraphData(safeGraphData);
      } else {
        setGraphData({ nodes: [], links: [] });
      }
    } catch {
      // Keep fallback if error
      setGraphData(FALLBACK_GRAPH);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  /* Controls */
  const zoomIn  = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 300);
  const zoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 300);
  const fit     = () => fgRef.current?.zoomToFit(400, 60);

  if (loading) return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="flex-1 w-full" rounded="rounded-2xl" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-8rem)] flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Knowledge Graph</h1>
          <p className="text-slate-400 text-sm">
            Neo4j-powered relationship map between subjects, concepts, and performance.
          </p>
        </div>
        <Button variant="secondary" size="sm" isLoading={refreshing}
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => fetchGraph(true)}>
          Refresh Graph
        </Button>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 glass rounded-2xl border border-white/10 relative overflow-hidden">

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-black/50 backdrop-blur-md p-2 rounded-xl border border-white/10">
          {[
            { icon: ZoomIn, action: zoomIn, label: 'Zoom in' },
            { icon: ZoomOut, action: zoomOut, label: 'Zoom out' },
            { icon: Maximize, action: fit, label: 'Fit view' },
          ].map(({ icon: Icon, action, label }) => (
            <button key={label} onClick={action} title={label}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Node tooltip */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 pointer-events-none">
            <p className="text-sm font-semibold text-slate-200">{hoveredNode.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {['You', 'Subject', 'Concept', 'Metric'][hoveredNode.group - 1]}
            </p>
          </div>
        )}

        {/* Stats bar */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-xs">
          <div className="text-slate-400">Nodes: <span className="text-slate-200 font-semibold">{graphData.nodes.length}</span></div>
          <div className="text-slate-400">Links: <span className="text-slate-200 font-semibold">{graphData.links.length}</span></div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 pointer-events-none space-y-1.5">
          <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
            <Share2 className="w-3 h-3" /> Legend
          </p>
          {LEGEND.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Force Graph */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing">
          {graphData.nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Share2}
                title="No Graph Data Available" 
                description="We couldn't find any academic or relationship data to visualize. Generate some data or wait for Neo4j sync." 
                action={<Button onClick={() => fetchGraph(true)}>Try Again</Button>} 
              />
            </div>
          ) : dimensions.width > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel={node => `${node.name || 'Unknown'}`}
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              linkColor={() => 'rgba(148,163,184,0.18)'}
              linkWidth={link => (Number.isFinite(link.value) ? link.value : 1) * 0.8}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleColor={() => 'rgba(168,85,247,0.6)'}
              linkDirectionalParticleSpeed={0.004}
              backgroundColor="transparent"
              onNodeHover={setHoveredNode}
              onEngineStop={() => fgRef.current?.zoomToFit(500, 60)}
              cooldownTicks={120}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GraphView;
