import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../../components/navigation/Header';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../services/supabaseClient';

const ResidentManagement = () => {
  const { role, careHomeId } = useAuth();
  const [residents, setResidents] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCareHome, setFilterCareHome] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    care_home_id: '',
    name: '',
    date_of_birth: '',
    gender: '',
    room_number: '',
    admission_date: '',
    status: 'Active',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    dietary_restrictions: [],
    allergens: [],
    texture_modification: 'Normal',
    medical_notes: ''
  });

  const dietaryOptions = ['Diabetic', 'Gluten-Free', 'Low Sodium', 'Vegetarian', 'Low Fat', 'Vegan', 'Halal', 'Kosher'];
  const allergenOptions = ['Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat', 'Fish', 'Sesame'];
  const textureOptions = ['Normal', 'Soft', 'Minced', 'Pureed'];

  useEffect(() => {
    fetchCareHomes();
    fetchResidents();
  }, []);

  const fetchCareHomes = async () => {
    try {
      const { data, error } = await supabase
        .from('care_homes')
        .select('id, name, location')
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

  const fetchResidents = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First try to fetch residents with the join
      let query = supabase
        .from('residents')
        .select(`
          id,
          care_home_id,
          name,
          date_of_birth,
          age,
          gender,
          room_number,
          admission_date,
          status,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone,
          emergency_contact_email,
          dietary_restrictions,
          allergens,
          texture_modification,
          medical_notes,
          created_at,
          updated_at,
          care_homes(id, name, location)
        `);
      
      // Filter for care home managers
      if (role === 'care_home_manager' && careHomeId) {
        query = query.eq('care_home_id', careHomeId);
      }
      
      query = query.order('created_at', { ascending: false });
      
      let { data, error } = await query;

      if (error) {
        console.error('Error fetching residents with join:', error);
        // Fall back to fetching without join
        let fallbackQuery = supabase.from('residents').select('*');
        if (role === 'care_home_manager' && careHomeId) {
          fallbackQuery = fallbackQuery.eq('care_home_id', careHomeId);
        }
        const { data: residentsData, error: residentsError } = await fallbackQuery.order('created_at', { ascending: false });
        
        if (residentsError) throw residentsError;
        setResidents(residentsData || []);
      } else {
        setResidents(data || []);
      }
    } catch (error) {
      console.error('Error fetching residents:', error);
      setError(`Failed to load residents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const array = name === 'dietary_restrictions' ? [...formData.dietary_restrictions] : [...formData.allergens];
      if (checked) {
        array.push(value);
      } else {
        array.splice(array.indexOf(value), 1);
      }
      setFormData(prev => ({
        ...prev,
        [name]: array
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.care_home_id) {
        setError('Please select a care home');
        setLoading(false);
        return;
      }

      if (!formData.name) {
        setError('Please enter resident name');
        setLoading(false);
        return;
      }

      if (!formData.date_of_birth) {
        setError('Please enter date of birth');
        setLoading(false);
        return;
      }

      if (!formData.gender) {
        setError('Please select gender');
        setLoading(false);
        return;
      }

      if (!formData.room_number) {
        setError('Please enter room number');
        setLoading(false);
        return;
      }

      if (!formData.admission_date) {
        setError('Please enter admission date');
        setLoading(false);
        return;
      }

      if (!formData.emergency_contact_name) {
        setError('Please enter emergency contact name');
        setLoading(false);
        return;
      }

      if (!formData.emergency_contact_phone) {
        setError('Please enter emergency contact phone');
        setLoading(false);
        return;
      }

      const age = calculateAge(formData.date_of_birth);
      
      const { data, error } = await supabase
        .from('residents')
        .insert([{
          care_home_id: formData.care_home_id,
          name: formData.name.trim(),
          date_of_birth: formData.date_of_birth,
          age: age,
          gender: formData.gender,
          room_number: formData.room_number.trim(),
          admission_date: formData.admission_date,
          status: formData.status,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_relationship: formData.emergency_contact_relationship.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          emergency_contact_email: formData.emergency_contact_email.trim(),
          dietary_restrictions: formData.dietary_restrictions,
          allergens: formData.allergens,
          texture_modification: formData.texture_modification,
          medical_notes: formData.medical_notes.trim()
        }])
        .select(`
          *,
          care_homes:care_home_id(id, name, location)
        `);

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || 'Failed to create resident in database');
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from server');
      }

      setResidents([data[0], ...residents]);
      setShowAddModal(false);
      
      // Reset form
      setFormData({
        care_home_id: '',
        name: '',
        date_of_birth: '',
        gender: '',
        room_number: '',
        admission_date: '',
        status: 'Active',
        emergency_contact_name: '',
        emergency_contact_relationship: '',
        emergency_contact_phone: '',
        emergency_contact_email: '',
        dietary_restrictions: [],
        allergens: [],
        texture_modification: 'Normal',
        medical_notes: ''
      });
    } catch (error) {
      console.error('Full error object:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to create resident';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async (residentId) => {
    if (!confirm('Are you sure you want to remove this resident? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentId);

      if (error) throw error;

      setResidents(residents.filter(r => r.id !== residentId));
    } catch (error) {
      console.error('Error deleting resident:', error);
      alert('Failed to delete resident: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredResidents = residents.filter(resident => {
    const careName = resident.care_homes?.name || '';
    const matchesSearch = resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (resident.room_number && resident.room_number.includes(searchTerm)) ||
                         careName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCareHome = filterCareHome === 'all' || resident.care_home_id === filterCareHome;
    const matchesStatus = filterStatus === 'all' || resident.status === filterStatus;
    return matchesSearch && matchesCareHome && matchesStatus;
  });

  const handleViewDetails = (resident) => {
    setSelectedResident(resident);
    setShowDetailsModal(true);
  };

  const openEditResident = (resident) => {
    setSelectedResident(resident);
    setFormData({
      care_home_id: resident.care_home_id || '',
      name: resident.name || '',
      date_of_birth: resident.date_of_birth || '',
      gender: resident.gender || '',
      room_number: resident.room_number || '',
      admission_date: resident.admission_date || '',
      status: resident.status || 'Active',
      emergency_contact_name: resident.emergency_contact_name || '',
      emergency_contact_relationship: resident.emergency_contact_relationship || '',
      emergency_contact_phone: resident.emergency_contact_phone || '',
      emergency_contact_email: resident.emergency_contact_email || '',
      dietary_restrictions: resident.dietary_restrictions || [],
      allergens: resident.allergens || [],
      texture_modification: resident.texture_modification || 'Normal',
      medical_notes: resident.medical_notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateResident = async (e) => {
    e.preventDefault();
    if (!selectedResident) return;
    setLoading(true);
    setError('');

    try {
      // Basic validations similar to add
      if (!formData.care_home_id) throw new Error('Please select a care home');
      if (!formData.name) throw new Error('Please enter resident name');
      if (!formData.date_of_birth) throw new Error('Please enter date of birth');
      if (!formData.gender) throw new Error('Please select gender');
      if (!formData.room_number) throw new Error('Please enter room number');
      if (!formData.admission_date) throw new Error('Please enter admission date');
      if (!formData.emergency_contact_name) throw new Error('Please enter emergency contact name');
      if (!formData.emergency_contact_phone) throw new Error('Please enter emergency contact phone');

      const age = calculateAge(formData.date_of_birth);

      const { data, error } = await supabase
        .from('residents')
        .update({
          care_home_id: formData.care_home_id,
          name: formData.name.trim(),
          date_of_birth: formData.date_of_birth,
          age,
          gender: formData.gender,
          room_number: formData.room_number.trim(),
          admission_date: formData.admission_date,
          status: formData.status,
          emergency_contact_name: formData.emergency_contact_name.trim(),
          emergency_contact_relationship: formData.emergency_contact_relationship.trim(),
          emergency_contact_phone: formData.emergency_contact_phone.trim(),
          emergency_contact_email: formData.emergency_contact_email.trim(),
          dietary_restrictions: formData.dietary_restrictions,
          allergens: formData.allergens,
          texture_modification: formData.texture_modification,
          medical_notes: formData.medical_notes.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedResident.id)
        .select(`
          *,
          care_homes:care_home_id(id, name, location)
        `)
        .single();

      if (error) throw error;

      setResidents(prev => prev.map(r => (r.id === selectedResident.id ? data : r)));
      setShowEditModal(false);
      setSelectedResident(null);
    } catch (err) {
      console.error('Error updating resident:', err);
      setError(err.message || 'Failed to update resident');
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
            <h1 className="text-3xl font-bold text-foreground mb-1">Resident Management</h1>
            <p className="text-muted-foreground">Manage resident information, dietary requirements, and care details</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
            <Icon name="AlertCircle" size={20} color="var(--color-error)" />
            <div>
              <p className="text-error font-medium">Error Loading Residents</p>
              <p className="text-error text-sm mt-1">{error}</p>
              <p className="text-error text-xs mt-2">Please check the browser console (F12) for more details, or ensure the residents SQL table has been created.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Residents</p>
                <p className="text-2xl font-bold text-foreground">{residents.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={24} color="var(--color-primary)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Special Diets</p>
                <p className="text-2xl font-bold text-warning">
                  {residents.filter(r => r.dietary_restrictions && r.dietary_restrictions.length > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="Utensils" size={24} color="var(--color-warning)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Allergens</p>
                <p className="text-2xl font-bold text-error">
                  {residents.filter(r => r.allergens && r.allergens.length > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                <Icon name="AlertTriangle" size={24} color="var(--color-error)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modified Texture</p>
                <p className="text-2xl font-bold text-accent">
                  {residents.filter(r => r.texture_modification && r.texture_modification !== 'Normal').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Icon name="Soup" size={24} color="var(--color-accent)" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by name, room, or care home..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="Search"
              />
            </div>
            <Select
              value={filterCareHome}
              onChange={(value) => setFilterCareHome(value)}
              options={[
                { value: 'all', label: 'All Care Homes' },
                ...careHomes.map(home => ({ value: home.id, label: home.name }))
              ]}
              placeholder="Filter by Care Home"
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Discharged', label: 'Discharged' }
              ]}
              placeholder="Filter by Status"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              setShowAddModal(true);
              if (role === 'care_home_manager' && careHomeId) {
                setFormData(prev => ({ ...prev, care_home_id: careHomeId }));
              }
            }} className="gap-2">
              <Icon name="UserPlus" size={18} />
              Add Resident
            </Button>
          </div>
        </div>

        {/* Residents Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Care Home</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dietary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Allergens</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResidents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Icon name="User" size={20} color="var(--color-primary)" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{resident.name}</div>
                          <div className="text-sm text-muted-foreground">{resident.age} years old</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{resident.care_homes?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                        Room {resident.room_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        resident.status === 'Active' ? 'bg-success/10 text-success' :
                        resident.status === 'Inactive' ? 'bg-warning/10 text-warning' :
                        'bg-error/10 text-error'
                      }`}>
                        {resident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {resident.dietary_restrictions.length > 0 ? (
                          resident.dietary_restrictions.map((req, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/10 text-warning">
                              {req}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {resident.allergens.length > 0 ? (
                          resident.allergens.map((allergen, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs font-semibold rounded-full bg-error/10 text-error">
                              {allergen}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(resident)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="View Details"
                        >
                          <Icon name="Eye" size={18} />
                        </button>
                        <button
                          onClick={() => openEditResident(resident)}
                          className="text-accent hover:text-accent/80 transition-colors"
                          title="Edit Resident"
                        >
                          <Icon name="Edit" size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteResident(resident.id)}
                          className="text-error hover:text-error/80 transition-colors"
                          title="Remove Resident"
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

          {filteredResidents.length === 0 && (
            <div className="text-center py-12">
              <Icon name="Users" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
              <p className="text-muted-foreground">No residents found</p>
            </div>
          )}
        </div>

        {/* Add Resident Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Add New Resident</h2>
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
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Select
                            name="care_home_id"
                            value={formData.care_home_id}
                            onChange={(value) => setFormData(prev => ({ ...prev, care_home_id: value }))}
                            label="Care Home"
                            placeholder="Select Care Home"
                            options={careHomes.map(home => ({ value: home.id, label: home.name }))}
                            required
                            disabled={role === 'care_home_manager'}
                          />
                          <Input
                            type="text"
                            name="name"
                            label="Full Name"
                            placeholder="Margaret Thompson"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="date"
                            name="date_of_birth"
                            label="Date of Birth"
                            value={formData.date_of_birth}
                            onChange={handleInputChange}
                            required
                          />
                          <Select
                            name="gender"
                            value={formData.gender}
                            onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                            label="Gender"
                            placeholder="Select Gender"
                            options={[
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                              { value: 'Other', label: 'Other' }
                            ]}
                            required
                          />
                          <Input
                            type="text"
                            name="room_number"
                            label="Room Number"
                            placeholder="101"
                            value={formData.room_number}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="date"
                            name="admission_date"
                            label="Admission Date"
                            value={formData.admission_date}
                            onChange={handleInputChange}
                            required
                          />
                          <Select
                            name="status"
                            value={formData.status}
                            onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            label="Status"
                            options={[
                              { value: 'Active', label: 'Active' },
                              { value: 'Inactive', label: 'Inactive' },
                              { value: 'Discharged', label: 'Discharged' }
                            ]}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            type="text"
                            name="emergency_contact_name"
                            label="Contact Name"
                            placeholder="David Thompson"
                            value={formData.emergency_contact_name}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="text"
                            name="emergency_contact_relationship"
                            label="Relationship"
                            placeholder="Son"
                            value={formData.emergency_contact_relationship}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="tel"
                            name="emergency_contact_phone"
                            label="Phone Number"
                            placeholder="+44 7700 900123"
                            value={formData.emergency_contact_phone}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="email"
                            name="emergency_contact_email"
                            label="Email Address"
                            placeholder="contact@example.com"
                            value={formData.emergency_contact_email}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Dietary Requirements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Dietary Restrictions</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                              {dietaryOptions.map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="dietary_restrictions"
                                    value={option}
                                    checked={formData.dietary_restrictions.includes(option)}
                                    onChange={handleInputChange}
                                    className="rounded border-border"
                                  />
                                  <span className="text-sm text-foreground">{option}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2">
                              <Input
                                type="text"
                                placeholder="Add custom... (Enter)"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    setFormData(prev => ({
                                      ...prev,
                                      dietary_restrictions: [...new Set([...prev.dietary_restrictions, e.target.value.trim()])]
                                    }));
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                            {formData.dietary_restrictions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {formData.dietary_restrictions.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 text-xs bg-warning/10 text-warning rounded-full flex items-center gap-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({
                                        ...prev,
                                        dietary_restrictions: prev.dietary_restrictions.filter((_, i) => i !== idx)
                                      }))}
                                      className="ml-1 hover:text-warning/80"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Allergens</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                              {allergenOptions.map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="allergens"
                                    value={option}
                                    checked={formData.allergens.includes(option)}
                                    onChange={handleInputChange}
                                    className="rounded border-border"
                                  />
                                  <span className="text-sm text-foreground">{option}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2">
                              <Input
                                type="text"
                                placeholder="Add custom... (Enter)"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    setFormData(prev => ({
                                      ...prev,
                                      allergens: [...new Set([...prev.allergens, e.target.value.trim()])]
                                    }));
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                            {formData.allergens.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {formData.allergens.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 text-xs bg-error/10 text-error rounded-full flex items-center gap-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({
                                        ...prev,
                                        allergens: prev.allergens.filter((_, i) => i !== idx)
                                      }))}
                                      className="ml-1 hover:text-error/80"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Select
                            value={formData.texture_modification}
                            onChange={(value) => setFormData(prev => ({ ...prev, texture_modification: value }))}
                            label="Texture Modification"
                            options={[
                              { value: 'Normal', label: 'Normal' },
                              { value: 'Soft', label: 'Soft' },
                              { value: 'Minced', label: 'Minced' },
                              { value: 'Pureed', label: 'Pureed' }
                            ]}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Medical Notes</label>
                        <textarea
                          name="medical_notes"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          rows="3"
                          placeholder="Medical conditions, preferences, etc..."
                          value={formData.medical_notes}
                          onChange={handleInputChange}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading || !formData.care_home_id || !formData.name}>
                      {loading ? 'Adding...' : 'Add Resident'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Edit Resident Modal */}
        {showEditModal && selectedResident && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEditModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Edit Resident</h2>
                    <button onClick={() => setShowEditModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <form onSubmit={handleUpdateResident}>
                  {error && (
                    <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
                      <Icon name="AlertCircle" size={20} color="var(--color-error)" />
                      <p className="text-error text-sm">{error}</p>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Select
                            name="care_home_id"
                            value={formData.care_home_id}
                            onChange={(value) => setFormData(prev => ({ ...prev, care_home_id: value }))}
                            label="Care Home"
                            placeholder="Select Care Home"
                            options={careHomes.map(home => ({ value: home.id, label: home.name }))}
                            required
                            disabled={role === 'care_home_manager'}
                          />
                          <Input
                            type="text"
                            name="name"
                            label="Full Name"
                            placeholder="Margaret Thompson"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="date"
                            name="date_of_birth"
                            label="Date of Birth"
                            value={formData.date_of_birth}
                            onChange={handleInputChange}
                            required
                          />
                          <Select
                            name="gender"
                            value={formData.gender}
                            onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                            label="Gender"
                            placeholder="Select Gender"
                            options={[
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                              { value: 'Other', label: 'Other' }
                            ]}
                            required
                          />
                          <Input
                            type="text"
                            name="room_number"
                            label="Room Number"
                            placeholder="101"
                            value={formData.room_number}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="date"
                            name="admission_date"
                            label="Admission Date"
                            value={formData.admission_date}
                            onChange={handleInputChange}
                            required
                          />
                          <Select
                            name="status"
                            value={formData.status}
                            onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            label="Status"
                            options={[
                              { value: 'Active', label: 'Active' },
                              { value: 'Inactive', label: 'Inactive' },
                              { value: 'Discharged', label: 'Discharged' }
                            ]}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            type="text"
                            name="emergency_contact_name"
                            label="Contact Name"
                            placeholder="David Thompson"
                            value={formData.emergency_contact_name}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="text"
                            name="emergency_contact_relationship"
                            label="Relationship"
                            placeholder="Son"
                            value={formData.emergency_contact_relationship}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="tel"
                            name="emergency_contact_phone"
                            label="Phone Number"
                            placeholder="+44 7700 900123"
                            value={formData.emergency_contact_phone}
                            onChange={handleInputChange}
                            required
                          />
                          <Input
                            type="email"
                            name="emergency_contact_email"
                            label="Email Address"
                            placeholder="contact@example.com"
                            value={formData.emergency_contact_email}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Dietary Requirements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Dietary Restrictions</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                              {dietaryOptions.map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="dietary_restrictions"
                                    value={option}
                                    checked={formData.dietary_restrictions.includes(option)}
                                    onChange={handleInputChange}
                                    className="rounded border-border"
                                  />
                                  <span className="text-sm text-foreground">{option}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2">
                              <Input
                                type="text"
                                placeholder="Add custom... (Enter)"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    setFormData(prev => ({
                                      ...prev,
                                      dietary_restrictions: [...new Set([...prev.dietary_restrictions, e.target.value.trim()])]
                                    }));
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                            {formData.dietary_restrictions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {formData.dietary_restrictions.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 text-xs bg-warning/10 text-warning rounded-full flex items-center gap-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({
                                        ...prev,
                                        dietary_restrictions: prev.dietary_restrictions.filter((_, i) => i !== idx)
                                      }))}
                                      className="ml-1 hover:text-warning/80"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Allergens</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                              {allergenOptions.map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="allergens"
                                    value={option}
                                    checked={formData.allergens.includes(option)}
                                    onChange={handleInputChange}
                                    className="rounded border-border"
                                  />
                                  <span className="text-sm text-foreground">{option}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2">
                              <Input
                                type="text"
                                placeholder="Add custom... (Enter)"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    setFormData(prev => ({
                                      ...prev,
                                      allergens: [...new Set([...prev.allergens, e.target.value.trim()])]
                                    }));
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                            {formData.allergens.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {formData.allergens.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 text-xs bg-error/10 text-error rounded-full flex items-center gap-1">
                                    {item}
                                    <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({
                                        ...prev,
                                        allergens: prev.allergens.filter((_, i) => i !== idx)
                                      }))}
                                      className="ml-1 hover:text-error/80"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Select
                            value={formData.texture_modification}
                            onChange={(value) => setFormData(prev => ({ ...prev, texture_modification: value }))}
                            label="Texture Modification"
                            options={[
                              { value: 'Normal', label: 'Normal' },
                              { value: 'Soft', label: 'Soft' },
                              { value: 'Minced', label: 'Minced' },
                              { value: 'Pureed', label: 'Pureed' }
                            ]}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Medical Notes</label>
                        <textarea
                          name="medical_notes"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          rows="3"
                          placeholder="Medical conditions, preferences, etc..."
                          value={formData.medical_notes}
                          onChange={handleInputChange}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedResident(null); }}>Cancel</Button>
                    <Button type="submit" disabled={loading || !formData.care_home_id || !formData.name}>
                      {loading ? 'Updating...' : 'Update Resident'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedResident && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDetailsModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">{selectedResident.name}</h2>
                    <button onClick={() => setShowDetailsModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Age</p>
                        <p className="text-foreground font-medium">{selectedResident.age} years old</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Gender</p>
                        <p className="text-foreground font-medium">{selectedResident.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Care Home</p>
                        <p className="text-foreground font-medium">{selectedResident.care_homes?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Room</p>
                        <p className="text-foreground font-medium">Room {selectedResident.room_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Admission Date</p>
                        <p className="text-foreground font-medium">{new Date(selectedResident.admission_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedResident.status === 'Active' ? 'bg-success/10 text-success' :
                          selectedResident.status === 'Inactive' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }`}>
                          {selectedResident.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Emergency Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Contact</p>
                        <p className="text-foreground font-medium">{selectedResident.emergency_contact_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Relationship</p>
                        <p className="text-foreground font-medium">{selectedResident.emergency_contact_relationship}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Phone</p>
                        <p className="text-foreground font-medium">{selectedResident.emergency_contact_phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="text-foreground font-medium">{selectedResident.emergency_contact_email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Dietary Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Dietary Restrictions</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedResident.dietary_restrictions.length > 0 ? (
                            selectedResident.dietary_restrictions.map((req, idx) => (
                              <span key={idx} className="px-3 py-1 text-sm font-semibold rounded-full bg-warning/10 text-warning">
                                {req}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Allergens</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedResident.allergens.length > 0 ? (
                            selectedResident.allergens.map((allergen, idx) => (
                              <span key={idx} className="px-3 py-1 text-sm font-semibold rounded-full bg-error/10 text-error">
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Texture Modification</p>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                          selectedResident.texture_modification === 'Normal' ? 'bg-success/10 text-success' :
                          selectedResident.texture_modification === 'Soft' ? 'bg-accent/10 text-accent' :
                          'bg-warning/10 text-warning'
                        }`}>
                          {selectedResident.texture_modification}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedResident.medical_notes && (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-warning mb-2">Medical Notes</h3>
                      <p className="text-sm text-foreground">{selectedResident.medical_notes}</p>
                    </div>
                  )}
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

export default ResidentManagement;
