import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { registerUser } from '../../lib/auth';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  createdBy?: string; // For admin/owner creating accounts
  allowedRoles?: Array<'admin' | 'member' | 'user'>;
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSwitchToLogin, 
  createdBy, 
  allowedRoles,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: (allowedRoles?.[0] || 'user') as 'owner' | 'admin' | 'member' | 'user'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const { login } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
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
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    const result = registerUser({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      role: formData.role
    }, createdBy);
    
    if (result.success && result.user) {
      if (!createdBy) {
        // Self-registration, log them in
        login(result.user);
      } else {
        // Admin creating account, show success and reset form
        onSuccess?.();
      }
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  const getAvailableRoles = () => {
    if (allowedRoles) {
      return allowedRoles.map(role => ({
        value: role,
        label: role.charAt(0).toUpperCase() + role.slice(1)
      }));
    }
    
    // Default roles for self-registration
    return [
      { value: 'user', label: 'User' },
      { value: 'member', label: 'Member' }
    ];
  };

  const isCreatingForOthers = !!createdBy;
  const availableRoles = getAvailableRoles();

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          {isCreatingForOthers ? 'Create New Account' : 'Join Our Church'}
        </h2>
        <p style={styles.cardDescription}>
          {isCreatingForOthers 
            ? 'Create an account for a new church member'
            : 'Create your account to get started'
          }
        </p>
      </div>
      <div style={styles.cardContent}>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.alert}>
              <p style={styles.alertText}>{error}</p>
            </div>
          )}
          
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
              placeholder="your.email@example.com"
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
            <label htmlFor="role" style={styles.label}>Role</label>
            <div style={styles.selectWrapper}>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                style={styles.select}
              >
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Password *</label>
            <input
              id="password"
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
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
          
          {!isCreatingForOthers && (
            <div style={styles.footer}>
              <span style={styles.footerText}>Already have an account? </span>
              <button
                type="button"
                style={styles.link}
                onClick={onSwitchToLogin}
              >
                Sign in here
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const styles = {
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
    textAlign: 'center' as const,
    margin: '0 0 8px 0',
    color: '#0f172a',
  },
  cardDescription: {
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
  cardContent: {
    padding: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
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
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
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
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    boxSizing: 'border-box' as const,
  },
  selectWrapper: {
    position: 'relative' as const,
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    appearance: 'none' as const,
    boxSizing: 'border-box' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
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
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center' as const,
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
    fontWeight: 'normal',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};



// import React, { useState } from 'react';
// // import { Button } from '@/components/ui/button';
// // import { Label } from '@/components/ui/label';
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Button } from '../../components/ui/button';
// import { Label } from '../../components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
// import { useAuth } from './AuthProvider';
// import { Input } from '../ui/input';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
// import { Alert, AlertDescription } from '../ui/alert';
// import { registerUser } from '../../lib/auth';

// interface RegisterFormProps {
//   onSwitchToLogin: () => void;
//   createdBy?: string; // For admin/owner creating accounts
//   allowedRoles?: Array<'admin' | 'member' | 'user'>;
//   onSuccess?: () => void;
// }

// export const RegisterForm: React.FC<RegisterFormProps> = ({ 
//   onSwitchToLogin, 
//   createdBy, 
//   allowedRoles,
//   onSuccess 
// }) => {
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//     confirmPassword: '',
//     firstName: '',
//     lastName: '',
//     phone: '',
//     role: (allowedRoles?.[0] || 'user') as 'owner' | 'admin' | 'member' | 'user'
//   });
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { login } = useAuth();

//   const handleInputChange = (field: string, value: string) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setIsLoading(true);

//     // Validation
//     if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
//       setError('Please fill in all required fields');
//       setIsLoading(false);
//       return;
//     }

//     if (formData.password !== formData.confirmPassword) {
//       setError('Passwords do not match');
//       setIsLoading(false);
//       return;
//     }

//     if (formData.password.length < 6) {
//       setError('Password must be at least 6 characters long');
//       setIsLoading(false);
//       return;
//     }

//     const result = registerUser({
//       email: formData.email,
//       firstName: formData.firstName,
//       lastName: formData.lastName,
//       phone: formData.phone,
//       role: formData.role
//     }, createdBy);
    
//     if (result.success && result.user) {
//       if (!createdBy) {
//         // Self-registration, log them in
//         login(result.user);
//       } else {
//         // Admin creating account, show success and reset form
//         onSuccess?.();
//       }
//     } else {
//       setError(result.message);
//     }
    
//     setIsLoading(false);
//   };

//   const getAvailableRoles = () => {
//     if (allowedRoles) {
//       return allowedRoles.map(role => ({
//         value: role,
//         label: role.charAt(0).toUpperCase() + role.slice(1)
//       }));
//     }
    
//     // Default roles for self-registration
//     return [
//       { value: 'user', label: 'User' },
//       { value: 'member', label: 'Member' }
//     ];
//   };

//   const isCreatingForOthers = !!createdBy;

//   return (
//     <Card className="w-full max-w-md">
//       <CardHeader className="space-y-1">
//         <CardTitle className="text-2xl font-bold text-center">
//           {isCreatingForOthers ? 'Create New Account' : 'Join Our Church'}
//         </CardTitle>
//         <CardDescription className="text-center">
//           {isCreatingForOthers 
//             ? 'Create an account for a new church member'
//             : 'Create your account to get started'
//           }
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           {error && (
//             <Alert variant="destructive">
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}
          
//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label htmlFor="firstName">First Name *</Label>
//               <Input
//                 id="firstName"
//                 placeholder="John"
//                 value={formData.firstName}
//                 onChange={(e) => handleInputChange('firstName', e.target.value)}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="lastName">Last Name *</Label>
//               <Input
//                 id="lastName"
//                 placeholder="Doe"
//                 value={formData.lastName}
//                 onChange={(e) => handleInputChange('lastName', e.target.value)}
//                 required
//               />
//             </div>
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="email">Email *</Label>
//             <Input
//               id="email"
//               type="email"
//               placeholder="your.email@example.com"
//               value={formData.email}
//               onChange={(e) => handleInputChange('email', e.target.value)}
//               required
//             />
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="phone">Phone Number</Label>
//             <Input
//               id="phone"
//               type="tel"
//               placeholder="(555) 123-4567"
//               value={formData.phone}
//               onChange={(e) => handleInputChange('phone', e.target.value)}
//             />
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="role">Role</Label>
//             <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Select role" />
//               </SelectTrigger>
//               <SelectContent>
//                 {getAvailableRoles().map(role => (
//                   <SelectItem key={role.value} value={role.value}>
//                     {role.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="password">Password *</Label>
//             <Input
//               id="password"
//               type="password"
//               placeholder="At least 6 characters"
//               value={formData.password}
//               onChange={(e) => handleInputChange('password', e.target.value)}
//               required
//             />
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="confirmPassword">Confirm Password *</Label>
//             <Input
//               id="confirmPassword"
//               type="password"
//               placeholder="Confirm your password"
//               value={formData.confirmPassword}
//               onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
//               required
//             />
//           </div>
          
//           <Button type="submit" className="w-full" disabled={isLoading}>
//             {isLoading ? 'Creating Account...' : 'Create Account'}
//           </Button>
          
//           {!isCreatingForOthers && (
//             <div className="text-center text-sm">
//               <span className="text-muted-foreground">Already have an account? </span>
//               <Button
//                 type="button"
//                 variant="link"
//                 className="p-0 h-auto font-normal"
//                 onClick={onSwitchToLogin}
//               >
//                 Sign in here
//               </Button>
//             </div>
//           )}
//         </form>
//       </CardContent>
//     </Card>
//   );
// };