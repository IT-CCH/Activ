import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';
import ActivityMediaUploader from '../../components/activities/ActivityMediaUploader';
import BulletTextarea from '../../components/activities/BulletTextarea';
import RichTextEditor from '../../components/activities/RichTextEditor';
import sanitizeHtml from '../../utils/sanitizeHtml';
import Swal from 'sweetalert2';

const ActivitiesCalendar = () => {
  const { user, careHomeId, isSuperAdmin, organizationId } = useAuth();
  const [allActivities, setAllActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [supportsImageUrlColumn, setSupportsImageUrlColumn] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mediaItems, setMediaItems] = useState([]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const mouseDownOnBackdrop = useRef(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', description: '' });
  const [adminCareHomes, setAdminCareHomes] = useState([]);
  const [selectedCareHomeForActivity, setSelectedCareHomeForActivity] = useState('');
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    objective: '',
    duration_minutes: 60,
    max_participants: '',
    location: '',
    materials_needed: '',
    instructions: '',
    benefits: '',
    image_url: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, [careHomeId]);

  useEffect(() => {
    const fetchAdminCareHomes = async () => {
      if (!isSuperAdmin) {
        setAdminCareHomes([]);
        return;
      }

      try {
        let query = supabase
          .from('care_homes')
          .select('id, name, organization_id')
          .order('name', { ascending: true });

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAdminCareHomes(data || []);
      } catch (err) {
        console.error('Error loading care homes for super admin:', err);
      }
    };

    fetchAdminCareHomes();
  }, [isSuperAdmin, organizationId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchAllActivities()
    ]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log('Fetched categories:', data);
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchAllActivities = async () => {
    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          activity_categories(name, color_code),
          activity_media(
            id,
            media_type,
            title,
            tagline,
            description,
            file_path,
            file_name,
            file_size,
            mime_type,
            thumbnail_url,
            external_url,
            youtube_video_id,
            is_primary,
            display_order,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setAllActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryData.name.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Category name required',
        text: 'Please enter a category name.'
      });
      return;
    }

    // Get care_home_id from user object or careHomeId
    let care_home_id = user?.care_home_id || careHomeId;
    
    // If no care_home_id, try to get the first available care home
    if (!care_home_id) {
      try {
        const { data: careHomes, error } = await supabase
          .from('care_homes')
          .select('id')
          .limit(1)
          .single();
        
        if (!error && careHomes) {
          care_home_id = careHomes.id;
          console.log('Using first available care home:', care_home_id);
        }
      } catch (err) {
        console.error('Error fetching care home:', err);
      }
    }
    
    console.log('Creating category with:', { care_home_id, user, careHomeId });

    if (!care_home_id) {
      await Swal.fire({
        icon: 'error',
        title: 'Care home not found',
        text: 'Please ensure you are logged in properly or create a care home first.'
      });
      return;
    }

    // Check if category with this name already exists
    try {
      const { data: existingCategory } = await supabase
        .from('activity_categories')
        .select('id, name')
        .eq('care_home_id', care_home_id)
        .eq('name', newCategoryData.name.trim())
        .maybeSingle();

      if (existingCategory) {
        await Swal.fire({
          icon: 'warning',
          title: 'Category already exists',
          text: `Category "${newCategoryData.name.trim()}" already exists. Please use a different name.`
        });
        return;
      }
    } catch (checkErr) {
      console.warn('Error checking for duplicate category:', checkErr);
      // Continue with creation if check fails
    }

    try {
      const { data, error } = await supabase
        .from('activity_categories')
        .insert([{
          care_home_id: care_home_id,
          name: newCategoryData.name.trim(),
          description: newCategoryData.description.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Add new category to the list and select it
      setCategories(prev => [...prev, data]);
      setFormData({...formData, category_id: data.id});
      
      // Reset and hide form
      setNewCategoryData({ name: '', description: '' });
      setShowNewCategoryForm(false);
      
      await Swal.fire({
        icon: 'success',
        title: 'Category created',
        text: 'Category created successfully!'
      });
    } catch (err) {
      console.error('Error creating category:', err);
      if (err.code === '23505') {
        await Swal.fire({
          icon: 'warning',
          title: 'Category already exists',
          text: 'A category with this name already exists. Please use a different name.'
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to create category',
          text: err.message
        });
      }
    }
  };

  const resetActivityForm = () => {
    setFormData({
      category_id: '',
      name: '',
      description: '',
      objective: '',
      duration_minutes: 60,
      max_participants: '',
      location: '',
      materials_needed: '',
      instructions: '',
      benefits: '',
      image_url: '',
      status: 'active'
    });
    setMediaItems([]);
    setEditingActivityId(null);
    setShowNewCategoryForm(false);
    setSelectedCareHomeForActivity(careHomeId || user?.care_home_id || '');
  };

  const handleOpenAddModal = () => {
    resetActivityForm();
    if (isSuperAdmin) {
      setSelectedCareHomeForActivity(careHomeId || user?.care_home_id || '');
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = () => {
    if (!showActivityDetail) return;

    setEditingActivityId(showActivityDetail.id);
    setFormData({
      category_id: showActivityDetail.category_id || '',
      name: showActivityDetail.name || '',
      description: showActivityDetail.description || '',
      objective: showActivityDetail.objective || '',
      duration_minutes: showActivityDetail.duration_minutes || 60,
      max_participants: showActivityDetail.max_participants || '',
      location: showActivityDetail.location || '',
      materials_needed: showActivityDetail.materials_needed || '',
      instructions: showActivityDetail.instructions || '',
      benefits: showActivityDetail.benefits || '',
      image_url: showActivityDetail.image_url || '',
      status: showActivityDetail.status || 'active'
    });
    setSelectedCareHomeForActivity(showActivityDetail.care_home_id || '');
    setMediaItems(showActivityDetail.activity_media || []);
    setShowActivityDetail(null);
    setShowAddModal(true);
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailUploading(true);
    try {
      let care_home_id = selectedCareHomeForActivity || user?.care_home_id || careHomeId;
      if (!care_home_id) {
        const { data: careHomes, error: chError } = await supabase
          .from('care_homes')
          .select('id')
          .limit(1)
          .single();
        if (!chError && careHomes) {
          care_home_id = careHomes.id;
        }
      }

      if (!care_home_id) {
        await Swal.fire({
          icon: 'error',
          title: 'Care home not found',
          text: 'Cannot upload thumbnail.'
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
      const storageScope = care_home_id || 'shared';
      const filePath = `${storageScope}/thumbnail/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('activity-media')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (err) {
      console.error('Thumbnail upload error:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Thumbnail upload failed',
        text: err.message
      });
    } finally {
      setThumbnailUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    try {
      const isUpdate = Boolean(editingActivityId);

      // Validate that category_id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.category_id)) {
        await Swal.fire({
          icon: 'warning',
          title: 'Invalid category',
          text: 'Please select a valid category.'
        });
        return;
      }
      
      // Get care_home_id from user object or careHomeId
      let care_home_id = user?.care_home_id || careHomeId;
      
      // If no care_home_id, try to get the first available care home
      if (!care_home_id) {
        const { data: careHomes, error: chError } = await supabase
          .from('care_homes')
          .select('id')
          .limit(1)
          .single();
        
        if (!chError && careHomes) {
          care_home_id = careHomes.id;
        }
      }
      
      if (!care_home_id && !isSuperAdmin) {
        await Swal.fire({
          icon: 'error',
          title: 'Care home not found',
          text: 'Please ensure you are logged in properly or create a care home first.'
        });
        return;
      }

      const resolvedCareHomeId = isSuperAdmin
        ? (selectedCareHomeForActivity || care_home_id || null)
        : (care_home_id || null);

      const payload = {
        ...formData,
        care_home_id: resolvedCareHomeId,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : 60,
      };

      if (!supportsImageUrlColumn) {
        delete payload.image_url;
      }

      let activityData;
      try {
        if (editingActivityId) {
          const { data, error } = await supabase
            .from('activities')
            .update(payload)
            .eq('id', editingActivityId)
            .select()
            .single();
          if (error) throw error;
          activityData = data;
        } else {
          const { data, error } = await supabase
            .from('activities')
            .insert([{ ...payload, created_by: user?.id }])
            .select()
            .single();
          if (error) throw error;
          activityData = data;
        }
      } catch (activityErr) {
        const missingImageColumn = String(activityErr?.message || '').toLowerCase().includes("could not find the 'image_url' column")
          || String(activityErr?.message || '').toLowerCase().includes('image_url') && String(activityErr?.message || '').toLowerCase().includes('schema cache');

        if (!missingImageColumn) {
          throw activityErr;
        }

        setSupportsImageUrlColumn(false);

        const payloadWithoutImage = { ...payload };
        delete payloadWithoutImage.image_url;

        if (editingActivityId) {
          const { data, error } = await supabase
            .from('activities')
            .update(payloadWithoutImage)
            .eq('id', editingActivityId)
            .select()
            .single();
          if (error) throw error;
          activityData = data;
        } else {
          const { data, error } = await supabase
            .from('activities')
            .insert([{ ...payloadWithoutImage, created_by: user?.id }])
            .select()
            .single();
          if (error) throw error;
          activityData = data;
        }

        await Swal.fire({
          icon: 'warning',
          title: 'Saved with limitation',
          text: 'Activity saved, but thumbnail cannot be stored until image_url column is added to activities table.'
        });
      }

      const activityId = activityData.id;

      if (editingActivityId) {
        const { data: currentDbMedia, error: mediaFetchError } = await supabase
          .from('activity_media')
          .select('id')
          .eq('activity_id', activityId);
        if (mediaFetchError) throw mediaFetchError;

        const existingInForm = mediaItems.filter(item => !String(item.id).startsWith('temp_'));
        const existingIdsInForm = new Set(existingInForm.map(item => item.id));
        const idsToDelete = (currentDbMedia || [])
          .filter(item => !existingIdsInForm.has(item.id))
          .map(item => item.id);

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('activity_media')
            .delete()
            .in('id', idsToDelete);
          if (deleteError) throw deleteError;
        }

        for (let i = 0; i < existingInForm.length; i++) {
          const item = existingInForm[i];
          const { error: updateMediaError } = await supabase
            .from('activity_media')
            .update({
              media_type: item.media_type,
              title: item.title,
              tagline: item.tagline,
              description: item.description,
              file_path: item.file_path,
              file_name: item.file_name,
              file_size: item.file_size,
              mime_type: item.mime_type,
              external_url: item.external_url,
              youtube_video_id: item.youtube_video_id,
              thumbnail_url: item.thumbnail_url,
              display_order: i,
              is_primary: Boolean(item.is_primary)
            })
            .eq('id', item.id);
          if (updateMediaError) throw updateMediaError;
        }
      }

      const newMediaItems = mediaItems.filter(item => String(item.id).startsWith('temp_'));
      if (newMediaItems.length > 0) {
        const mediaCareHomeId = resolvedCareHomeId || selectedCareHomeForActivity || care_home_id;
        if (!mediaCareHomeId) {
          await Swal.fire({
            icon: 'warning',
            title: 'Media needs care home scope',
            text: 'Please choose a care home to save attached media for this activity.'
          });
          return;
        }

        const mediaToInsert = newMediaItems.map((item, index) => ({
          activity_id: activityId,
          care_home_id: mediaCareHomeId,
          media_type: item.media_type,
          title: item.title,
          tagline: item.tagline,
          description: item.description,
          file_path: item.file_path,
          file_name: item.file_name,
          file_size: item.file_size,
          mime_type: item.mime_type,
          external_url: item.external_url,
          youtube_video_id: item.youtube_video_id,
          thumbnail_url: item.thumbnail_url,
          display_order: index,
          is_primary: Boolean(item.is_primary),
          created_by: user?.id
        }));

        const { error: mediaError } = await supabase
          .from('activity_media')
          .insert(mediaToInsert);

        if (mediaError) throw mediaError;
      }

      resetActivityForm();
      setShowAddModal(false);
      await fetchAllActivities();

      writeAuditLog({ tableName: 'activities', recordId: activityData?.id, action: isUpdate ? 'UPDATE' : 'INSERT', newValues: activityData });

      await Swal.fire({
        icon: 'success',
        title: isUpdate ? 'Updated successfully' : 'Saved successfully',
        text: isUpdate ? 'Activity has been updated successfully.' : 'Activity has been saved successfully.',
        confirmButtonText: 'OK',
        allowOutsideClick: true
      });
    } catch (err) {
      console.error('Error saving activity:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to save activity',
        text: err.message
      });
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Delete this activity? This will also remove all related sessions.')) return;
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAllActivities();
      writeAuditLog({ tableName: 'activities', recordId: id, action: 'DELETE' });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete activity',
        text: err.message
      });
    }
  };

  const filteredActivities = allActivities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || activity.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getMediaLink = (item) => {
    if (!item) return null;
    if (item.media_type === 'youtube' && item.youtube_video_id) {
      return `https://www.youtube.com/watch?v=${item.youtube_video_id}`;
    }
    return item.external_url || null;
  };

  const getMediaThumb = (item) => {
    if (!item) return null;
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.media_type === 'youtube' && item.youtube_video_id) {
      return `https://img.youtube.com/vi/${item.youtube_video_id}/hqdefault.jpg`;
    }
    return null;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading activities...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Activities
              </h1>
              <p className="text-gray-600">Manage and create activities for residents</p>
            </div>
          </motion.div>

          {/* All Activities Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                <Icon name="Grid" size={28} className="text-indigo-600" />
                All Activities
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition shadow-xl hover:shadow-2xl font-semibold"
              >
                <Icon name="Plus" size={22} />
                Add New Activity
              </motion.button>
            </div>

            {/* Search and Filter */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-lg p-6 mb-6 border border-indigo-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Icon name="Search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-4 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm font-medium"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </motion.div>

            {/* Activities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all border border-gray-100 cursor-pointer"
                  onClick={() => setShowActivityDetail(activity)}
                >
                  {/* Activity Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={activity.image_url || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80'}
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <span
                      className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm"
                      style={{
                        backgroundColor: activity.activity_categories?.color_code + 'dd',
                        color: '#ffffff'
                      }}
                    >
                      {activity.activity_categories?.name}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 leading-tight">
                      {activity.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-lg">
                        <Icon name="Clock" size={16} className="text-blue-600" />
                        <span className="font-semibold text-blue-700">{activity.duration_minutes} min</span>
                      </span>
                      {activity.max_participants && (
                        <span className="flex items-center gap-1.5 bg-purple-50 px-3 py-2 rounded-lg">
                          <Icon name="Users" size={16} className="text-purple-600" />
                          <span className="font-semibold text-purple-700">Max {activity.max_participants}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Icon name="MapPin" size={16} className="text-gray-400" />
                        <span>{activity.location}</span>
                      </div>
                      <div className="text-indigo-600 font-semibold text-sm flex items-center gap-1">
                        View Details
                        <Icon name="ChevronRight" size={16} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-16 text-center border border-gray-200"
              >
                <Icon name="Search" size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-xl font-semibold">No activities found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Add Activity Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownOnBackdrop.current = true; }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
                setShowAddModal(false);
                resetActivityForm();
              }
              mouseDownOnBackdrop.current = false;
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onMouseDown={(e) => { mouseDownOnBackdrop.current = false; }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-8"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {editingActivityId ? 'Edit Activity' : 'Add New Activity'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingActivityId ? 'Update activity details, thumbnail, and media' : 'Create a new activity for residents'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetActivityForm();
                  }}
                  className="p-2 hover:bg-white rounded-xl transition shadow-sm"
                >
                  <Icon name="X" size={24} className="text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSaveActivity} className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 12rem)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Icon name="Tag" size={16} className="text-indigo-600" />
                        Category *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Icon name={showNewCategoryForm ? "X" : "Plus"} size={16} />
                        {showNewCategoryForm ? 'Cancel' : 'New Category'}
                      </button>
                    </div>
                    
                    {!showNewCategoryForm ? (
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        required={!showNewCategoryForm}
                      >
                        <option value="">Select category</option>
                        {categories.filter(cat => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat.id)).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-3 p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category Name *</label>
                          <input
                            type="text"
                            value={newCategoryData.name}
                            onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., Physical Exercise"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                          <textarea
                            value={newCategoryData.description}
                            onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Brief description"
                            rows={2}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateNewCategory}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Icon name="Check" size={18} />
                          Create Category
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Type" size={16} className="text-indigo-600" />
                      Activity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="e.g., Painting Workshop"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="FileText" size={16} className="text-indigo-600" />
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Brief description of the activity"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Target" size={16} className="text-indigo-600" />
                      Objective
                    </label>
                    <BulletTextarea
                      value={formData.objective}
                      onChange={(val) => setFormData({...formData, objective: val})}
                      mode="bullet"
                      placeholder="What are the goals of this activity?"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="ListChecks" size={16} className="text-indigo-600" />
                      Instructions
                    </label>
                    <BulletTextarea
                      value={formData.instructions}
                      onChange={(val) => setFormData({...formData, instructions: val})}
                      mode="number"
                      placeholder="Step-by-step instructions on how to conduct the activity"
                      rows={4}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Package" size={16} className="text-indigo-600" />
                      Materials Needed
                    </label>
                    <BulletTextarea
                      value={formData.materials_needed}
                      onChange={(val) => setFormData({...formData, materials_needed: val})}
                      mode="number"
                      placeholder="List of materials required"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Heart" size={16} className="text-indigo-600" />
                      Benefits
                    </label>
                    <RichTextEditor
                      value={formData.benefits}
                      onChange={(val) => setFormData({...formData, benefits: val})}
                      placeholder="Benefits for residents"
                      minHeight="80px"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Clock" size={16} className="text-indigo-600" />
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Users" size={16} className="text-indigo-600" />
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Optional"
                      min="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="MapPin" size={16} className="text-indigo-600" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="e.g., Main Hall, Garden, etc."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Image" size={16} className="text-indigo-600" />
                      Activity Thumbnail
                    </label>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="w-36 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        {formData.image_url ? (
                          <img src={formData.image_url} alt="Activity thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400 px-2 text-center">No thumbnail</span>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer text-sm font-medium">
                          <Icon name="Upload" size={16} />
                          {thumbnailUploading ? 'Uploading...' : 'Upload Thumbnail'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                            disabled={thumbnailUploading}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">This image is shown on activity cards and modal header.</p>
                        {formData.image_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image_url: '' })}
                            className="text-xs text-red-600 hover:text-red-700 mt-2"
                          >
                            Remove thumbnail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Media Upload Section */}
                <div className="border-t-2 border-gray-100 pt-6 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Icon name="Paperclip" size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Activity Resources & Media</h3>
                      <p className="text-sm text-gray-500">Add guided videos, photos, PDFs, presentations, or links</p>
                    </div>
                  </div>
                  <ActivityMediaUploader
                    careHomeId={careHomeId || user?.care_home_id || 'global'}
                    existingMedia={mediaItems}
                    onMediaChange={setMediaItems}
                  />
                </div>

                
                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowAddModal(false);
                      resetActivityForm();
                    }}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <Icon name={editingActivityId ? 'Save' : 'Plus'} size={20} />
                    {editingActivityId ? 'Save Changes' : 'Add Activity'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {showActivityDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownOnBackdrop.current = true; }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
                setShowActivityDetail(null);
              }
              mouseDownOnBackdrop.current = false;
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onMouseDown={(e) => { mouseDownOnBackdrop.current = false; }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden"
            >
              {/* Modal Header with Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={showActivityDetail.image_url || 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80'}
                  alt={showActivityDetail.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <button
                  onClick={() => setShowActivityDetail(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition shadow-lg"
                >
                  <Icon name="X" size={24} className="text-gray-800" />
                </button>
                <div className="absolute bottom-6 left-6 right-6">
                  <span
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm mb-3"
                    style={{
                      backgroundColor: showActivityDetail.activity_categories?.color_code + 'dd',
                      color: '#ffffff'
                    }}
                  >
                    {showActivityDetail.activity_categories?.name}
                  </span>
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">{showActivityDetail.name}</h2>
                </div>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 16rem)' }}>
                <div className="p-6 md:p-8 space-y-6">
                  {showActivityDetail.description && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="FileText" size={20} className="text-indigo-600" />
                        Description
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{showActivityDetail.description}</p>
                    </div>
                  )}
                  {showActivityDetail.objective && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Target" size={20} className="text-indigo-600" />
                        Objective
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{showActivityDetail.objective}</p>
                    </div>
                  )}
                  {showActivityDetail.instructions && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="ListChecks" size={20} className="text-indigo-600" />
                        How to Conduct
                      </h3>
                      <div className="space-y-2">
                        {showActivityDetail.instructions.split(/\r?\n/).filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="flex gap-2.5 text-sm text-gray-600">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="leading-relaxed">{line.replace(/^\d+\.\s*/, '').trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showActivityDetail.materials_needed && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Package" size={20} className="text-indigo-600" />
                        Materials Needed
                      </h3>
                      <div className="space-y-1.5">
                        {showActivityDetail.materials_needed.split(/\r?\n/).filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="text-sm text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                            {line.replace(/^\d+\.\s*/, '').trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showActivityDetail.benefits && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Heart" size={20} className="text-indigo-600" />
                        Benefits
                      </h3>
                      <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(showActivityDetail.benefits) }} />
                    </div>
                  )}

                  {Array.isArray(showActivityDetail.activity_media) && showActivityDetail.activity_media.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-lg flex items-center gap-2">
                          <Icon name="Paperclip" size={20} className="text-indigo-600" />
                          Resources & Media ({showActivityDetail.activity_media.length})
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {showActivityDetail.activity_media.map((media) => {
                          const mediaLink = getMediaLink(media);
                          return (
                            <div key={media.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-3">
                              {(media.media_type === 'youtube' && media.youtube_video_id) && (
                                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${media.youtube_video_id}`}
                                    title={media.title || media.file_name || 'YouTube video'}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              )}

                              {(media.media_type === 'video' && media.external_url) && (
                                <video controls className="w-full rounded-lg bg-black max-h-80">
                                  <source src={media.external_url} type={media.mime_type || 'video/mp4'} />
                                  Your browser does not support the video tag.
                                </video>
                              )}

                              {(media.media_type === 'photo' && media.external_url) && (
                                <img
                                  src={media.external_url}
                                  alt={media.title || media.file_name || 'Activity media'}
                                  className="w-full rounded-lg object-cover max-h-80"
                                />
                              )}

                              {(media.media_type === 'pdf' && media.external_url) && (
                                <iframe
                                  src={media.external_url}
                                  title={media.title || media.file_name || 'PDF document'}
                                  className="w-full h-80 rounded-lg border bg-white"
                                />
                              )}

                              {(media.media_type !== 'youtube' && media.media_type !== 'video' && media.media_type !== 'photo' && media.media_type !== 'pdf') && (
                                <div className="w-full h-36 rounded-lg bg-indigo-50 flex items-center justify-center">
                                  <Icon name="File" size={24} className="text-indigo-600" />
                                </div>
                              )}

                              <div className="flex items-start gap-3">
                                {getMediaThumb(media) ? (
                                  <img
                                    src={getMediaThumb(media)}
                                    alt={media.title || media.file_name || 'Media'}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Icon name="File" size={22} className="text-indigo-600" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {media.title || media.file_name || 'Untitled media'}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">{media.media_type || 'file'}</p>
                                  {mediaLink && (
                                    <a
                                      href={mediaLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                      Open
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Activity Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                      <Icon name="Clock" size={24} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Duration</p>
                        <p className="font-bold text-gray-900">{showActivityDetail.duration_minutes} minutes</p>
                      </div>
                    </div>
                    {showActivityDetail.max_participants && (
                      <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl">
                        <Icon name="Users" size={24} className="text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Capacity</p>
                          <p className="font-bold text-gray-900">Max {showActivityDetail.max_participants}</p>
                        </div>
                      </div>
                    )}
                    {showActivityDetail.location && (
                      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-xl">
                        <Icon name="MapPin" size={24} className="text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Location</p>
                          <p className="font-bold text-gray-900">{showActivityDetail.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowActivityDetail(null)}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                    >
                      Close
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenEditModal}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition shadow-lg font-semibold flex items-center gap-2"
                    >
                      <Icon name="Pencil" size={18} />
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (window.confirm('Delete this activity? This action cannot be undone.')) {
                          handleDeleteActivity(showActivityDetail.id);
                          setShowActivityDetail(null);
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition shadow-lg font-semibold flex items-center gap-2"
                    >
                      <Icon name="Trash2" size={18} />
                      Delete Activity
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActivitiesCalendar;
