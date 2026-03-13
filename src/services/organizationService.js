import supabase from './supabaseClient';

/**
 * Organization Service
 * Handles all CRUD operations for organizations, and cross-org queries for Super Admins
 */

// =====================================================
// ORGANIZATIONS
// =====================================================

export const getOrganizations = async () => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const getOrganizationById = async (id) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createOrganization = async (organization) => {
  const { data, error } = await supabase
    .from('organizations')
    .insert([{
      name: organization.name,
      slug: organization.slug || organization.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      logo_url: organization.logo_url || null,
      contact_name: organization.contact_name || null,
      contact_email: organization.contact_email || null,
      contact_phone: organization.contact_phone || null,
      billing_email: organization.billing_email || null,
      billing_address: organization.billing_address || null,
      billing_city: organization.billing_city || null,
      billing_postcode: organization.billing_postcode || null,
      billing_country: organization.billing_country || 'United Kingdom',
      subscription_plan: organization.subscription_plan || 'basic',
      subscription_status: organization.subscription_status || 'trial',
      trial_ends_at: organization.trial_ends_at || null,
      max_care_homes: organization.max_care_homes || 5,
      max_users: organization.max_users || 50,
      features: organization.features || { analytics: true, compliance_reports: true, meal_costing: true },
      is_active: organization.is_active !== false
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateOrganization = async (id, updates) => {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteOrganization = async (id) => {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// =====================================================
// CARE HOMES (Cross-Organization for Super Admin)
// =====================================================

export const getAllCareHomes = async () => {
  // Use simple select first, then enrich with org data if available
  const { data, error } = await supabase
    .from('care_homes')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  
  // If we have care homes with organization_ids, fetch org names
  if (data && data.length > 0) {
    const orgIds = [...new Set(data.filter(ch => ch.organization_id).map(ch => ch.organization_id))];
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);
      
      const orgMap = (orgs || []).reduce((acc, org) => ({ ...acc, [org.id]: org }), {});
      return data.map(ch => ({
        ...ch,
        organizations: ch.organization_id ? orgMap[ch.organization_id] || null : null
      }));
    }
  }
  
  return data?.map(ch => ({ ...ch, organizations: null })) || [];
};

export const getCareHomesByOrganization = async (organizationId) => {
  const { data, error } = await supabase
    .from('care_homes')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const createCareHome = async (careHome) => {
  const { data, error } = await supabase
    .from('care_homes')
    .insert([{
      organization_id: careHome.organization_id,
      name: careHome.name,
      location: careHome.location,
      address: careHome.address,
      postcode: careHome.postcode || null,
      phone: careHome.phone || null,
      email: careHome.email || null,
      manager_name: careHome.manager_name || null,
      capacity: careHome.capacity || 0,
      current_residents: careHome.current_residents || 0,
      status: careHome.status || 'Active',
      notes: careHome.notes || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCareHome = async (id, updates) => {
  const { data, error } = await supabase
    .from('care_homes')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCareHome = async (id) => {
  const { error } = await supabase
    .from('care_homes')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// =====================================================
// USERS (Cross-Organization for Super Admin)
// =====================================================

export const getAllUsers = async () => {
  // Simple select to avoid join issues with null FKs
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Enrich with org and care home names
  if (data && data.length > 0) {
    const orgIds = [...new Set(data.filter(u => u.organization_id).map(u => u.organization_id))];
    const chIds = [...new Set(data.filter(u => u.care_home_id).map(u => u.care_home_id))];
    
    let orgMap = {};
    let chMap = {};
    
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase.from('organizations').select('id, name, slug').in('id', orgIds);
      orgMap = (orgs || []).reduce((acc, org) => ({ ...acc, [org.id]: org }), {});
    }
    
    if (chIds.length > 0) {
      const { data: chs } = await supabase.from('care_homes').select('id, name').in('id', chIds);
      chMap = (chs || []).reduce((acc, ch) => ({ ...acc, [ch.id]: ch }), {});
    }
    
    return data.map(u => ({
      ...u,
      organizations: u.organization_id ? orgMap[u.organization_id] || null : null,
      care_homes: u.care_home_id ? chMap[u.care_home_id] || null : null
    }));
  }
  
  return data?.map(u => ({ ...u, organizations: null, care_homes: null })) || [];
};

export const getUsersByOrganization = async (organizationId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      care_homes (id, name)
    `)
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

export const updateUserProfile = async (id, updates) => {
  // Validate and normalize role if provided
  const VALID_ROLES = ['Super Admin', 'Organization Admin', 'Care Home Manager', 'Care Home Staff', 'admin', 'staff'];
  
  // Clean and validate the role
  if (updates.role !== undefined && updates.role !== null && updates.role !== '') {
    const cleanedRole = String(updates.role).trim();
    
    console.log('UpdateUserProfile - Original role:', JSON.stringify(updates.role));
    console.log('UpdateUserProfile - Cleaned role:', JSON.stringify(cleanedRole));
    console.log('UpdateUserProfile - Valid roles:', VALID_ROLES);
    
    if (!VALID_ROLES.includes(cleanedRole)) {
      console.error(`❌ Invalid role "${cleanedRole}". Allowed roles:`, VALID_ROLES);
      throw new Error(`Invalid role "${cleanedRole}". Must be one of: ${VALID_ROLES.join(', ')}`);
    }
    
    // Use the cleaned role
    updates.role = cleanedRole;
  }

  console.log('UpdateUserProfile - Final update object:', updates);

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ UpdateUserProfile database error:', error);
    console.error('Error message:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
  console.log('✅ User profile updated successfully');
  return data;
};

export const createUser = async (email, password, name, organizationId, careHomeId, role) => {
  // Validate role
  const VALID_ROLES = ['Super Admin', 'Organization Admin', 'Care Home Manager', 'Care Home Staff', 'admin', 'staff'];
  const normalizedRole = role && VALID_ROLES.includes(role) ? role : 'Care Home Staff';
  
  if (role && !VALID_ROLES.includes(role)) {
    console.warn(`Role "${role}" not valid, using "Care Home Staff" instead`);
  }

  // Prevent signUp from replacing the current session in-browser:
  // Save current session tokens, perform signUp, then restore previous session.
  const { data: current } = await supabase.auth.getSession();
  const prevSession = current?.session || null;

  let authData;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          organization_id: organizationId || null,
          care_home_id: careHomeId || null,
          role: normalizedRole
        }
      }
    });
    if (error) throw error;
    authData = data;
  } finally {
    // Restore previous session if we had one
    if (prevSession && prevSession.access_token && prevSession.refresh_token) {
      try {
        await supabase.auth.setSession({
          access_token: prevSession.access_token,
          refresh_token: prevSession.refresh_token
        });
      } catch (err) {
        // non-fatal: log and continue
        console.error('Failed to restore session after signUp:', err);
      }
    }
  }

  // The database trigger (handle_new_user) automatically creates the user_profiles entry
  // We just need to verify it was created and return the profile
  const newUserId = authData?.user?.id || authData?.id || null;
  
  if (!newUserId) {
    throw new Error('User creation failed: No user ID returned');
  }

  // Wait a moment for the trigger to complete, then fetch the profile
  await new Promise(resolve => setTimeout(resolve, 500));

  // Fetch the created profile
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', newUserId)
    .single();

  // If profile doesn't exist yet (trigger might have failed), create it manually
  if (profileError || !profileData) {
    console.log('Profile not found after signup, creating manually...');
    const { data: manualProfile, error: insertError } = await supabase
      .from('user_profiles')
      .upsert([{
        id: newUserId,
        email,
        name,
        organization_id: organizationId || null,
        care_home_id: careHomeId || null,
        role: normalizedRole,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' })
      .select()
      .single();

    if (insertError) {
      console.error('Manual profile creation failed:', insertError);
      throw new Error(`Profile creation failed: ${insertError.message}`);
    }
    return manualProfile;
  }

  return profileData;
};

// =====================================================
// STATISTICS (For Super Admin Dashboard)
// =====================================================

export const getSuperAdminStats = async () => {
  try {
    // Get organizations count
    const { count: orgCount, error: orgError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    // Get care homes count
    const { count: careHomeCount, error: chError } = await supabase
      .from('care_homes')
      .select('*', { count: 'exact', head: true });

    // Get users count
    const { count: userCount, error: userError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get residents count
    const { count: residentCount, error: resError } = await supabase
      .from('residents')
      .select('*', { count: 'exact', head: true });

    // Get active subscriptions
    const { count: activeSubCount, error: subError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

    // Get trial subscriptions
    const { count: trialCount, error: trialError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'trial');

    return {
      organizations: orgCount || 0,
      careHomes: careHomeCount || 0,
      users: userCount || 0,
      residents: residentCount || 0,
      activeSubscriptions: activeSubCount || 0,
      trialSubscriptions: trialCount || 0
    };
  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    return {
      organizations: 0,
      careHomes: 0,
      users: 0,
      residents: 0,
      activeSubscriptions: 0,
      trialSubscriptions: 0
    };
  }
};

export const getRecentActivity = async (limit = 10) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      care_homes (name)
    `)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

export default {
  // Organizations
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  // Care Homes
  getAllCareHomes,
  getCareHomesByOrganization,
  createCareHome,
  updateCareHome,
  deleteCareHome,
  // Users
  getAllUsers,
  getUsersByOrganization,
  updateUserProfile,
  // Stats
  getSuperAdminStats,
  getRecentActivity
};
