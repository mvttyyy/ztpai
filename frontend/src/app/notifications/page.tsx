'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Bell, 
  MessageSquare, 
  Star, 
  Download, 
  CheckCircle, 
  Info,
  Check,
  Trash2,
  Square,
  CheckSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'NEW_COMMENT' | 'NEW_RATING' | 'NEW_DOWNLOAD' | 'LOOP_PROCESSED' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  data?: {
    loopId?: string;
    loopSlug?: string;
    commentId?: string;
  };
  createdAt: string;
}

const notificationIcons = {
  NEW_COMMENT: MessageSquare,
  NEW_RATING: Star,
  NEW_DOWNLOAD: Download,
  LOOP_PROCESSED: CheckCircle,
  SYSTEM: Info,
};

const notificationColors = {
  NEW_COMMENT: 'text-blue-500',
  NEW_RATING: 'text-yellow-500',
  NEW_DOWNLOAD: 'text-green-500',
  LOOP_PROCESSED: 'text-purple-500',
  SYSTEM: 'text-gray-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll({ limit: 50 });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.meta?.unreadCount || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map(id => 
        notificationsApi.delete(id)
      );
      await Promise.all(deletePromises);
      
      const deletedUnreadCount = notifications.filter(
        n => selectedIds.has(n.id) && !n.isRead
      ).length;
      
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to delete selected notifications:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.data?.loopSlug) {
      return `/loops/${notification.data.loopSlug}`;
    }
    if (notification.data?.loopId) {
      return `/loops/${notification.data.loopId}`;
    }
    return null;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={loadNotifications}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-2">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete selected ({selectedIds.size})
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Select All */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-muted-foreground"
          >
            {selectedIds.size === notifications.length ? (
              <CheckSquare className="h-4 w-4 mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            {selectedIds.size === notifications.length ? 'Deselect all' : 'Select all'}
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
          <p className="text-muted-foreground">
            When you receive comments, ratings, or downloads, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Info;
            const iconColor = notificationColors[notification.type] || 'text-gray-500';
            const link = getNotificationLink(notification);
            const isSelected = selectedIds.has(notification.id);

            const content = (
              <div 
                className={`
                  flex items-start gap-4 p-4 rounded-lg border transition-colors
                  ${notification.isRead ? 'bg-card' : 'bg-primary/5 border-primary/20'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}
                  ${link ? 'hover:bg-accent cursor-pointer' : ''}
                `}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleSelect(notification.id);
                  }}
                  className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <div className={`flex-shrink-0 mt-1 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-medium ${notification.isRead ? '' : 'text-primary'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </div>
            );

            return link ? (
              <Link key={notification.id} href={link} onClick={() => handleMarkAsRead(notification.id)}>
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
