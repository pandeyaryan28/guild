import React from 'react';
import { APP_URL } from '../../config/landingData';

export function Footer() {
  return (
    <footer className="mt-16 pt-12 border-t border-border-default/60 max-w-[1200px] mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        
        <div className="col-span-2 space-y-4">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
              <img src="/logo.png" alt="Guild Orbit Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-md font-black tracking-wider uppercase text-text-primary">
              Guild Orbit
            </span>
          </a>
          <p className="text-xs text-text-secondary max-w-[280px] leading-relaxed font-medium">
            The operational coordination monolith for small and mid-sized businesses. Designed to restore sanity to daily operations.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase text-text-primary tracking-widest">Product</h4>
          <ul className="space-y-2 text-xs font-semibold text-text-secondary">
            <li><a href="#features" className="hover:text-indigo-600">Features</a></li>
            <li><a href="#solutions" className="hover:text-indigo-600">Solutions</a></li>
            <li><a href="#pricing" className="hover:text-indigo-600">Pricing</a></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase text-text-primary tracking-widest">Resources</h4>
          <ul className="space-y-2 text-xs font-semibold text-text-secondary">
            <li><a href={`${APP_URL}/login`} className="hover:text-indigo-600">App Sign In</a></li>
            <li><a href={`${APP_URL}/signup`} className="hover:text-indigo-600">Create Workspace</a></li>
            <li><a href="#faq" className="hover:text-indigo-600">FAQs</a></li>
          </ul>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-default/30 pt-6">
        <span className="text-[10px] font-semibold text-text-muted">
          &copy; 2026 Guild Orbit Inc. All rights reserved.
        </span>
        <div className="flex items-center gap-6 text-[10px] font-semibold text-text-muted">
          <a href="#" className="hover:text-text-primary">Privacy Policy</a>
          <a href="#" className="hover:text-text-primary">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
