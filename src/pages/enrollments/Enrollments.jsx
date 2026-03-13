import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';

const Enrollments = () => {
  const { careHomeId } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedResident, setSelectedResident] = useState(null);

  useEffect(() => {
    loadDemoResidents();
  }, []);

  const loadDemoResidents = () => {
    // Demo residents with activity history
    const demoResidents = [
      {
        id: 'res-1',
        full_name: 'Margaret Thompson',
        room_number: '101',
        age: 82,
        photo_url: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=400&q=80',
        status: 'active',
        move_in_date: '2023-06-15',
        care_level: 'Standard',
        mobility: 'Walking with aid',
        dietary_requirements: 'Diabetic friendly',
        emergency_contact: 'John Thompson (Son) - 07700 900123',
        notes: 'Enjoys gardening and music. Former school teacher.',
        interests: ['Gardening', 'Music', 'Reading', 'Knitting'],
        total_activities_enrolled: 8,
        activities_attended: 45,
        attendance_rate: 92,
        favorite_category: 'Arts & Crafts',
        last_activity_date: '2026-01-28',
        enrollments: [
          { activity_name: 'Morning Yoga & Mindfulness', category: 'Physical Exercise', status: 'active', enrolled_date: '2025-12-01', sessions_attended: 12 },
          { activity_name: 'Watercolor Landscapes', category: 'Arts & Crafts', status: 'active', enrolled_date: '2025-11-15', sessions_attended: 8 },
          { activity_name: 'Book Club', category: 'Social Activities', status: 'active', enrolled_date: '2025-10-01', sessions_attended: 10 },
          { activity_name: 'Therapeutic Garden Walks', category: 'Outdoor Activities', status: 'active', enrolled_date: '2025-09-20', sessions_attended: 15 },
        ],
        activity_history: [
          { date: '2026-01-28', activity: 'Morning Yoga & Mindfulness', status: 'attended', notes: 'Very engaged today' },
          { date: '2026-01-27', activity: 'Watercolor Landscapes', status: 'attended', notes: 'Created beautiful sunset painting' },
          { date: '2026-01-26', activity: 'Book Club', status: 'attended', notes: 'Led discussion on chapter 5' },
          { date: '2026-01-25', activity: 'Therapeutic Garden Walks', status: 'missed', notes: 'Felt unwell' },
          { date: '2026-01-24', activity: 'Morning Yoga & Mindfulness', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-2',
        full_name: 'Harold Mitchell',
        room_number: '105',
        age: 78,
        photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
        status: 'active',
        move_in_date: '2024-01-10',
        care_level: 'Enhanced',
        mobility: 'Wheelchair user',
        dietary_requirements: 'Low sodium',
        emergency_contact: 'Susan Mitchell (Daughter) - 07700 900456',
        notes: 'Former engineer. Loves puzzles and brain games.',
        interests: ['Puzzles', 'Chess', 'History', 'Technology'],
        total_activities_enrolled: 5,
        activities_attended: 32,
        attendance_rate: 88,
        favorite_category: 'Cognitive Training',
        last_activity_date: '2026-01-28',
        enrollments: [
          { activity_name: 'Brain Fitness Challenge', category: 'Cognitive Training', status: 'active', enrolled_date: '2024-02-01', sessions_attended: 20 },
          { activity_name: 'Trivia & Quiz Games', category: 'Cognitive Training', status: 'active', enrolled_date: '2024-03-15', sessions_attended: 12 },
          { activity_name: 'Classic Movie Matinee', category: 'Music & Entertainment', status: 'active', enrolled_date: '2024-04-01', sessions_attended: 8 },
        ],
        activity_history: [
          { date: '2026-01-28', activity: 'Brain Fitness Challenge', status: 'attended', notes: 'Won the logic puzzle competition' },
          { date: '2026-01-27', activity: 'Trivia & Quiz Games', status: 'attended', notes: 'Team captain for Blue Team' },
          { date: '2026-01-26', activity: 'Classic Movie Matinee', status: 'attended', notes: '' },
          { date: '2026-01-25', activity: 'Brain Fitness Challenge', status: 'attended', notes: '' },
          { date: '2026-01-24', activity: 'Trivia & Quiz Games', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-3',
        full_name: 'Dorothy Williams',
        room_number: '203',
        age: 85,
        photo_url: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&q=80',
        status: 'active',
        move_in_date: '2022-09-01',
        care_level: 'Standard',
        mobility: 'Independent',
        dietary_requirements: 'None',
        emergency_contact: 'Mary Williams (Daughter) - 07700 900789',
        notes: 'Very social and loves group activities. Former nurse.',
        interests: ['Socializing', 'Dancing', 'Cooking', 'Crafts'],
        total_activities_enrolled: 10,
        activities_attended: 78,
        attendance_rate: 95,
        favorite_category: 'Social Activities',
        last_activity_date: '2026-01-28',
        enrollments: [
          { activity_name: 'Afternoon Tea & Stories', category: 'Social Activities', status: 'active', enrolled_date: '2022-10-01', sessions_attended: 40 },
          { activity_name: 'Musical Memories Sing-Along', category: 'Music & Entertainment', status: 'active', enrolled_date: '2022-11-15', sessions_attended: 25 },
          { activity_name: 'Chair Aerobics', category: 'Physical Exercise', status: 'active', enrolled_date: '2023-01-01', sessions_attended: 13 },
          { activity_name: 'Pottery & Clay Sculpting', category: 'Arts & Crafts', status: 'paused', enrolled_date: '2023-06-01', sessions_attended: 8 },
        ],
        activity_history: [
          { date: '2026-01-28', activity: 'Afternoon Tea & Stories', status: 'attended', notes: 'Shared wonderful wartime stories' },
          { date: '2026-01-27', activity: 'Musical Memories Sing-Along', status: 'attended', notes: 'Requested favorite song' },
          { date: '2026-01-26', activity: 'Chair Aerobics', status: 'attended', notes: '' },
          { date: '2026-01-25', activity: 'Afternoon Tea & Stories', status: 'attended', notes: '' },
          { date: '2026-01-24', activity: 'Musical Memories Sing-Along', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-4',
        full_name: 'George Anderson',
        room_number: '108',
        age: 80,
        photo_url: 'https://images.unsplash.com/photo-1559963110-71b394e7494d?w=400&q=80',
        status: 'active',
        move_in_date: '2024-05-20',
        care_level: 'Standard',
        mobility: 'Walking with aid',
        dietary_requirements: 'Vegetarian',
        emergency_contact: 'Robert Anderson (Son) - 07700 900111',
        notes: 'Former chef. Enjoys cooking demonstrations and outdoor activities.',
        interests: ['Cooking', 'Nature', 'Photography', 'Walking'],
        total_activities_enrolled: 6,
        activities_attended: 28,
        attendance_rate: 85,
        favorite_category: 'Outdoor Activities',
        last_activity_date: '2026-01-27',
        enrollments: [
          { activity_name: 'Therapeutic Garden Walks', category: 'Outdoor Activities', status: 'active', enrolled_date: '2024-06-01', sessions_attended: 15 },
          { activity_name: 'Bird Watching', category: 'Outdoor Activities', status: 'active', enrolled_date: '2024-07-01', sessions_attended: 8 },
          { activity_name: 'Cooking Demonstrations', category: 'Social Activities', status: 'active', enrolled_date: '2024-08-01', sessions_attended: 5 },
        ],
        activity_history: [
          { date: '2026-01-27', activity: 'Therapeutic Garden Walks', status: 'attended', notes: 'Helped identify bird species' },
          { date: '2026-01-26', activity: 'Bird Watching', status: 'attended', notes: 'Spotted rare finch' },
          { date: '2026-01-25', activity: 'Cooking Demonstrations', status: 'attended', notes: 'Shared family recipe' },
          { date: '2026-01-24', activity: 'Therapeutic Garden Walks', status: 'attended', notes: '' },
          { date: '2026-01-23', activity: 'Bird Watching', status: 'missed', notes: 'Doctor appointment' },
        ]
      },
      {
        id: 'res-5',
        full_name: 'Eleanor Davis',
        room_number: '210',
        age: 88,
        photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
        status: 'active',
        move_in_date: '2021-11-15',
        care_level: 'Enhanced',
        mobility: 'Limited mobility',
        dietary_requirements: 'Soft foods',
        emergency_contact: 'James Davis (Grandson) - 07700 900222',
        notes: 'Former artist. Loves creative activities and music.',
        interests: ['Painting', 'Classical Music', 'Poetry', 'Nature'],
        total_activities_enrolled: 7,
        activities_attended: 52,
        attendance_rate: 78,
        favorite_category: 'Arts & Crafts',
        last_activity_date: '2026-01-26',
        enrollments: [
          { activity_name: 'Watercolor Landscapes', category: 'Arts & Crafts', status: 'active', enrolled_date: '2021-12-01', sessions_attended: 35 },
          { activity_name: 'Classical Music Appreciation', category: 'Music & Entertainment', status: 'active', enrolled_date: '2022-01-15', sessions_attended: 12 },
          { activity_name: 'Poetry Reading', category: 'Social Activities', status: 'paused', enrolled_date: '2022-06-01', sessions_attended: 5 },
        ],
        activity_history: [
          { date: '2026-01-26', activity: 'Watercolor Landscapes', status: 'attended', notes: 'Beautiful landscape of the garden' },
          { date: '2026-01-25', activity: 'Classical Music Appreciation', status: 'attended', notes: 'Enjoyed Beethoven session' },
          { date: '2026-01-24', activity: 'Watercolor Landscapes', status: 'missed', notes: 'Resting today' },
          { date: '2026-01-23', activity: 'Classical Music Appreciation', status: 'attended', notes: '' },
          { date: '2026-01-22', activity: 'Watercolor Landscapes', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-6',
        full_name: 'Robert Brown',
        room_number: '112',
        age: 75,
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        status: 'active',
        move_in_date: '2025-03-01',
        care_level: 'Standard',
        mobility: 'Independent',
        dietary_requirements: 'Gluten-free',
        emergency_contact: 'Linda Brown (Wife) - 07700 900333',
        notes: 'Very active. Former sports coach. Loves physical activities.',
        interests: ['Exercise', 'Sports', 'Coaching', 'Walking'],
        total_activities_enrolled: 4,
        activities_attended: 22,
        attendance_rate: 98,
        favorite_category: 'Physical Exercise',
        last_activity_date: '2026-01-28',
        enrollments: [
          { activity_name: 'Morning Yoga & Mindfulness', category: 'Physical Exercise', status: 'active', enrolled_date: '2025-03-15', sessions_attended: 10 },
          { activity_name: 'Chair Aerobics', category: 'Physical Exercise', status: 'active', enrolled_date: '2025-04-01', sessions_attended: 8 },
          { activity_name: 'Therapeutic Garden Walks', category: 'Outdoor Activities', status: 'active', enrolled_date: '2025-05-01', sessions_attended: 4 },
        ],
        activity_history: [
          { date: '2026-01-28', activity: 'Morning Yoga & Mindfulness', status: 'attended', notes: 'Helped new participant' },
          { date: '2026-01-27', activity: 'Chair Aerobics', status: 'attended', notes: 'Led warm-up exercises' },
          { date: '2026-01-26', activity: 'Therapeutic Garden Walks', status: 'attended', notes: '' },
          { date: '2026-01-25', activity: 'Morning Yoga & Mindfulness', status: 'attended', notes: '' },
          { date: '2026-01-24', activity: 'Chair Aerobics', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-7',
        full_name: 'Patricia Clark',
        room_number: '205',
        age: 79,
        photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
        status: 'inactive',
        move_in_date: '2023-08-10',
        care_level: 'Enhanced',
        mobility: 'Wheelchair user',
        dietary_requirements: 'Pureed foods',
        emergency_contact: 'Mark Clark (Son) - 07700 900444',
        notes: 'Currently on medical leave. Expected to return next month.',
        interests: ['Music', 'Crafts', 'Socializing'],
        total_activities_enrolled: 3,
        activities_attended: 18,
        attendance_rate: 0,
        favorite_category: 'Music & Entertainment',
        last_activity_date: '2026-01-10',
        enrollments: [
          { activity_name: 'Musical Memories Sing-Along', category: 'Music & Entertainment', status: 'paused', enrolled_date: '2023-09-01', sessions_attended: 15 },
          { activity_name: 'Pottery & Clay Sculpting', category: 'Arts & Crafts', status: 'paused', enrolled_date: '2023-10-01', sessions_attended: 3 },
        ],
        activity_history: [
          { date: '2026-01-10', activity: 'Musical Memories Sing-Along', status: 'attended', notes: 'Last session before medical leave' },
          { date: '2026-01-08', activity: 'Pottery & Clay Sculpting', status: 'attended', notes: '' },
          { date: '2026-01-06', activity: 'Musical Memories Sing-Along', status: 'attended', notes: '' },
        ]
      },
      {
        id: 'res-8',
        full_name: 'William Taylor',
        room_number: '115',
        age: 83,
        photo_url: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&q=80',
        status: 'active',
        move_in_date: '2024-09-15',
        care_level: 'Standard',
        mobility: 'Walking with aid',
        dietary_requirements: 'None',
        emergency_contact: 'Emma Taylor (Daughter) - 07700 900555',
        notes: 'Former librarian. Loves reading and intellectual discussions.',
        interests: ['Reading', 'History', 'Debates', 'Writing'],
        total_activities_enrolled: 5,
        activities_attended: 15,
        attendance_rate: 72,
        favorite_category: 'Social Activities',
        last_activity_date: '2026-01-27',
        enrollments: [
          { activity_name: 'Book Club', category: 'Social Activities', status: 'active', enrolled_date: '2024-10-01', sessions_attended: 8 },
          { activity_name: 'Trivia & Quiz Games', category: 'Cognitive Training', status: 'active', enrolled_date: '2024-11-01', sessions_attended: 5 },
          { activity_name: 'Poetry Reading', category: 'Social Activities', status: 'active', enrolled_date: '2025-01-01', sessions_attended: 2 },
        ],
        activity_history: [
          { date: '2026-01-27', activity: 'Book Club', status: 'attended', notes: 'Presented book review' },
          { date: '2026-01-26', activity: 'Trivia & Quiz Games', status: 'attended', notes: '' },
          { date: '2026-01-25', activity: 'Poetry Reading', status: 'missed', notes: 'Visiting family' },
          { date: '2026-01-24', activity: 'Book Club', status: 'attended', notes: '' },
          { date: '2026-01-23', activity: 'Trivia & Quiz Games', status: 'missed', notes: 'Physiotherapy session' },
        ]
      },
    ];

    setResidents(demoResidents);
    setLoading(false);
  };

  const getEngagementLevel = (rate) => {
    if (rate >= 90) return { level: 'Highly Engaged', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (rate >= 70) return { level: 'Active', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (rate >= 50) return { level: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { level: 'Low Engagement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const categories = [...new Set(residents.flatMap(r => r.enrollments.map(e => e.category)))];

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = 
      resident.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.interests.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || resident.status === statusFilter;
    
    const matchesEngagement = engagementFilter === 'all' || 
      (engagementFilter === 'high' && resident.attendance_rate >= 90) ||
      (engagementFilter === 'active' && resident.attendance_rate >= 70 && resident.attendance_rate < 90) ||
      (engagementFilter === 'moderate' && resident.attendance_rate >= 50 && resident.attendance_rate < 70) ||
      (engagementFilter === 'low' && resident.attendance_rate < 50);
    
    const matchesCategory = categoryFilter === 'all' || 
      resident.enrollments.some(e => e.category === categoryFilter);
    
    return matchesSearch && matchesStatus && matchesEngagement && matchesCategory;
  });

  // Stats calculations
  const totalResidents = residents.length;
  const activeResidents = residents.filter(r => r.status === 'active').length;
  const avgAttendanceRate = Math.round(residents.reduce((sum, r) => sum + r.attendance_rate, 0) / residents.length);
  const totalEnrollments = residents.reduce((sum, r) => sum + r.total_activities_enrolled, 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setEngagementFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || engagementFilter !== 'all' || categoryFilter !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading residents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Resident Enrollments
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            View resident activity enrollments, engagement history and participation details
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Icon name="Users" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Residents</p>
                <p className="text-2xl font-bold text-gray-800">{totalResidents}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <Icon name="UserCheck" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Residents</p>
                <p className="text-2xl font-bold text-gray-800">{activeResidents}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Icon name="TrendingUp" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-800">{avgAttendanceRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl">
                <Icon name="ClipboardList" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-800">{totalEnrollments}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, room, or interests..."
                className="w-full pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Engagement Filter */}
            <select
              value={engagementFilter}
              onChange={(e) => setEngagementFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Engagement</option>
              <option value="high">Highly Engaged (90%+)</option>
              <option value="active">Active (70-89%)</option>
              <option value="moderate">Moderate (50-69%)</option>
              <option value="low">Low Engagement (&lt;50%)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="X" size={16} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-purple-900">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-purple-900">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              )}
              {engagementFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Engagement: {engagementFilter}
                  <button onClick={() => setEngagementFilter('all')} className="hover:text-purple-900">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')} className="hover:text-purple-900">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Results count */}
        <motion.div 
          className="mb-4 text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Showing {filteredResidents.length} of {residents.length} residents
        </motion.div>

        {/* Residents Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {filteredResidents.map((resident, idx) => {
            const engagement = getEngagementLevel(resident.attendance_rate);
            return (
              <motion.div
                key={resident.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onClick={() => setSelectedResident(resident)}
              >
                {/* Resident Header */}
                <div className="relative">
                  <div className="h-24 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                  <div className="absolute -bottom-10 left-4">
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
                      {resident.photo_url ? (
                        <img 
                          src={resident.photo_url} 
                          alt={resident.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100">
                          <Icon name="User" size={32} className="text-purple-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      resident.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {resident.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Resident Info */}
                <div className="pt-12 px-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{resident.full_name}</h3>
                      <p className="text-sm text-gray-500">Room {resident.room_number} • Age {resident.age}</p>
                    </div>
                  </div>

                  {/* Engagement Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${engagement.bg} ${engagement.color}`}>
                    <Icon name="Activity" size={12} />
                    {engagement.level} • {resident.attendance_rate}% Attendance
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">{resident.total_activities_enrolled}</p>
                      <p className="text-xs text-gray-500">Enrolled</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-emerald-600">{resident.activities_attended}</p>
                      <p className="text-xs text-gray-500">Attended</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-pink-600">{resident.enrollments.filter(e => e.status === 'active').length}</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                  </div>

                  {/* Favorite Category */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Icon name="Heart" size={14} className="text-pink-500" />
                    <span>Favorite: {resident.favorite_category}</span>
                  </div>

                  {/* Interests Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {resident.interests.slice(0, 3).map((interest, i) => (
                      <span 
                        key={i}
                        className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs"
                      >
                        {interest}
                      </span>
                    ))}
                    {resident.interests.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                        +{resident.interests.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredResidents.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Icon name="Users" size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No residents found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </motion.main>

      {/* Resident Detail Modal */}
      <AnimatePresence>
        {selectedResident && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedResident(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative">
                <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                <button
                  onClick={() => setSelectedResident(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                >
                  <Icon name="X" size={20} />
                </button>
                <div className="absolute -bottom-12 left-6">
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                    {selectedResident.photo_url ? (
                      <img 
                        src={selectedResident.photo_url} 
                        alt={selectedResident.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100">
                        <Icon name="User" size={40} className="text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="pt-16 px-6 pb-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
                {/* Resident Info Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedResident.full_name}</h2>
                    <p className="text-gray-500">Room {selectedResident.room_number} • Age {selectedResident.age}</p>
                    <p className="text-sm text-gray-400 mt-1">Resident since {new Date(selectedResident.move_in_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedResident.status === 'active' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedResident.status === 'active' ? 'Active Resident' : 'Inactive'}
                  </span>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-bold text-purple-600">{selectedResident.total_activities_enrolled}</p>
                    <p className="text-sm text-gray-600">Enrolled Activities</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-600">{selectedResident.activities_attended}</p>
                    <p className="text-sm text-gray-600">Sessions Attended</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{selectedResident.attendance_rate}%</p>
                    <p className="text-sm text-gray-600">Attendance Rate</p>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-xl">
                    <p className="text-2xl font-bold text-pink-600">{selectedResident.enrollments.filter(e => e.status === 'active').length}</p>
                    <p className="text-sm text-gray-600">Active Enrollments</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Personal Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Icon name="User" size={18} className="text-purple-500" />
                      Personal Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Care Level:</span>
                        <span className="font-medium text-gray-700">{selectedResident.care_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mobility:</span>
                        <span className="font-medium text-gray-700">{selectedResident.mobility}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dietary:</span>
                        <span className="font-medium text-gray-700">{selectedResident.dietary_requirements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Emergency Contact:</span>
                        <span className="font-medium text-gray-700 text-right text-xs">{selectedResident.emergency_contact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Icon name="Heart" size={18} className="text-pink-500" />
                      Interests & Preferences
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedResident.interests.map((interest, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 bg-white text-purple-600 rounded-full text-sm border border-purple-200"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {selectedResident.notes}
                    </p>
                  </div>
                </div>

                {/* Current Enrollments */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Icon name="ClipboardList" size={18} className="text-purple-500" />
                    Activity Enrollments
                  </h3>
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Activity</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Sessions</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Enrolled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedResident.enrollments.map((enrollment, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-800">{enrollment.activity_name}</td>
                            <td className="px-4 py-3 text-gray-600">{enrollment.category}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-purple-600">{enrollment.sessions_attended}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                enrollment.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {enrollment.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(enrollment.enrolled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Activity History */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Icon name="Clock" size={18} className="text-blue-500" />
                    Recent Activity History
                  </h3>
                  <div className="space-y-2">
                    {selectedResident.activity_history.map((record, i) => (
                      <div 
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          record.status === 'attended' ? 'bg-emerald-50' : 'bg-amber-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            record.status === 'attended' ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}>
                            <Icon 
                              name={record.status === 'attended' ? 'CheckCircle' : 'XCircle'} 
                              size={16} 
                              className={record.status === 'attended' ? 'text-emerald-600' : 'text-amber-600'}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{record.activity}</p>
                            {record.notes && (
                              <p className="text-sm text-gray-500">{record.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            {new Date(record.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <span className={`text-xs ${
                            record.status === 'attended' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {record.status === 'attended' ? 'Attended' : 'Missed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Enrollments;
