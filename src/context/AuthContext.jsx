import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [careHomeId, setCareHomeId] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          console.log('User ID:', session.user.id);
          
          // Use user_metadata for role/name (instantly available, no DB query)
          const userRole = session.user?.user_metadata?.role || 'staff';
          const userName = session.user?.user_metadata?.name || session.user?.email?.split('@')?.[0] || 'User';
          const userCareHome = session.user?.user_metadata?.care_home_id || null;
          const userOrganization = session.user?.user_metadata?.organization_id || null;
          
          console.log('Role from metadata:', userRole);
          setRole(userRole);
          setDisplayName(userName);
          setCareHomeId(userCareHome);
          setOrganizationId(userOrganization);
          
          // Fetch full profile async in background (won't block loading)
          supabase
            .from('user_profiles')
            .select('role, name, care_home_id, organization_id, status')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile, error }) => {
              if (!isMounted) return;
              
              if (profile && !error) {
                console.log('Updated from DB profile:', profile);
                // Update with actual DB values if different
                if (profile.role && profile.role !== userRole) {
                  setRole(profile.role);
                }
                if (profile.name && profile.name !== userName) {
                  setDisplayName(profile.name);
                }
                if (profile.care_home_id && profile.care_home_id !== userCareHome) {
                  setCareHomeId(profile.care_home_id);
                }
                if (profile.organization_id && profile.organization_id !== userOrganization) {
                  setOrganizationId(profile.organization_id);
                }
                // Store user status
                if (profile.status) {
                  setUserStatus(profile.status);
                }
              }
              // Mark status as loaded even on error to avoid infinite loading
              setStatusLoaded(true);
            })
            .catch(err => {
              console.warn('Background profile fetch failed:', err);
              setStatusLoaded(true);
            });
          
          setIsLoading(false);
        } else {
          setUser(null);
          setRole(null);
          setDisplayName('');
          setCareHomeId(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) {
          setUser(null);
          setRole(null);
          setDisplayName('');
          setCareHomeId(null);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        console.log('Auth change - User ID:', session.user.id);
        
        // Use user_metadata for role/name (instantly available, no DB query)
        const userRole = session.user?.user_metadata?.role || 'staff';
        const userName = session.user?.user_metadata?.name || session.user?.email?.split('@')?.[0] || 'User';
        const userCareHome = session.user?.user_metadata?.care_home_id || null;
        const userOrganization = session.user?.user_metadata?.organization_id || null;
        
        console.log('Auth change - Role from metadata:', userRole);
        setRole(userRole);
        setDisplayName(userName);
        setCareHomeId(userCareHome);
        setOrganizationId(userOrganization);
        setIsLoading(false);
        
        // Fetch full profile async in background (won't block loading)
        supabase
          .from('user_profiles')
          .select('role, name, care_home_id, organization_id, status')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (!isMounted) return;
            
            if (profile && !error) {
              console.log('Auth change - Updated from DB profile:', profile);
              // Update with actual DB values if different
                if (profile.role && profile.role !== userRole) {
                setRole(profile.role);
              }
              if (profile.name && profile.name !== userName) {
                setDisplayName(profile.name);
              }
                if (profile.care_home_id && profile.care_home_id !== userCareHome) {
                  setCareHomeId(profile.care_home_id);
                }
                if (profile.organization_id && profile.organization_id !== userOrganization) {
                  setOrganizationId(profile.organization_id);
                }
              // Store user status
              if (profile.status) {
                setUserStatus(profile.status);
              }
            }
            // Mark status as loaded even on error to avoid infinite loading
            setStatusLoaded(true);
          })
          .catch(err => {
            console.warn('Auth change - Background profile fetch failed:', err);
            setStatusLoaded(true);
          });
      } else {
        setUser(null);
        setRole(null);
        setDisplayName('');
        setCareHomeId(null);
        setUserStatus(null);
        setStatusLoaded(false);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const logout = async () => {
    // Try normal sign out first
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('supabase.signOut returned error:', error);
    } catch (err) {
      console.warn('supabase.signOut threw error:', err);
    }

    // Verify session cleared server-side; if not, force local cleanup.
    try {
      const { data } = await supabase.auth.getSession();
      const stillSession = data?.session;
      if (stillSession?.user) {
        console.warn('Session still present after signOut, forcing local cleanup');
      }
    } catch (err) {
      // ignore errors from getSession
    }

    // Robust cleanup: remove any Supabase auth keys that may remain in localStorage
    try {
      Object.keys(localStorage).forEach((key) => {
        if (typeof key === 'string' && (
          key.startsWith('supabase') || key.includes('supabase') || key.startsWith('sb:') || key.includes('supa') || key.includes('sb-')
        )) {
          try { localStorage.removeItem(key); } catch { /* ignore */ }
        }
      });
      // Also try a broad remove of commonly used keys
      ['supabase.auth.token', 'supabase.auth', 'sb-access-token', 'sb-refresh-token'].forEach(k => { try { localStorage.removeItem(k); } catch {} });
      // Broadcast sign-out to other tabs
      try { localStorage.setItem('app:signed_out', String(Date.now())); } catch {}
    } catch (e) {
      console.warn('Failed clearing localStorage auth keys:', e);
    }

    // Also clear cookies (best-effort) since some environments may persist tokens there
    try {
      document.cookie.split(';').forEach(function(c) {
        const name = c.split('=')[0].trim();
        // expire cookie
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
      });
    } catch (e) {
      // ignore cookie clearing errors
    }

    // Reset in-memory state
    setUser(null);
    setRole(null);
    setDisplayName('');
    setCareHomeId(null);
    setUserStatus(null);
    setStatusLoaded(false);

    // Redirect to login (or reload) to ensure UI shows signed-out state
    try {
      // Prefer explicit navigation to login so SPA route handlers run
      window.location.href = '/login';
    } catch (err) {
      try { window.location.reload(); } catch { /* ignore */ }
    }
  };

  const value = {
    user,
    role,
    displayName,
    careHomeId,
    organizationId,
    userStatus,
    statusLoaded,
    isLoading,
    login,
    logout,
    isAdmin: role === 'admin' || role === 'Super Admin' || role === 'Organization Admin',
    isSuperAdmin: role === 'Super Admin',
    isOrgAdmin: role === 'Organization Admin' || role === 'admin',
    isCareHomeManager: role === 'Care Home Manager' || role === 'care_home_manager',
    // Default to active unless explicitly marked inactive
    isActive: userStatus !== 'Inactive',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
