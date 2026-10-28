'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: 'CASE STUDIES', href: '/case-studies' },
    { label: 'LEARN', href: '/learn' },
    { label: 'NEWS', href: '/news' },
    { label: 'EVENTS', href: '/events' },
    { label: 'RETROFIT AI', href: '/retrofit-ai' },
    { label: 'ABOUT', href: '/about' },
    { label: 'CONTACT', href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] border-b border-slate-100">
      <div className="max-w-[1340px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
        {/* Exact Retrofit Canada SVG Logo */}
        <Link href="/" className="block">
          <img
            src="https://retrofitcanada.com/wp-content/uploads/2025/02/logo-retrofitcanada.svg"
            alt="Retrofit Canada | Deep Energy Retrofits"
            width={280}
            height={50}
            className="w-[220px] sm:w-[280px] h-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[15px] font-medium tracking-wide">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors uppercase font-roboto whitespace-nowrap ${
                isActive(link.href)
                  ? 'text-[#ea3f3f] font-bold border-b-2 border-[#ea3f3f] pb-1'
                  : 'text-[#2e3249] hover:text-[#faa627]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Hamburger Trigger */}
        <div className="flex lg:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#2e3249] hover:text-[#ea3f3f] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-6 py-6 space-y-4 shadow-xl animate-in fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block text-base uppercase font-semibold py-2 transition-colors ${
                isActive(link.href)
                  ? 'text-[#ea3f3f] font-bold'
                  : 'text-[#2e3249] hover:text-[#faa627]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
