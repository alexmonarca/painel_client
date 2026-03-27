import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6321]" />
      </div>
    );
  }

  return (
    <div className="antialiased font-sans text-gray-900">
      {session ? <Dashboard /> : <Login />}
    </div>
  );
}
