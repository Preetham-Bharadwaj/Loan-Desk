import React, { useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useDeleteNotification, useMarkNotificationRead, useNotifications } from '../../hooks/useLoans';
import { Badge, Card, LoadingPage, Button } from '../../components/ui/Primitives';
import { Bell, BellOff, Check, Trash2 } from 'lucide-react';

const CustomerNotifications = () => {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    if (filter === 'Unread') return notifications.filter((n) => !n.read);
    if (filter === 'Read') return notifications.filter((n) => n.read);
    return notifications;
  }, [filter, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    notifications.filter((n) => !n.read).forEach((n) => markReadMutation.mutate(n.id));
  };

  if (isLoading) return <LoadingPage message="Loading notifications..." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <Bell className="w-6 h-6 mr-2 text-slate-700" /> Notifications
          </h1>
          <p className="text-sm text-slate-500">Live updates from your loan workflow.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {['All', 'Unread', 'Read'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs font-semibold">
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{notifications.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Unread</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{unreadCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Read</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{notifications.length - unreadCount}</div>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-md mx-auto space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <BellOff className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Inbox is empty</h3>
            <p className="text-xs text-slate-500">No notifications match the current filter.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border rounded-xl shadow-sm flex items-start space-x-3 transition-colors ${
                notif.read ? 'bg-white border-slate-200' : 'bg-blue-50/20 border-blue-100 ring-1 ring-blue-50'
              }`}
            >
              <div className="mt-1">
                {notif.read ? <Check className="w-5 h-5 text-slate-400" /> : <Bell className="w-5 h-5 text-blue-600" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className={`text-sm ${notif.read ? 'text-slate-800 font-semibold' : 'text-slate-950 font-bold'}`}>
                      {notif.title}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                      {notif.applicationId && (
                        <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                          Application: {notif.applicationId}
                        </span>
                      )}
                      <Badge status={notif.read ? 'Read' : 'Unread'} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(notif.timestamp || notif.createdAt || Date.now()).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">{notif.message}</p>
              </div>

              <div className="flex items-center gap-1">
                {!notif.read && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(notif.id)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerNotifications;
