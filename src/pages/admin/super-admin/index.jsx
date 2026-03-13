import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../../components/navigation/Header';
import usePageTitle from '../../../hooks/usePageTitle';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useAuth } from '../../../context/AuthContext';
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getAllCareHomes,
  getCareHomesByOrganization,
  createCareHome,
  updateCareHome,
  deleteCareHome,
  getAllUsers,
  getUsersByOrganization,
  createUser,
  updateUserProfile,
  getSuperAdminStats,
  getRecentActivity
} from '../../../services/organizationService';

const SuperAdminDashboard = () => {
  usePageTitle('Super Admin Dashboard');
  const { user, role, organizationId } = useAuth();

  // Check if user is Super Admin
  const isSuperAdmin = role === 'Super Admin' || role === 'admin';

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Data state
  const [stats, setStats] = useState({
    organizations: 0,
    careHomes: 0,
    users: 0,
    residents: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0
  });
  const [organizations, setOrganizations] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Modal state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showCareHomeModal, setShowCareHomeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState('');

  // Filter state
  const [selectedOrg, setSelectedOrg] = useState(organizationId || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    billing_email: '',
    billing_address: '',
    billing_city: '',
    billing_postcode: '',
    subscription_plan: 'basic',
    subscription_status: 'trial',
    max_care_homes: 5,
    max_users: 50,
    is_active: true
  });

  const [careHomeForm, setCareHomeForm] = useState({
    organization_id: '',
    name: '',
    location: '',
    address: '',
    postcode: '',
    phone: '',
    email: '',
    manager_name: '',
    capacity: 0,
    status: 'Active'
  });

  const [userForm, setUserForm] = useState({
    email: '',
    name: '',
    password: '',
    organization_id: '',
    care_home_id: '',
    role: 'Care Home Staff',
    status: 'Active'
  });

  // Load data on mount
  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  // Track whether migration is needed (organizations table missing)
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setMigrationNeeded(false);
    setError('');
    
    try {
      // Load each piece individually to identify which query fails
      let statsData = { organizations: 0, careHomes: 0, users: 0, residents: 0, activeSubscriptions: 0, trialSubscriptions: 0 };
      let orgsData = [];
      let careHomesData = [];
      let usersData = [];
      let activityData = [];

      try {
        statsData = await getSuperAdminStats();
      } catch (e) {
        console.error('Stats error:', e);
      }

      try {
        orgsData = await getOrganizations();
      } catch (e) {
        console.error('Organizations error:', e);
        // Check if organizations table doesn't exist
        if (e.message?.includes('does not exist') || e.code === '42P01') {
          setMigrationNeeded(true);
          setLoading(false);
          return;
        }
      }

      try {
        careHomesData = await getAllCareHomes();
      } catch (e) {
        console.error('Care homes error:', e);
      }

      try {
        usersData = await getAllUsers();
      } catch (e) {
        console.error('Users error:', e);
      }

      try {
        activityData = await getRecentActivity(10);
      } catch (e) {
        console.error('Activity error:', e);
      }

      setStats(statsData);
      setOrganizations(orgsData || []);
      setCareHomes(careHomesData || []);
      setUsers(usersData || []);
      setRecentActivity(activityData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      const msg = err.message || '';
      if (msg.includes('does not exist') || err.code === '42P01' || msg.includes('relation')) {
        setMigrationNeeded(true);
        setError('');
      } else {
        setError(`Failed to load data: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // If not super admin, redirect
  if (!isSuperAdmin) {
    return <Navigate to="/main-dashboard" replace />;
  }

  // If migration is needed, show helpful setup screen
  if (migrationNeeded) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-border-light p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-warning-light rounded-full flex items-center justify-center">
              <Icon name="AlertTriangle" className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Database Setup Required</h1>
            <p className="text-text-secondary mb-6">
              The multi-tenancy tables haven't been created yet. To enable the Super Admin features, 
              please run the migration SQL in your Supabase dashboard.
            </p>
            <div className="bg-surface-secondary rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-text-primary mb-2">Steps to complete setup:</h3>
              <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2">
                <li>Open your Supabase project dashboard</li>
                <li>Go to <strong>SQL Editor</strong></li>
                <li>Run the file: <code className="bg-gray-100 px-1 rounded">migrations/2026-01-19-add-organizations-multi-tenancy.sql</code></li>
                <li>Then run: <code className="bg-gray-100 px-1 rounded">migrations/2026-01-19-migrate-existing-data-to-org.sql</code></li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <Button onClick={() => window.location.reload()}>
              <Icon name="RefreshCw" className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'organizations', label: 'Organizations', icon: 'Building' },
    { id: 'care-homes', label: 'Care Homes', icon: 'Building2' },
    { id: 'users', label: 'Users', icon: 'Users' },
    { id: 'activity', label: 'Activity Log', icon: 'Activity' }
  ];

  // Stats cards for overview
  const statsCards = [
    { label: 'Organizations', value: stats.organizations, icon: 'Building', color: 'primary' },
    { label: 'Care Homes', value: stats.careHomes, icon: 'Building2', color: 'success' },
    { label: 'Total Users', value: stats.users, icon: 'Users', color: 'accent' },
    { label: 'Residents', value: stats.residents, icon: 'UserCheck', color: 'warning' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: 'CreditCard', color: 'success' },
    { label: 'Trial Accounts', value: stats.trialSubscriptions, icon: 'Clock', color: 'warning' }
  ];

  // Organization handlers
  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingItem) {
        await updateOrganization(editingItem.id, orgForm);
        setSuccess('Organization updated successfully!');
      } else {
        await createOrganization(orgForm);
        setSuccess('Organization created successfully!');
      }
      setShowOrgModal(false);
      resetOrgForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save organization');
    }
  };

  const handleEditOrg = (org) => {
    setEditingItem(org);
    setOrgForm({
      name: org.name || '',
      slug: org.slug || '',
      contact_name: org.contact_name || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      billing_email: org.billing_email || '',
      billing_address: org.billing_address || '',
      billing_city: org.billing_city || '',
      billing_postcode: org.billing_postcode || '',
      subscription_plan: org.subscription_plan || 'basic',
      subscription_status: org.subscription_status || 'trial',
      max_care_homes: org.max_care_homes || 5,
      max_users: org.max_users || 50,
      is_active: org.is_active !== false
    });
    setShowOrgModal(true);
  };

  const resetOrgForm = () => {
    setOrgForm({
      name: '',
      slug: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      billing_email: '',
      billing_address: '',
      billing_city: '',
      billing_postcode: '',
      subscription_plan: 'basic',
      subscription_status: 'trial',
      max_care_homes: 5,
      max_users: 50,
      is_active: true
    });
    setEditingItem(null);
  };

  // Care Home handlers
  const handleCareHomeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingItem) {
        await updateCareHome(editingItem.id, careHomeForm);
        setSuccess('Care home updated successfully!');
      } else {
        await createCareHome(careHomeForm);
        setSuccess('Care home created successfully!');
      }
      setShowCareHomeModal(false);
      resetCareHomeForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save care home');
    }
  };

  const handleEditCareHome = (ch) => {
    setEditingItem(ch);
    setCareHomeForm({
      organization_id: ch.organization_id || '',
      name: ch.name || '',
      location: ch.location || '',
      address: ch.address || '',
      postcode: ch.postcode || '',
      phone: ch.phone || '',
      email: ch.email || '',
      manager_name: ch.manager_name || '',
      capacity: ch.capacity || 0,
      status: ch.status || 'Active'
    });
    setShowCareHomeModal(true);
  };

  const resetCareHomeForm = () => {
    setCareHomeForm({
      organization_id: '',
      name: '',
      location: '',
      address: '',
      postcode: '',
      phone: '',
      email: '',
      manager_name: '',
      capacity: 0,
      status: 'Active'
    });
    setEditingItem(null);
  };

  // User handlers
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Validate role before submission
      const VALID_ROLES = ['Super Admin', 'Organization Admin', 'Care Home Manager', 'Care Home Staff', 'admin', 'staff'];
      const cleanedRole = (userForm.role || '').trim();
      
      if (!cleanedRole || !VALID_ROLES.includes(cleanedRole)) {
        throw new Error(`Invalid role: "${userForm.role}". Must be one of: ${VALID_ROLES.join(', ')}`);
      }
      
      if (editingItem && editingItem.id) {
        // Update existing user
        console.log('Updating user with role:', cleanedRole);
        await updateUserProfile(editingItem.id, {
          organization_id: userForm.organization_id || null,
          care_home_id: userForm.care_home_id || null,
          role: cleanedRole,
          status: userForm.status
        });
        setSuccess('User updated successfully!');
      } else {
        // Create new user
        if (!userForm.email || !userForm.password || !userForm.name) {
          throw new Error('Email, password, and name are required');
        }
        console.log('Creating user with role:', cleanedRole);
        await createUser(
          userForm.email,
          userForm.password,
          userForm.name,
          userForm.organization_id || null,
          userForm.care_home_id || null,
          cleanedRole
        );
        setSuccess('User created successfully!');
      }
      setShowUserModal(false);
      resetUserForm();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  };

  const handleEditUser = (u) => {
    setEditingItem(u);
    setUserForm({
      email: u.email || '',
      name: u.name || '',
      password: '',
      organization_id: u.organization_id || '',
      care_home_id: u.care_home_id || '',
      role: u.role || 'Care Home Staff',
      status: u.status || 'Active'
    });
    setShowUserModal(true);
  };

  const handleAddUser = (orgId) => {
    setEditingItem(null);
    setUserForm({
      email: '',
      name: '',
      password: '',
      organization_id: orgId || '',
      care_home_id: '',
      role: 'Care Home Staff',
      status: 'Active'
    });
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      name: '',
      password: '',
      organization_id: '',
      care_home_id: '',
      role: 'Care Home Staff',
      status: 'Active'
    });
    setEditingItem(null);
  };

  // Delete handlers
  const handleDelete = async () => {
    try {
      if (deleteType === 'organization') {
        await deleteOrganization(deleteItem.id);
        setSuccess('Organization deleted successfully!');
      } else if (deleteType === 'careHome') {
        await deleteCareHome(deleteItem.id);
        setSuccess('Care home deleted successfully!');
      }
      setShowDeleteModal(false);
      setDeleteItem(null);
      setDeleteType('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const confirmDelete = (item, type) => {
    setDeleteItem(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  // Filter functions
  const filteredCareHomes = careHomes.filter(ch => {
    const matchesOrg = selectedOrg === 'all' || ch.organization_id === selectedOrg;
    const matchesSearch = ch.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesOrg && matchesSearch;
  });

  const filteredUsers = users.filter(u => {
    const userOrgId = u.organization_id || (u.organizations && u.organizations.id) || null;
    const matchesOrg = selectedOrg === 'all' || userOrgId === selectedOrg;
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesOrg && matchesSearch;
  });

  // Normalize role labels for display and styling
  const formatRole = (r) => {
    if (!r) return 'Care Home Staff';
    const s = String(r).toLowerCase();
    if (s.includes('super')) return 'Super Admin';
    if (s.includes('organization') || s === 'admin') return 'Organization Admin';
    if (s.includes('care home manager') || s.includes('manager')) return 'Care Home Manager';
    if (s.includes('care home staff') || s.includes('staff')) return 'Care Home Staff';
    return r;
  };

  // Auto-hide success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto p-6"
      >
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon name="Shield" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage all organizations, care homes, and users</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
            <Icon name="AlertCircle" className="text-error" size={20} />
            <span className="text-error">{error}</span>
            <button onClick={() => setError('')} className="ml-auto">
              <Icon name="X" size={18} className="text-error" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
            <Icon name="CheckCircle" className="text-success" size={20} />
            <span className="text-success">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {statsCards.map((stat, index) => (
                    <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 bg-${stat.color}/10 rounded-xl flex items-center justify-center`}>
                          <Icon name={stat.icon} size={24} className={`text-${stat.color}`} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => { resetOrgForm(); setShowOrgModal(true); }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Icon name="Plus" size={18} />
                      Add Organization
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { resetCareHomeForm(); setShowCareHomeModal(true); }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Icon name="Plus" size={18} />
                      Add Care Home
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('activity')}
                      className="flex items-center justify-center gap-2"
                    >
                      <Icon name="Activity" size={18} />
                      View Activity Log
                    </Button>
                  </div>
                </div>

                {/* Recent Organizations */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Recent Organizations</h2>
                    <button
                      onClick={() => setActiveTab('organizations')}
                      className="text-sm text-primary hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {organizations.slice(0, 5).map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon name="Building" size={20} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.contact_email || 'No email'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          org.subscription_status === 'active' ? 'bg-success/10 text-success' :
                          org.subscription_status === 'trial' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }`}>
                          {org.subscription_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Organizations Tab */}
            {activeTab === 'organizations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <Button onClick={() => { resetOrgForm(); setShowOrgModal(true); }}>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Add Organization
                  </Button>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Care Homes</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {organizations
                          .filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((org) => {
                            const orgCareHomes = careHomes.filter(ch => ch.organization_id === org.id);
                            return (
                              <tr key={org.id} className="hover:bg-surface/50">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                      <Icon name="Building" size={20} className="text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{org.name}</p>
                                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-foreground">{org.contact_name || '-'}</p>
                                  <p className="text-sm text-muted-foreground">{org.contact_email || '-'}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    org.subscription_plan === 'enterprise' ? 'bg-primary/10 text-primary' :
                                    org.subscription_plan === 'professional' ? 'bg-accent/10 text-accent' :
                                    'bg-surface text-muted-foreground'
                                  }`}>
                                    {org.subscription_plan}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    org.subscription_status === 'active' ? 'bg-success/10 text-success' :
                                    org.subscription_status === 'trial' ? 'bg-warning/10 text-warning' :
                                    'bg-error/10 text-error'
                                  }`}>
                                    {org.subscription_status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {orgCareHomes.length} / {org.max_care_homes}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleEditOrg(org)}
                                      className="p-2 hover:bg-surface rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Icon name="Edit" size={16} className="text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(org, 'organization')}
                                      className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Icon name="Trash2" size={16} className="text-error" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Care Homes Tab */}
            {activeTab === 'care-homes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search care homes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">All Organizations</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => { resetCareHomeForm(); setShowCareHomeModal(true); }}>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Add Care Home
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCareHomes.map((ch) => (
                    <div key={ch.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                            <Icon name="Building2" size={24} className="text-success" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{ch.name}</h3>
                            <p className="text-sm text-muted-foreground">{ch.organizations?.name || 'No org'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          ch.status === 'Active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {ch.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon name="MapPin" size={16} />
                          <span>{ch.address || ch.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon name="Users" size={16} />
                          <span>{ch.current_residents || 0} / {ch.capacity} residents</span>
                        </div>
                        {ch.manager_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon name="User" size={16} />
                            <span>{ch.manager_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-border">
                        <button
                          onClick={() => handleEditCareHome(ch)}
                          className="flex-1 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(ch, 'careHome')}
                          className="flex-1 py-2 text-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">All Organizations</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={() => handleAddUser(selectedOrg === 'all' ? '' : selectedOrg)}
                    className="flex items-center gap-2"
                  >
                    <Icon name="Plus" size={20} />
                    Create User
                  </Button>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-surface">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Facility</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsers.map((u) => {
                          const roleRaw = u.role || u.role_label || u.user_role || (u.user_metadata && u.user_metadata.role) || null;
                          const roleLabel = formatRole(roleRaw || u.role);
                          const orgName = u.organizations?.name || (u.organization_id ? '-' : 'Head Office');
                          const facilityName = (u.care_homes && u.care_homes.name) || ( !u.organization_id && (roleLabel === 'Super Admin' || roleLabel === 'Organization Admin') ? 'Head Office' : '-');
                          const roleClass = roleLabel === 'Super Admin' ? 'bg-primary/10 text-primary' : roleLabel === 'Organization Admin' ? 'bg-accent/10 text-accent' : roleLabel === 'Care Home Manager' ? 'bg-success/10 text-success' : 'bg-surface text-muted-foreground';
                          return (
                            <tr key={u.id} className="hover:bg-surface/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-accent">{(u.name || u.email || 'U')[0].toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{u.name || 'No name'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">{u.email}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{orgName}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{facilityName}</td>
                              <td className="px-4 py-3"> <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleClass}`}>{roleLabel}</span> </td>
                              <td className="px-4 py-3"> <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.status === 'Active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>{u.status}</span> </td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => handleEditUser(u)} className="p-2 hover:bg-surface rounded-lg transition-colors" title="Edit"><Icon name="Edit" size={16} className="text-muted-foreground" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No recent activity</p>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-surface rounded-lg">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon name="Activity" size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{activity.action} - {activity.entity_type}</p>
                          <p className="text-sm text-muted-foreground">{activity.summary || 'No details'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{activity.actor_name || 'System'}</span>
                            <span>•</span>
                            <span>{activity.care_homes?.name || 'System-wide'}</span>
                            <span>•</span>
                            <span>{new Date(activity.changed_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingItem ? 'Edit Organization' : 'Add New Organization'}
                </h2>
                <button onClick={() => { setShowOrgModal(false); resetOrgForm(); }}>
                  <Icon name="X" size={24} className="text-muted-foreground" />
                </button>
              </div>
            </div>
            <form onSubmit={handleOrgSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Organization Name *</label>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
                  <input
                    type="text"
                    value={orgForm.slug}
                    onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                    placeholder="auto-generated-if-empty"
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={orgForm.contact_name}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_name: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={orgForm.contact_email}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={orgForm.contact_phone}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Billing Email</label>
                  <input
                    type="email"
                    value={orgForm.billing_email}
                    onChange={(e) => setOrgForm({ ...orgForm, billing_email: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Billing City</label>
                  <input
                    type="text"
                    value={orgForm.billing_city}
                    onChange={(e) => setOrgForm({ ...orgForm, billing_city: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Billing Address</label>
                <input
                  type="text"
                  value={orgForm.billing_address}
                  onChange={(e) => setOrgForm({ ...orgForm, billing_address: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Plan</label>
                  <select
                    value={orgForm.subscription_plan}
                    onChange={(e) => setOrgForm({ ...orgForm, subscription_plan: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={orgForm.subscription_status}
                    onChange={(e) => setOrgForm({ ...orgForm, subscription_status: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max Care Homes</label>
                  <input
                    type="number"
                    value={orgForm.max_care_homes}
                    onChange={(e) => setOrgForm({ ...orgForm, max_care_homes: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Max Users</label>
                  <input
                    type="number"
                    value={orgForm.max_users}
                    onChange={(e) => setOrgForm({ ...orgForm, max_users: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={orgForm.is_active}
                  onChange={(e) => setOrgForm({ ...orgForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm text-foreground">Active</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setShowOrgModal(false); resetOrgForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update Organization' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Care Home Modal */}
      {showCareHomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingItem ? 'Edit Care Home' : 'Add New Care Home'}
                </h2>
                <button onClick={() => { setShowCareHomeModal(false); resetCareHomeForm(); }}>
                  <Icon name="X" size={24} className="text-muted-foreground" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCareHomeSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Organization *</label>
                <select
                  value={careHomeForm.organization_id}
                  onChange={(e) => setCareHomeForm({ ...careHomeForm, organization_id: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Care Home Name *</label>
                  <input
                    type="text"
                    value={careHomeForm.name}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
                  <input
                    type="text"
                    value={careHomeForm.location}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, location: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address *</label>
                <input
                  type="text"
                  value={careHomeForm.address}
                  onChange={(e) => setCareHomeForm({ ...careHomeForm, address: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Postcode</label>
                  <input
                    type="text"
                    value={careHomeForm.postcode}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, postcode: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <input
                    type="tel"
                    value={careHomeForm.phone}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={careHomeForm.email}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={careHomeForm.manager_name}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, manager_name: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Capacity</label>
                  <input
                    type="number"
                    value={careHomeForm.capacity}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={careHomeForm.status}
                    onChange={(e) => setCareHomeForm({ ...careHomeForm, status: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setShowCareHomeModal(false); resetCareHomeForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update Care Home' : 'Create Care Home'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Edit/Create Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingItem ? 'Edit User' : 'Create New User'}
                </h2>
                <button onClick={() => { setShowUserModal(false); resetUserForm(); }}>
                  <Icon name="X" size={24} className="text-muted-foreground" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-6">
              {editingItem && (
                <div className="p-4 bg-surface rounded-lg">
                  <p className="font-medium text-foreground">{editingItem.name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{editingItem.email}</p>
                </div>
              )}

              {!editingItem && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Initial Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pr-28 px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="px-2 py-1 rounded-md text-sm bg-surface/80 hover:bg-surface"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const text = `Email: ${userForm.email || ''}\nPassword: ${userForm.password || ''}`;
                            try {
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                await navigator.clipboard.writeText(text);
                              } else {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                              }
                              setCopiedCredentials(true);
                              setTimeout(() => setCopiedCredentials(false), 2000);
                            } catch (err) {
                              console.error('Copy failed', err);
                            }
                          }}
                          className="px-2 py-1 rounded-md text-sm bg-surface/80 hover:bg-surface"
                          title="Copy credentials"
                        >
                          <Icon name="Copy" size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">User can reset password after login</p>
                    {copiedCredentials && <p className="text-xs text-success mt-1">Credentials copied to clipboard</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Organization</label>
                <select
                  value={userForm.organization_id}
                  onChange={(e) => setUserForm({ ...userForm, organization_id: e.target.value, care_home_id: '' })}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">No Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              {userForm.organization_id && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Care Home (Optional)</label>
                  <select
                    value={userForm.care_home_id}
                    onChange={(e) => setUserForm({ ...userForm, care_home_id: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">No Care Home</option>
                    {careHomes
                      .filter(ch => ch.organization_id === userForm.organization_id)
                      .map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Care Home Staff">Care Home Staff</option>
                  <option value="Care Home Manager">Care Home Manager</option>
                  <option value="Organization Admin">Organization Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              {editingItem && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setShowUserModal(false); resetUserForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <Icon name="AlertTriangle" size={24} className="text-error" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Confirm Delete</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-foreground mb-6">
              Are you sure you want to delete <strong>{deleteItem.name}</strong>?
              {deleteType === 'organization' && (
                <span className="block text-sm text-warning mt-2">
                  Warning: This will affect all associated care homes and users.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteItem(null); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
