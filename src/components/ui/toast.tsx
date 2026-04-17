'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeToast } from '@/store/slices/uiSlice';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

export default function ToastContainer() {
  const dispatch = useAppDispatch();
  const { toasts } = useAppSelector((state) => state.ui);

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => dispatch(removeToast(toast.id))}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
  };
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
  };

  const Icon = icons[toast.type];

  const styles = {
    success: {
      bg: cssVar(CSS_VARS.success),
      border: cssVar(CSS_VARS.success),
      text: cssVar(CSS_VARS.textInverse),
    },
    error: {
      bg: cssVar(CSS_VARS.error),
      border: cssVar(CSS_VARS.error),
      text: cssVar(CSS_VARS.textInverse),
    },
    info: {
      bg: cssVar(CSS_VARS.info),
      border: cssVar(CSS_VARS.info),
      text: cssVar(CSS_VARS.textInverse),
    },
  };

  const style = styles[toast.type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'min-w-[300px] max-w-[500px] animate-in slide-in-from-right'
      )}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 rounded p-1 hover:bg-black/20 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

