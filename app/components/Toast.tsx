"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  duration?: "short" | "medium" | "long";
}

export default function Toast({ message, duration = "medium" }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const durationMap = {
    short: 2000,
    medium: 4000,
    long: 6000,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, durationMap[duration]);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-primary text-primary-foreground p-4 m-2 z-100 rounded-2xl relative"
      >
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="Close toast"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
        <div className="flex items-center justify-center">
          <p className="text-center pr-4">{message}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
