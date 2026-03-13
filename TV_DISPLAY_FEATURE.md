# TV Display Feature - Activity Planner

## Overview

The TV Display feature provides a full-screen, slideshow-style display system for care homes to showcase activities, greetings, and engaging content on TVs in common areas.

## Features

### 🖥️ **TV Display Page** (`/tv-display`)
A full-screen, auto-rotating presentation with three types of slides:

#### Slide 1: Greeting Slide 🎉
- **Live Time**: Updates every second with current time (HH:MM:SS format)
- **Current Date**: Shows full date (e.g., "Monday, January 26, 2026")
- **Special Days**: Automatically detects and highlights special occasions:
  - New Year's Day (Jan 1)
  - Valentine's Day (Feb 14)
  - St. Patrick's Day (Mar 17)
  - Earth Day (Apr 22)
  - Christmas Day (Dec 25)
- **Design**: Vibrant gradient background with animated elements

#### Slide 2: Today's Activities 📅
- **Activity List**: Displays scheduled activities for the day with:
  - Activity name
  - Time slot (start and end times)
  - Location/Room
  - Emoji icons for visual appeal
- **Examples**: Chair Yoga, Art Therapy, Social Hour
- **Interactive**: Smooth hover effects on activity cards

#### Slide 3: Memory Quiz 🧠
- **Daily Quiz**: Changes daily based on the date
- **Format**: 
  - Question display
  - Multiple choice options
  - Answer highlighting (correct answer in green)
- **Questions Pool**: Includes general knowledge and trivia questions
- **Engagement**: Encourages residents to participate

### 🎮 **TV Display Control Panel** (`/tv-display-control`)
A comprehensive admin interface for managing TV display content and settings.

#### Features:
- **Start TV Display**: One-click button to launch TV display in fullscreen
- **Slide Management**:
  - View all slides in a organized list
  - Add new custom slides
  - Edit existing slides
  - Delete slides (minimum 1 slide required)
  - Reorder slides (move up/down)
- **Slide Types**:
  - Greeting
  - Activities
  - Quiz
  - Custom (user-defined)
- **Display Settings**:
  - **Auto-Play Toggle**: Enable/disable automatic slide rotation
  - **Slide Duration**: Configure time each slide displays (5-60 seconds)
  - **Total Slide Count**: Shows number of slides in rotation
- **Slide List Display**:
  - Slide number indicator
  - Slide type badge
  - Description
  - Action buttons (move, edit, delete)

### 🎬 **Inline Controls** (Bottom of TV Display)
When TV Display is running, users can control:
- **Navigation**: Previous/Next slide buttons
- **Slide Indicators**: Visual dots showing current slide, clickable to jump
- **Auto-Play**: Play/Pause button to toggle automatic rotation
- **Exit**: Close fullscreen button

## Integration with Dashboard

### Fixed Position Buttons
Two buttons appear in the bottom-right corner of the main dashboard:

1. **TV Display Button** (Top)
   - Opens TV Display in a new window
   - Automatically requests fullscreen mode
   - Color: Indigo/Purple gradient
   - Action: Launches the presentation

2. **Control Panel Button** (Below TV Display)
   - Navigates to TV Display Control Panel
   - Color: Dark slate gradient
   - Action: Opens management interface

## Usage

### For Care Home Staff

1. **Viewing TV Display**:
   - Click the "TV Display" button on the dashboard
   - The display will open in a new window and enter fullscreen
   - Slides automatically rotate every 15 seconds (default)
   - Use bottom controls to navigate manually

2. **Pausing/Playing**:
   - Click the play/pause icon to stop auto-rotation
   - Use arrow buttons to manually advance slides
   - Click slide indicators to jump to specific slide

3. **Exiting**:
   - Click the X button on the control panel, or
   - Press Escape key in fullscreen

### For Administrators

1. **Managing Slides**:
   - Navigate to Control Panel (from dashboard buttons)
   - Click "Add New Slide" to create custom content
   - Fill in slide name, type, and description
   - Slides are automatically added to rotation

2. **Reordering Slides**:
   - Click up/down arrows to change slide order
   - Changes apply immediately

3. **Configuring Display**:
   - Toggle "Auto-Play" to control automatic rotation
   - Adjust "Slide Duration" slider (5-60 seconds)
   - Settings apply to current session

4. **Deleting Slides**:
   - Click trash icon to remove a slide
   - Minimum 1 slide required (cannot delete all)
   - Deleted slides cannot be recovered

## Special Features

### 🎨 **Visual Design**
- **Gradient Backgrounds**: Each slide type has unique color schemes
  - Greeting: Indigo/Purple/Pink gradient
  - Activities: Emerald/Teal/Cyan gradient
  - Quiz: Amber/Orange/Red gradient
- **Animated Elements**: Pulsing background circles for visual interest
- **Responsive Typography**: Large, readable fonts for TV displays
- **Smooth Transitions**: Hover effects and slide animations

### ⏰ **Time Display**
- Live clock updates every second
- Displays time in 24-hour format (HH:MM:SS)
- Full date with weekday name

### 🎁 **Special Day Highlighting**
- Automatic detection of UK holidays and special days
- Custom styling with sparkle emojis (✨)
- Separate highlighted section on greeting slide

### 📱 **Responsive Display**
- Optimized for large TV screens
- Full 1920x1080 and higher resolutions
- Text scales appropriately for viewing distance

## Technical Details

### Routes
- `/tv-display` - TV Display fullscreen presentation
- `/tv-display-control` - Control Panel admin interface

### Components
- **TVDisplay.jsx** - Main fullscreen presentation component
- **TVDisplayControlPanel.jsx** - Admin management interface

### State Management
- Local component state for slide rotation
- Auto-play timer management
- Keyboard and mouse event handling

### Accessibility
- Keyboard navigation support (Arrow keys, Escape)
- Mouse/touch navigation
- Clear button labels and descriptions

## Future Enhancements

Potential features to add:
- Save/load slide configurations
- Upload custom images for slides
- Resident photo rotation
- Announcements/news ticker
- Weather display
- Resident birthday highlights
- Caregiver messages/notes
- Music integration
- Timer/countdown displays
- Polls and interactive content

## Configuration

### Default Settings
- Auto-play: Enabled
- Slide duration: 15 seconds
- Default slides: 3 (Greeting, Activities, Quiz)

### Customization
All settings can be modified via the Control Panel. Changes apply immediately to the current session (resets on page reload unless persisted).

## Support

For issues or feature requests related to the TV Display:
1. Check the Control Panel for current configuration
2. Ensure slides are in desired order
3. Verify auto-play is enabled if slides aren't rotating
4. Try adjusting slide duration
5. Clear browser cache if display looks incorrect

---

**Last Updated**: January 26, 2026
**Version**: 1.0
