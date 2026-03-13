import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, displayName, careHomeId, isAdmin, isCareHomeManager, isSuperAdmin, isOrgAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(0);
  const countdownRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [careHomeName, setCareHomeName] = useState(null);
  const userMenuRef = useRef(null);
  const adminMenuRef = useRef(null);

  // Fetch care home name from database using UUID
  useEffect(() => {
    const fetchCareHomeName = async () => {
      const isStaffLike = String(role || '').toLowerCase().includes('staff');
      if ((isStaffLike || isCareHomeManager) && careHomeId) {
        try {
          const { data, error } = await supabase
            .from('care_homes')
            .select('name')
            .eq('id', careHomeId)
            .single();
          
          if (error) {
            console.error('Error fetching care home:', error);
            setCareHomeName(null);
          } else {
            setCareHomeName(data?.name || null);
          }
        } catch (err) {
          console.error('Error fetching care home name:', err);
          setCareHomeName(null);
        }
      } else {
          setCareHomeName(null);
      }
    };

    fetchCareHomeName();
  }, [careHomeId, role]);

  // Main navigation items
  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Calendar', path: '/calendar', icon: 'CalendarDays' },
    { label: 'Activities', path: '/activities', icon: 'Activity' },
    { label: 'Sessions', path: '/sessions', icon: 'Calendar' },
    { label: 'Enrollments', path: '/enrollments', icon: 'Users' },
    { label: 'Expenses', path: '/expenses', icon: 'DollarSign' },
    { label: 'Audit Logs', path: '/audit-logs', icon: 'FileText' },
    { label: 'TV Display', path: '/tv-display-control', icon: 'Monitor' },
  ];

  // Staff-specific navigation
  const staffNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Calendar', path: '/calendar', icon: 'CalendarDays' },
    { label: 'Activities', path: '/activities', icon: 'Activity' },
    { label: 'Sessions', path: '/sessions', icon: 'Calendar' },
    { label: 'Enrollments', path: '/enrollments', icon: 'Users' },
    { label: 'Expenses', path: '/expenses', icon: 'DollarSign' },
    { label: 'Audit Logs', path: '/audit-logs', icon: 'FileText' },
  ];

  // Admin navigation items
  const adminNavItems = [
    { label: 'Users', path: '/admin/user-management', icon: 'Users' },
    { label: 'Care Homes', path: '/admin/care-home-management', icon: 'Building2' },
    { label: 'Residents', path: '/admin/resident-management', icon: 'UserCheck' },
  ];

  // Super Admin specific nav item
  const superAdminNavItem = { label: 'Super Admin', path: '/super-admin', icon: 'Shield' };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef?.current && !userMenuRef?.current?.contains(event?.target)) {
        setIsUserMenuOpen(false);
      }
      if (adminMenuRef?.current && !adminMenuRef?.current?.contains(event?.target)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const simulateConnection = () => {
      const statuses = ['connected', 'syncing', 'connected'];
      let index = 0;
      const interval = setInterval(() => {
        setConnectionStatus(statuses?.[index % statuses?.length]);
        index++;
      }, 5000);
      return interval;
    };

    const interval = simulateConnection();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'syncing':
        return 'bg-amber-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        {/* Top Row: Logo + Right Section */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 py-2">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Icon name="Activity" size={24} color="white" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Activity Planner</span>
                <span className="text-xs text-gray-500">Capital Care Homes</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {role === 'staff' && careHomeName && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <Icon name="Building2" size={16} className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{careHomeName}</span>
                </div>
              )}
              
              <div className="hidden lg:flex items-center gap-2 px-2 py-1" title={getStatusText()}>
                <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
                <span className="text-xs text-gray-500">{getStatusText()}</span>
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isUserMenuOpen ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  title={displayName || user?.email?.split('@')?.[0] || 'User'}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                    <Icon name="User" size={16} className="text-purple-600" />
                  </div>
                  <span className="hidden lg:inline text-sm font-semibold text-gray-700 truncate max-w-[100px] group-hover:text-purple-600 transition-colors">
                    {displayName || user?.email?.split('@')?.[0] || 'User'}
                  </span>
                  <Icon 
                    name={isUserMenuOpen ? 'ChevronUp' : 'ChevronDown'} 
                    size={16} 
                    className="hidden lg:block text-gray-400 transition-transform duration-300" 
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setIsUserMenuOpen(false); setIsChangePasswordOpen(true); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2"
                    >
                      <Icon name="Key" size={16} />
                      Change Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                      <Icon name="LogOut" size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                className={`lg:hidden p-2 rounded-lg transition-colors ${isMobileMenuOpen ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={20} className="text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation - Compact with Dropdowns */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-0.5 h-12">
              {/* Main Navigation Items */}
              {(isAdmin || isCareHomeManager || isSuperAdmin || isOrgAdmin) ? (
                <>
                  {/* Dashboard */}
                  <Link
                    to="/dashboard"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/dashboard')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Dashboard"
                  >
                    <Icon name="LayoutDashboard" size={16} />
                    <span className="hidden xl:inline">Dashboard</span>
                  </Link>

                  {/* Calendar */}
                  <Link
                    to="/calendar"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/calendar')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Calendar"
                  >
                    <Icon name="CalendarDays" size={16} />
                    <span className="hidden xl:inline">Calendar</span>
                  </Link>

                  {/* Activities */}
                  <Link
                    to="/activities"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/activities')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Activities"
                  >
                    <Icon name="Activity" size={16} />
                    <span className="hidden xl:inline">Activities</span>
                  </Link>

                  {/* Sessions */}
                  <Link
                    to="/sessions"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/sessions')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Sessions"
                  >
                    <Icon name="Calendar" size={16} />
                    <span className="hidden xl:inline">Sessions</span>
                  </Link>

                  {/* Enrollments */}
                  <Link
                    to="/enrollments"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/enrollments')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Enrollments"
                  >
                    <Icon name="Users" size={16} />
                    <span className="hidden xl:inline">Enrollments</span>
                  </Link>

                  {/* Expenses */}
                  <Link
                    to="/expenses"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/expenses')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Expenses"
                  >
                    <Icon name="DollarSign" size={16} />
                    <span className="hidden xl:inline">Expenses</span>
                  </Link>

                  {/* Audit Logs */}
                  <Link
                    to="/audit-logs"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/audit-logs')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="Audit Logs"
                  >
                    <Icon name="FileText" size={16} />
                    <span className="hidden xl:inline">Audit Logs</span>
                  </Link>

                  {/* TV Display */}
                  <Link
                    to="/tv-display-control"
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActivePath('/tv-display-control')
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title="TV Display"
                  >
                    <Icon name="Monitor" size={16} />
                    <span className="hidden xl:inline">TV Display</span>
                  </Link>

                  {/* Admin Menu */}
                  <div className="w-px h-6 bg-gray-300 mx-1"></div>
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                        isAdminMenuOpen
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title="Admin tools"
                      aria-expanded={isAdminMenuOpen}
                      aria-haspopup="true"
                    >
                      <Icon name="Settings" size={16} />
                      <span className="hidden xl:inline">Admin</span>
                      <Icon 
                        name={isAdminMenuOpen ? 'ChevronUp' : 'ChevronDown'} 
                        size={14} 
                        className="transition-transform duration-200"
                      />
                    </button>

                    {isAdminMenuOpen && (
                      <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {adminNavItems?.map((item, index) => (
                          <Link
                            key={item?.path}
                            to={item?.path}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                              index === 0 ? 'rounded-t-lg' : ''
                            } ${
                              index === adminNavItems.length - 1 && !isSuperAdmin ? 'rounded-b-lg' : ''
                            } ${
                              isActivePath(item?.path)
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => setIsAdminMenuOpen(false)}
                          >
                            <Icon name={item?.icon} size={16} />
                            <span>{item?.label}</span>
                          </Link>
                        ))}

                        {isSuperAdmin && (
                          <>
                            <div className="border-t border-gray-100 my-1"></div>
                            <Link
                              to="/super-admin"
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-b-lg transition-colors ${
                                isActivePath('/super-admin')
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'text-purple-600 hover:bg-purple-50'
                              }`}
                              onClick={() => setIsAdminMenuOpen(false)}
                            >
                              <Icon name="Shield" size={16} className="text-purple-600" />
                              <span>Super Admin</span>
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Staff Navigation - Compact */
                <>
                  <Link to="/dashboard" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/dashboard') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Dashboard">
                    <Icon name="LayoutDashboard" size={16} />
                    <span className="hidden xl:inline">Dashboard</span>
                  </Link>
                  <Link to="/calendar" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/calendar') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Calendar">
                    <Icon name="CalendarDays" size={16} />
                    <span className="hidden xl:inline">Calendar</span>
                  </Link>
                  <Link to="/activities" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/activities') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Activities">
                    <Icon name="Activity" size={16} />
                    <span className="hidden xl:inline">Activities</span>
                  </Link>
                  <Link to="/sessions" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/sessions') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Sessions">
                    <Icon name="Calendar" size={16} />
                    <span className="hidden xl:inline">Sessions</span>
                  </Link>
                  <Link to="/enrollments" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/enrollments') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Enrollments">
                    <Icon name="Users" size={16} />
                    <span className="hidden xl:inline">Enrollments</span>
                  </Link>
                  <Link to="/expenses" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/expenses') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Expenses">
                    <Icon name="DollarSign" size={16} />
                    <span className="hidden xl:inline">Expenses</span>
                  </Link>
                  <Link to="/audit-logs" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/audit-logs') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="Audit Logs">
                    <Icon name="FileText" size={16} />
                    <span className="hidden xl:inline">Audit Logs</span>
                  </Link>
                  <Link to="/tv-display-control" className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActivePath('/tv-display-control') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title="TV Display">
                    <Icon name="Monitor" size={16} />
                    <span className="hidden xl:inline">TV Display</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Change Password Modal */}
      {isChangePasswordOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[20000] flex items-center justify-center p-4" onClick={() => { if (!changeSuccess) setIsChangePasswordOpen(false); }}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <button onClick={() => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } setIsChangePasswordOpen(false); setChangeSuccess(false); setSuccessCountdown(0); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="p-2 rounded hover:bg-gray-100">
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Success overlay */}
            {changeSuccess && (
              <div className="absolute inset-0 flex items-center justify-center z-[20010] pointer-events-auto">
                <div className="absolute inset-0 bg-black/30 rounded-2xl pointer-events-none" />
                <div className="animate-in fade-in slide-in-from-top-2 bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-2xl ring-1 ring-gray-100 max-w-xs pointer-events-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Icon name="CheckCircle2" size={28} />
                  </div>
                  <div className="text-lg font-bold text-gray-900">Password updated</div>
                  <div className="text-sm text-gray-600">Your password has been changed successfully.</div>
                  <div className="text-xs text-gray-500 mt-1">Closing in {successCountdown}s</div>
                </div>
              </div>
            )} 

            {changeError && <div className="p-3 bg-red-50 border border-red-200 rounded mb-3 text-sm text-red-700">{changeError}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setChangeError('');
              setChangeSuccess(false);
              if (!currentPassword) return setChangeError('Enter your current password');
              if (!newPassword || newPassword.length < 8) return setChangeError('New password must be at least 8 characters');
              if (newPassword !== confirmPassword) return setChangeError('Passwords do not match');
              try {
                setChangeLoading(true);
                const email = user?.email;
                if (!email) throw new Error('Cannot verify user email');
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
                if (signInError) throw signInError;
                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
                if (updateError) throw updateError;
                setChangeSuccess(true);
                setSuccessCountdown(3);
                if (countdownRef.current) {
                  clearInterval(countdownRef.current);
                  countdownRef.current = null;
                }
                countdownRef.current = setInterval(() => {
                  setSuccessCountdown((prev) => {
                    if (prev <= 1) {
                      if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                      }
                      setIsChangePasswordOpen(false);
                      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setChangeSuccess(false);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
              } catch (err) {
                setChangeError(err?.message || 'Failed to change password');
              } finally {
                setChangeLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current password</label>
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    disabled={changeLoading || changeSuccess} 
                    className="w-full pr-10 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white" 
                  />
                  <button type="button" onClick={() => setShowCurrentPassword(s => !s)} className="absolute right-2 top-7 text-gray-500 hover:text-gray-700">
                    <Icon name={showCurrentPassword ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New password</label>
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    disabled={changeLoading || changeSuccess} 
                    className="w-full pr-10 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white" 
                  />
                  <button type="button" onClick={() => setShowNewPassword(s => !s)} className="absolute right-2 top-7 text-gray-500 hover:text-gray-700">
                    <Icon name={showNewPassword ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm new password</label>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    disabled={changeLoading || changeSuccess} 
                    className="w-full pr-10 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white" 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="absolute right-2 top-7 text-gray-500 hover:text-gray-700">
                    <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } setIsChangePasswordOpen(false); setChangeSuccess(false); setSuccessCountdown(0); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} 
                    disabled={changeLoading} 
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={changeLoading || changeSuccess} 
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${changeLoading ? 'bg-purple-400' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'}`}
                  >
                    {changeLoading ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 lg:hidden animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Icon name="Activity" size={20} color="white" />
                </div>
                <span className="font-bold text-gray-900">Activity Planner</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="p-2 hover:bg-gray-100 rounded-lg">
                <Icon name="X" size={24} className="text-gray-600" />
              </button>
            </div>

            <nav className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
              {navigationItems?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                    isActivePath(item?.path) ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon name={item?.icon} size={20} />
                  <span className="font-medium">{item?.label}</span>
                </Link>
              ))}

              {(isAdmin || isCareHomeManager || isSuperAdmin || isOrgAdmin) && (
                <>
                  <div className="border-t border-gray-200 my-4 pt-4">
                    <p className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Administration</p>
                    {adminNavItems?.map((item) => (
                      <Link
                        key={item?.path}
                        to={item?.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                          isActivePath(item?.path) ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon name={item?.icon} size={20} />
                        <span className="font-medium">{item?.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {isSuperAdmin && (
                <div className="border-t border-gray-200 my-4 pt-4">
                  <p className="px-4 text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wider">Super Admin</p>
                  <Link
                    to={superAdminNavItem.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                      isActivePath(superAdminNavItem.path) ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon name={superAdminNavItem.icon} size={20} className="text-purple-600" />
                    <span className="font-semibold">{superAdminNavItem.label}</span>
                  </Link>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="px-4 mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Connection Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
                    <span className="text-sm text-gray-700">{getStatusText()}</span>
                  </div>
                </div>

                <div className="px-4 space-y-2">
                  <button
                    onClick={() => { setIsChangePasswordOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium text-gray-700"
                  >
                    <Icon name="Key" size={16} />
                    Change Password
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Icon name="LogOut" size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
