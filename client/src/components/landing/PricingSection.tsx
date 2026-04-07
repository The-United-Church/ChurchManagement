import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface PricingPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    description: 'Perfect for small churches just getting started.',
    price: 'Free',
    period: '',
    features: [
      '1 Church & 1 Branch',
      'Up to 50 Members',
      'Basic Member Management',
      'Activity Logs',
      'Email Support',
    ],
    highlighted: false,
    cta: 'Get Started Free',
  },
  {
    name: 'Growth',
    description: 'For growing churches with multiple locations.',
    price: '$29',
    period: '/month',
    features: [
      '1 Church & Up to 10 Branches',
      'Up to 2,000 Members',
      'Advanced Member Management',
      'Department Organization',
      'Analytics Dashboard',
      'Role-Based Access Control',
      'Priority Email Support',
    ],
    highlighted: true,
    badge: 'Most Popular',
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    description: 'For large ministries with global operations.',
    price: '$99',
    period: '/month',
    features: [
      'Unlimited Churches & Branches',
      'Unlimited Members',
      'Custom Roles & Permissions',
      'Advanced Analytics & Reports',
      'Dedicated Account Manager',
      'API Access',
      'White-Label Options',
      '24/7 Phone & Email Support',
    ],
    highlighted: false,
    cta: 'Contact Sales',
  },
];

const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            Start free and scale as your church grows. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-gray-500 mt-12">
          All plans include SSL encryption, data backups, and 99.9% uptime guarantee.
        </p>
      </div>
    </section>
  );
};

const PricingCard: React.FC<PricingPlan> = ({
  name,
  description,
  price,
  period,
  features,
  highlighted,
  badge,
  cta,
}) => (
  <div
    className={`relative rounded-2xl p-8 flex flex-col ${
      highlighted
        ? 'bg-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 scale-105'
        : 'bg-white border border-gray-200 shadow-sm'
    }`}
  >
    {badge && (
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1">
        {badge}
      </Badge>
    )}

    <div className="mb-6">
      <h3 className="text-xl font-bold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>

    <div className="mb-6">
      <span className="text-4xl font-bold text-gray-900">{price}</span>
      {period && <span className="text-gray-500 ml-1">{period}</span>}
    </div>

    <ul className="space-y-3 mb-8 flex-1">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700">{feature}</span>
        </li>
      ))}
    </ul>

    <Button
      className={`w-full py-5 font-semibold ${
        highlighted
          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
          : ''
      }`}
      variant={highlighted ? 'default' : 'outline'}
    >
      {cta}
    </Button>
  </div>
);

export default PricingSection;
