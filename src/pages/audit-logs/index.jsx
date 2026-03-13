import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';

const AuditLogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    document.title = 'Audit Logs - Activity Planner';
    loadDemoLogs();
  }, []);

  const loadDemoLogs = () => {
    const demoLogs = [
      {
        id: 'log-1',
        timestamp: '2026-01-29T14:32:15',
        user_name: 'Sarah Johnson',
        user_role: 'Activity Coordinator',
        action: 'create',
        module: 'activities',
        description: 'Created new activity "Morning Yoga & Mindfulness"',
        details: {
          activity_name: 'Morning Yoga & Mindfulness',
          category: 'Physical Wellness',
          schedule: 'Monday, Wednesday, Friday at 9:00 AM'
        },
        ip_address: '192.168.1.105',
        device: 'Windows 11 / Chrome'
      },
      {
        id: 'log-2',
        timestamp: '2026-01-29T13:45:22',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'approve',
        module: 'expenses',
        description: 'Approved expense "Yoga mats (set of 10)" - £89.99',
        details: {
          expense_id: 'exp-1',
          amount: 89.99,
          vendor: 'Sports Direct',
          submitted_by: 'Sarah Johnson'
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
      {
        id: 'log-3',
        timestamp: '2026-01-29T12:18:44',
        user_name: 'Emily Chen',
        user_role: 'Activity Coordinator',
        action: 'update',
        module: 'sessions',
        description: 'Updated session attendance for "Watercolor Landscapes Workshop"',
        details: {
          session_id: 'sess-5',
          attendees_added: ['Margaret Thompson', 'Harold Mitchell'],
          total_attendees: 8
        },
        ip_address: '192.168.1.112',
        device: 'iPad / Safari'
      },
      {
        id: 'log-4',
        timestamp: '2026-01-29T11:05:33',
        user_name: 'Patricia Adams',
        user_role: 'Staff',
        action: 'create',
        module: 'enrollments',
        description: 'Enrolled resident "Dorothy Williams" in "Therapeutic Garden Walks"',
        details: {
          resident_name: 'Dorothy Williams',
          activity_name: 'Therapeutic Garden Walks',
          start_date: '2026-01-30'
        },
        ip_address: '192.168.1.108',
        device: 'Android / Chrome'
      },
      {
        id: 'log-5',
        timestamp: '2026-01-29T10:22:11',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'delete',
        module: 'activities',
        description: 'Deleted activity "Cancelled Event" (no enrollments)',
        details: {
          activity_name: 'Cancelled Event',
          reason: 'Event cancelled due to low interest'
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
      {
        id: 'log-6',
        timestamp: '2026-01-29T09:15:08',
        user_name: 'Sarah Johnson',
        user_role: 'Activity Coordinator',
        action: 'login',
        module: 'authentication',
        description: 'User logged in successfully',
        details: {
          login_method: 'Email/Password',
          session_duration: '8 hours'
        },
        ip_address: '192.168.1.105',
        device: 'Windows 11 / Chrome'
      },
      {
        id: 'log-7',
        timestamp: '2026-01-28T16:45:55',
        user_name: 'Michael Roberts',
        user_role: 'Activity Coordinator',
        action: 'create',
        module: 'expenses',
        description: 'Submitted expense "Popcorn, drinks and snacks" - £18.50',
        details: {
          expense_category: 'Refreshments',
          activity: 'Classic Movie Matinee',
          payment_method: 'Cash'
        },
        ip_address: '192.168.1.115',
        device: 'MacOS / Safari'
      },
      {
        id: 'log-8',
        timestamp: '2026-01-28T15:30:20',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'update',
        module: 'residents',
        description: 'Updated resident profile for "Harold Mitchell"',
        details: {
          fields_updated: ['Medical Notes', 'Emergency Contact'],
          updated_by: 'Admin User'
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
      {
        id: 'log-9',
        timestamp: '2026-01-28T14:12:37',
        user_name: 'Emily Chen',
        user_role: 'Activity Coordinator',
        action: 'complete',
        module: 'sessions',
        description: 'Marked session "Afternoon Tea & Stories" as completed',
        details: {
          session_date: '2026-01-28',
          attendees: 12,
          duration: '90 minutes',
          notes: 'Residents enjoyed the storytelling session'
        },
        ip_address: '192.168.1.112',
        device: 'iPad / Safari'
      },
      {
        id: 'log-10',
        timestamp: '2026-01-28T11:08:49',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'reject',
        module: 'expenses',
        description: 'Rejected expense "Portable Bluetooth speaker" - £49.99',
        details: {
          reason: 'Already have sufficient speakers',
          submitted_by: 'Sarah Johnson'
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
      {
        id: 'log-11',
        timestamp: '2026-01-28T09:55:12',
        user_name: 'Linda Thompson',
        user_role: 'Staff',
        action: 'view',
        module: 'reports',
        description: 'Viewed monthly activity participation report',
        details: {
          report_type: 'Activity Participation',
          date_range: 'January 2026'
        },
        ip_address: '192.168.1.120',
        device: 'Windows 10 / Firefox'
      },
      {
        id: 'log-12',
        timestamp: '2026-01-27T17:22:33',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'create',
        module: 'users',
        description: 'Created new user account for "David Wilson"',
        details: {
          user_email: 'd.wilson@careHome.com',
          role: 'Activity Coordinator',
          permissions: ['activities', 'sessions', 'enrollments']
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
      {
        id: 'log-13',
        timestamp: '2026-01-27T15:40:18',
        user_name: 'Sarah Johnson',
        user_role: 'Activity Coordinator',
        action: 'export',
        module: 'reports',
        description: 'Exported resident activity history to PDF',
        details: {
          residents_included: 15,
          date_range: 'Last 30 days',
          file_format: 'PDF'
        },
        ip_address: '192.168.1.105',
        device: 'Windows 11 / Chrome'
      },
      {
        id: 'log-14',
        timestamp: '2026-01-27T14:15:05',
        user_name: 'Patricia Adams',
        user_role: 'Staff',
        action: 'cancel',
        module: 'sessions',
        description: 'Cancelled session "Outdoor Walk" due to weather',
        details: {
          original_date: '2026-01-27',
          reason: 'Inclement weather',
          affected_residents: 8
        },
        ip_address: '192.168.1.108',
        device: 'Android / Chrome'
      },
      {
        id: 'log-15',
        timestamp: '2026-01-27T10:30:41',
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'update',
        module: 'settings',
        description: 'Updated system notification preferences',
        details: {
          email_notifications: true,
          activity_reminders: '24 hours before',
          expense_alerts: true
        },
        ip_address: '192.168.1.100',
        device: 'Windows 11 / Edge'
      },
    ];

    setLogs(demoLogs);
    setLoading(false);
  };

  const actions = ['create', 'update', 'delete', 'approve', 'reject', 'login', 'logout', 'view', 'export', 'complete', 'cancel'];
  const modules = ['activities', 'sessions', 'enrollments', 'expenses', 'residents', 'users', 'reports', 'settings', 'authentication'];

  const getActionInfo = (action) => {
    const info = {
      create: { icon: 'Plus', color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Created' },
      update: { icon: 'Edit', color: 'text-blue-600', bg: 'bg-blue-100', label: 'Updated' },
      delete: { icon: 'Trash2', color: 'text-red-600', bg: 'bg-red-100', label: 'Deleted' },
      approve: { icon: 'CheckCircle', color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' },
      reject: { icon: 'XCircle', color: 'text-rose-600', bg: 'bg-rose-100', label: 'Rejected' },
      login: { icon: 'LogIn', color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Login' },
      logout: { icon: 'LogOut', color: 'text-gray-600', bg: 'bg-gray-100', label: 'Logout' },
      view: { icon: 'Eye', color: 'text-purple-600', bg: 'bg-purple-100', label: 'Viewed' },
      export: { icon: 'Download', color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'Exported' },
      complete: { icon: 'CheckSquare', color: 'text-teal-600', bg: 'bg-teal-100', label: 'Completed' },
      cancel: { icon: 'XSquare', color: 'text-orange-600', bg: 'bg-orange-100', label: 'Cancelled' },
    };
    return info[action] || { icon: 'Activity', color: 'text-gray-600', bg: 'bg-gray-100', label: action };
  };

  const getModuleInfo = (module) => {
    const info = {
      activities: { icon: 'Calendar', color: 'text-purple-600' },
      sessions: { icon: 'Clock', color: 'text-blue-600' },
      enrollments: { icon: 'UserPlus', color: 'text-green-600' },
      expenses: { icon: 'Receipt', color: 'text-amber-600' },
      residents: { icon: 'Users', color: 'text-pink-600' },
      users: { icon: 'UserCog', color: 'text-indigo-600' },
      reports: { icon: 'FileText', color: 'text-cyan-600' },
      settings: { icon: 'Settings', color: 'text-gray-600' },
      authentication: { icon: 'Shield', color: 'text-emerald-600' },
    };
    return info[module] || { icon: 'Box', color: 'text-gray-600' };
  };

  const uniqueUsers = [...new Set(logs.map(log => log.user_name))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesUser = userFilter === 'all' || log.user_name === userFilter;
    
    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const logDate = new Date(log.timestamp);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (dateRangeFilter) {
        case 'today':
          matchesDate = logDate >= startOfToday;
          break;
        case 'yesterday':
          const yesterday = new Date(startOfToday);
          yesterday.setDate(yesterday.getDate() - 1);
          matchesDate = logDate >= yesterday && logDate < startOfToday;
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          matchesDate = logDate >= startOfWeek;
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          matchesDate = logDate >= startOfMonth;
          break;
        case 'last-7':
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          matchesDate = logDate >= sevenDaysAgo;
          break;
      }
    }
    
    return matchesSearch && matchesAction && matchesModule && matchesUser && matchesDate;
  });

  // Stats calculations
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const createActions = logs.filter(l => l.action === 'create').length;
  const updateActions = logs.filter(l => l.action === 'update').length;
  const criticalActions = logs.filter(l => ['delete', 'reject'].includes(l.action)).length;

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setModuleFilter('all');
    setDateRangeFilter('all');
    setUserFilter('all');
  };

  const hasActiveFilters = searchTerm || actionFilter !== 'all' || moduleFilter !== 'all' || dateRangeFilter !== 'all' || userFilter !== 'all';

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Audit Logs
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Track all system activities and user actions
            </p>
          </div>
          <motion.button
            className="flex items-center gap-2 px-5 py-3 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md border border-gray-200 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon name="Download" size={20} />
            Export Logs
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Icon name="Activity" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Activity</p>
                <p className="text-2xl font-bold text-gray-800">{todayLogs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <Icon name="Plus" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Items Created</p>
                <p className="text-2xl font-bold text-gray-800">{createActions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Icon name="Edit" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Updates Made</p>
                <p className="text-2xl font-bold text-gray-800">{updateActions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                <Icon name="AlertTriangle" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical Actions</p>
                <p className="text-2xl font-bold text-gray-800">{criticalActions}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action.charAt(0).toUpperCase() + action.slice(1)}</option>
              ))}
            </select>

            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Modules</option>
              {modules.map(module => (
                <option key={module} value={module}>{module.charAt(0).toUpperCase() + module.slice(1)}</option>
              ))}
            </select>

            {/* User Filter */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(userName => (
                <option key={userName} value={userName}>{userName}</option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-7">Last 7 Days</option>
              <option value="this-month">This Month</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="X" size={16} />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div 
          className="mb-4 text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Showing {filteredLogs.length} of {logs.length} log entries
        </motion.div>

        {/* Audit Logs Timeline */}
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {filteredLogs.map((log, idx) => {
            const actionInfo = getActionInfo(log.action);
            const moduleInfo = getModuleInfo(log.module);
            
            return (
              <motion.div
                key={log.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * idx, duration: 0.4 }}
                whileHover={{ scale: 1.002, x: 4 }}
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-center p-4">
                  {/* Action Icon */}
                  <div className={`p-2.5 rounded-xl ${actionInfo.bg} mr-4`}>
                    <Icon name={actionInfo.icon} size={20} className={actionInfo.color} />
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-800 truncate">{log.description}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon name="User" size={14} />
                        {log.user_name}
                      </span>
                      <span className={`flex items-center gap-1 ${moduleInfo.color}`}>
                        <Icon name={moduleInfo.icon} size={14} />
                        <span className="capitalize">{log.module}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Icon name="Monitor" size={14} />
                        {log.device.split(' / ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Action Badge */}
                  <div className={`px-3 py-1.5 rounded-lg ${actionInfo.bg} mr-4`}>
                    <span className={`text-sm font-medium ${actionInfo.color}`}>
                      {actionInfo.label}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right min-w-[100px]">
                    <p className="text-sm font-medium text-gray-700">{formatTimestamp(log.timestamp)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Arrow */}
                  <Icon name="ChevronRight" size={20} className="text-gray-300 ml-3" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Icon name="FileText" size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No logs found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters to see more results</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </motion.main>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/20`}>
                      <Icon name={getActionInfo(selectedLog.action).icon} size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{getActionInfo(selectedLog.action).label} Action</h2>
                      <p className="text-purple-100 text-sm">{selectedLog.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <Icon name="X" size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                {/* Description */}
                <div className="mb-6">
                  <p className="text-lg text-gray-800 font-medium">{selectedLog.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">User</p>
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      <Icon name="User" size={16} className="text-gray-500" />
                      {selectedLog.user_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{selectedLog.user_role}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Module</p>
                    <p className={`font-semibold capitalize flex items-center gap-2 ${getModuleInfo(selectedLog.module).color}`}>
                      <Icon name={getModuleInfo(selectedLog.module).icon} size={16} />
                      {selectedLog.module}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Timestamp</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedLog.timestamp).toLocaleString('en-GB', { 
                        weekday: 'short',
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">IP Address</p>
                    <p className="font-semibold text-gray-800 font-mono">{selectedLog.ip_address}</p>
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-1">Device / Browser</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    <Icon name="Monitor" size={16} className="text-gray-500" />
                    {selectedLog.device}
                  </p>
                </div>

                {/* Action Details */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600 font-medium mb-3 flex items-center gap-2">
                      <Icon name="Info" size={16} />
                      Action Details
                    </p>
                    <div className="space-y-2">
                      {Object.entries(selectedLog.details).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-sm text-gray-500 capitalize min-w-[120px]">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-sm text-gray-800 font-medium">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogsPage;
