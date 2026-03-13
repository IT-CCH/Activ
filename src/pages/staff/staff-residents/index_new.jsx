import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Header from '../../../components/navigation/Header';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../services/supabaseClient';

const StaffResidents = () => {
  const { careHomeId } = useAuth();
  const [residents, setResidents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  const dietaryOptions = ['Diabetic', 'Gluten-Free', 'Low Sodium', 'Vegetarian', 'Low Fat', 'Vegan', 'Halal', 'Kosher'];
  const allergenOptions = ['Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat', 'Fish', 'Sesame'];
  const textureOptions = ['Normal', 'Soft', 'Minced', 'Pureed'];

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (careHomeId) {
      fetchResidents();
    }
  }, [careHomeId]);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('care_home_id', careHomeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
    } catch (err) {
      console.error('Error fetching residents:', err);
      setError(`Failed to load residents: ${err.message}`);
    } finally {
      setLoading(false);
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

  const resetForm = () => {
    setFormData({
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
    setError('');
    setSuccess('');
    setDeletePassword('');
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.date_of_birth || !formData.room_number) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const age = calculateAge(formData.date_of_birth);

      const { error } = await supabase
        .from('residents')
        .insert([{
          care_home_id: careHomeId,
          ...formData,
          age
        }]);

      if (error) throw error;

      setSuccess('Resident added successfully');
      await fetchResidents();
      
      setTimeout(() => {
        resetForm();
        setShowAddModal(false);
      }, 1500);
    } catch (err) {
      console.error('Error adding resident:', err);
      setError(err.message || 'Failed to add resident');
    } finally {
      setLoading(false);
    }
  };

  const handleEditResident = (resident) => {
    setFormData({
      name: resident.name,
      date_of_birth: resident.date_of_birth,
      gender: resident.gender || '',
      room_number: resident.room_number,
      admission_date: resident.admission_date,
      status: resident.status,
      emergency_contact_name: resident.emergency_contact_name || '',
      emergency_contact_relationship: resident.emergency_contact_relationship || '',
      emergency_contact_phone: resident.emergency_contact_phone || '',
      emergency_contact_email: resident.emergency_contact_email || '',
      dietary_restrictions: resident.dietary_restrictions || [],
      allergens: resident.allergens || [],
      texture_modification: resident.texture_modification || 'Normal',
      medical_notes: resident.medical_notes || ''
    });
    setSelectedResident(resident);
    setShowEditModal(true);
  };

  const handleUpdateResident = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.date_of_birth || !formData.room_number) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const age = calculateAge(formData.date_of_birth);

      const { error } = await supabase
        .from('residents')
        .update({
          ...formData,
          age
        })
        .eq('id', selectedResident.id);

      if (error) throw error;

      setSuccess('Resident updated successfully');
      await fetchResidents();
      
      setTimeout(() => {
        resetForm();
        setShowEditModal(false);
        setSelectedResident(null);
      }, 1500);
    } catch (err) {
      console.error('Error updating resident:', err);
      setError(err.message || 'Failed to update resident');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async () => {
    if (!deletePassword.trim()) {
      setError('Please enter your password to confirm deletion');
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

      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', selectedResident.id);

      if (error) throw error;

      setSuccess('Resident deleted successfully');
      setShowDeleteModal(false);
      setDeletePassword('');
      setSelectedResident(null);
      await fetchResidents();
    } catch (err) {
      console.error('Error deleting resident:', err);
      setError(err.message || 'Failed to delete resident');
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         resident.room_number.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || resident.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Residents Management</h1>
              <p className="text-muted-foreground">Manage resident information and preferences</p>
            </div>
            <Button
              iconName="Plus"
              iconPosition="left"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              Add Resident
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{residents.filter(r => r.status === 'Active').length}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={24} color="var(--color-success)" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-warning">{residents.filter(r => r.status === 'Inactive').length}</p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="AlertCircle" size={24} color="var(--color-warning)" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Search by name or room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon="Search"
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>

        {/* Residents Table */}
        {loading && <p className="text-center text-muted-foreground">Loading...</p>}

        {!loading && filteredResidents.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Room</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Age</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.map((resident) => (
                  <tr key={resident.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{resident.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{resident.room_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{resident.age || calculateAge(resident.date_of_birth)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        resident.status === 'Active' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {resident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditResident(resident)}
                          className="text-accent hover:text-accent/80 transition-colors"
                          title="Edit Resident"
                        >
                          <Icon name="Edit" size={18} />
                        </button>
                        <button
                          onClick={() => { setSelectedResident(resident); setShowDeleteModal(true); }}
                          className="text-error hover:text-error/80 transition-colors"
                          title="Delete Resident"
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

        {!loading && filteredResidents.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Users" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <p className="text-muted-foreground">No residents found</p>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowAddModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Add New Resident</h2>
                    <button onClick={() => setShowAddModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={handleAddResident}>
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
                        type="date" 
                        label="Date of Birth" 
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        required 
                      />
                      <Select 
                        label="Gender" 
                        value={formData.gender}
                        onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                        options={[
                          { value: '', label: 'Select Gender' },
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' }
                        ]}
                      />
                      <Input 
                        type="text" 
                        label="Room Number" 
                        name="room_number"
                        placeholder="101" 
                        value={formData.room_number}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="date" 
                        label="Admission Date" 
                        name="admission_date"
                        value={formData.admission_date}
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
                      />
                      <Input 
                        type="text" 
                        label="Emergency Contact Name" 
                        name="emergency_contact_name"
                        placeholder="Jane Doe" 
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="text" 
                        label="Relationship" 
                        name="emergency_contact_relationship"
                        placeholder="Daughter" 
                        value={formData.emergency_contact_relationship}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="tel" 
                        label="Emergency Contact Phone" 
                        name="emergency_contact_phone"
                        placeholder="07700 900123" 
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="email" 
                        label="Emergency Contact Email" 
                        name="emergency_contact_email"
                        placeholder="jane@example.com" 
                        value={formData.emergency_contact_email}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Dietary Restrictions</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {dietaryOptions.map((option) => (
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
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Allergens</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {allergenOptions.map((option) => (
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
                    </div>

                    <div className="mt-4">
                      <Select 
                        label="Texture Modification" 
                        value={formData.texture_modification}
                        onChange={(value) => setFormData(prev => ({ ...prev, texture_modification: value }))}
                        options={textureOptions.map(opt => ({ value: opt, label: opt }))}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Medical Notes</label>
                      <textarea
                        name="medical_notes"
                        placeholder="Any important medical information..."
                        value={formData.medical_notes}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setShowAddModal(false); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Resident'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedResident && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowEditModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Edit Resident</h2>
                    <button onClick={() => setShowEditModal(false)}>
                      <Icon name="X" size={24} color="var(--color-muted-foreground)" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={handleUpdateResident}>
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
                        type="date" 
                        label="Date of Birth" 
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        required 
                      />
                      <Select 
                        label="Gender" 
                        value={formData.gender}
                        onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                        options={[
                          { value: '', label: 'Select Gender' },
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' }
                        ]}
                      />
                      <Input 
                        type="text" 
                        label="Room Number" 
                        name="room_number"
                        placeholder="101" 
                        value={formData.room_number}
                        onChange={handleInputChange}
                        required 
                      />
                      <Input 
                        type="date" 
                        label="Admission Date" 
                        name="admission_date"
                        value={formData.admission_date}
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
                      />
                      <Input 
                        type="text" 
                        label="Emergency Contact Name" 
                        name="emergency_contact_name"
                        placeholder="Jane Doe" 
                        value={formData.emergency_contact_name}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="text" 
                        label="Relationship" 
                        name="emergency_contact_relationship"
                        placeholder="Daughter" 
                        value={formData.emergency_contact_relationship}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="tel" 
                        label="Emergency Contact Phone" 
                        name="emergency_contact_phone"
                        placeholder="07700 900123" 
                        value={formData.emergency_contact_phone}
                        onChange={handleInputChange}
                      />
                      <Input 
                        type="email" 
                        label="Emergency Contact Email" 
                        name="emergency_contact_email"
                        placeholder="jane@example.com" 
                        value={formData.emergency_contact_email}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Dietary Restrictions</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {dietaryOptions.map((option) => (
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
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Allergens</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {allergenOptions.map((option) => (
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
                    </div>

                    <div className="mt-4">
                      <Select 
                        label="Texture Modification" 
                        value={formData.texture_modification}
                        onChange={(value) => setFormData(prev => ({ ...prev, texture_modification: value }))}
                        options={textureOptions.map(opt => ({ value: opt, label: opt }))}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Medical Notes</label>
                      <textarea
                        name="medical_notes"
                        placeholder="Any important medical information..."
                        value={formData.medical_notes}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setShowEditModal(false); setSelectedResident(null); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Resident'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedResident && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowDeleteModal(false)}></div>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-error/10 rounded-full mb-4">
                    <Icon name="AlertTriangle" size={24} color="var(--color-error)" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground text-center mb-2">Delete Resident</h2>
                  <p className="text-muted-foreground text-center mb-6">
                    Are you sure you want to delete <strong>{selectedResident.name}</strong>? This action cannot be undone.
                  </p>

                  <Input 
                    type="password" 
                    label="Confirm with your password" 
                    placeholder="Enter your password" 
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />

                  {error && (
                    <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
                      <Icon name="AlertCircle" size={18} color="var(--color-error)" />
                      <p className="text-error text-sm">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button type="button" variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleDeleteResident} 
                      disabled={loading}
                      className="bg-error hover:bg-error/90 text-error-foreground"
                    >
                      {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffResidents;
