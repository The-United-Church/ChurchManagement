import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Church,
  Users,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted, onLearnMore }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 dark:bg-blue-900 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100 dark:bg-purple-900 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1.5 text-sm font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Trusted by 4+ Congregations Worldwide
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            The Modern Platform to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Manage & Grow
            </span>{' '}
            Your Church
          </h1>

          {/* Sub-headline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Register your church, manage multiple branches across cities and countries,
            organize members, and empower your congregation — all from one unified platform.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="px-8 py-6 text-base font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              onClick={onGetStarted}
            >
              Register Your Church
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base font-semibold"
              onClick={onLearnMore}
            >
              See How It Works
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12 max-w-2xl mx-auto">
            <StatItem icon={Church} value="3+" label="Churches" />
            <StatItem icon={Users} value="30+" label="Members Managed" />
            <StatItem icon={MapPin} value="1+" label="Countries" />
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl shadow-gray-900/10 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-600">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white dark:bg-gray-600 rounded-md px-4 py-1 text-xs text-gray-400 dark:text-gray-300 border border-gray-200 dark:border-gray-500 w-64 text-center">
                  churchflow.app/dashboard
                </div>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-gray-50 dark:from-gray-800 to-white dark:to-gray-900">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatItem: React.FC<{ icon: React.ElementType; value: string; label: string }> = ({
  icon: Icon,
  value,
  label,
}) => (
  <div className="flex flex-col items-center gap-1">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-blue-600" />
      <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
  </div>
);

const DashboardPreview: React.FC = () => (
  <div className="grid grid-cols-4 gap-4">
    {/* Stat cards */}
    {[
      { label: 'Total Members', value: '1,247', color: 'bg-blue-500' },
      { label: 'Active Branches', value: '12', color: 'bg-green-500' },
      { label: 'This Week Events', value: '8', color: 'bg-purple-500' },
      { label: 'Attendance Rate', value: '87%', color: 'bg-orange-500' },
    ].map(card => (
      <div key={card.label} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600 shadow-sm">
        <div className={`w-8 h-1.5 ${card.color} rounded-full mb-3`} />
        <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
      </div>
    ))}
    {/* Chart placeholder */}
    <div className="col-span-2 bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600 shadow-sm">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">Weekly Attendance</p>
      <div className="flex items-end gap-1.5 h-16">
        {[60, 75, 45, 80, 65, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-blue-200 dark:bg-blue-700 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
    <div className="col-span-2 bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600 shadow-sm">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Members</p>
      <div className="space-y-2">
        {['Sarah Johnson', 'Michael Chen', 'Grace Obi'].map(name => (
          <div key={name} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{name}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HeroSection;
