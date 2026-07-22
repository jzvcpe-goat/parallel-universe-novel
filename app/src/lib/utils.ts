// ============================================================
// Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并Tailwind类名 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
