import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAuth } from './AuthProvider';
import { loginUser } from '../../lib/auth';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const result = loginUser(email, password);
    
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
        <h2 style={styles.cardTitle}>Welcome Back</h2>
        <p style={styles.cardDescription}>
          Sign in to your church account
        </p>
      </div>
      <div style={styles.cardContent}>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.alert}>
              <p style={styles.alertText}>{error}</p>
            </div>
          )}
          
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div style={styles.footer}>
            <span style={styles.footerText}>Don't have an account? </span>
            <button
              type="button"
              style={styles.link}
              onClick={onSwitchToRegister}
            >
              Register here
            </button>
          </div>
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
// // import { Input } from '@/components/ui/input';
// // import { Label } from '@/components/ui/label';
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// // import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Button } from '../../components/ui/button';
// import { Input } from '../../components/ui/input';
// import { Label } from '../../components/ui/label';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
// import { Alert, AlertDescription } from '../../components/ui/alert';
// import { useAuth } from './AuthProvider';
// // import { loginUser } from '@/lib/auth';
// import { loginUser } from '../../lib/auth';

// interface LoginFormProps {
//   onSwitchToRegister: () => void;
// }

// export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { login } = useAuth();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setIsLoading(true);

//     if (!email || !password) {
//       setError('Please fill in all fields');
//       setIsLoading(false);
//       return;
//     }

//     const result = loginUser(email, password);
    
//     if (result.success && result.user) {
//       login(result.user);
//     } else {
//       setError(result.message);
//     }
    
//     setIsLoading(false);
//   };

//   return (
//     <Card className="w-full max-w-md">
//       <CardHeader className="space-y-1">
//         <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
//         <CardDescription className="text-center">
//           Sign in to your church account
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           {error && (
//             <Alert variant="destructive">
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}
          
//           <div className="space-y-2">
//             <Label htmlFor="email">Email</Label>
//             <Input
//               id="email"
//               type="email"
//               placeholder="your.email@example.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </div>
          
//           <div className="space-y-2">
//             <Label htmlFor="password">Password</Label>
//             <Input
//               id="password"
//               type="password"
//               placeholder="Enter your password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </div>
          
//           <Button type="submit" className="w-full" disabled={isLoading}>
//             {isLoading ? 'Signing in...' : 'Sign In'}
//           </Button>
          
//           <div className="text-center text-sm">
//             <span className="text-muted-foreground">Don't have an account? </span>
//             <Button
//               type="button"
//               variant="link"
//               className="p-0 h-auto font-normal"
//               onClick={onSwitchToRegister}
//             >
//               Register here
//             </Button>
//           </div>
//         </form>
//       </CardContent>
//     </Card>
//   );
// };