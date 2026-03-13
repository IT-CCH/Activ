import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';
import ActivityMediaUploader from '../../components/activities/ActivityMediaUploader';
import ActivityMediaViewer from '../../components/activities/ActivityMediaViewer';

const Activities = () => {
  const navigate = useNavigate();
  const { user, careHomeId } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    objective: '',
    duration_minutes: 60,
    max_participants: '',
    location: '',
    status: 'active'
  });

  useEffect(() => {
    fetchActivities();
    fetchCategories();
  }, [careHomeId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_categories')
        .select('*')
        .eq('care_home_id', careHomeId);

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_categories(name, color_code),
          activity_media(id, media_type, title, tagline, thumbnail_url, external_url, youtube_video_id, is_primary)
        `)
        .eq('care_home_id', careHomeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create the activity first
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .insert([{
          ...formData,
          care_home_id: careHomeId,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
        }])
        .select()
        .single();

      if (activityError) throw activityError;
      
      // Save media items if any
      if (mediaItems.length > 0 && activityData) {
        const mediaToInsert = mediaItems.map(item => ({
          activity_id: activityData.id,
          care_home_id: careHomeId,
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
          display_order: item.display_order,
          is_primary: item.is_primary,
          created_by: user?.id
        }));

        const { error: mediaError } = await supabase
          .from('activity_media')
          .insert(mediaToInsert);

        if (mediaError) {
          console.error('Error saving media:', mediaError);
        }
      }
      
      setFormData({
        category_id: '',
        name: '',
        description: '',
        objective: '',
        duration_minutes: 60,
        max_participants: '',
        location: '',
        status: 'active'
      });
      setMediaItems([]);
      setShowForm(false);
      fetchActivities();
      writeAuditLog({ tableName: 'activities', recordId: activityData.id, action: 'INSERT', newValues: activityData });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this activity? This will also remove all related sessions and enrollments.')) return;
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchActivities();
      writeAuditLog({ tableName: 'activities', recordId: id, action: 'DELETE' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchActivities();
      writeAuditLog({ tableName: 'activities', recordId: id, action: 'UPDATE', newValues: { status: newStatus } });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-2">Create and manage activity programs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          <Icon name="Plus" size={20} />
          New Activity
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-border rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="Plus" size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Activity</h2>
              <p className="text-sm text-gray-500">Add details and media resources for your activity</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Activity Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Painting Class"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the activity"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Objective</label>
                <textarea
                  value={formData.objective}
                  onChange={(e) => setFormData({...formData, objective: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="What residents will achieve"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Participants</label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Art Room"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Icon name="Paperclip" size={20} />
                Activity Resources & Media
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add guided videos, photos, documents, presentations, or links related to this activity.
              </p>
              <ActivityMediaUploader
                careHomeId={careHomeId}
                existingMedia={mediaItems}
                onMediaChange={setMediaItems}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t mt-6">
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                Create Activity
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Activity" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No activities yet</h3>
          <p className="text-muted-foreground mb-6">Create your first activity to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => {
            const primaryMedia = activity.activity_media?.find(m => m.is_primary) || activity.activity_media?.[0];
            const mediaCount = activity.activity_media?.length || 0;
            const hasVideo = activity.activity_media?.some(m => m.media_type === 'video' || m.media_type === 'youtube');
            const hasPhoto = activity.activity_media?.some(m => m.media_type === 'photo');
            const hasPdf = activity.activity_media?.some(m => m.media_type === 'pdf');
            
            return (
            <div
              key={activity.id}
              className="bg-white border border-border rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* Media Preview */}
              {primaryMedia && (
                <div 
                  className="relative aspect-video bg-gray-100 cursor-pointer"
                  onClick={() => activity.activity_media?.length > 0 && setViewingActivity(activity)}
                >
                  {primaryMedia.thumbnail_url ? (
                    <img 
                      src={primaryMedia.thumbnail_url} 
                      alt={primaryMedia.title}
                      className="w-full h-full object-cover"
                    />
                  ) : primaryMedia.media_type === 'youtube' && primaryMedia.youtube_video_id ? (
                    <img 
                      src={`https://img.youtube.com/vi/${primaryMedia.youtube_video_id}/mqdefault.jpg`}
                      alt={primaryMedia.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon 
                        name={primaryMedia.media_type === 'video' ? 'Video' : primaryMedia.media_type === 'pdf' ? 'FileText' : 'Image'} 
                        size={48} 
                        className="text-gray-400" 
                      />
                    </div>
                  )}
                  
                  {/* Play button overlay for videos */}
                  {(primaryMedia.media_type === 'video' || primaryMedia.media_type === 'youtube') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[16px] border-l-primary border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  )}

                  {/* Media count badge */}
                  {mediaCount > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Icon name="Layers" size={12} />
                      {mediaCount}
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{activity.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.activity_categories?.name}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'active' ? 'bg-green-100 text-green-800' :
                  activity.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {activity.status}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>

              {/* Media Type Icons */}
              {mediaCount > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  {hasVideo && (
                    <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">
                      <Icon name="Video" size={12} />
                      Video
                    </span>
                  )}
                  {hasPhoto && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                      <Icon name="Image" size={12} />
                      Photos
                    </span>
                  )}
                  {hasPdf && (
                    <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">
                      <Icon name="FileText" size={12} />
                      PDF
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1 text-xs text-muted-foreground mb-4">
                {activity.location && (
                  <div className="flex items-center gap-2">
                    <Icon name="MapPin" size={14} />
                    {activity.location}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon name="Clock" size={14} />
                  {activity.duration_minutes} minutes
                </div>
                {activity.max_participants && (
                  <div className="flex items-center gap-2">
                    <Icon name="Users" size={14} />
                    Max {activity.max_participants} participants
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <select
                  value={activity.status}
                  onChange={(e) => handleStatusChange(activity.id, e.target.value)}
                  className="flex-1 text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="text-red-600 hover:text-red-800 px-2 py-1 text-xs"
                >
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Media Viewer Modal */}
      <ActivityMediaViewer
        media={viewingActivity?.activity_media || []}
        isOpen={!!viewingActivity}
        onClose={() => setViewingActivity(null)}
        activityName={viewingActivity?.name}
      />
    </div>
  );
};

export default Activities;
