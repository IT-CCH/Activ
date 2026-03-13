import React, { useState, useEffect } from 'react';
import Header from '../../components/navigation/Header';
import ComplianceScoreCard from './components/ComplianceScoreCard';
import FilterControls from './components/FilterControls';
import AuditTrailTable from './components/AuditTrailTable';
import ComplianceAlertPanel from './components/ComplianceAlertPanel';
import ComplianceTrendChart from './components/ComplianceTrendChart';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const ComplianceReporting = () => {
  const [filters, setFilters] = useState({
    dateRange: 'last7days',
    category: 'all',
    residentGroup: 'all',
    eventType: 'all'
  });

  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    document.title = 'Compliance Reporting - CareHome Food Analytics';
  }, []);

  const complianceScores = [
  {
    title: 'Dietary Restrictions',
    score: 96,
    benchmark: 95,
    status: 'Exceeds Target',
    icon: 'Utensils',
    trend: 2
  },
  {
    title: 'Allergen Management',
    score: 98,
    benchmark: 98,
    status: 'Meets Target',
    icon: 'AlertTriangle',
    trend: 0
  },
  {
    title: 'Nutritional Standards',
    score: 92,
    benchmark: 95,
    status: 'Below Target',
    icon: 'Activity',
    trend: -3
  },
  {
    title: 'Meal Delivery',
    score: 99,
    benchmark: 97,
    status: 'Exceeds Target',
    icon: 'CheckCircle2',
    trend: 1
  }];


  const auditEvents = [
  {
    id: 'AE001',
    timestamp: new Date('2025-12-12T08:30:00'),
    eventType: 'Dietary Violation',
    description: 'Dairy product served to lactose-intolerant resident',
    severity: 'critical',
    staffName: 'Sarah Johnson',
    staffRole: 'Kitchen Staff',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1e36d04fd-1763301705036.png",
    staffAvatarAlt: 'Professional headshot of Caucasian woman with blonde hair in white chef uniform',
    status: 'pending',
    category: 'Dietary Restrictions',
    resident: 'Margaret Thompson',
    mealName: 'Breakfast - Porridge with Milk',
    correctiveAction: 'Immediate meal replacement with lactose-free alternative. Staff retraining on dietary restrictions required.',
    notes: 'Resident did not consume the meal. No adverse reaction reported.',
    icon: 'AlertTriangle'
  },
  {
    id: 'AE002',
    timestamp: new Date('2025-12-12T07:15:00'),
    eventType: 'Meal Modification',
    description: 'Texture modification approved for new resident',
    severity: 'medium',
    staffName: 'Dr. James Wilson',
    staffRole: 'Medical Director',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_147c33ba1-1763298879042.png",
    staffAvatarAlt: 'Professional headshot of African American man with short black hair in white medical coat',
    status: 'resolved',
    category: 'Medical Requirements',
    resident: 'Robert Davies',
    mealName: 'All Meals',
    correctiveAction: 'Kitchen staff notified. Pureed meal preparation protocol activated.',
    notes: 'Medical assessment completed. Dysphagia level 2 confirmed.',
    icon: 'FileEdit'
  },
  {
    id: 'AE003',
    timestamp: new Date('2025-12-11T18:45:00'),
    eventType: 'Allergen Alert',
    description: 'Nut traces detected in kitchen preparation area',
    severity: 'high',
    staffName: 'Michael Chen',
    staffRole: 'Head Chef',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1bf46143f-1763295306481.png",
    staffAvatarAlt: 'Professional headshot of Asian man with short black hair in chef uniform',
    status: 'in-progress',
    category: 'Allergen Management',
    resident: 'Multiple Residents',
    mealName: 'Dinner Service',
    correctiveAction: 'Deep cleaning of preparation area. Allergen-free zone protocols reinforced.',
    notes: 'No meals were contaminated. Preventive action taken.',
    icon: 'Shield'
  },
  {
    id: 'AE004',
    timestamp: new Date('2025-12-11T12:30:00'),
    eventType: 'Nutritional Review',
    description: 'Weekly nutritional analysis completed',
    severity: 'low',
    staffName: 'Emma Roberts',
    staffRole: 'Nutritionist',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_128f7e26a-1763297659639.png",
    staffAvatarAlt: 'Professional headshot of Caucasian woman with brown hair in business attire',
    status: 'resolved',
    category: 'Nutritional Standards',
    resident: 'All Residents',
    mealName: 'Weekly Menu',
    correctiveAction: 'Minor adjustments to protein portions recommended for next cycle.',
    notes: 'Overall nutritional balance meets NHS guidelines.',
    icon: 'ClipboardCheck'
  },
  {
    id: 'AE005',
    timestamp: new Date('2025-12-11T09:00:00'),
    eventType: 'Delivery Confirmation',
    description: 'Breakfast service completed with 100% delivery rate',
    severity: 'low',
    staffName: 'Lisa Anderson',
    staffRole: 'Care Assistant',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_17341a317-1763293337568.png",
    staffAvatarAlt: 'Professional headshot of African American woman with curly black hair in care uniform',
    status: 'resolved',
    category: 'Meal Delivery',
    resident: 'All Residents',
    mealName: 'Breakfast Service',
    correctiveAction: 'No action required. Excellent service delivery.',
    notes: 'All residents received meals on time. No complaints recorded.',
    icon: 'CheckCircle2'
  },
  {
    id: 'AE006',
    timestamp: new Date('2025-12-10T19:30:00'),
    eventType: 'Compliance Audit',
    description: 'Monthly CQC compliance check completed',
    severity: 'medium',
    staffName: 'David Thompson',
    staffRole: 'Compliance Officer',
    staffAvatar: "https://img.rocket.new/generatedImages/rocket_gen_img_187ac2848-1764684680250.png",
    staffAvatarAlt: 'Professional headshot of Caucasian man with grey hair in business suit',
    status: 'resolved',
    category: 'Regulatory Compliance',
    resident: 'Facility-wide',
    mealName: 'All Services',
    correctiveAction: 'Documentation updated. Minor process improvements implemented.',
    notes: 'Overall compliance rating: Excellent. No major findings.',
    icon: 'FileCheck'
  }];


  const complianceAlerts = [
  {
    id: 'CA001',
    title: 'Urgent: Dietary Violation Pending Review',
    description: 'Lactose-intolerant resident served dairy product. Immediate action required.',
    priority: 'urgent',
    time: '30 minutes ago'
  },
  {
    id: 'CA002',
    title: 'Allergen Cleaning Protocol Active',
    description: 'Kitchen area deep cleaning in progress. Monitor completion.',
    priority: 'high',
    time: '2 hours ago'
  },
  {
    id: 'CA003',
    title: 'Staff Training Due',
    description: 'Quarterly dietary restrictions training scheduled for next week.',
    priority: 'medium',
    time: '1 day ago'
  }];


  const upcomingDeadlines = [
  {
    id: 'DL001',
    title: 'CQC Inspection Preparation',
    description: 'Complete all documentation and compliance checks',
    dueDate: new Date('2025-12-15'),
    daysLeft: 3
  },
  {
    id: 'DL002',
    title: 'Monthly Nutritional Report',
    description: 'Submit comprehensive nutritional analysis to management',
    dueDate: new Date('2025-12-18'),
    daysLeft: 6
  },
  {
    id: 'DL003',
    title: 'Allergen Management Review',
    description: 'Quarterly review of allergen protocols and procedures',
    dueDate: new Date('2025-12-20'),
    daysLeft: 8
  }];


  const regulatoryUpdates = [
  {
    id: 'RU001',
    title: 'Updated NHS Dietary Guidelines',
    summary: 'New recommendations for sodium intake in elderly care facilities',
    publishedDate: new Date('2025-12-10')
  },
  {
    id: 'RU002',
    title: 'CQC Inspection Framework Changes',
    summary: 'Enhanced focus on nutritional monitoring and resident satisfaction',
    publishedDate: new Date('2025-12-08')
  },
  {
    id: 'RU003',
    title: 'Food Safety Regulations Update',
    summary: 'New allergen labeling requirements effective January 2026',
    publishedDate: new Date('2025-12-05')
  }];


  const trendData = [
  { date: '05 Dec', dietary: 94, allergen: 97, nutritional: 91, delivery: 98 },
  { date: '06 Dec', dietary: 95, allergen: 98, nutritional: 92, delivery: 99 },
  { date: '07 Dec', dietary: 93, allergen: 96, nutritional: 90, delivery: 97 },
  { date: '08 Dec', dietary: 96, allergen: 98, nutritional: 93, delivery: 99 },
  { date: '09 Dec', dietary: 95, allergen: 97, nutritional: 91, delivery: 98 },
  { date: '10 Dec', dietary: 97, allergen: 99, nutritional: 94, delivery: 99 },
  { date: '11 Dec', dietary: 96, allergen: 98, nutritional: 92, delivery: 99 },
  { date: '12 Dec', dietary: 96, allergen: 98, nutritional: 92, delivery: 99 }];


  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'last7days',
      category: 'all',
      residentGroup: 'all',
      eventType: 'all'
    });
  };

  const handleExportReport = () => {
    const reportData = {
      generatedDate: new Date()?.toISOString(),
      filters: filters,
      complianceScores: complianceScores,
      auditEvents: auditEvents,
      summary: {
        totalEvents: auditEvents?.length,
        criticalEvents: auditEvents?.filter((e) => e?.severity === 'critical')?.length,
        resolvedEvents: auditEvents?.filter((e) => e?.status === 'resolved')?.length,
        pendingEvents: auditEvents?.filter((e) => e?.status === 'pending')?.length
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-report-${new Date()?.toISOString()?.split('T')?.[0]}.json`;
    document.body?.appendChild(link);
    link?.click();
    document.body?.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAcknowledgeEvent = (eventId) => {
    console.log('Acknowledging event:', eventId);
  };

  const handleAssignAction = (eventId) => {
    console.log('Assigning corrective action for event:', eventId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="main-content">
        <div className="max-w-[1920px] mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-semibold text-foreground">Compliance Reporting</h1>
              <div className="flex items-center gap-3">
                <Button variant="outline" iconName="Download" onClick={handleExportReport}>
                  Export Report
                </Button>
                <Button variant="default" iconName="FileText">
                  Generate Summary
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              Comprehensive compliance monitoring and audit trail management for CQC requirements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {complianceScores?.map((score, index) =>
            <ComplianceScoreCard key={index} {...score} />
            )}
          </div>

          <div className="mb-8">
            <FilterControls
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              onExport={handleExportReport} />

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            <div className="lg:col-span-8">
              <AuditTrailTable
                events={auditEvents}
                onAcknowledge={handleAcknowledgeEvent}
                onAssignAction={handleAssignAction} />

            </div>

            <div className="lg:col-span-4">
              <ComplianceAlertPanel
                alerts={complianceAlerts}
                deadlines={upcomingDeadlines}
                updates={regulatoryUpdates} />

            </div>
          </div>

          <div className="mb-8">
            <ComplianceTrendChart
              data={trendData}
              title="Compliance Performance Trends (Last 7 Days)" />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Icon name="CheckCircle2" size={24} className="text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Resolved Events</h3>
                  <p className="text-2xl font-semibold text-foreground">
                    {auditEvents?.filter((e) => e?.status === 'resolved')?.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(auditEvents?.filter((e) => e?.status === 'resolved')?.length / auditEvents?.length * 100)}% of total events
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Icon name="Clock" size={24} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Pending Actions</h3>
                  <p className="text-2xl font-semibold text-foreground">
                    {auditEvents?.filter((e) => e?.status === 'pending')?.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-error/10 flex items-center justify-center">
                  <Icon name="AlertTriangle" size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Critical Events</h3>
                  <p className="text-2xl font-semibold text-foreground">
                    {auditEvents?.filter((e) => e?.severity === 'critical')?.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">High priority violations</p>
            </div>
          </div>
        </div>
      </main>
    </div>);

};

export default ComplianceReporting;