import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';

const ActivityEnrollments = () => {
  const { user, careHomeId } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity_id: '',
    resident_id: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, [careHomeId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('id, name')
        .eq('care_home_id', careHomeId);

      // Fetch residents
      const { data: residentsData } = await supabase
        .from('residents')
        .select('id, name')
        .eq('care_home_id', careHomeId);

      // Fetch enrollments
      const { data: enrollmentsData } = await supabase
        .from('activity_enrollments')
        .select(`
          id,
          activity_id,
          resident_id,
          status,
          enrollment_date,
          activities(name),
          residents(name)
        `)
        .eq('care_home_id', careHomeId)
        .order('enrollment_date', { ascending: false });

      setActivities(activitiesData || []);
      setResidents(residentsData || []);
      setEnrollments(enrollmentsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: inserted, error } = await supabase
        .from('activity_enrollments')
        .insert([{
          ...formData,
          care_home_id: careHomeId,
          enrollment_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;
      
      setFormData({ activity_id: '', resident_id: '', status: 'active' });
      setShowForm(false);
      fetchData();
      if (inserted?.id) writeAuditLog({ tableName: 'activity_enrollments', recordId: inserted.id, action: 'INSERT', newValues: inserted });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('activity_enrollments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchData();
      writeAuditLog({ tableName: 'activity_enrollments', recordId: id, action: 'UPDATE', newValues: { status: newStatus } });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this enrollment?')) return;
    try {
      const { error } = await supabase
        .from('activity_enrollments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      writeAuditLog({ tableName: 'activity_enrollments', recordId: id, action: 'DELETE' });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Enrollments</h1>
          <p className="text-muted-foreground mt-2">Manage resident enrollments in activities</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          <Icon name="Plus" size={20} />
          Enroll Resident
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">New Enrollment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Activity</label>
                <select
                  value={formData.activity_id}
                  onChange={(e) => setFormData({...formData, activity_id: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select activity</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Resident</label>
                <select
                  value={formData.resident_id}
                  onChange={(e) => setFormData({...formData, resident_id: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select resident</option>
                  {residents.map(res => (
                    <option key={res.id} value={res.id}>{res.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                Enroll
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

      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No enrollments yet</h3>
          <p className="text-muted-foreground mb-6">Enroll residents in activities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{enrollment.activities?.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{enrollment.residents?.name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                  enrollment.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  enrollment.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {enrollment.status}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="Calendar" size={16} />
                  {new Date(enrollment.enrollment_date).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={enrollment.status}
                  onChange={(e) => handleUpdateStatus(enrollment.id, e.target.value)}
                  className="flex-1 text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={() => handleDelete(enrollment.id)}
                  className="text-red-600 hover:text-red-800 px-2 py-1 text-xs"
                >
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityEnrollments;
