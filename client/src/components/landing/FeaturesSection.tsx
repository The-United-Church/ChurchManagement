import React from 'react';
import {
  Church,
  Users,
  MapPin,
  Shield,
  GitBranch,
  Bell,
  BarChart3,
  UserCheck,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Church,
    title: 'Multi-Church Management',
    description:
      'Register and manage multiple churches from a single platform. Each church gets its own dedicated space with independent settings.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: GitBranch,
    title: 'Branch & Location Support',
    description:
      'Add multiple branches per church across different cities and countries. Designate headquarters and track each location.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Users,
    title: 'Member Management',
    description:
      'Add, organize, and manage congregation members. Track attendance, assign roles, and keep your membership records up to date.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description:
      'Granular permissions with Super Admin, Admin, and Member roles. Each church admin can manage only their own congregation.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: UserCheck,
    title: 'Self-Service Onboarding',
    description:
      'Church leaders register their church and become instant admins. Members join and see exactly which churches they belong to.',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description:
      'Support churches across continents with branch-level addressing, multi-currency support plans, and region-aware settings.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description:
      'Get insights on membership growth, attendance patterns, and branch performance with easy-to-read dashboards.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: Bell,
    title: 'Activity Logging',
    description:
      'Track every important action with comprehensive audit logs. Know who did what and when across your entire organization.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: MapPin,
    title: 'Location Mapping',
    description:
      'Visualize your branches on a map. Help new members find the nearest location with addresses and branch details.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Everything Your Church Needs in One Place
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            From registration to daily operations, ChurchFlow provides all the tools
            to run your church efficiently and connect with your congregation.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
}> = ({ icon: Icon, title, description, color, bg }) => (
  <div className="group relative p-6 rounded-2xl border border-gray-100 dark:border-gray-700 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300">
    <div className={`inline-flex p-3 rounded-xl ${bg} dark:bg-gray-700/60 mb-4`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

export default FeaturesSection;
