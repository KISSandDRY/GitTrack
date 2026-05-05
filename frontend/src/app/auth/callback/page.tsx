'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setError('No authorization code provided by GitHub.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        const response = await fetch(`${API_BASE_URL}/api/auth/github`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Save JWT to local storage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect back to dashboard
        router.push('/');
        
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An unexpected error occurred during login.');
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full border border-red-500/30 bg-red-900/10 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Login Failed</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-indigo-200 animate-pulse font-medium">Authenticating with GitHub...</p>
      </div>
    </main>
  );
}
