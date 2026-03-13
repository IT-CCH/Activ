import supabase from '../services/supabaseClient';

export const seedActivitiesData = async (careHomeId) => {
  try {
    console.log('Starting to seed activities data...');

    // 1. Create Activity Categories
    const categories = [
      { name: 'Physical Exercise', color_code: '#10B981', description: 'Physical activities and exercises', care_home_id: careHomeId },
      { name: 'Arts & Crafts', color_code: '#F59E0B', description: 'Creative and artistic activities', care_home_id: careHomeId },
      { name: 'Music & Entertainment', color_code: '#8B5CF6', description: 'Musical and entertainment activities', care_home_id: careHomeId },
      { name: 'Social Activities', color_code: '#EC4899', description: 'Social interaction activities', care_home_id: careHomeId },
      { name: 'Cognitive Training', color_code: '#3B82F6', description: 'Brain training and cognitive activities', care_home_id: careHomeId },
      { name: 'Outdoor Activities', color_code: '#14B8A6', description: 'Activities in nature', care_home_id: careHomeId },
    ];

    const { data: insertedCategories, error: catError } = await supabase
      .from('activity_categories')
      .upsert(categories, { onConflict: 'name,care_home_id' })
      .select();

    if (catError) throw catError;
    console.log('✓ Categories created');

    // 2. Create Sample Activities
    const activities = [
      {
        category_id: insertedCategories[0].id,
        name: 'Morning Yoga Session',
        description: 'Gentle yoga exercises designed for seniors to improve flexibility and balance',
        objective: 'Improve flexibility, balance, and mental well-being through guided yoga practice',
        instructions: `1. Set up yoga mats in a quiet, well-lit room
2. Start with 5 minutes of breathing exercises
3. Guide through gentle stretches (neck, shoulders, arms)
4. Practice seated poses (cat-cow, seated twists)
5. Include standing poses with chair support (tree pose, warrior)
6. End with 5 minutes of relaxation and meditation
7. Remind participants to move at their own pace`,
        materials_needed: 'Yoga mats, chairs for support, calming music, water bottles',
        benefits: 'Increases flexibility, improves balance, reduces stress, enhances breathing, promotes mindfulness',
        duration_minutes: 45,
        max_participants: 15,
        location: 'Wellness Room',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[1].id,
        name: 'Watercolor Painting Workshop',
        description: 'Express creativity through watercolor painting with nature themes',
        objective: 'Foster creativity, fine motor skills, and self-expression through art',
        instructions: `1. Prepare painting stations with all materials
2. Show example watercolor techniques (wet-on-wet, dry brush)
3. Demonstrate basic brush strokes and color mixing
4. Provide reference images (landscapes, flowers, sunsets)
5. Allow 30 minutes for individual painting
6. Encourage participants to share their work
7. Display finished paintings in the common area`,
        materials_needed: 'Watercolor paints, brushes, watercolor paper, water cups, paper towels, aprons, reference images',
        benefits: 'Enhances creativity, improves hand-eye coordination, provides emotional expression, reduces anxiety',
        duration_minutes: 60,
        max_participants: 12,
        location: 'Art Studio',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[2].id,
        name: 'Sing-Along & Music Therapy',
        description: 'Interactive music session featuring classic songs and sing-alongs',
        objective: 'Stimulate memory, improve mood, and encourage social interaction through music',
        instructions: `1. Set up sound system and prepare song sheets
2. Create a comfortable seating arrangement
3. Start with familiar warm-up songs
4. Include a variety of genres (oldies, folk, patriotic)
5. Encourage participants to sing, clap, or play simple instruments
6. Share stories related to the songs
7. End with a calming lullaby or favorite hymn`,
        materials_needed: 'Sound system, microphones, song sheets (large print), simple instruments (tambourines, maracas, bells)',
        benefits: 'Stimulates memory recall, elevates mood, encourages social bonding, provides emotional outlet',
        duration_minutes: 50,
        max_participants: 20,
        location: 'Main Hall',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[3].id,
        name: 'Tea Time Social Hour',
        description: 'Casual social gathering with tea, snacks, and conversation',
        objective: 'Promote social interaction and reduce feelings of isolation',
        instructions: `1. Set up tables with tablecloths and tea settings
2. Prepare various teas and light refreshments
3. Create conversation starter cards
4. Facilitate introductions and ice-breakers
5. Encourage sharing of stories and experiences
6. Play soft background music
7. Take photos to create memory books`,
        materials_needed: 'Tea sets, variety of teas, cookies and pastries, tablecloths, napkins, conversation cards, soft music',
        benefits: 'Reduces loneliness, improves communication skills, creates friendships, enhances quality of life',
        duration_minutes: 60,
        max_participants: 16,
        location: 'Garden Lounge',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[4].id,
        name: 'Memory Games & Puzzles',
        description: 'Brain-stimulating games and puzzles to enhance cognitive function',
        objective: 'Maintain and improve cognitive abilities through engaging mental exercises',
        instructions: `1. Set up game stations with different activities
2. Explain each game clearly with demonstrations
3. Start with word association and memory card games
4. Introduce jigsaw puzzles (various difficulty levels)
5. Include crosswords and Sudoku for interested participants
6. Rotate activities every 15 minutes
7. Celebrate successes and progress`,
        materials_needed: 'Memory card games, jigsaw puzzles (100-500 pieces), crossword books, Sudoku puzzles, pencils, erasers',
        benefits: 'Improves memory retention, enhances problem-solving skills, slows cognitive decline, builds confidence',
        duration_minutes: 45,
        max_participants: 10,
        location: 'Activity Room',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[5].id,
        name: 'Garden Walk & Nature Time',
        description: 'Peaceful outdoor walk through the gardens with nature observation',
        objective: 'Connect with nature, enjoy fresh air, and engage in light physical activity',
        instructions: `1. Check weather conditions and prepare accordingly
2. Ensure all participants have appropriate footwear
3. Provide walking aids if needed
4. Walk at a gentle pace through the garden paths
5. Stop to observe plants, birds, and seasonal changes
6. Include sensory activities (touching leaves, smelling flowers)
7. Find a shaded spot for rest and conversation`,
        materials_needed: 'Sun hats, sunscreen, water bottles, walking aids, seating cushions, nature identification guides',
        benefits: 'Increases vitamin D exposure, improves mood, provides gentle exercise, reduces stress, stimulates senses',
        duration_minutes: 40,
        max_participants: 12,
        location: 'Garden & Courtyard',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[1].id,
        name: 'Pottery & Clay Modeling',
        description: 'Therapeutic clay work creating simple pottery and sculptures',
        objective: 'Develop fine motor skills and provide sensory stimulation through clay work',
        instructions: `1. Cover tables with plastic sheets
2. Provide aprons and hand wipes
3. Demonstrate basic clay techniques (pinching, coiling, rolling)
4. Start with simple projects (bowls, ornaments, figurines)
5. Allow free creative expression
6. Help with detail work as needed
7. Arrange for pieces to be fired or air-dried`,
        materials_needed: 'Air-dry clay or pottery clay, sculpting tools, rolling pins, texture tools, aprons, water bowls, sponges',
        benefits: 'Strengthens hand muscles, provides tactile stimulation, encourages creativity, produces tangible results',
        duration_minutes: 60,
        max_participants: 8,
        location: 'Art Studio',
        status: 'active',
        care_home_id: careHomeId
      },
      {
        category_id: insertedCategories[2].id,
        name: 'Movie Matinee',
        description: 'Classic film screening with popcorn and comfortable seating',
        objective: 'Provide entertainment and nostalgic experience through classic cinema',
        instructions: `1. Select an age-appropriate classic film
2. Set up projection system and test audio
3. Arrange comfortable seating with blankets
4. Prepare popcorn and beverages
5. Provide brief introduction about the film
6. Dim lights and start the movie
7. Facilitate discussion afterward`,
        materials_needed: 'Projector/TV, sound system, comfortable seating, blankets, popcorn machine, drinks, film selection',
        benefits: 'Provides entertainment, triggers happy memories, creates shared experience, encourages conversation',
        duration_minutes: 120,
        max_participants: 25,
        location: 'Main Hall',
        status: 'active',
        care_home_id: careHomeId
      },
    ];

    const { data: insertedActivities, error: actError } = await supabase
      .from('activities')
      .insert(activities)
      .select();

    if (actError) throw actError;
    console.log('✓ Activities created');

    // 3. Create Activity Sessions for the current month
    const today = new Date();
    const sessions = [];

    // Schedule activities throughout January 2026
    insertedActivities.forEach((activity, index) => {
      // Schedule each activity 3-4 times this month
      const daysToSchedule = [2, 5, 9, 12, 16, 19, 23, 27, 30];
      const sessionCounts = [3, 4, 3, 4, 3, 4, 3, 4];
      
      for (let i = 0; i < sessionCounts[index % sessionCounts.length]; i++) {
        const day = daysToSchedule[(index + i) % daysToSchedule.length];
        const date = new Date(2026, 0, day); // January 2026
        
        // Different time slots based on activity type
        const timeSlots = {
          'Morning Yoga Session': { start: '09:00', end: '09:45' },
          'Watercolor Painting Workshop': { start: '14:00', end: '15:00' },
          'Sing-Along & Music Therapy': { start: '15:30', end: '16:20' },
          'Tea Time Social Hour': { start: '15:00', end: '16:00' },
          'Memory Games & Puzzles': { start: '10:00', end: '10:45' },
          'Garden Walk & Nature Time': { start: '11:00', end: '11:40' },
          'Pottery & Clay Modeling': { start: '14:00', end: '15:00' },
          'Movie Matinee': { start: '19:00', end: '21:00' }
        };

        const times = timeSlots[activity.name] || { start: '14:00', end: '15:00' };

        sessions.push({
          activity_id: activity.id,
          care_home_id: careHomeId,
          scheduled_date: date.toISOString().split('T')[0],
          start_time: times.start,
          end_time: times.end,
          location: activity.location,
          max_participants: activity.max_participants,
          status: 'scheduled',
          notes: `Scheduled ${activity.name}`,
          enrolled_count: Math.floor(Math.random() * (activity.max_participants || 10))
        });
      }
    });

    const { error: sessError } = await supabase
      .from('activity_sessions')
      .insert(sessions);

    if (sessError) throw sessError;
    console.log('✓ Activity sessions created');

    console.log('✅ Sample data seeded successfully!');
    return { success: true, message: 'Sample data loaded successfully!' };

  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, error: error.message };
  }
};
