'use client';

import { useState } from 'react';
import Link from 'next/link';
import FontAwesomeIcon from './FontAwesomeIcon';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Redirect to home page after logout
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-orange-600">🍳 ZUTATO</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="flex">
              <input
                type="text"
                placeholder="Rezepte suchen..."
                className="w-full flex-1 pl-4 pr-4 py-3 rounded-l-full rounded-r-none !rounded-r-none border border-gray-400 border-r-0 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                className="inline-flex items-center justify-center px-5 py-3 rounded-r-full border border-gray-400 border-l-0 -ml-px bg-orange-600 hover:bg-orange-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                aria-label="Suchen"
              >
                <FontAwesomeIcon icon="search" className="text-white" size="lg" />
              </button>
            </div>
          </div>

          {/* Auth Button */}
          <div className="flex-shrink-0">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Hallo, {user.firstName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full font-medium transition-colors"
                >
                  Abmelden
                </button>
              </div>
            ) : (
              <Link href="/login">
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-full font-medium transition-colors">
                  Anmelden
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-center space-x-8 py-3 border-t border-gray-100">
          <Link href="/neue-rezepte" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
            Neue Rezepte
          </Link>
          <Link href="/beliebte-rezepte" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
            Beliebte Rezepte
          </Link>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-orange-600">🍳 ZUTATO</span>
              </Link>
            </div>

            {/* Auth Button and Menu */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    {user.firstName || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    Abmelden
                  </button>
                </div>
              ) : (
                <Link href="/login">
                  <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                    Anmelden
                  </button>
                </Link>
              )}
              
              {/* Burger Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-700 hover:text-orange-600 hover:bg-gray-100 transition-colors"
              >
                <FontAwesomeIcon 
                  icon={isMenuOpen ? "times" : "bars"} 
                  className="text-gray-700" 
                  size="lg"
                />
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="pb-4">
            <div className="flex">
              <input
                type="text"
                placeholder="Rezepte suchen..."
                className="w-full flex-1 pl-4 pr-4 py-3 rounded-l-full rounded-r-none !rounded-r-none border border-gray-400 border-r-0 bg-gray-50 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                className="inline-flex items-center justify-center px-5 py-3 rounded-r-full border border-gray-400 border-l-0 -ml-px bg-orange-600 hover:bg-orange-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                aria-label="Suchen"
              >
                <FontAwesomeIcon icon="search" className="text-white" size="lg" />
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="border-t border-gray-100 py-4">
              <div className="flex flex-col space-y-3">
                <Link 
                  href="/neue-rezepte" 
                  className="text-gray-700 hover:text-orange-600 font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Neue Rezepte
                </Link>
                <Link 
                  href="/beliebte-rezepte" 
                  className="text-gray-700 hover:text-orange-600 font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Beliebte Rezepte
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 