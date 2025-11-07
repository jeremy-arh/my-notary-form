import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import Logo from '../../assets/Logo';

const SetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if user needs to set password (newly invited user)
          // If user has a password set, they should go to dashboard
          // For invited users, they need to set password first
          setValidSession(true);
        } else {
          // Check if there's a token in the URL (from invitation link)
          const token = searchParams.get('token');
          const type = searchParams.get('type');
          
          if (token && type === 'invite') {
            // Try to get session from token
            try {
              const { data: { session: tokenSession }, error: tokenError } = await supabase.auth.getSession();
              if (tokenSession) {
                setValidSession(true);
              } else {
                setError('Invalid or expired invitation link. Please contact your administrator.');
              }
            } catch (err) {
              setError('Invalid or expired invitation link. Please contact your administrator.');
            }
          } else {
            setError('Invalid invitation link. Please contact your administrator.');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError('Error validating invitation. Please contact your administrator.');
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, [searchParams]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Verify user is a notary
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: notary, error: notaryError } = await supabase
          .from('notary')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (notaryError || !notary) {
          await supabase.auth.signOut();
          throw new Error('Access denied. This account is not authorized as a notary.');
        }
      }

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Set password error:', error);
      setError(error.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center">
          <Logo width={150} height={150} />
        </div>

        <div className="bg-[#F3F4F6] rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Set Your Password
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Create a password for your notary account
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {validSession ? (
            <form onSubmit={handleSetPassword} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 6 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-glassy w-full px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting password...
                  </>
                ) : (
                  <>
                    <Icon icon="heroicons:lock-closed" className="w-5 h-5 mr-2" />
                    Set Password
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">{error || 'Invalid invitation link'}</p>
              <a
                href="/login"
                className="btn-glassy inline-block px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                Back to Login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPassword;

