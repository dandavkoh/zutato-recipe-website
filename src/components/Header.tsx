'use client';

import { useState } from 'react';
import Link from 'next/link';
import FontAwesomeIcon from './FontAwesomeIcon';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <div className="relative">
              <input
                type="text"
                placeholder="Rezepte suchen..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon="search" 
                  className="text-gray-400" 
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Login Button */}
          <div className="flex-shrink-0">
            <Link href="/login">
              <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-full font-medium transition-colors">
                Anmelden
              </button>
            </Link>
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

            {/* Login Button and Menu */}
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
                  Anmelden
                </button>
              </Link>
              
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
            <div className="relative">
              <input
                type="text"
                placeholder="Rezepte suchen..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon="search" 
                  className="text-gray-400" 
                  size="lg"
                />
              </div>
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