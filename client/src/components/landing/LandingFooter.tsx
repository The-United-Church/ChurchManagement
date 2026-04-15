import React from 'react';
import { Church, Mail, MapPin, Phone } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    // { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  // Support: [
  //   { label: 'Help Center', href: '#' },
  //   { label: 'Documentation', href: '#' },
  //   { label: 'API Reference', href: '#' },
  //   { label: 'Status', href: '#' },
  // ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    // { label: 'GDPR', href: '#' },
  ],
};

const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Church className="h-7 w-7 text-blue-400" />
              <span className="text-xl font-bold text-white">ChurchFlow</span>
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-xs">
              The modern platform for churches to manage congregations, branches,
              and members — all in one place.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>theunitedchurchflow@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>(+234) 703-11700-92</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>Rivers, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {currentYear} ChurchFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <SocialLink
              label="X"
              href="https://x.com/EdoghotuA"
              path="M18.901 1.153h3.68l-8.04 9.194 9.46 12.5h-7.406l-5.8-7.584-6.63 7.584H.485l8.6-9.83L0 1.154h7.594l5.243 6.932L18.9 1.153z"
            />
            <SocialLink
              label="Facebook"
              href="https://www.facebook.com/edoghotu"
              path="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
            />
            <SocialLink
              label="Instagram"
              href="https://www.instagram.com/gideon_edoghotu/"
              path="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z"
            />
            <SocialLink
              label="LinkedIn"
              href="https://www.linkedin.com/in/gideon-edoghotu/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BBpwAfLW1RDyOv2G4NwKJqg%3D%3D"
              path={[
                'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z',
                'M2 9h4v12H2z',
                'M6 4a2 2 0 1 1-4 0a2 2 0 0 1 4 0z',
              ]}
            />
            <SocialLink
              label="YouTube"
              href="https://www.youtube.com/@techieuniquegiddy"
              path={[
                'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z',
                'M9.75 15.02V8.98L15.5 12l-5.75 3.02z',
              ]}
            />
            <SocialLink
              label="WhatsApp"
              href="https://wa.me/message/7VMXUHFDTIIOG1"
              path="M20.52 3.48A11.78 11.78 0 0 0 12.06 0C5.52 0 .24 5.28.24 11.82c0 2.1.54 4.14 1.56 5.94L0 24l6.42-1.68a11.8 11.8 0 0 0 5.64 1.44h.06c6.54 0 11.82-5.28 11.82-11.82 0-3.12-1.2-6.06-3.42-8.46zM12.12 21.6h-.06a9.7 9.7 0 0 1-4.92-1.32l-.36-.18-3.78.96 1.02-3.66-.24-.36a9.67 9.67 0 0 1-1.5-5.22c0-5.34 4.38-9.72 9.78-9.72 2.58 0 5.04 1.02 6.9 2.88a9.67 9.67 0 0 1 2.82 6.9c0 5.4-4.38 9.72-9.66 9.72zm5.34-7.32c-.3-.12-1.8-.9-2.1-1.02-.3-.12-.48-.18-.72.12-.24.3-.84 1.02-1.02 1.2-.18.18-.36.24-.66.12-.3-.12-1.32-.48-2.52-1.56-.96-.84-1.56-1.86-1.74-2.16-.18-.3 0-.42.12-.6.12-.12.3-.3.42-.48.18-.18.24-.3.36-.54.12-.24.06-.42-.06-.6-.12-.12-.72-1.74-.96-2.4-.24-.6-.48-.54-.66-.54h-.54c-.18 0-.48.06-.72.36-.24.24-.96.96-.96 2.34s1.02 2.76 1.2 2.94c.12.18 2.04 3.12 4.98 4.32.66.3 1.2.42 1.62.54.66.24 1.26.18 1.74.12.54-.06 1.8-.72 2.04-1.44.24-.72.24-1.32.18-1.44-.06-.12-.24-.18-.54-.3z"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink: React.FC<{ label: string; href: string; path: string | string[] }> = ({ label, href, path }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
  >
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {(Array.isArray(path) ? path : [path]).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  </a>
);

export default LandingFooter;
