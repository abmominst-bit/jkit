import { useState, useEffect } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import Auth from '@/src/components/jk-it/Auth';
import Dashboard from '@/src/components/jk-it/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    
    if (!supabase) {
      setIsConfigured(false);
      setLoading(false);
      return;
    }

    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 p-4">
        <Card className="max-w-md w-full border-red-200/80 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600 mb-2">
              <AlertCircle className="h-6 w-6" />
              <CardTitle className="font-serif">Configuration Required</CardTitle>
            </div>
            <CardDescription>
              Supabase credentials are missing. Please configure your environment variables to enable authentication and database features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-md text-sm space-y-2">
              <p className="font-semibold">Required Secrets:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground italic">
              You can add these in the "Secrets" panel in the AI Studio sidebar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {!session ? <Auth /> : <Dashboard />}
      <Toaster position="top-right" />
    </>
  );
}
