import React from 'react';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  church: string;
  content: string;
  rating: number;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Pastor James Okoro',
    role: 'Senior Pastor',
    church: 'Grace Community Church',
    content:
      'ChurchFlow transformed how we manage our 12 branches across Nigeria. The multi-branch support and member tracking is exactly what we needed. Our admin staff saves over 15 hours per week.',
    rating: 5,
    avatar: 'JO',
  },
  {
    name: 'Rev. Sarah Williams',
    role: 'Church Administrator',
    church: 'New Life Fellowship',
    content:
      'Setting up our church took less than 5 minutes. Adding members, organizing departments, and managing roles is incredibly intuitive. Our volunteers picked it up without any training.',
    rating: 5,
    avatar: 'SW',
  },
  {
    name: 'Bishop Michael Adeyemi',
    role: 'General Overseer',
    church: 'Sunrise Ministries International',
    content:
      'With churches in 3 countries, we needed a platform that could scale. ChurchFlow handles our 5,000+ members across 20 branches seamlessly. The analytics give us clear visibility.',
    rating: 5,
    avatar: 'MA',
  },
  {
    name: 'Pastor Linda Nguyen',
    role: 'Lead Pastor',
    church: 'Hope Assembly',
    content:
      'The role-based access control is perfect. Our branch pastors manage their own locations while I maintain oversight of the entire ministry. Exactly the control we needed.',
    rating: 5,
    avatar: 'LN',
  },
  {
    name: 'Deacon Emmanuel Balogun',
    role: 'IT Coordinator',
    church: 'Faith Tabernacle',
    content:
      'As someone who evaluated many church management tools, ChurchFlow stands out for its clean design and multi-church architecture. The activity logs give us full transparency.',
    rating: 5,
    avatar: 'EB',
  },
  {
    name: 'Pastor Grace Okonkwo',
    role: 'Associate Pastor',
    church: 'Dominion Chapel',
    content:
      'Our members love being able to log in and see which churches they belong to in one place. The church selector makes switching between communities effortless.',
    rating: 4,
    avatar: 'GO',
  },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Loved by Church Leaders Everywhere
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            Hear from pastors, administrators, and coordinators who use ChurchFlow
            to manage and grow their congregations.
          </p>
        </div>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialCard: React.FC<Testimonial> = ({
  name,
  role,
  church,
  content,
  rating,
  avatar,
}) => (
  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col">
    {/* Quote icon */}
    <Quote className="h-8 w-8 text-blue-200 mb-4 flex-shrink-0" />

    {/* Stars */}
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>

    {/* Content */}
    <p className="text-gray-700 leading-relaxed text-sm flex-1">"{content}"</p>

    {/* Author */}
    <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-200">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
        {avatar}
      </div>
      <div>
        <p className="font-semibold text-sm text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">
          {role} · {church}
        </p>
      </div>
    </div>
  </div>
);

export default TestimonialsSection;
