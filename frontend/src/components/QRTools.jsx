import React, { useState, useEffect } from 'react';
import { QrCode, Scan, BookOpen, Sparkles, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';
import FormatReference from './FormatReference';

export default function QRTools() {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'scan' | 'reference'
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', version: '2.0.0' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setBackendHealth({ status: 'online', version: data.version });
        } else {
          setBackendHealth({ status: 'error' });
        }
      } catch (e) {
        setBackendHealth({ status: 'offline' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white pb-12">
      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center p-2 text-sky-600 shadow-xs">
              <QrCode className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">QR & Barcode Tools</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Generate verified standard QR codes & scan all 1D/2D optical symbologies locally.
              </p>
            </div>
          </div>

          {/* Top-Right Pill Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-full border border-slate-200 shadow-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'generate'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <QrCode className="w-4 h-4 text-sky-600 stroke-[2.2]" />
              <span>Generate QR</span>
            </button>

            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-white text-sky-700 shadow-sm border border-sky-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Scan className="w-4 h-4 text-sky-600 stroke-[2.2]" />
              <span>Scan QR / Barcode</span>
            </button>

            <button
              onClick={() => setActiveTab('reference')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'reference'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
              title="17 Symbology Format Standards"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">Standards Guide</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        {activeTab === 'generate' && <QRGenerator />}
        {activeTab === 'scan' && <QRScanner />}
        {activeTab === 'reference' && <FormatReference />}
      </main>
    </div>
  );
}
