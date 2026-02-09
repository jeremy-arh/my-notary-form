import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import Logo from '../../assets/Logo';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    // Handle magic link callback
    const handleMagicLinkCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        setLoading(true);
        try {
          // Set the session with the tokens from the magic link
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          if (data.session) {
            // Clear URL hash and redirect to dashboard
            window.history.replaceState({}, document.title, '/login');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Magic link callback error:', error);
          setError(error.message || 'Failed to sign in. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    // Check if this is a callback from magic link
    if (window.location.hash.includes('access_token')) {
      handleMagicLinkCallback();
      return;
    }

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };

    checkUser();
  }, [navigate]);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMagicLinkSent(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      setMagicLinkSent(true);
      setEmail('');
    } catch (error) {
      console.error('Magic link error:', error);
      setError(error.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center">
          <Logo width={150} height={150} />
        </div>

        {/* Login Form */}
        <div className="bg-[#F3F4F6] rounded-3xl p-8 shadow-sm">
          <p className="text-gray-600 text-center mb-8">
            {magicLinkSent ? 'Check your email' : 'Sign in to your account'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
              <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {magicLinkSent && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start">
                <Icon icon="heroicons:check-circle" className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Magic link sent!</p>
                  <p>Check your email and click the link to sign in. The link will expire in 1 hour.</p>
                </div>
              </div>
            </div>
          )}

          {!magicLinkSent && (
            <form onSubmit={handleSendMagicLink} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
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
                    Sending magic link...
                  </>
                ) : (
                  <>
                    <Icon icon="heroicons:paper-airplane" className="w-5 h-5 mr-2" />
                    Send Magic Link
                  </>
                )}
              </button>
            </form>
          )}

          {magicLinkSent && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false);
                  setError('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Send another magic link
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <a href="/form" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Back to form
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
