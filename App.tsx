import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ContextSetup from './pages/ContextSetup';
import ContextView from './pages/ContextView';
import { getContext, clearData } from './services/storageService';
import { BusinessContext } from './types';

const App: React.FC = () => {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await getContext();
        if (stored) setContext(stored);
      } catch (e) {
        console.error("Failed to load context", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleReset = async () => {
    if (window.confirm("Are you sure? This will delete your business context.")) {
      await clearData();
      setContext(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <HashRouter>
      <Layout hasContext={!!context} onReset={handleReset}>
        <Routes>
          <Route 
            path="/" 
            element={context ? <Dashboard context={context} /> : <Navigate to="/context" />} 
          />
          <Route 
            path="/context" 
            element={!context ? <ContextSetup setContext={setContext} /> : <ContextView context={context} />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;