/**
 * Utility functions index
 * Re-export all utilities for convenient importing
 */

// Main cn utility (class name merger) - shadcn/ui pattern
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export all utility modules
export * from './date';
export * from './css';
export * from './id';
export * from './constants';
export * from './extractTitle';
export * from './theme';
