import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Layers, 
  Zap, 
  Cpu, 
  CheckCircle2, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Plus,
  Minus,
  Move,
  Database,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sliders
} from 'lucide-react';
import { CanvasNode, CanvasWire } from '../../types';

interface NodeGraphCanvasProps {
  nodes?: CanvasNode[];
  wires?: CanvasWire[];
  initialNodes?: CanvasNode[];
  initialWires?: CanvasWire[];
  title?: string;
  subtitle?: string;
  isInteractiveTestEnabled?: boolean;
  onRunTest?: () => Promise<void> | void;
  className?: string;
  mode?: 'analytics' | 'routing';
  readOnly?: boolean;
}

export const NodeGraphCanvas: React.FC<NodeGraphCanvasProps> = ({
  nodes: propNodes,
  wires: propWires,
  initialNodes,
  initialWires,
  title = "Zero-Shot Dynamic Node Topology",
  subtitle = "Interactive flat 2D schematic with live signal propagation & port telemetry",
  isInteractiveTestEnabled = true,
  onRunTest,
  className = "",
  mode = "analytics"
}) => {
  const resolvedInitialNodes = propNodes || initialNodes || [];
  const resolvedInitialWires = propWires || initialWires || [];

  const [nodes, setNodes] = useState<CanvasNode[]>(resolvedInitialNodes);
  const [wires, setWires] = useState<CanvasWire[]>(resolvedInitialWires);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  
  // Interactive Zoom and Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propNodes || initialNodes) {
      setNodes(propNodes || initialNodes || []);
    }
  }, [propNodes, initialNodes]);

  useEffect(() => {
    if (propWires || initialWires) {
      setWires(propWires || initialWires || []);
    }
  }, [propWires, initialWires]);

  // Zoom helpers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2.2, +(prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.45, +(prev - 0.15).toFixed(2)));
  };

  const handleResetView = () => {
    setZoomLevel(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitView = () => {
    setZoomLevel(0.85);
    setPan({ x: 20, y: 10 });
  };

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoomLevel(prev => Math.min(2.2, Math.max(0.45, +(prev + zoomDelta).toFixed(2))));
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan if clicking canvas background (not on a node)
    if ((e.target as HTMLElement).closest('.canvas-node-card')) {
      return;
    }
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Execute pipeline test sequence
  const handleExecutePipelineTest = async () => {
    if (isSimulating || !nodes.length) return;
    setIsSimulating(true);
    setActiveStepIndex(0);

    // Reset all nodes to idle
    setNodes(prev => (prev || []).map(n => ({ ...n, status: 'idle' })));
    setWires(prev => (prev || []).map(w => ({ ...w, active: false })));

    // Sequential stage execution
    for (let i = 0; i < (nodes || []).length; i++) {
      setActiveStepIndex(i);
      
      // Activate current node
      setNodes(prev => (prev || []).map((n, idx) => {
        if (idx === i) return { ...n, status: 'active' };
        if (idx < i) return { ...n, status: 'passed' };
        return { ...n, status: 'idle' };
      }));

      // Activate connected wires
      const currentNodeId = nodes[i].id;
      setWires(prev => (prev || []).map(w => ({
        ...w,
        active: w.fromNodeId === currentNodeId || (w.toNodeId === currentNodeId && i > 0)
      })));

      await new Promise(r => setTimeout(r, 450));
    }

    // Finalize all as passed
    setNodes(prev => (prev || []).map(n => ({ ...n, status: 'passed' })));
    setWires(prev => (prev || []).map(w => ({ ...w, active: true })));
    setActiveStepIndex(-1);
    setIsSimulating(false);

    if (onRunTest) {
      await onRunTest();
    }
  };

  // Helper to calculate port coordinates for SVG Bézier curve
  const getPortCoordinates = (nodeId: string, portId: string, isOutput: boolean) => {
    const node = (nodes || []).find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const width = node.width || 210;
    const ports = (isOutput ? node.outputs : node.inputs) || [];
    const portIndex = ports.findIndex(p => p.id === portId);
    const validIndex = portIndex >= 0 ? portIndex : 0;

    const x = isOutput ? node.x + width : node.x;
    const headerHeight = 36;
    const portSpacing = 24;
    const y = node.y + headerHeight + (validIndex + 1) * portSpacing;

    return { x, y };
  };

  // Generate SVG path for smooth S-curve cable
  const createWirePath = (wire: CanvasWire) => {
    const start = getPortCoordinates(wire.fromNodeId, wire.fromPortId, true);
    const end = getPortCoordinates(wire.toNodeId, wire.toPortId, false);

    const dx = Math.max(40, Math.abs(end.x - start.x) * 0.45);
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  };

  return (
    <div className={`bg-[#14120c] border border-[#2E1F10] rounded-2xl overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Top Toolbar */}
      <div className="bg-[#1a1710] px-5 py-3.5 border-b border-[#2E1F10] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2E1F10] border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#2E1F10] text-[#FF5500] border border-[#FF5500]/30 font-semibold">
                Flat 2D Node Schematic
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Controls & Zoom Toolbar */}
        <div className="flex items-center gap-2">
          {/* Zoom and Pan Controls */}
          <div className="flex items-center bg-[#12100c] border border-[#2E1F10] rounded-xl p-0.5 text-xs text-stone-300">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-[#2E1F10] hover:text-[#FF5500] rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-white min-w-[48px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-[#2E1F10] hover:text-[#FF5500] rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-[#2E1F10] mx-0.5" />
            <button
              onClick={handleResetView}
              className="px-2 py-1 hover:bg-[#2E1F10] hover:text-[#FF5500] rounded-lg transition-colors cursor-pointer font-mono text-[10px]"
              title="Reset Zoom to 100%"
            >
              100%
            </button>
            <button
              onClick={handleFitView}
              className="p-1.5 hover:bg-[#2E1F10] hover:text-[#FF5500] rounded-lg transition-colors cursor-pointer"
              title="Fit View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {isInteractiveTestEnabled && (
            <button
              onClick={handleExecutePipelineTest}
              disabled={isSimulating}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isSimulating
                  ? 'bg-amber-600 text-white animate-pulse opacity-90'
                  : 'bg-[#FF5500] hover:bg-[#ff7733] text-black shadow-[#FF5500]/20'
              }`}
            >
              {isSimulating ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Node Pipeline</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Flat 2D Node Graph Canvas Stage with Zoom & Pan */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[520px] overflow-hidden node-grid-bg bg-[#12100c] select-none p-6 ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Navigation Hint Pill */}
        <div className="absolute top-3 left-4 z-30 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#2E1F10] text-[10px] font-mono text-stone-400">
          Scroll to Zoom • Drag to Pan ({Math.round(zoomLevel * 100)}%)
        </div>

        {/* Transform Layer for Zoom & Pan */}
        <div 
          className="relative min-w-[960px] min-h-[480px] origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0'
          }}
        >
          {/* SVG Wires Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 min-w-[1200px] min-h-[600px]">
            <defs>
              <linearGradient id="wireGradActive" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF5500" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>

            {(wires || []).map((wire) => {
              const path = createWirePath(wire);
              const isActive = wire.active || isSimulating;
              const strokeColor = isActive ? (wire.color || '#FF5500') : '#3f2d18';

              return (
                <g key={wire.id}>
                  {/* Background shadow wire */}
                  <path
                    d={path}
                    fill="none"
                    stroke="#0a0906"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                  {/* Main connection cable */}
                  <path
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    strokeLinecap="round"
                    className={isActive ? 'wire-pulse' : ''}
                    filter={isActive ? 'url(#glow)' : undefined}
                    opacity={isActive ? 1 : 0.65}
                  />
                  {/* Flow label pill */}
                  {wire.flowValue && (
                    <text
                      x="50%"
                      y="50%"
                      fill="#999"
                      fontSize="9"
                      className="font-mono"
                    >
                      {wire.flowValue}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Node Entities Layer (Flat 2D) */}
          <div className="relative z-20">
            {(nodes || []).map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isActive = node.status === 'active';
              const isPassed = node.status === 'passed';
              const width = node.width || 210;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  className={`canvas-node-card absolute rounded-xl border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-[#FF5500] shadow-[0_0_25px_rgba(255,85,0,0.35)] ring-2 ring-[#FF5500]/40'
                      : isPassed
                      ? 'border-emerald-500/70 shadow-lg'
                      : isSelected
                      ? 'border-cyan-400 shadow-lg ring-1 ring-cyan-400/30'
                      : 'border-[#2E1F10] hover:border-stone-500 shadow-md'
                  } bg-[#18150f]`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${width}px`,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.45)'
                  }}
                >
                  {/* Node Header */}
                  <div 
                    className="px-3 py-2 rounded-t-xl border-b border-[#2E1F10] flex items-center justify-between gap-2"
                    style={{ backgroundColor: node.headerColor || '#221a10' }}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full" style={{
                        backgroundColor: isActive ? '#FF5500' : isPassed ? '#10B981' : '#78716c'
                      }}></span>
                      <span className="text-xs font-bold text-white tracking-tight truncate">
                        {node.title}
                      </span>
                    </div>

                    {/* Latency / Status Badge */}
                    <div className="flex items-center gap-1">
                      {node.executionTimeMs !== undefined && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isActive 
                            ? 'bg-[#FF5500] text-black animate-pulse' 
                            : isPassed 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' 
                            : 'bg-black/40 text-stone-400'
                        }`}>
                          {node.executionTimeMs}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Node Body with Ports */}
                  <div className="p-3 space-y-3">
                    {/* Inputs & Outputs Grid */}
                    <div className="flex justify-between items-start text-[11px] gap-2">
                      {/* Input Pins */}
                      <div className="space-y-2">
                        {(node.inputs || []).map((port) => (
                          <div key={port.id} className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full border border-black/80 shadow-inner flex-shrink-0 -ml-4.5"
                              style={{ 
                                backgroundColor: port.color || '#FF5500',
                                boxShadow: isActive ? '0 0 8px #FF5500' : 'none'
                              }}
                              title={`Input: ${port.label} (${port.dataType})`}
                            />
                            <span className="text-stone-300 font-mono text-[10px]">{port.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Output Pins */}
                      <div className="space-y-2 text-right">
                        {(node.outputs || []).map((port) => (
                          <div key={port.id} className="flex items-center justify-end gap-2">
                            <span className="text-stone-300 font-mono text-[10px]">{port.label}</span>
                            <span 
                              className="w-3 h-3 rounded-full border border-black/80 shadow-inner flex-shrink-0 -mr-4.5"
                              style={{ 
                                backgroundColor: port.color || '#10B981',
                                boxShadow: isActive ? '0 0 8px #10B981' : 'none'
                              }}
                              title={`Output: ${port.label} (${port.dataType})`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Node Data Insights Footer */}
                    {node.data && (
                      <div className="pt-2 border-t border-[#2E1F10]/70 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        {node.data.metric && <span>{node.data.metric}</span>}
                        {node.data.tag && (
                          <span className="px-1.5 py-0.2 bg-[#2E1F10] text-[#FF5500] rounded font-semibold">
                            {node.data.tag}
                          </span>
                        )}
                        {node.data.tier && (
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            node.data.tier === 'Free' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'bg-purple-950 text-purple-300'
                          }`}>
                            {node.data.tier}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="bg-[#18150f] border-t border-[#2E1F10] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#2E1F10] text-[#FF5500] flex items-center justify-center font-mono font-bold text-xs">
              #
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">{selectedNode.title}</h4>
                <span className="text-[10px] text-stone-400 font-mono">ID: {selectedNode.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2E1F10] text-emerald-400 font-semibold font-mono">
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Inputs: {(selectedNode.inputs || []).map(i => i.label).join(', ') || 'None'} • Outputs: {(selectedNode.outputs || []).map(o => o.label).join(', ') || 'None'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1.5 bg-[#221a10] hover:bg-[#2e2315] text-stone-300 rounded-lg text-xs font-semibold border border-[#2E1F10] cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
