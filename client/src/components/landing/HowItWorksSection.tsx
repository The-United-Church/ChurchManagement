import React from 'react';
import { Church, Users, Settings, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Church,
    title: 'Register Your Church',
    description:
      'Create an account for your church with your basic information. Set up your headquarters location and become the church admin instantly.',
    color: 'from-blue-500 to-blue-600',
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    number: '02',
    icon: Users,
    title: 'Add Your Members',
    description:
      'Invite congregation members to join your church on the platform. They can log in and see all the churches they belong to in one view.',
    color: 'from-purple-500 to-purple-600',
    accent: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    number: '03',
    icon: Settings,
    title: 'Manage & Grow',
    description:
      'Open new branches, organize departments, track attendance, run reports, and watch your congregation flourish with powerful management tools.',
    color: 'from-green-500 to-green-600',
    accent: 'text-green-600',
    bg: 'bg-green-50',
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Get Started in Three Simple Steps
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            No complex setup. No technical knowledge required. Get your church
            online and organized in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <StepCard {...step} />
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center -mx-8">
                  <ArrowRight className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Simplified architecture visual */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
            <h3 className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-8">
              Platform Architecture
            </h3>
            <div className="flex flex-col items-center gap-4">
              {/* Super Admin */}
              <RoleBlock
                label="Platform Super Admin"
                description="Full platform oversight & management"
                gradient="from-red-500 to-red-600"
              />
              <VerticalConnector />
              {/* Churches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <ChurchBlock name="Salvation Ministry" branches={3} members={450} />
                <ChurchBlock name="Winners Chapel" branches={5} members={1200} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StepCard: React.FC<{
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  accent: string;
  bg: string;
}> = ({ number, icon: Icon, title, description, color, bg }) => (
  <div className="relative text-center md:text-left">
    <div className="flex flex-col items-center md:items-start">
      <div className={`relative inline-flex p-4 rounded-2xl ${bg} dark:bg-gray-700/60 mb-6`}>
        <Icon className="h-8 w-8 text-gray-900 dark:text-white" />
        <span
          className={`absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br ${color} text-white text-xs font-bold rounded-full flex items-center justify-center`}
        >
          {number}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

const VerticalConnector: React.FC = () => (
  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
);

const RoleBlock: React.FC<{ label: string; description: string; gradient: string }> = ({
  label,
  description,
  gradient,
}) => (
  <div
    className={`w-full max-w-sm bg-gradient-to-r ${gradient} text-white rounded-xl px-6 py-4 text-center`}
  >
    <p className="font-semibold">{label}</p>
    <p className="text-xs opacity-80 mt-1">{description}</p>
  </div>
);

const ChurchBlock: React.FC<{ name: string; branches: number; members: number }> = ({
  name,
  branches,
  members,
}) => (
  <div className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700/40 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <Church className="h-4 w-4 text-blue-600" />
      <p className="font-semibold text-sm text-gray-900 dark:text-white">{name}</p>
    </div>
    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
      <span>{branches} Branches</span>
      <span>{members} Members</span>
    </div>
    <div className="mt-2 flex gap-1">
      <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Admin</span>
      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Members</span>
    </div>
  </div>
);

export default HowItWorksSection;
