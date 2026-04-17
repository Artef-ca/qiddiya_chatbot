'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeToast, Toast } from '@/store/slices/uiSlice';
import Notification from './Notification';

export default function NotificationContainer() {
  const dispatch = useAppDispatch();
  const { toasts } = useAppSelector((state) => state.ui);
  const [exitingNotifications, setExitingNotifications] = useState<Map<string, Toast>>(new Map());
  const exitingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Show all toast types including info (for generating notifications)
  const activeNotifications = toasts;

  // Track notifications that are exiting
  const handleDismiss = (id: string) => {
    // If already exiting, ignore
    if (exitingNotifications.has(id)) {
      return;
    }

    // Find the notification before it's removed
    const notification = activeNotifications.find((t) => t.id === id);
    
    if (notification) {
      // Store it in exiting state immediately
      setExitingNotifications((prev) => {
        const next = new Map(prev);
        next.set(id, notification);
        return next;
      });

      // Remove from Redux immediately (but keep in exiting state for animation)
      dispatch(removeToast(id));

      // Remove from exiting state after animation completes
      const timeout = setTimeout(() => {
        setExitingNotifications((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        exitingTimeoutsRef.current.delete(id);
      }, 300); // Match animation duration
      
      exitingTimeoutsRef.current.set(id, timeout);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      exitingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      exitingTimeoutsRef.current.clear();
    };
  }, []);

  // Don't remove from exiting if it appears back in active - let it stay in both
  // This prevents flickering if a notification is re-added

  // Combine active and exiting notifications
  // Prioritize exiting notifications to prevent flicker
  const allNotifications = [
    ...Array.from(exitingNotifications.values()),
    ...activeNotifications.filter(
      (n) => !exitingNotifications.has(n.id)
    ),
  ];

  return (
    <>
      {allNotifications.map((toast) => (
        <Notification
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => handleDismiss(toast.id)}
          duration={toast.duration}
        />
      ))}
    </>
  );
}

