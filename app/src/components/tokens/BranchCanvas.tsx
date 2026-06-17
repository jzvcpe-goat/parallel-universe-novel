// ============================================================
// BranchCanvas - 平行分支可视化画布
// ============================================================
// 平行宇宙主题的核心可视化组件
// 显示节点间的IF分支关系，支持拖拽和缩放

import { useRef, useState } from 'react'
import type { MouseEvent, WheelEvent } from 'react'
import { cn } from '@/lib/utils'
import type { StudioNode, NodeConnection } from '@/types'

interface BranchCanvasProps {
  nodes: StudioNode[]
  connections: NodeConnection[]
  onNodeClick?: (nodeId: string) => void
  className?: string
}

const NODE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  root: { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.3)', dot: '#14b8a6' },
  branch: { bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.25)', dot: '#60a5fa' },
  end: { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)', dot: '#8b5cf6' },
}

export function BranchCanvas({ nodes, connections, onNodeClick, className }: BranchCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.max(0.5, Math.min(2, s + delta)))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }

  const handleMouseUp = () => { isDragging.current = false }

  // SVG connections
  const renderConnections = () => {
    return connections.map((conn, i) => {
      const from = nodes.find(n => n.id === conn.from)
      const to = nodes.find(n => n.id === conn.to)
      if (!from || !to) return null
      const fx = from.x * scale + offset.x
      const fy = from.y * scale + offset.y
      const tx = to.x * scale + offset.x
      const ty = to.y * scale + offset.y
      const mx = (fx + tx) / 2
      return (
        <path
          key={i}
          d={`M ${fx + 128} ${fy + 40} Q ${mx} ${fy + 40} ${tx + 128} ${ty + 40}`}
          fill="none"
          stroke="rgba(96, 165, 250, 0.3)"
          strokeWidth={2}
          className="pointer-events-none"
        />
      )
    })
  }

  return (
    <div
      ref={canvasRef}
      className={cn('relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none', className)}
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
        backgroundSize: '30px 30px',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG layer for connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {renderConnections()}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const colors = NODE_COLORS[node.type] || NODE_COLORS.branch
        const x = node.x * scale + offset.x
        const y = node.y * scale + offset.y
        return (
          <div
            key={node.id}
            data-node
            className="absolute w-64 p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
            style={{
              left: x,
              top: y,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            onClick={() => onNodeClick?.(node.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: colors.dot }} />
              <span className="text-[10px] text-slate-500 uppercase">{node.type === 'root' ? '起点' : node.type === 'branch' ? 'IF分支' : '终点'}</span>
              {node.status === 'active' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-200">{node.title}</h4>
            <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{node.description}</p>
          </div>
        )
      })}

      {/* Zoom controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-10">
        <button
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-110 transition-all"
          onClick={() => setScale(s => Math.min(2, s + 0.2))}
        >
          +
        </button>
        <button
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-110 transition-all"
          onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
        >
          -
        </button>
      </div>
    </div>
  )
}
