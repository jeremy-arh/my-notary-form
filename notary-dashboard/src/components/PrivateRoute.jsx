import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PrivateRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isNotary, setIsNotary] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Check if user is a notary
      const { data: notary, error } = await supabase
        .from('notary')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (error || !notary) {
        setAuthenticated(false);
        setIsNotary(false);
      } else {
        setAuthenticated(true);
        setIsNotary(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!authenticated || !isNotary) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;

