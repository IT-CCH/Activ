import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/navigation/Header';
import Icon from '../components/AppIcon';
import usePageTitle from '../hooks/usePageTitle';

const Help = () => {
  usePageTitle('Help & Documentation');
  const [expandedSection, setExpandedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'Rocket',
      content: [
        {
          title: 'System Overview',
          text: 'The Food Calendar Management System helps care homes manage meal planning, delivery tracking, cost analytics, and compliance reporting. The system supports multiple user roles with different permissions and capabilities.'
        },
        {
          title: 'User Roles',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Admin:</strong> Full system access, manage users, care homes, residents, and view all data across facilities</li>
              <li><strong>Care Home Manager:</strong> Manage meal cycles, Confirm deliveries, residents, and view analytics for their specific care home</li>
              <li><strong>Staff:</strong> Confirm deliveries, view schedules, and access reports for their care home</li>
            </ul>
          )
        },
        {
          title: 'First Login',
          text: 'After receiving your credentials, log in at the login page. You\'ll be prompted to change your password on first login. Navigate using the top menu bar to access different features based on your role.'
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Main Dashboard',
      icon: 'LayoutDashboard',
      content: [
        {
          title: 'Overview',
          text: 'The Dashboard provides a real-time overview of today\'s meals, key performance indicators, and quick access to important functions.'
        },
        {
          title: 'Today\'s Menu Widget',
          text: 'Displays the scheduled meals for today including main meals, sides, and desserts. Click on any meal to view detailed nutritional information, allergens, and preparation instructions.'
        },
        {
          title: 'KPI Cards',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Total Residents:</strong> Current number of active residents in your care home</li>
              <li><strong>Meals Served Today:</strong> Number of confirmed deliveries today</li>
              <li><strong>Pending Deliveries:</strong> Deliveries awaiting confirmation</li>
              <li><strong>Today\'s Cost:</strong> Total cost of meals scheduled/delivered today</li>
            </ul>
          )
        },
        {
          title: 'Weekly Calendar Preview',
          text: 'Shows the upcoming week\'s meal schedule. Click any day to view full meal details or navigate to the Food Calendar for more options.'
        },
        
        {
          title: 'Quick Actions',
          text: 'Use the "Confirm Delivery" button to quickly record today\'s meal deliveries, including side dish and dessert counts.'
        }
      ]
    },
    {
      id: 'food-calendar',
      title: 'Food Calendar & Menu Planning',
      icon: 'Calendar',
      content: [
        {
          title: 'Calendar Views',
          text: 'The Food Calendar offers viewing, creating, and editing scheduled meals. Scheduling works on a weekly basis, and you can create weekly cycles based on your needs.'
        },
        {
          title: 'Creating a Meal Cycle',
          text: (
            <div className="space-y-2">
              <p><strong>Step 1:</strong> Click "Create New Cycle" in Management View</p>
              <p><strong>Step 2:</strong> Select your care home (admins only) and set the cycle length (1-6 weeks)</p>
              <p><strong>Step 3:</strong> Choose a start date and optionally set a week offset (e.g., start from Week 2 instead of Week 1)</p>
              <p><strong>Step 4:</strong> The system shows a preview of which calendar weeks correspond to which cycle weeks</p>
              <p><strong>Step 5:</strong> Plan meals for each day by selecting main meals, sides, and desserts from dropdowns</p>
              <p><strong>Step 6:</strong> Click "Save Meal Template" to store the cycle (it won't schedule meals yet)</p>
              <p><strong>Step 7:</strong> Click "Confirm" to activate the cycle and create deliveries</p>
            </div>
          )
        },
        {
          title: 'Week Offset Feature',
          text: 'If you have a multi-week cycle but want to start from a specific week (e.g., Week 2), use the "Start from Week Number" dropdown. The preview shows exactly which calendar dates will correspond to which cycle week numbers.'
        },
        {
          title: 'Reordering Weeks',
          text: 'Use the up (⬆️) and down (⬇️) arrow buttons next to each week header to swap weeks. This is useful if you accidentally set Week 2 as Week 1. Changes are frontend-only until you click "Update Meal Template".'
        },
        {
          title: 'Editing Meal Cycles',
          text: 'Click "Edit Template" to modify an existing cycle. You can change meals for any week, add/remove sides and desserts, or adjust the week offset. Remember to save your changes.'
        },
        {
          title: 'Meal Selection Tips',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Main meal is required for each day</li>
              <li>You can select multiple side dishes (up to 3)</li>
              <li>You can select multiple desserts (up to 2)</li>
              <li>Meals marked as "Global" are available to all care homes</li>
              <li>Care home-specific meals only appear for that facility</li>
            </ul>
          )
        },
        
      ]
    },
    {
      id: 'delivery-status',
      title: 'Delivery Status & Confirmation',
      icon: 'ClipboardCheck',
      content: [
        {
          title: 'Overview',
          text: 'The Delivery Status page shows all scheduled meal deliveries with their confirmation status. Staff can confirm deliveries and enter actual served counts.'
        },
        {
          title: 'Confirming a Delivery',
          text: (
            <div className="space-y-2">
              <p><strong>Step 1:</strong> Find the delivery record for today (or any date)</p>
              <p><strong>Step 2:</strong> Click "Confirm" button on the record</p>
              <p><strong>Step 3:</strong> In the modal, enter the number of main meals served</p>
              <p><strong>Step 4:</strong> If there are side dishes, enter the count for each side</p>
              <p><strong>Step 5:</strong> If there are desserts, enter the count for each dessert</p>
              <p><strong>Step 6:</strong> Optionally add notes about the delivery</p>
              <p><strong>Step 7:</strong> Click "Confirm Delivery" to save</p>
            </div>
          )
        },
        {
          title: 'Multiple Sides & Desserts',
          text: 'When a delivery includes multiple side dishes or desserts, you\'ll see separate input fields for each. Enter the actual count served for each item. The system calculates total costs based on these counts.'
        },
        {
          title: 'Editing Confirmed Deliveries',
          text: 'Staff and managers can edit previously confirmed deliveries. Click the "Edit" button on any confirmed record to update counts or add notes.'
        },
        {
          title: 'Delivery Status Indicators',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Scheduled:</strong> Meal is planned but not yet delivered</li>
              <li><strong>Confirmed:</strong> Delivery completed and counts recorded</li>
              <li><strong>Pending or Not Delivered:</strong> Meals scheduled, awaiting confirmation</li>
              <li><strong>Overdue:</strong> Past delivery date but not confirmed</li>
            </ul>
          )
        },
        {
          title: 'Filtering & Search',
          text: 'Use the date range picker to view deliveries for specific periods. Filter by status, care home (admins), or search by meal name to find specific records quickly.'
        },
        {
          title: 'Care Home Column',
          text: 'Admins and Care Home Managers see a "Care Home" column showing which facility each delivery is for. Staff only see their own facility\'s deliveries.'
        }
      ]
    },
    {
      id: 'meals-management',
      title: 'Meals Management',
      icon: 'UtensilsCrossed',
      content: [
        {
          title: 'Overview',
          text: 'Manage your meal library including main meals, side dishes, and desserts. Create custom meals specific to your care home or use global meals available system-wide.'
        },
        {
          title: 'Creating a New Meal',
          text: (
            <div className="space-y-2">
              <p><strong>Step 1:</strong> Click "Add New Meal" button</p>
              <p><strong>Step 2:</strong> Fill in meal details:</p>
              <ul className="list-disc pl-8 space-y-1">
                <li>Meal Name (required)</li>
                <li>Meal Type: Main, Side, or Dessert</li>
                <li>Description</li>
                <li>Cost per serving</li>
                <li>Preparation time</li>
                <li>Dietary tags (Vegetarian, Vegan, Gluten-Free, etc.)</li>
                <li>Allergen information</li>
                <li>Nutritional information (calories, protein, carbs, fat)</li>
                <li>Ingredients list</li>
              </ul>
              <p><strong>Step 3:</strong> Click "Save Meal" to add to your library</p>
            </div>
          )
        },
        {
          title: 'Global vs Care Home-Specific Meals',
          text: 'Admins can create "Global" meals that all care homes can use. Care Home Managers and Staff create meals specific to their facility. When planning meal cycles, you\'ll see both global meals and your care home\'s meals.'
        },
        {
          title: 'Editing Meals',
          text: 'Click the edit icon on any meal card to modify its details. Only admins can edit global meals. You can update costs, dietary tags, nutritional info, or any other field.'
        },
        {
          title: 'Deleting Meals',
          text: 'Click the delete icon and confirm your password to delete a meal. Note: You cannot delete meals that are currently scheduled in active meal cycles.'
        },
        {
          title: 'Bulk Upload',
          text: 'Use the "Bulk Upload" feature to import multiple meals at once via CSV or Excel file. Download the template to see the required format.'
        },
        {
          title: 'Search & Filters',
          text: 'Use the search bar to find meals by name or ingredients. Filter by meal type (Main/Side/Dessert) or by care home (admins only) to narrow down results.'
        },
        {
          title: 'Meal Cards',
          text: 'Each meal displays cost, dietary tags, allergen warnings, and prep time. Click on a meal card to view full nutritional details and ingredients.'
        }
      ]
    },
    {
      id: 'cost-analytics',
      title: 'Cost Analytics & Reports',
      icon: 'TrendingUp',
      content: [
        {
          title: 'Overview',
          text: 'The Cost Analytics page provides comprehensive financial insights including spending trends, cost breakdowns, budget alerts, and forecasting tools.'
        },
        {
          title: 'Date Range Selection',
          text: 'Use the date range picker to analyze costs for different periods: Last 7 days, Last 30 days, Last 90 days, or Custom range. The dashboard updates automatically when you change the range.'
        },
        {
          title: 'Key Metrics',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Total Spend:</strong> Sum of all confirmed meal costs in the selected period</li>
              <li><strong>Average Cost per Meal:</strong> Total spend divided by number of meals served</li>
              <li><strong>Cost per Resident:</strong> Total spend divided by number of residents</li>
              <li><strong>Budget Utilization:</strong> Percentage of monthly budget used</li>
            </ul>
          )
        },
        {
          title: 'Spending Chart',
          text: 'Line chart showing daily spending trends over time. Identify patterns, spikes, or unusual spending days. Hover over data points for exact amounts.'
        },
        {
          title: 'Cost Breakdown',
          text: 'Pie chart showing distribution of costs across categories: Main Meals, Side Dishes, Desserts, and other meal types. Click segments to view detailed breakdowns.'
        },
        {
          title: 'Top Expenses',
          text: 'Lists the most expensive meals served during the period, showing frequency and total cost. Useful for identifying cost-saving opportunities.'
        },
        {
          title: 'Meal Distribution',
          text: 'Charts showing the variety and frequency of different meal types served. Helps ensure balanced nutrition and menu variety.'
        },
        {
          title: 'Efficiency Metrics',
          text: 'Tracks cost per resident per day, waste indicators, and other efficiency measures. Use these to optimize meal planning and reduce costs.'
        },
        {
          title: 'Budget Alerts',
          text: 'Automatic warnings when spending approaches or exceeds budget thresholds. Set custom alert levels to stay within budget.'
        },
        {
          title: 'Forecasting',
          text: 'Predicts future spending based on historical data and current meal cycles. Plan budgets more accurately and anticipate cost changes.'
        },
        {
          title: 'Optimization Recommendations',
          text: 'AI-powered suggestions for reducing costs while maintaining quality, such as substituting expensive ingredients or adjusting portion sizes.'
        },
        {
          title: 'Export Reports',
          text: 'Download analytics data as CSV or PDF for external reporting, board meetings, or record-keeping. Reports include all charts and tables.'
        },
        {
          title: 'Care Home Selector (Admin)',
          text: 'Admins can view analytics for any care home using the dropdown selector. Care Home Managers only see their facility\'s data.'
        }
      ]
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs',
      icon: 'FileText',
      content: [
        {
          title: 'Overview',
          text: 'Audit Logs track all system activities including user actions, data changes, and system events. Essential for compliance, security, and troubleshooting.'
        },
        {
          title: 'Log Entries',
          text: 'Each log entry shows: Date/Time, User who performed the action, Action type (Create/Update/Delete/View), Affected entity (Meal, Resident, User, etc.), and Details of the change.'
        },
        {
          title: 'Filtering Logs',
          text: 'Filter by date range, user, action type, or entity to find specific events. Use search to find logs containing specific keywords or IDs.'
        },
        {
          title: 'Common Use Cases',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Track who confirmed/edited specific deliveries</li>
              <li>Review meal cycle changes and who made them</li>
              <li>Monitor user login activity and password changes</li>
              <li>Investigate data discrepancies or errors</li>
              <li>Compliance audits and reporting</li>
            </ul>
          )
        },
        {
          title: 'Data Retention',
          text: 'Audit logs are retained for 2 years by default. Older logs may be archived but can be retrieved upon request for compliance purposes.'
        },
        
      ]
    },
    {
      id: 'admin-functions',
      title: 'Admin Functions',
      icon: 'Shield',
      content: [
        {
          title: 'User Management',
          text: 'Admins can create, edit, and deactivate user accounts. Assign roles (Admin, Care Home Manager, Staff), set permissions, and manage passwords. Navigate to Admin > Users to access user management.'
        },
        {
          title: 'Creating Users',
          text: (
            <div className="space-y-2">
              <p><strong>Step 1:</strong> Click "Add New User"</p>
              <p><strong>Step 2:</strong> Enter user details: Name, Email, Role</p>
              <p><strong>Step 3:</strong> Assign to a care home (if not admin)</p>
              <p><strong>Step 4:</strong> System generates temporary password and sends invitation email</p>
              <p><strong>Step 5:</strong> User receives login credentials and is prompted to change password on first login</p>
            </div>
          )
        },
        {
          title: 'Care Home Management',
          text: 'Create and manage care homes in the system. Set facility details, contact information, capacity, and operational settings. Navigate to Admin > Care Homes.'
        },
        {
          title: 'Creating Care Homes',
          text: 'Click "Add Care Home", enter name, address, capacity, contact details, and any special requirements. Assign managers and staff to the facility after creation.'
        },
        {
          title: 'Resident Management',
          text: 'Admins have system-wide access to resident records. View all residents across facilities, manage dietary requirements, and track occupancy. Navigate to Admin > Residents.'
        },
        {
          title: 'Global Meal Library',
          text: 'Create meals marked as "Global" that are available to all care homes. Useful for standardizing menus across facilities or sharing popular recipes.'
        },
        {
          title: 'System Configuration',
          text: 'Access system-wide settings including default budget thresholds, alert configurations, and operational parameters.'
        },
        {
          title: 'Cross-Facility Reports',
          text: 'View aggregated analytics and reports across all care homes to identify system-wide trends, best practices, or areas for improvement.'
        }
      ]
    },
    {
      id: 'staff-functions',
      title: 'Staff Functions',
      icon: 'Users',
      content: [
        {
          title: 'Staff Dashboard',
          text: 'Staff members see a simplified dashboard focused on daily operations: today\'s meals, delivery confirmations, and resident information.'
        },
        {
          title: 'Managing Residents',
          text: 'Staff can view and update resident information including dietary requirements, allergies, and meal preferences. Navigate to Staff > Residents.'
        },
        {
          title: 'Adding Residents',
          text: (
            <div className="space-y-2">
              <p><strong>Step 1:</strong> Click "Add New Resident"</p>
              <p><strong>Step 2:</strong> Enter resident details: Name, Room number, Admission date</p>
              <p><strong>Step 3:</strong> Add dietary requirements (Vegetarian, Gluten-Free, etc.)</p>
              <p><strong>Step 4:</strong> List any allergies or food intolerances</p>
              <p><strong>Step 5:</strong> Note meal preferences or restrictions</p>
              <p><strong>Step 6:</strong> Save to create resident profile</p>
            </div>
          )
        },
        {
          title: 'Daily Delivery Confirmations',
          text: 'Primary responsibility is confirming meal deliveries. Access from Dashboard "Confirm Delivery" button or Delivery Status page. Enter actual counts for mains, sides, and desserts.'
        },
        {
          title: 'Viewing Schedules',
          text: 'Access Food Calendar to see upcoming meals. Staff cannot edit meal cycles but can view what\'s scheduled and prepare accordingly.'
        },
        {
          title: 'Limited Analytics',
          text: 'Staff can view basic cost analytics for their care home but cannot access budget settings or optimization recommendations.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting & FAQs',
      icon: 'HelpCircle',
      content: [
        {
          title: 'Login Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Cannot log in with provided credentials</p>
              <p><strong>Solution:</strong> Verify email is correct (case-sensitive). If first login, temporary password expires after 24 hours. Contact your admin for password reset.</p>
              <p><strong>Problem:</strong> "Invalid credentials" error</p>
              <p><strong>Solution:</strong> Check Caps Lock is off. Ensure you\'re using the most recent password if you\'ve changed it.</p>
            </div>
          )
        },
        {
          title: 'Meal Cycle Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Cannot see scheduled meals in calendar</p>
              <p><strong>Solution:</strong> Verify the meal cycle is "Scheduled" not just saved as template. Check that the date range includes today.</p>
              <p><strong>Problem:</strong> Wrong week showing in cycle</p>
              <p><strong>Solution:</strong> Check the week offset setting. If starting from Week 2, offset should be 1. Use arrow buttons to reorder weeks if needed.</p>
            </div>
          )
        },
        {
          title: 'Delivery Confirmation Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Confirm button is disabled</p>
              <p><strong>Solution:</strong> Only staff and managers can confirm deliveries. Delivery must be scheduled for today or past date. Cannot confirm future deliveries.</p>
              <p><strong>Problem:</strong> Side dish counts not saving</p>
              <p><strong>Solution:</strong> Ensure you enter counts for ALL side dishes shown in the modal. Leave no fields empty (enter 0 if not served).</p>
            </div>
          )
        },
        {
          title: 'Analytics Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Costs show as zero or incorrect</p>
              <p><strong>Solution:</strong> Verify meal costs are set in Meals Management. Confirm deliveries were properly confirmed with correct counts. Check date range includes confirmed deliveries.</p>
              <p><strong>Problem:</strong> Charts not loading</p>
              <p><strong>Solution:</strong> Refresh the page. Check internet connection. Try a different date range. If persists, contact support.</p>
            </div>
          )
        },
        {
          title: 'Performance Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Page loads slowly</p>
              <p><strong>Solution:</strong> Clear browser cache. Check internet speed. Try during off-peak hours. Large date ranges in analytics may take longer to load.</p>
              <p><strong>Problem:</strong> System feels unresponsive</p>
              <p><strong>Solution:</strong> Check connection status indicator in header. If "Syncing" or "Disconnected", wait for reconnection. Refresh page if issue persists.</p>
            </div>
          )
        },
        {
          title: 'Data Issues',
          text: (
            <div className="space-y-2">
              <p><strong>Problem:</strong> Missing residents or meals</p>
              <p><strong>Solution:</strong> Staff only see their care home\'s data. If admin, check care home selector. Verify data wasn\'t accidentally deleted (check audit logs).</p>
              <p><strong>Problem:</strong> Incorrect care home showing</p>
              <p><strong>Solution:</strong> Log out and back in. Your account may be assigned to wrong care home - contact admin to verify.</p>
            </div>
          )
        },
        {
          title: 'Getting Help',
          text: 'If you encounter issues not covered here: 1) Check audit logs for clues, 2) Contact your Care Home Manager or System Admin, 3) Email support with screenshots and error messages, 4) Include your user role and care home name in support requests.'
        }
      ]
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: 'Star',
      content: [
        {
          title: 'Daily Workflow',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Start day by checking Dashboard for today\'s meals</li>
              <li>Confirm deliveries as soon as meals arrive</li>
              <li>Enter accurate counts for mains, sides, and desserts</li>
              <li>Add notes for any issues or special circumstances</li>
              <li>Review tomorrow\'s schedule before end of shift</li>
            </ul>
          )
        },
        {
          title: 'Meal Planning Tips',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Plan meal cycles at least 2 weeks in advance</li>
              <li>Ensure variety - avoid repeating the same meal too frequently</li>
              <li>Balance costs across the week (mix expensive and economical meals)</li>
              <li>Consider resident dietary requirements when selecting meals</li>
              <li>Use the week offset feature if you need to shift cycle timing</li>
              <li>Review analytics before planning to stay within budget</li>
            </ul>
          )
        },
        {
          title: 'Cost Management',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Set realistic monthly budgets based on historical data</li>
              <li>Monitor spending weekly, don\'t wait until month-end</li>
              <li>Use forecasting to anticipate budget needs</li>
              <li>Review optimization recommendations regularly</li>
              <li>Consider substituting expensive sides with similar alternatives</li>
              <li>Track waste and adjust portion sizes if needed</li>
            </ul>
          )
        },
        {
          title: 'Data Accuracy',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Always enter actual served counts, not planned amounts</li>
              <li>Update resident information when dietary needs change</li>
              <li>Keep meal costs current with supplier pricing</li>
              <li>Review and correct errors promptly via edit function</li>
              <li>Use notes field to document unusual situations</li>
            </ul>
          )
        },
        {
          title: 'Communication',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Staff: Report meal quality issues to manager immediately</li>
              <li>Managers: Review audit logs weekly for unusual activity</li>
              <li>Admins: Check cross-facility reports monthly for system-wide trends</li>
              <li>All users: Use notes in delivery confirmations to communicate with other shifts</li>
              <li>Document any system issues with screenshots for support</li>
            </ul>
          )
        },
        {
          title: 'Security',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li>Never share your login credentials</li>
              <li>Log out when leaving workstation unattended</li>
              <li>Change password if you suspect compromise</li>
              <li>Use strong passwords with mix of letters, numbers, symbols</li>
              <li>Report suspicious activity to your manager immediately</li>
            </ul>
          )
        }
      ]
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: 'Keyboard',
      content: [
        {
          title: 'Global Shortcuts',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><kbd className="px-2 py-1 bg-muted rounded border">Esc</kbd> - Close modals and overlays</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">S</kbd> - Save current form (when editing)</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">F</kbd> - Focus search field</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">K</kbd> - Quick command menu (if available)</li>
            </ul>
          )
        },
        {
          title: 'Navigation',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><kbd className="px-2 py-1 bg-muted rounded border">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">D</kbd> - Go to Dashboard</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">C</kbd> - Go to Calendar</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">M</kbd> - Go to Meals Management</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded border">A</kbd> - Go to Analytics</li>
            </ul>
          )
        },
        {
          title: 'Modal Shortcuts',
          text: (
            <ul className="list-disc pl-6 space-y-2">
              <li><kbd className="px-2 py-1 bg-muted rounded border">Enter</kbd> - Confirm/Submit modal action</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Esc</kbd> - Cancel and close modal</li>
              <li><kbd className="px-2 py-1 bg-muted rounded border">Tab</kbd> - Navigate between form fields</li>
            </ul>
          )
        }
      ]
    }
  ];

  const filteredSections = searchQuery
    ? helpSections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.some(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof item.text === 'string' && item.text.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : helpSections;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon name="BookOpen" className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Help & Documentation</h1>
                <p className="text-muted-foreground">Complete guide to using the Food Calendar Management System</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-8 p-6 bg-card border border-border rounded-lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Zap" className="w-5 h-5 text-primary" />
              Quick Links
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/main-dashboard" className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                <Icon name="LayoutDashboard" className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <Link to="/food-calendar-view" className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                <Icon name="Calendar" className="w-4 h-4" />
                <span className="text-sm">Calendar</span>
              </Link>
              <Link to="/delivery-status" className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                <Icon name="ClipboardCheck" className="w-4 h-4" />
                <span className="text-sm">Deliveries</span>
              </Link>
              <Link to="/cost-analytics" className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                <Icon name="TrendingUp" className="w-4 h-4" />
                <span className="text-sm">Analytics</span>
              </Link>
            </div>
          </div>

          {/* Help Sections */}
          <div className="space-y-4">
            {filteredSections.length === 0 && (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Icon name="Search" className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No help topics found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Clear Search
                </button>
              </div>
            )}

            {filteredSections.map((section) => (
              <div key={section.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name={section.icon} className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                  </div>
                  <Icon
                    name={expandedSection === section.id ? 'ChevronUp' : 'ChevronDown'}
                    className="w-5 h-5 text-muted-foreground"
                  />
                </button>

                {expandedSection === section.id && (
                  <div className="px-6 pb-6 space-y-6 border-t border-border">
                    {section.content.map((item, index) => (
                      <div key={index} className="pt-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                        <div className="text-muted-foreground leading-relaxed">
                          {typeof item.text === 'string' ? <p>{item.text}</p> : item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 p-6 bg-card border border-border rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
              <Icon name="LifeBuoy" className="w-5 h-5 text-primary" />
              Need More Help?
            </h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Contact your system administrator or care home manager for assistance.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/audit-logs" className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2">
                <Icon name="FileText" className="w-4 h-4" />
                View Audit Logs
              </Link>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2"
              >
                <Icon name="Printer" className="w-4 h-4" />
                Print This Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Help;
