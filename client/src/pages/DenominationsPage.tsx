import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Church,
  Search,
  MapPin,
  GitBranch,
  Mail,
  ArrowLeft,
  Send,
  User,
  Building2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Country, State } from 'country-state-city';
import { fetchPublicDenominations, submitDenominationRequestApi } from '@/lib/api';
import { PhoneField, isoToFlag } from '@/components/dashboard/people/AddPersonDialog';

interface BranchInfo {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}

interface DenominationInfo {
  id: string;
  denomination_name: string;
  description?: string;
  location?: string;
  state?: string;
  country?: string;
  branches: BranchInfo[];
}

const ADMIN_EMAIL = 'theunitedchurchflow@gmail.com';

const allCountries = Country.getAllCountries();

const DenominationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [denominations, setDenominations] = useState<DenominationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [states, setStates] = useState<{ name: string; isoCode: string }[]>([]);

  const phoneOptions = React.useMemo(
    () =>
      allCountries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        code: `+${c.phonecode}`,
        flag: isoToFlag(c.isoCode),
      })),
    []
  );

  // Request form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    denominationName: '',
    reason: '',
  });

  useEffect(() => {
    fetchPublicDenominations()
      .then((data) => setDenominations(data ?? []))
      .catch(() => setDenominations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = denominations.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.denomination_name.toLowerCase().includes(q) ||
      d.location?.toLowerCase().includes(q) ||
      d.state?.toLowerCase().includes(q) ||
      d.country?.toLowerCase().includes(q) ||
      d.branches?.some(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.city?.toLowerCase().includes(q) ||
          b.country?.toLowerCase().includes(q)
      )
    );
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCountryChange = (isoCode: string) => {
    const country = allCountries.find((c) => c.isoCode === isoCode);
    setForm((prev) => ({ ...prev, country: country?.name || '', state: '' }));
    setStates(State.getStatesOfCountry(isoCode).map((s) => ({ name: s.name, isoCode: s.isoCode })));
  };

  const handleStateChange = (stateName: string) => {
    setForm((prev) => ({ ...prev, state: stateName }));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      await submitDenominationRequestApi({
        denomination_name: form.denominationName,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        reason: form.reason || undefined,
      });
      setSubmitSuccess(true);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        denominationName: '',
        reason: '',
      });
      setStates([]);
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.denominationName.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 text-foreground dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <Church className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-foreground">ChurchFlow</span>
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              Create Account
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
            <Church className="h-4 w-4" />
            Registered Denominations
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Find Your Denomination
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse our growing list of registered denominations and their branches.
            Can't find yours? Request it below and we'll get it added.
          </p>
        </div>

        {/* Search + Stats */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search denominations, branches, or locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-500" />
              <strong className="text-foreground">{denominations.length}</strong> Denominations
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-4 w-4 text-purple-500" />
              <strong className="text-foreground">
                {denominations.reduce((acc, d) => acc + (d.branches?.length || 0), 0)}
              </strong>{' '}
              Branches
            </span>
          </div>
        </div>

        {/* Denomination Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted/70 rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted/70 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Church className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search ? 'No matching denominations found' : 'No denominations yet'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {search
                ? "Try a different search term, or request your denomination to be added."
                : "Be the first! Request your denomination to be added."}
            </p>
            <Button onClick={() => setShowRequestForm(true)} className="gap-2">
              <Mail className="h-4 w-4" />
              Request a Denomination
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((denom) => {
              const isExpanded = expandedId === denom.id;
              return (
                <div
                  key={denom.id}
                  className="group rounded-2xl border border-border bg-card text-card-foreground hover:border-blue-300/60 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <Church className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-card-foreground truncate text-base">
                            {denom.denomination_name}
                          </h3>
                          {(denom.location || denom.state || denom.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {[denom.location, denom.state, denom.country]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-500/10 rounded-full px-2.5 py-1">
                        <GitBranch className="h-3 w-3" />
                        {denom.branches?.length || 0}
                      </span>
                    </div>

                    {denom.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {denom.description}
                      </p>
                    )}

                    {/* Branches toggle */}
                    {denom.branches && denom.branches.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : denom.id)
                          }
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 font-medium transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide branches
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View {denom.branches.length} branch
                              {denom.branches.length !== 1 ? 'es' : ''}
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {denom.branches.map((branch) => (
                              <div
                                key={branch.id}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted text-sm"
                              >
                                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {branch.name}
                                  </p>
                                  {(branch.city || branch.state || branch.country) && (
                                    <p className="text-xs text-muted-foreground">
                                      {[branch.city, branch.state, branch.country]
                                        .filter(Boolean)
                                        .join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Request Denomination CTA */}
        <div className="mt-16 relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl px-8 py-14 md:px-14 md:py-16 overflow-hidden text-center">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white rounded-full opacity-5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white rounded-full opacity-5" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-purple-400 rounded-full opacity-10 blur-2xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <Mail className="h-4 w-4 text-yellow-300" />
              <span className="text-sm text-white/90 font-medium">
                Can't find your denomination?
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Request Your Denomination
            </h2>
            <p className="mt-4 text-blue-100 leading-relaxed max-w-lg mx-auto">
              If your denomination isn't listed above, fill out a short form and
              we'll have the admin register it for you. We typically respond
              within 24–48 hours.
            </p>

            <div className="mt-8">
              <Button
                size="lg"
                className="px-8 py-6 text-base font-semibold bg-white text-blue-700 hover:bg-gray-100 shadow-lg gap-2"
                onClick={() => setShowRequestForm(true)}
              >
                <Send className="h-5 w-5" />
                Request a Denomination
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-foreground">ChurchFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ChurchFlow. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ─── Request Denomination Modal ────────────────────────────────── */}
      {showRequestForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRequestForm(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Church className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Request a Denomination
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Submit your request for admin review
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestForm(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            {submitSuccess ? (
              <div className="p-6 text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Submitted!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Your denomination request has been submitted successfully. You will receive an email
                  with your login credentials once the admin reviews and approves your request.
                </p>
                <Button
                  onClick={() => {
                    setShowRequestForm(false);
                    setSubmitSuccess(false);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            ) : (
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
              {/* Denomination Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Denomination Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Church className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="denominationName"
                    value={form.denominationName}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Redeemed Christian Church of God"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleFormChange}
                      required
                      placeholder="John"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleFormChange}
                      required
                      placeholder="Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    required
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                <PhoneField
                  value={form.phone}
                  onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                  options={phoneOptions}
                  countryName={form.country}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="123 Church Street"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* City & Country & State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Country
                  </label>
                  <Select
                    value={allCountries.find((c) => c.name === form.country)?.isoCode || ''}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto">
                      {allCountries.map((c) => (
                        <SelectItem key={c.isoCode} value={c.isoCode}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    State / Region
                  </label>
                  <Select
                    value={form.state || ''}
                    onValueChange={handleStateChange}
                    disabled={states.length === 0}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm">
                      <SelectValue placeholder={states.length === 0 ? 'Select country first' : 'Select State'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto">
                      {states.map((s) => (
                        <SelectItem key={s.isoCode} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleFormChange}
                  placeholder="Lagos"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Additional Information
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Tell us a bit about your denomination or why you'd like it added..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all text-sm resize-none"
                  />
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20">
                <Mail className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Your request will be reviewed by the ChurchFlow admin team.
                  Once approved, your account and denomination will be created automatically,
                  and login credentials will be sent to your email.
                </p>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                  <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-3 gap-2 text-sm font-semibold"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DenominationsPage;
