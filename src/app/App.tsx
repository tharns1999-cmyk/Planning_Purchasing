import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { plannerRepository } from '../services/plannerService';

export const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await plannerRepository.initializeAsync();
      } catch (err) {
        console.error("Failed to initialize data from GAS", err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลจากฐานข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
};

