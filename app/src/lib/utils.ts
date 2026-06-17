// ============================================================
// Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并Tailwind类名 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 偏离度颜色计算 */
export function getDeviationColor(score: number): {
  text: string
  bg: string
  border: string
  glow: string
} {
  if (score <= 30) {
    return {
      text: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      glow: 'shadow-teal-500/20',
    }
  }
  if (score <= 70) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/20',
    }
  }
  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/20',
  }
}

/** 格式化数字 */
export function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

/** 格式化日期 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** 格式化相对时间 */
export function formatRelative(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return formatDate(date)
}
