import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRegister } from '@/hooks/useAuthQuery';
import { Country } from 'country-state-city';
import { PhoneField, isoToFlag } from '@/components/dashboard/AddPersonDialog';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7777/api';

type NameCheckStatus = 'idle' | 'checking' | 'taken' | 'available';

interface ChurchRegistrationFormProps {
  onSwitchToLogin: () => void;
  onSwitchToRegister?: () => void;
}

export const ChurchRegistrationForm: React.FC<ChurchRegistrationFormProps> = ({ onSwitchToLogin, onSwitchToRegister }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    denominationName: '',
    denominationDescription: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [nameCheck, setNameCheck] = useState<NameCheckStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { loginWithResponse } = useAuth();
  const registerMutation = useRegister();
  const phoneOptions = React.useMemo(() =>
    Country.getAllCountries().map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      code: `+${c.phonecode}`,
      flag: isoToFlag(c.isoCode),
    })),
    []
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const trimmed = formData.denominationName.trim();
    if (!trimmed) {
      setNameCheck('idle');
      return;
    }
    setNameCheck('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/churches/check-name?name=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setNameCheck(data.available ? 'available' : 'taken');
        } else {
          setNameCheck('idle');
        }
      } catch {
        setNameCheck('idle');
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formData.denominationName]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.denominationName.trim()) {
      setError('Denomination name is required');
      return;
    }
    if (nameCheck === 'checking') {
      setError('Please wait while we verify the denomination name.');
      return;
    }
    if (nameCheck === 'taken') {
      setError('This denomination is already registered. If this is your church, please sign in instead.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const fullName = `${formData.firstName} ${formData.lastName}`;
    registerMutation.mutate(
      {
        email: formData.email,
        full_name: fullName,
        password: formData.password,
        phone_number: formData.phone || undefined,
        church: {
          denomination_name: formData.denominationName,
          description: formData.denominationDescription || undefined,
        },
      },
      {
        onSuccess: (data) => {
          loginWithResponse(data as any);
          // Index.tsx reactively redirects to /dashboard when isAuthenticated becomes true
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Register Your Denomination</h2>
        <p style={styles.cardDescription}>
          {step === 1
            ? 'Tell us about your denomination'
            : 'Create your admin account'}
        </p>
        {/* Step indicator */}
        <div style={styles.stepIndicator}>
          <div style={{ ...styles.stepDot, ...(step >= 1 ? styles.stepDotActive : {}) }}>1</div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepDot, ...(step >= 2 ? styles.stepDotActive : {}) }}>2</div>
        </div>
      </div>
      <div style={styles.cardContent}>
        {step === 1 ? (
          <form onSubmit={handleStep1} style={styles.form}>
            {error && (
              <div style={styles.alert}>
                <p style={styles.alertText}>{error}</p>
              </div>
            )}

            <div style={styles.formGroup}>
              <label htmlFor="denominationName" style={styles.label}>Denomination Name *</label>
              <input
                id="denominationName"
                placeholder="e.g. Salvation Ministry"
                value={formData.denominationName}
                onChange={(e) => handleInputChange('denominationName', e.target.value)}
                required
                style={{
                  ...styles.input,
                  borderColor: nameCheck === 'taken' ? '#f97316' : nameCheck === 'available' ? '#22c55e' : undefined,
                }}
              />
              {nameCheck === 'checking' && (
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Checking availability…</p>
              )}
              {nameCheck === 'taken' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px' }}>
                  <p style={{ fontSize: '13px', color: '#c2410c', margin: 0 }}>
                    ⚠️ A denomination with this name is already registered. If this is your church, please{' '}
                    <button type="button" style={{ ...styles.link, fontSize: '13px' }} onClick={onSwitchToLogin}>sign in</button>.
                    {onSwitchToRegister && (
                      <> Don't have an account?{' '}
                        <button type="button" style={{ ...styles.link, fontSize: '13px' }} onClick={onSwitchToRegister}>Sign up</button>.
                      </>
                    )}
                  </p>
                </div>
              )}
              {nameCheck === 'available' && (
                <p style={{ fontSize: '12px', color: '#16a34a', margin: 0 }}>✓ Name is available</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="denominationDescription" style={styles.label}>Description</label>
              <textarea
                id="denominationDescription"
                placeholder="A brief description of your denomination..."
                value={formData.denominationDescription}
                onChange={(e) => handleInputChange('denominationDescription', e.target.value)}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                rows={3}
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...((nameCheck === 'taken' || nameCheck === 'checking') ? styles.buttonDisabled : {}),
              }}
              disabled={nameCheck === 'taken' || nameCheck === 'checking'}
            >
              {nameCheck === 'checking' ? 'Checking…' : 'Continue'}
            </button>

            <div style={styles.footer}>
              <span style={styles.footerText}>Already have an account? </span>
              <button type="button" style={styles.link} onClick={onSwitchToLogin}>
                Sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.alert}>
                <p style={styles.alertText}>{error}</p>
              </div>
            )}

            <div style={styles.churchBadge}>
              <span style={styles.churchBadgeIcon}>⛪</span>
              <span style={styles.churchBadgeText}>{formData.denominationName}</span>
            </div>

            <div style={styles.gridRow}>
              <div style={styles.formGroup}>
                <label htmlFor="firstName" style={styles.label}>First Name *</label>
                <input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="lastName" style={styles.label}>Last Name *</label>
                <input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email *</label>
              <input
                id="email"
                type="email"
                placeholder="admin@yourchurch.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <PhoneField
                value={formData.phone}
                onChange={(v) => handleInputChange('phone', v)}
                options={phoneOptions}
                countryName=""
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="regPassword" style={styles.label}>Password *</label>
              <input
                id="regPassword"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                style={styles.backButton}
                onClick={() => { setStep(1); setError(''); }}
              >
                Back
              </button>
              <button
                type="submit"
                style={{ ...styles.button, ...(registerMutation.isPending ? styles.buttonDisabled : {}), flex: 1 }}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating...' : 'Register Denomination'}
              </button>
            </div>

            <div style={styles.footer}>
              <span style={styles.footerText}>Already have an account? </span>
              <button type="button" style={styles.link} onClick={onSwitchToLogin}>
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    maxWidth: '448px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '24px 24px 0 24px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 8px 0',
    color: '#0f172a',
  },
  cardDescription: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
    margin: '0 0 16px 0',
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    marginBottom: '8px',
  },
  stepDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    transition: 'all 0.2s',
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  stepLine: {
    width: '40px',
    height: '2px',
    backgroundColor: '#e2e8f0',
  },
  cardContent: {
    padding: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  alert: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
  },
  alertText: {
    color: '#991b1b',
    fontSize: '14px',
    margin: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f172a',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  button: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  backButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  churchBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
  },
  churchBadgeIcon: {
    fontSize: '16px',
  },
  churchBadgeText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d4ed8',
  },
  footer: {
    textAlign: 'center',
    fontSize: '14px',
  },
  footerText: {
    color: '#64748b',
  },
  link: {
    color: '#2563eb',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
