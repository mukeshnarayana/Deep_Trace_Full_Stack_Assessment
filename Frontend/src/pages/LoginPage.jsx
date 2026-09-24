import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Input from '../components/Input';
import Button from '../components/Button';
import { SEED_ACCOUNTS } from '../utils/constants';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { success, error: showErrorToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await login({ email: email.trim(), password });
      success(`Welcome back, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid credentials or tenant account deactivated.';
      setErrorMessage(msg);
      showShowToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const showShowToastError = (msg) => {
    showErrorToast(msg);
  };

  const handleQuickFill = (account) => {
    setEmail(account.email);
    setPassword('Password123!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Branding */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-gray-900">
          AegisGuard Platform
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500 uppercase tracking-wider font-medium">
          Multi-Tenant Enterprise Security Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10">
          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@acmebank.com"
              icon={Mail}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In to Platform
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quick Test Accounts (Password: Password123!)</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Click any role below to pre-populate verified backend seed accounts:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {SEED_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="flex items-center justify-between text-left p-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors text-xs group cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-gray-800 group-hover:text-indigo-700">
                      {acc.label}
                    </span>
                    <span className="block text-[11px] text-gray-500">{acc.email}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 group-hover:text-indigo-600 font-medium">
                    Use &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Strict tenant isolation active. Session secured with revokable JWT.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
