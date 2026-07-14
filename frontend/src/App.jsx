import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import SupabaseBootstrap from './components/SupabaseBootstrap';
import AppRoutes from './routes/AppRoutes';

// Configure TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't trigger refetch on switching OS windows
      retry: 1,                    // Retry failed network calls once
      staleTime: 1000 * 30,        // Cache items for 30s before considering stale
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SupabaseBootstrap />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
