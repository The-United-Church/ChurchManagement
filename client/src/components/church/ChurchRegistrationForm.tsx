import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { registerChurchWithAdmin } from '@/lib/auth';

interface ChurchRegistrationFormProps {
  onSwitchToLogin: () => void;
}

export const ChurchRegistrationForm: React.FC<ChurchRegistrationFormProps> = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    churchName: '',
    churchDescription: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.churchName.trim()) {
      setError('Church name is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    const result = registerChurchWithAdmin(
      { name: formData.churchName, description: formData.churchDescription },
      {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        password: formData.password,
      }
    );

    if (result.success && result.user) {
      login(result.user);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Register Your Church</h2>
        <p style={styles.cardDescription}>
          {step === 1
            ? 'Tell us about your church'
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
              <label htmlFor="churchName" style={styles.label}>Church Name *</label>
              <input
                id="churchName"
                placeholder="e.g. Salvation Ministry"
                value={formData.churchName}
                onChange={(e) => handleInputChange('churchName', e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="churchDescription" style={styles.label}>Description</label>
              <textarea
                id="churchDescription"
                placeholder="A brief description of your church..."
                value={formData.churchDescription}
                onChange={(e) => handleInputChange('churchDescription', e.target.value)}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' as const }}
                rows={3}
              />
            </div>

            <button type="submit" style={styles.button}>
              Continue
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
              <span style={styles.churchBadgeText}>{formData.churchName}</span>
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
              <label htmlFor="phone" style={styles.label}>Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                style={styles.input}
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
                style={{ ...styles.button, ...(isLoading ? styles.buttonDisabled : {}), flex: 1 }}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Register Church'}
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
