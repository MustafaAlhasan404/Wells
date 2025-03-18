import { toast } from "sonner";
import React from 'react';

// Store the toast queue and processing state
const toastQueue: { type: string; message: string; description?: string; icon?: React.ReactNode; }[] = [];
let isProcessingToast = false;

/**
 * Show a toast notification with queueing to prevent animation glitches
 * @param type The type of toast: 'success', 'error', 'info', etc.
 * @param message The main message to display
 * @param options Optional configuration including description and icon
 */
export const showToast = (type: string, message: string, options?: { description?: string; icon?: React.ReactNode }) => {
  // Add to queue
  toastQueue.push({
    type,
    message,
    description: options?.description,
    icon: options?.icon,
  });
  
  // Start processing if not already
  if (!isProcessingToast) {
    processToastQueue();
  }
};

/**
 * Internal function to process the toast queue with delays
 */
const processToastQueue = () => {
  if (toastQueue.length === 0) {
    isProcessingToast = false;
    return;
  }
  
  isProcessingToast = true;
  const { type, message, description, icon } = toastQueue.shift()!;
  
  // Show the toast based on type
  switch (type) {
    case 'error':
      toast.error(message, { description, icon });
      break;
    case 'success':
      toast.success(message, { description, icon });
      break;
    case 'info':
      toast.info(message, { description, icon });
      break;
    case 'warning':
      toast.warning(message, { description, icon });
      break;
    default:
      toast(message, { description, icon });
  }
  
  // Process next toast after delay
  setTimeout(() => {
    processToastQueue();
  }, 300); // 300ms delay between toasts
}; 