'use client';

import { useState, useEffect, useRef } from 'react';
import { setToastCallback } from '@/../lib/toast-manager';
import Toast from './Toast';

interface ToastMessage {
  id: string;
  message: string;
  duration: 'short' | 'medium' | 'long';
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idCounterRef = useRef(0);

  useEffect(() => {
    setToastCallback(({ message, duration }) => {
      const id = `toast-${idCounterRef.current++}`;

      const durationMap = {
        short: 2000,
        medium: 4000,
        long: 6000,
      };

      const safeDuration: "short" | "medium" | "long" = duration ?? "medium";

      setToasts(prev => [
        ...prev,
        {
          id,
          message,
          duration: safeDuration
        }
      ]);


      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, durationMap[safeDuration]);
    });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-100 space-y-3 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast message={toast.message} duration={toast.duration} />
        </div>
      ))}
    </div>
  );
}
