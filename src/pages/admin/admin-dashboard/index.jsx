import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../../components/navigation/Header';
import Icon from '../../../components/AppIcon';
import supabase from '../../../services/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    careHomes: 4,
    totalResidents: 0,
    systemHealth: 98
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch users count
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      if (!userError && userData) {
        setStats(prev => ({ ...prev, totalUsers: userData.users.length }));
      }

      // Note: You'll need to create tables for facilities and residents
      // For now using static data
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      label: 'Total Users', 
      value: loading ? '...' : stats.totalUsers, 
      icon: 'Users', 
      color: 'primary', 
      change: '+3 this month',
      trend: 'up'
    },
    { 
      label: 'Care Homes', 
      value: stats.careHomes, 
      icon: 'Building2', 
      color: 'success', 
      change: 'Active facilities',
      trend: 'neutral'
    },
    { 
      label: 'Total Residents', 
      value: '176', 
      icon: 'UserCheck', 
      color: 'accent', 
      change: '85% capacity',
      trend: 'up'
    },
    { 
      label: 'System Health', 
      value: `${stats.systemHealth}%`, 
      icon: 'Activity', 
      color: 'warning', 
      change: 'All systems operational',
      trend: 'up'
    },
  ];

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage system users, roles, and permissions',
      icon: 'Users',
      color: 'primary',
      link: '/admin/user-management',
      features: ['Add/Edit Users', 'Role Assignment', 'Permission Control', 'Activity Logs']
    },
    {
      title: 'Care Home Management',
      description: 'Manage facilities, capacity, and locations',
      icon: 'Building2',
      color: 'success',
      link: '/admin/care-home-management',
      features: ['Add/Edit Facilities', 'Capacity Management', 'Location Details', 'Manager Assignment']
    },
    {
      title: 'Resident Management',
      description: 'Manage resident details and dietary requirements',
      icon: 'UserCheck',
      color: 'accent',
      link: '/admin/resident-management',
      features: ['Resident Profiles', 'Dietary Needs', 'Allergen Tracking', 'Emergency Contacts']
    },
  ];

  const recentActivity = [
    { action: 'New user added', user: 'Sarah Jones', time: '2 hours ago', icon: 'UserPlus', color: 'success' },
    { action: 'Care home updated', user: 'Admin', time: '5 hours ago', icon: 'Edit', color: 'accent' },
    { action: 'Resident admitted', user: 'John Smith', time: '1 day ago', icon: 'UserCheck', color: 'primary' },
    { action: 'System backup completed', user: 'System', time: '2 days ago', icon: 'Database', color: 'warning' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Last updated:</span>
              <span className="text-sm font-medium text-foreground">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 bg-${stat.color}/10 rounded-xl flex items-center justify-center`}>
                  <Icon name={stat.icon} size={28} color={`var(--color-${stat.color})`} />
                </div>
                {stat.trend === 'up' && (
                  <div className="flex items-center gap-1 text-success">
                    <Icon name="TrendingUp" size={16} />
                    <span className="text-xs font-medium">+12%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mb-2">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Modules */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Icon name="Grid" size={24} />
            Administration Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminModules.map((module, index) => (
              <Link
                key={index}
                to={module.link}
                className="bg-gradient-to-br from-card to-card/50 border-2 border-border rounded-xl p-6 hover:shadow-xl hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-${module.color}/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon name={module.icon} size={32} color={`var(--color-${module.color})`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{module.description}</p>
                  <div className="space-y-2 mb-4">
                    {module.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all">
                    <span>Open Module</span>
                    <Icon name="ArrowRight" size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity & Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Icon name="Clock" size={24} />
                Recent Activity
              </h2>
              <button className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2">
                View All
                <Icon name="ArrowRight" size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className={`w-12 h-12 bg-${activity.color}/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon name={activity.icon} size={20} color={`var(--color-${activity.color})`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Icon name="Zap" size={24} />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 hover:shadow-md transition-all group text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="FileText" size={20} color="var(--color-primary)" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">System Reports</p>
                    <p className="text-xs text-muted-foreground">Generate reports</p>
                  </div>
                </div>
              </button>

              <button className="w-full bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-lg p-4 hover:shadow-md transition-all group text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Settings" size={20} color="var(--color-warning)" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">System Settings</p>
                    <p className="text-xs text-muted-foreground">Configure system</p>
                  </div>
                </div>
              </button>

              <button className="w-full bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-lg p-4 hover:shadow-md transition-all group text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Database" size={20} color="var(--color-success)" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Data Backup</p>
                    <p className="text-xs text-muted-foreground">Manage backups</p>
                  </div>
                </div>
              </button>

              <button className="w-full bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-4 hover:shadow-md transition-all group text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Mail" size={20} color="var(--color-accent)" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Notifications</p>
                    <p className="text-xs text-muted-foreground">Send alerts</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
