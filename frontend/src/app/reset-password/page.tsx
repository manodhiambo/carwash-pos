'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Card, Spinner } from '@/components/ui';
import { PasswordInput } from '@/components/ui/input';
import { Lock, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setIsTokenValid(false);
      setIsValidating(false);
      return;
    }

    try {
      // Simulate API call to validate token
      await new Promise(resolve => setTimeout(resolve, 1000));

      // API call would go here
      // await api.auth.validateResetToken({ token });

      setIsTokenValid(true);
    } catch (err) {
      setIsTokenValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // API call would go here
      // await api.auth.resetPassword({ token, password });

      setIsSubmitted(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) strength++;
    if (pass.match(/[0-9]/)) strength++;
    if (pass.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'bg-destructive';
      case 2:
        return 'bg-warning';
      case 3:
        return 'bg-primary';
      case 4:
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  const getStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="w-full max-w-md">
          <Card className="p-6">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Invalid or Expired Link</h2>
              <p className="text-muted-foreground mb-6">
                This password reset link is invalid or has expired.
                Please request a new password reset link.
              </p>
              <div className="space-y-3">
                <Link href="/forgot-password">
                  <Button className="w-full">Request New Link</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold">Sparkle Car Wash</h1>
          <p className="text-muted-foreground">Car Wash Management System</p>
        </div>

        <Card className="p-6">
          {isSubmitted ? (
            // Success State
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Password Reset Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully reset.
                You will be redirected to the login page shortly.
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Continue to Login
                </Button>
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Reset Your Password</h2>
                <p className="text-muted-foreground">
                  Please enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= passwordStrength ? getStrengthColor() : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password strength: <span className="font-medium">{getStrengthLabel()}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Password requirements:</p>
                  <ul className="space-y-1">
                    <li className={password.length >= 8 ? 'text-success' : ''}>
                      • At least 8 characters
                    </li>
                    <li className={password.match(/[a-z]/) && password.match(/[A-Z]/) ? 'text-success' : ''}>
                      • Uppercase and lowercase letters
                    </li>
                    <li className={password.match(/[0-9]/) ? 'text-success' : ''}>
                      • At least one number
                    </li>
                    <li className={password.match(/[^a-zA-Z0-9]/) ? 'text-success' : ''}>
                      • At least one special character
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Need help? Contact support at</p>
          <a href="mailto:support@sparklecarwash.co.ke" className="text-primary hover:underline">
            support@sparklecarwash.co.ke
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
