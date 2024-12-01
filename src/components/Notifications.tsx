import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationsProps {
  notifications: Notification[];
  maxNotifications?: number;
}

const VARIANTS = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.95 }
};

const NOTIFICATION_COLORS = {
  info: 'text-cyan-400 border-cyan-500/30',
  success: 'text-green-400 border-green-500/30',
  warning: 'text-yellow-400 border-yellow-500/30',
  error: 'text-red-400 border-red-500/30'
} as const;

const NotificationItem = memo<{ notification: Notification }>(({ notification }) => {
  const colorClasses = NOTIFICATION_COLORS[notification.type || 'info'];

  return (
    <motion.div
      layout
      variants={VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`bg-black/80 px-4 py-2 rounded-lg border backdrop-blur-sm 
        flex items-center gap-2 ${colorClasses}`}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="font-medium text-sm">{notification.message}</p>
    </motion.div>
  );
});

export const Notifications = memo<NotificationsProps>(({ 
  notifications,
  maxNotifications = 5
}) => {
  const visibleNotifications = notifications
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxNotifications);

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none p-4 z-50">
      <div className="max-w-md w-full space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});