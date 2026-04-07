import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CTASectionProps {
  onGetStarted: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl px-8 py-16 md:px-16 md:py-20 overflow-hidden text-center">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full opacity-5" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white rounded-full opacity-5" />
            <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-purple-400 rounded-full opacity-10 blur-2xl" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm text-white/90 font-medium">
                Join 2,000+ churches already on ChurchFlow
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Ready to Transform Your Church Management?
            </h2>

            <p className="mt-5 text-lg text-blue-100 leading-relaxed max-w-xl mx-auto">
              Start for free today. Register your church, add your members, and experience
              the difference a modern management platform makes.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="px-8 py-6 text-base font-semibold bg-white text-blue-700 hover:bg-gray-100 shadow-lg"
                onClick={onGetStarted}
              >
                Register Your Church Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <p className="mt-6 text-sm text-blue-200">
              No credit card required · Free plan available · Setup in under 5 minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
