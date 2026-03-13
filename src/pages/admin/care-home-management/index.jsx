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

const CareHomeManagement = () => {
  usePageTitle('Care Home Management');
  const { user, role, careHomeId } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Delete confirmation state
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    postcode: '',
    phone: '',
    email: '',
    manager_name: '',
    capacity: '',
    current_residents: '0',
    status: 'Active',
    notes: ''
  });

  // Fetch care homes on component mount
  useEffect(() => {
    fetchCareHomes();
  }, []);

  const fetchCareHomes = async () => {
    try {
      setLoading(true);
      
      // Care home managers can view all care homes but only edit their own
      const { data, error } = await supabase
        .from('care_homes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error fetching care homes:', error);
      setError('Failed to load care homes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (showEditModal && selectedFacility) {
        // Update existing care home
        const { data, error } = await supabase
          .from('care_homes')
          .update({
            name: formData.name,
            location: formData.location,
            address: formData.address,
            postcode: formData.postcode,
            phone: formData.phone,
            email: formData.email,
            manager_name: formData.manager_name,
            capacity: parseInt(formData.capacity),
            current_residents: parseInt(formData.current_residents),
            status: formData.status,
            notes: formData.notes
          })
          .eq('id', selectedFacility.id)
          .select();

        if (error) throw error;

        // Update in local state
        setFacilities(facilities.map(f => f.id === selectedFacility.id ? data[0] : f));
        setShowEditModal(false);
      } else {
        // Create new care home
        const { data, error } = await supabase
          .from('care_homes')
          .insert([{
            name: formData.name,
            location: formData.location,
            address: formData.address,
            postcode: formData.postcode,
            phone: formData.phone,
            email: formData.email,
            manager_name: formData.manager_name,
            capacity: parseInt(formData.capacity),
            current_residents: parseInt(formData.current_residents),
            status: formData.status,
            notes: formData.notes
          }])
          .select();

        if (error) throw error;

        // Add the new care home to the list
        setFacilities([data[0], ...facilities]);
        setShowAddModal(false);
      }
      
      // Reset form
      setFormData({
        name: '',
        location: '',
        address: '',
        postcode: '',
        phone: '',
        email: '',
        manager_name: '',
        capacity: '',
        current_residents: '0',
        status: 'Active',
        notes: ''
      });
      setSelectedFacility(null);
    } catch (error) {
      console.error('Error saving care home:', error);
      setError(error.message || 'Failed to save care home');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (facility) => {
    // Care home managers can only edit their own care home
    if (role === 'care_home_manager' && facility.id !== careHomeId) {
      setError('You can only manage your own care home');
      return;
    }
    setSelectedFacility(facility);
    setFormData({
      name: facility.name,
      location: facility.location,
      address: facility.address,
      postcode: facility.postcode || '',
      phone: facility.phone || '',
      email: facility.email || '',
      manager_name: facility.manager_name || '',
      capacity: facility.capacity.toString(),
      current_residents: facility.current_residents.toString(),
      status: facility.status,
      notes: facility.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (facility) => {
    setSelectedFacility(facility);
    setDeleteConfirmName('');
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteError('');
    
    // Validate care home name
    if (deleteConfirmName !== selectedFacility.name) {
      setDeleteError('Care home name does not match');
      return;
    }

    // Verify password
    try {
      setLoading(true);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (authError) {
        setDeleteError('Incorrect password');
        setLoading(false);
        return;
      }

      // Delete care home
      const { error: deleteError } = await supabase
        .from('care_homes')
        .delete()
        .eq('id', selectedFacility.id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setFacilities(facilities.filter(f => f.id !== selectedFacility.id));
      
      // Close modal and reset
      setShowDeleteModal(false);
      setSelectedFacility(null);
      setDeleteConfirmName('');
      setDeletePassword('');
    } catch (error) {
      console.error('Error deleting care home:', error);
      setDeleteError('Failed to delete care home: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFacilities = facilities.filter(facility =>
    facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (facility) => {
    setSelectedFacility(facility);
    setShowDetailsModal(true);
  };

  const getOccupancyPercentage = (residents, capacity) => {
    if (capacity === 0) return 0;
    return Math.round((residents / capacity) * 100);
  };

  const getOccupancyColor = (percentage) => {
    if (percentage >= 90) return 'text-error';
    if (percentage >= 75) return 'text-warning';
    return 'text-success';
  };

  const getTotalResidents = () => {
    return facilities.reduce((sum, f) => sum + (f.current_residents || 0), 0);
  };

  const getTotalCapacity = () => {
    return facilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
  };

  const getAverageOccupancy = () => {
    const totalCapacity = getTotalCapacity();
    if (totalCapacity === 0) return 0;
    return Math.round((getTotalResidents() / totalCapacity) * 100);
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
            <Icon name="Building2" size={28} color="var(--color-primary)" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Care Home Management</h1>
            <p className="text-muted-foreground">Manage care home facilities, capacity, and details</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Facilities</p>
                <p className="text-2xl font-bold text-foreground">{facilities.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Building2" size={24} color="var(--color-primary)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Residents</p>
                <p className="text-2xl font-bold text-foreground">{getTotalResidents()}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={24} color="var(--color-success)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold text-foreground">{getTotalCapacity()}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="Home" size={24} color="var(--color-accent)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Occupancy</p>
                <p className="text-2xl font-bold text-foreground">
                  {getAverageOccupancy()}%
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="TrendingUp" size={24} color="var(--color-warning)" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search care homes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="Search"
              />
            </div>
            {role !== 'care_home_manager' && (
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Icon name="Plus" size={18} />
                Add Care Home
              </Button>
            )}
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => {
            const occupancy = getOccupancyPercentage(facility.current_residents, facility.capacity);
            return (
              <div key={facility.id} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon name="Building2" size={24} color="var(--color-primary)" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{facility.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Icon name="MapPin" size={14} />
                          {facility.location}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      facility.status === 'Active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {facility.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Manager</span>
                      <span className="text-foreground font-medium">{facility.manager_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="text-foreground font-medium">{facility.phone || 'N/A'}</span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className={`font-bold ${getOccupancyColor(occupancy)}`}>
                          {occupancy}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancy >= 90 ? 'bg-error' :
                            occupancy >= 75 ? 'bg-warning' :
                            'bg-success'
                          }`}
                          style={{ width: `${occupancy}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{facility.current_residents} residents</span>
                        <span>{facility.capacity} capacity</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => handleViewDetails(facility)}
                      className="gap-2"
                    >
                      <Icon name="Eye" size={16} />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(facility)}
                      className="gap-2"
                    >
                      <Icon name="Edit" size={16} />
                    </Button>
                    {role !== 'care_home_manager' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(facility)}
                        className="gap-2 text-error hover:bg-error/10"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFacilities.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Icon name="Building2" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <p className="text-muted-foreground">No care homes found</p>
          </div>
        )}

        {/* Edit Care Home Modal */}
        {showEditModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEditModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Edit Care Home</h2>
                    <button onClick={() => setShowEditModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
                      <Icon name="AlertCircle" size={20} color="var(--color-error)" />
                      <p className="text-error text-sm">{error}</p>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        type="text" 
                        name="name"
                        label="Facility Name" 
                        placeholder="Sunrise Care Home" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="location"
                        label="Location/City" 
                        placeholder="Manchester" 
                        value={formData.location}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="address"
                        label="Address" 
                        placeholder="123 Main Street" 
                        value={formData.address}
                        onChange={handleInputChange}
                        required 
                        className="md:col-span-2" 
                      />
                      <Input 
                        type="text" 
                        name="postcode"
                        label="Postcode" 
                        placeholder="M1 1AA" 
                        value={formData.postcode}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="tel" 
                        name="phone"
                        label="Phone Number" 
                        placeholder="+44 161 123 4567" 
                        value={formData.phone}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="email" 
                        name="email"
                        label="Email Address" 
                        placeholder="info@carehome.com" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="manager_name"
                        label="Manager Name" 
                        placeholder="John Smith" 
                        value={formData.manager_name}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="number" 
                        name="capacity"
                        label="Capacity" 
                        placeholder="50" 
                        value={formData.capacity}
                        onChange={handleInputChange}
                        required 
                        min="1" 
                      />
                      <Input 
                        type="number" 
                        name="current_residents"
                        label="Current Residents" 
                        placeholder="0" 
                        value={formData.current_residents}
                        onChange={handleInputChange}
                        required 
                        min="0" 
                      />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          rows="3"
                          placeholder="Additional information..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Care Home'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Add Care Home Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Add New Care Home</h2>
                    <button onClick={() => setShowAddModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
                      <Icon name="AlertCircle" size={20} color="var(--color-error)" />
                      <p className="text-error text-sm">{error}</p>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        type="text" 
                        name="name"
                        label="Facility Name" 
                        placeholder="Sunrise Care Home" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="location"
                        label="Location/City" 
                        placeholder="Manchester" 
                        value={formData.location}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="address"
                        label="Address" 
                        placeholder="123 Main Street" 
                        value={formData.address}
                        onChange={handleInputChange}
                        required 
                        className="md:col-span-2" 
                      />
                      <Input 
                        type="text" 
                        name="postcode"
                        label="Postcode" 
                        placeholder="M1 1AA" 
                        value={formData.postcode}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="tel" 
                        name="phone"
                        label="Phone Number" 
                        placeholder="+44 161 123 4567" 
                        value={formData.phone}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="email" 
                        name="email"
                        label="Email Address" 
                        placeholder="info@carehome.com" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="text" 
                        name="manager_name"
                        label="Manager Name" 
                        placeholder="John Smith" 
                        value={formData.manager_name}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="number" 
                        name="capacity"
                        label="Capacity" 
                        placeholder="50" 
                        value={formData.capacity}
                        onChange={handleInputChange}
                        required 
                        min="1" 
                      />
                      <Input 
                        type="number" 
                        name="current_residents"
                        label="Current Residents" 
                        placeholder="0" 
                        value={formData.current_residents}
                        onChange={handleInputChange}
                        required 
                        min="0" 
                      />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          rows="3"
                          placeholder="Additional information..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Care Home'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedFacility && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                      <Icon name="AlertTriangle" size={24} color="var(--color-error)" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Delete Care Home</h2>
                      <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning font-medium mb-2">You are about to delete:</p>
                    <p className="text-foreground font-bold">{selectedFacility.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedFacility.location}</p>
                  </div>

                  {deleteError && (
                    <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
                      <Icon name="AlertCircle" size={20} color="var(--color-error)" />
                      <p className="text-error text-sm">{deleteError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Type the care home name to confirm: <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-error"
                      placeholder={selectedFacility.name}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Copy and paste is disabled</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Enter your password: <span className="text-error">*</span>
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-error"
                      placeholder="Your account password"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDeleteModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleDeleteConfirm}
                    disabled={loading || !deleteConfirmName || !deletePassword}
                    className="bg-error hover:bg-error/90"
                  >
                    {loading ? 'Deleting...' : 'Delete Care Home'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedFacility && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDetailsModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">{selectedFacility.name}</h2>
                    <button onClick={() => setShowDetailsModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Location</p>
                      <p className="text-foreground font-medium">{selectedFacility.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedFacility.status === 'Active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {selectedFacility.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Address</p>
                      <p className="text-foreground font-medium">{selectedFacility.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Manager</p>
                      <p className="text-foreground font-medium">{selectedFacility.manager_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="text-foreground font-medium">{selectedFacility.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Residents</p>
                      <p className="text-foreground font-medium">{selectedFacility.current_residents}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                      <p className="text-foreground font-medium">{selectedFacility.capacity}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-border flex justify-end">
                  <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CareHomeManagement;
