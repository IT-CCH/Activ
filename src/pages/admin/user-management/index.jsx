import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../../components/navigation/Header';
import usePageTitle from '../../../hooks/usePageTitle';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import supabase from '../../../services/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

const UserManagement = () => {
  usePageTitle('User Management');
  const { role, careHomeId, organizationId } = useAuth();
  const [users, setUsers] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    care_home_id: '',
    phone: '',
    status: 'Active'
  });

  const roles = ['admin', 'care_home_manager', 'staff'];

  const formatRole = (r) => {
    if (!r) return 'Care Home Staff';
    const s = String(r).toLowerCase();
    if (s.includes('super')) return 'Super Admin';
    if (s.includes('organization') || s === 'admin') return 'Organization Admin';
    if (s.includes('care home manager') || s.includes('care_home_manager') || s.includes('manager')) return 'Care Home Manager';
    if (s.includes('staff')) return 'Care Home Staff';
    return r;
  };
  const statuses = ['Active', 'Inactive'];

  // Fetch users and care homes from Supabase
  useEffect(() => {
    fetchCareHomes();
  }, []);

  // Fetch users when role or careHomeId changes
  useEffect(() => {
    if (role) {
      fetchUsers();
    }
  }, [role, careHomeId]);

  const fetchCareHomes = async () => {
    try {
      const { data, error } = await supabase
        .from('care_homes')
        .select('id, name')
        .eq('status', 'Active')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching care homes:', error);
        return;
      }
      setCareHomes(data || []);
    } catch (error) {
      console.error('Error fetching care homes:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      console.log('fetchUsers called with role:', role, 'careHomeId:', careHomeId);
      
      // Query the user_profiles table with care home and organization join
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          name,
          role,
          organization_id,
          care_home_id,
          phone,
          status,
          created_at,
          updated_at,
          care_homes (name),
          organizations (id, name)
        `);
      
      // Normalize role for comparisons
      const roleKey = (role || '').toString().toLowerCase().replace(/\s+/g, '_');

      // Filter for care home managers to only see users in their care home
      if (roleKey === 'care_home_manager' && careHomeId) {
        console.log('Care Home Manager filtering by careHomeId:', careHomeId);
        query = query.eq('care_home_id', careHomeId);
      }

      // Organization admins should only see users in their organization
      if ((roleKey === 'organization_admin' || roleKey === 'admin') && organizationId) {
        console.log('Organization Admin filtering by organizationId:', organizationId);
        query = query.eq('organization_id', organizationId);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Raw fetched users data:', data);
      console.log('Number of users fetched:', data?.length || 0);

      // Transform to our format
      const transformedUsers = data.map(user => {
        const raw = user.role || '';
        const r = String(raw).toLowerCase();
        let canonicalRole = 'staff';
        if (r.includes('super')) canonicalRole = 'super_admin';
        else if (r.includes('organization') || r === 'admin') canonicalRole = 'admin';
        else if (r.includes('care_home_manager') || r.includes('care home manager') || r.includes('manager')) canonicalRole = 'care_home_manager';
        else if (r.includes('staff')) canonicalRole = 'staff';

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: canonicalRole, // canonical key used for filtering and logic
          roleLabel: formatRole(user.role), // human-friendly label for display
          rawRole: user.role,
          organization_id: user.organization_id,
          organization_name: user.organizations?.name || null,
          care_home_id: user.care_home_id,
          facility: user.care_homes?.name || null,
          status: user.status,
          registeredOn: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
          phone: user.phone
        };
      });

      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(`Failed to load users: ${err.message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
      care_home_id: '',
      phone: '',
      status: 'Active'
    });
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${fieldName} copied to clipboard!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const copyCredentials = async () => {
    const credentials = `Email: ${formData.email}\nPassword: ${formData.password}`;
    try {
      await navigator.clipboard.writeText(credentials);
      setSuccess('Email and password copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy credentials');
    }
  };


  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.role === 'staff' && !formData.care_home_id) {
      setError('Please select a care home for staff members');
      return;
    }

    if (formData.role === 'care_home_manager' && !formData.care_home_id) {
      setError('Please select a care home for care home manager');
      return;
    }

    // Care home managers can only add users for their own care home
    if (role === 'care_home_manager') {
      if (formData.care_home_id !== careHomeId) {
        setError('You can only add users to your own care home');
        return;
      }
      // Care home managers cannot add other managers or admins
      if (formData.role !== 'staff') {
        setError('You can only add staff members to your care home');
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      // IMPORTANT: Save the current admin session before creating new user
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      
      if (!adminSession) {
        throw new Error('No active admin session found');
      }

      // Store admin session details
      const adminAccessToken = adminSession.access_token;
      const adminRefreshToken = adminSession.refresh_token;

      // Sign up the new user (this will temporarily log us in as them)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            care_home_id: formData.care_home_id || null,
            phone: formData.phone,
            status: formData.status
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!data?.user?.id) {
        throw new Error('User created but no ID returned');
      }

      // CRITICAL: Immediately restore the admin session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminAccessToken,
        refresh_token: adminRefreshToken
      });

      if (sessionError) {
        console.error('Error restoring admin session:', sessionError);
        // Even if session restore fails, continue - admin can re-login
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify user_profiles entry was created, if not create it manually
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile && !checkError?.code?.includes('PGRST116')) {
        // Profile doesn't exist, create it manually
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([{
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            care_home_id: formData.care_home_id || null,
            phone: formData.phone || null,
            status: formData.status
          }]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          throw new Error(`Profile creation failed: ${insertError.message}`);
        }
      }

      setSuccess(`User ${formData.name} created successfully! They can now login with their email and password.`);
      
      // Refresh user list
      await fetchUsers();
      
      // Reset form and close modal after 2 seconds
      setTimeout(() => {
        resetForm();
        setShowAddModal(false);
      }, 2000);

    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDeleteUser = async () => {
    if (!deletePassword.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      
      // Get current user info for verification
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: deletePassword
      });

      if (signInError) {
        setError('Incorrect password');
        setLoading(false);
        return;
      }
      
      // Delete from user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      setSuccess('User deleted successfully');
      setShowDeleteModal(false);
      setDeletePassword('');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setSelectedUser(user);
    setShowToggleModal(true);
  };

  const confirmToggleStatus = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const newStatus = selectedUser.status === 'Active' ? 'Inactive' : 'Active';
      
      console.log(`Attempting to update user ${selectedUser.id} status to ${newStatus}`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', selectedUser.id)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Update error details:', error);
        throw new Error(error.message || 'Failed to update status');
      }

      if (!data || data.length === 0) {
        throw new Error('No rows updated. User may not exist or RLS policy blocked update.');
      }

      console.log('User status updated successfully:', data);
      
      setSuccess(`User status updated to ${newStatus}`);
      setShowToggleModal(false);
      setSelectedUser(null);
      
      // Refresh user list after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 500);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(`Failed to update user status: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      care_home_id: user.care_home_id || '',
      phone: user.phone || '',
      status: user.status
    });
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.role) {
      setError('Please fill in required fields');
      return;
    }

    if (formData.role === 'staff' && !formData.care_home_id) {
      setError('Please select a care home for staff members');
      return;
    }

    if (formData.role === 'care_home_manager' && !formData.care_home_id) {
      setError('Please select a care home for care home manager');
      return;
    }

    // Care home managers can only edit users in their own care home
    if (role === 'care_home_manager') {
      if (formData.care_home_id !== careHomeId) {
        setError('You can only edit users in your own care home');
        return;
      }
    }

    try {
      setLoading(true);
      
      const updateData = {
        name: formData.name,
        role: formData.role,
        care_home_id: formData.care_home_id || null,
        phone: formData.phone,
        status: formData.status
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      setSuccess('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto p-6 py-8"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center">
            <Icon name="Users" size={28} color="var(--color-primary)" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">User Management</h1>
            <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={`grid ${role === 'admin' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-4'} gap-4 mb-6`}>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={24} color="var(--color-primary)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{users.filter(u => u.status === 'Active').length}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="UserCheck" size={24} color="var(--color-success)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-warning">{users.filter(u => u.status === 'Inactive').length}</p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="UserX" size={24} color="var(--color-warning)" />
              </div>
            </div>
          </div>

          {role === 'admin' && (
            <>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold text-accent">{users.filter(u => u.role === 'admin').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Icon name="Shield" size={24} color="var(--color-accent)" />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Care Home Managers</p>
                    <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === 'care_home_manager').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Icon name="UserCog" size={24} color="var(--color-primary)" />
                  </div>
                </div>
              </div>
            </>
          )}

          {role === 'care_home_manager' && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === 'staff').length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Icon name="Users" size={24} color="var(--color-primary)" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="Search"
              />
            </div>
            <Select
              value={filterRole}
              onChange={(value) => setFilterRole(value)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'care_home_manager', label: 'Care Home Manager' },
                { value: 'staff', label: 'Staff' }
              ]}
              placeholder="Filter by Role"
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
              placeholder="Filter by Status"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => { 
              resetForm(); 
              if (role === 'care_home_manager' && careHomeId) {
                setFormData(prev => ({ ...prev, care_home_id: careHomeId }));
              }
              setShowAddModal(true); 
            }} className="gap-2">
              <Icon name="UserPlus" size={18} />
              Add User
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Icon name="AlertCircle" size={20} color="var(--color-error)" />
            <p className="text-error text-sm">{error}</p>
            <button onClick={() => setError('')} className="ml-auto">
              <Icon name="X" size={16} color="var(--color-error)" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Icon name="CheckCircle" size={20} color="var(--color-success)" />
            <p className="text-success text-sm">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <Icon name="X" size={16} color="var(--color-success)" />
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading && (
            <div className="p-6">
              <div className="space-y-3">
                <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Facility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Registered On</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Icon name="User" size={20} color="var(--color-primary)" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-accent/10 text-accent' : user.role === 'care_home_manager' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                        }`}>
                          {user.roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {user.role === 'admin' && (!user.care_home_id || user.care_home_id === 'headoffice') 
                          ? '🏢 Head Office' 
                          : user.facility
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'Active' ? 'bg-success/10 text-success' :
                          user.status === 'Inactive' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.registeredOn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <Icon name={user.status === 'Active' ? 'UserX' : 'UserCheck'} size={18} />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-accent hover:text-accent/80 transition-colors"
                            title="Edit User"
                          >
                            <Icon name="Edit" size={18} />
                          </button>
                          <button
                            onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                            className="text-error hover:text-error/80 transition-colors"
                            title="Delete User"
                          >
                            <Icon name="Trash2" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Icon name="Users" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowAddModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Add New User</h2>
                    <button onClick={() => setShowAddModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={handleAddUser}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        type="text" 
                        label="Full Name" 
                        name="name"
                        placeholder="John Doe" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="email" 
                        label="Email Address" 
                        name="email"
                        placeholder="john@example.com" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                      />
                      
                      {/* Password field with show/hide and copy */}
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          label="Password" 
                          name="password"
                          placeholder="••••••••" 
                          value={formData.password}
                          onChange={handleInputChange}
                          required 
                        />
                        <div className="absolute right-2 top-8 flex gap-1">
                          {formData.password && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(formData.password, 'Password')}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Copy password"
                            >
                              <Icon name="Copy" size={16} color="var(--color-muted-foreground)" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} color="var(--color-muted-foreground)" />
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password field with show/hide */}
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          label="Confirm Password" 
                          name="confirmPassword"
                          placeholder="••••••••" 
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-8 p-1 hover:bg-muted rounded transition-colors"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          <Icon name={showConfirmPassword ? "EyeOff" : "Eye"} size={16} color="var(--color-muted-foreground)" />
                        </button>
                      </div>
                      <Select 
                        label="Role" 
                        value={formData.role}
                        onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                        options={role === 'care_home_manager' ? [
                          { value: '', label: 'Select Role' },
                          { value: 'staff', label: 'Staff' }
                        ] : [
                          { value: '', label: 'Select Role' },
                          { value: 'admin', label: 'Admin' },
                          { value: 'care_home_manager', label: 'Care Home Manager' },
                          { value: 'staff', label: 'Staff' }
                        ]}
                        required
                      />
                      <Select 
                        label="Care Home" 
                        value={formData.care_home_id}
                        onChange={(value) => setFormData(prev => ({ ...prev, care_home_id: value }))}
                        options={[
                          { value: '', label: 'Select Care Home' },
                          ...(formData.role === 'admin' ? [{ value: 'headoffice', label: '🏢 Head Office' }] : []),
                          ...careHomes.map(home => ({ value: home.id, label: home.name }))
                        ]}
                        disabled={role === 'care_home_manager'}
                      />
                      {formData.role === 'admin' && (
                        <p className="text-xs text-muted-foreground md:col-span-2 -mt-2">
                          Head Office admins can leave this empty or pick "🏢 Head Office"; staff and care home managers must choose a care home.
                        </p>
                      )}
                      <Input 
                        type="tel" 
                        label="Phone Number" 
                        name="phone"
                        placeholder="+44 1234 567890" 
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                      <Select 
                        label="Status" 
                        value={formData.status}
                        onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        options={[
                          { value: 'Active', label: 'Active' },
                          { value: 'Inactive', label: 'Inactive' }
                        ]}
                        required
                      />
                    </div>

                    {error && (
                      <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                        <Icon name="AlertCircle" size={18} color="var(--color-error)" />
                        <p className="text-error text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2">
                        <Icon name="CheckCircle" size={18} color="var(--color-success)" />
                        <p className="text-success text-sm">{success}</p>
                      </div>
                    )}

                    {/* Copy Credentials Button */}
                    {formData.email && formData.password && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Quick Copy Credentials</p>
                            <p className="text-xs text-slate-600">Copy email and password to send to the new user</p>
                          </div>
                          <button
                            type="button"
                            onClick={copyCredentials}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            <Icon name="Copy" size={16} />
                            Copy Both
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setShowAddModal(false); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowEditModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Edit User</h2>
                    <button onClick={() => setShowEditModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={handleUpdateUser}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        type="text" 
                        label="Full Name" 
                        placeholder="John Doe" 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required 
                      />
                      <Input 
                        type="email" 
                        label="Email Address" 
                        placeholder="john@example.com" 
                        value={formData.email}
                        disabled
                      />
                      <Select 
                        label="Role" 
                        value={formData.role}
                        onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                        options={role === 'care_home_manager' ? [
                          { value: 'staff', label: 'Staff' }
                        ] : [
                          { value: 'admin', label: 'Admin' },
                          { value: 'care_home_manager', label: 'Care Home Manager' },
                          { value: 'staff', label: 'Staff' }
                        ]}
                        required
                      />
                      <Select 
                        label="Care Home" 
                        value={formData.care_home_id}
                        onChange={(value) => setFormData(prev => ({ ...prev, care_home_id: value }))}
                        options={[
                          { value: '', label: 'Select Care Home' },
                          ...(formData.role === 'admin' ? [{ value: 'headoffice', label: '🏢 Head Office' }] : []),
                          ...careHomes.map(home => ({ value: home.id, label: home.name }))
                        ]}
                        required={formData.role === 'staff' || formData.role === 'care_home_manager'}
                        disabled={role === 'care_home_manager'}
                      />
                      <Input 
                        type="tel" 
                        label="Phone Number" 
                        placeholder="+44 1234 567890" 
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <Select 
                        label="Status" 
                        value={formData.status}
                        onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        options={[
                          { value: 'Active', label: 'Active' },
                          { value: 'Inactive', label: 'Inactive' }
                        ]}
                        required
                      />
                    </div>

                    {error && (
                      <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                        <Icon name="AlertCircle" size={18} color="var(--color-error)" />
                        <p className="text-error text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2">
                        <Icon name="CheckCircle" size={18} color="var(--color-success)" />
                        <p className="text-success text-sm">{success}</p>
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update User'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Toggle Status Confirmation Modal */}
        {showToggleModal && selectedUser && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowToggleModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-full mx-auto mb-4">
                    <Icon name="AlertTriangle" size={24} color="var(--color-warning)" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground text-center mb-2">
                    {selectedUser.status === 'Active' ? 'Deactivate User?' : 'Activate User?'}
                  </h2>
                  <p className="text-muted-foreground text-center mb-6">
                    {selectedUser.status === 'Active' 
                      ? `Are you sure you want to deactivate ${selectedUser.name}? They will not be able to login.`
                      : `Are you sure you want to activate ${selectedUser.name}? They will be able to login again.`
                    }
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowToggleModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={confirmToggleStatus} 
                      disabled={loading}
                      className={selectedUser.status === 'Active' ? 'bg-warning hover:bg-warning/90' : 'bg-success hover:bg-success/90'}
                    >
                      {loading ? 'Updating...' : (selectedUser.status === 'Active' ? 'Deactivate' : 'Activate')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteModal && selectedUser && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowDeleteModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-error/10 rounded-full mx-auto mb-4">
                    <Icon name="Trash2" size={24} color="var(--color-error)" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground text-center mb-2">Delete User?</h2>
                  <p className="text-muted-foreground text-center mb-2">
                    Are you sure you want to permanently delete <strong>{selectedUser.name}</strong>?
                  </p>
                  <p className="text-error text-sm text-center mb-6">
                    This action cannot be undone. Enter your password to confirm.
                  </p>
                  
                  <Input
                    type="password"
                    label="Your Password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />

                  {error && (
                    <div className="mt-4 p-2 bg-error/10 border border-error/20 rounded flex items-start gap-2">
                      <Icon name="AlertCircle" size={16} color="var(--color-error)" />
                      <p className="text-error text-sm">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setError(''); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDeleteUser} 
                      disabled={loading || !deletePassword}
                      className="bg-error hover:bg-error/90"
                    >
                      {loading ? 'Deleting...' : 'Delete User'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default UserManagement;
