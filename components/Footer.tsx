'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="w-full print:hidden">
      {/* Upper Footer (#2e3249) */}
      <div className="bg-[#2e3249] text-white pt-12 pb-10 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="https://retrofitcanada.com/wp-content/uploads/2024/10/logo-retrofitcanada-light.png"
              alt="Retrofit Canada"
              width={200}
              height={35}
              className="w-[200px] h-auto object-contain mx-auto"
            />
          </div>

          {/* Heading */}
          <h4 className="font-saira text-xl sm:text-2xl font-semibold text-white tracking-wide">
            Sign up for updates from Retrofit Canada
          </h4>

          {/* Newsletter Form */}
          <div className="max-w-[480px] mx-auto">
            {subscribed ? (
              <p className="text-emerald-400 font-medium text-sm">
                Thank you for subscribing to updates from Retrofit Canada!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 bg-white text-slate-900 placeholder-slate-400 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#faa627]"
                />
                <button
                  type="submit"
                  className="bg-[#ea3f3f] hover:bg-[#d63434] text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {/* Social Media SVG Icons */}
          <div className="pt-4 flex items-center justify-center gap-7">
            <a
              href="https://twitter.com/RetrofitCanada"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-transform hover:scale-110"
              aria-label="X (Twitter)"
            >
              <img
                src="https://retrofitcanada.com/wp-content/uploads/2025/01/rc-x.svg"
                alt="X"
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </a>
            <a
              href="https://www.linkedin.com/company/retrofit-canada/"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-transform hover:scale-110"
              aria-label="LinkedIn"
            >
              <img
                src="https://retrofitcanada.com/wp-content/uploads/2025/01/rc-linkedin.svg"
                alt="LinkedIn"
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </a>
            <a
              href="https://www.instagram.com/retrofit_canada/"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-transform hover:scale-110"
              aria-label="Instagram"
            >
              <img
                src="https://retrofitcanada.com/wp-content/uploads/2025/01/rc-instagram.svg"
                alt="Instagram"
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </a>
            <a
              href="https://www.facebook.com/retrofitcanada"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-transform hover:scale-110"
              aria-label="Facebook"
            >
              <img
                src="https://retrofitcanada.com/wp-content/uploads/2025/01/rc-facebook.svg"
                alt="Facebook"
                width={20}
                height={36}
                className="h-9 w-auto"
              />
            </a>
            <a
              href="https://www.youtube.com/channel/UCMh5RKv1e-eaO5P1TqHTPhA"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-transform hover:scale-110"
              aria-label="YouTube"
            >
              <img
                src="https://retrofitcanada.com/wp-content/uploads/2025/01/rc-youtube.svg"
                alt="YouTube"
                width={40}
                height={36}
                className="h-9 w-auto"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Red Strip (#ea3f3f) */}
      <div className="bg-[#ea3f3f] text-white py-6 px-6 text-center text-[13px] font-roboto leading-relaxed">
        <p className="mb-2">
          To access our case study library through an API, please{' '}
          <Link href="/contact" className="underline font-bold hover:text-amber-200">
            contact us
          </Link>
          .
        </p>
        <p className="opacity-95">
          © Copyright{' '}
          <Link href="/" className="underline hover:text-amber-200">
            Retrofit Canada
          </Link>
          <br />
          All rights reserved |{' '}
          <Link href="/about" className="underline hover:text-amber-200">
            Privacy Policy
          </Link>{' '}
          |{' '}
          <Link href="/contact" className="underline hover:text-amber-200">
            Contact
          </Link>{' '}
          |{' '}
          <Link href="/about" className="underline hover:text-amber-200">
            Terms of Use
          </Link>{' '}
          |{' '}
          <Link href="/about" className="underline hover:text-amber-200">
            Disclaimer
          </Link>
        </p>
      </div>
    </footer>
  );
}
