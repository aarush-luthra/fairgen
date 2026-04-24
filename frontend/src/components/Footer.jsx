import React from 'react';
import { motion } from 'framer-motion';

export default function Footer({ onLoadDemo, onLogin }) {
  return (
    <footer className="mx-6 mb-6 mt-32 overflow-hidden rounded-[4rem] bg-slate-900 px-12 pb-12 pt-20 text-white selection:bg-white selection:text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-16 md:flex-row">
          <div className="grid grid-cols-2 gap-20 lg:grid-cols-3">
            <div className="space-y-4">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="block text-sm font-medium opacity-60 hover:opacity-100">Home</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Pricing</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Programs</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Sign up</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Manifesto</button>
            </div>
            <div className="space-y-4">
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Privacy policy</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Terms</button>
              <a href="https://github.com/aarush-luthra/fairgen" target="_blank" rel="noreferrer" className="block text-sm font-medium opacity-60 hover:opacity-100">GitHub</a>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">YouTube</button>
            </div>
            <div className="hidden space-y-4 lg:block">
              <button onClick={onLoadDemo} className="block text-sm font-medium opacity-60 hover:opacity-100">Load Demo</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Audit Reports</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">Schema Builder</button>
              <button className="block text-sm font-medium opacity-60 hover:opacity-100">AI Prompting</button>
            </div>
          </div>

          <div className="text-right">
            <button onClick={onLogin} className="text-sm font-bold uppercase tracking-widest hover:underline">Log in</button>
          </div>
        </div>

        <div className="mt-32">
          <motion.h2 
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(4rem,20vw,24rem)] font-bold leading-[0.8] tracking-tighter text-white"
          >
            de.bias
          </motion.h2>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs font-bold opacity-40">© 2026 de.bias. High-performance structural calibration.</p>
          <div className="flex gap-8">
            <span className="text-xs font-bold uppercase tracking-widest opacity-40">v2.1 Stable</span>
            <span className="text-xs font-bold uppercase tracking-widest opacity-40">60FPS Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
