import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  timestamp: number;
}

interface NotificationsProps {
  notifications: Notification[];
}

export function Notifications({ notifications }: NotificationsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="max-w-md w-full mb-4 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-black/80 text-cyan-400 px-4 py-2 rounded-lg border border-cyan-500/30 backdrop-blur-sm flex items-center gap-2 animate-slideUp"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}