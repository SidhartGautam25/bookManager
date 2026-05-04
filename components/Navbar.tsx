"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookMarked, Menu, X, PlusCircle, Library, BarChart3 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Add Word", href: "/add-word", icon: <PlusCircle size={18} /> },
    { name: "Book List", href: "/book-list", icon: <Library size={18} /> },
    { name: "Analytics", href: "/analytics", icon: <BarChart3 size={18} /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white group-hover:rotate-3 transition-transform">
                <BookMarked size={24} />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">
                Book<span className="text-indigo-600">Word</span>
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Content */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out border-b border-gray-100 bg-white ${isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-colors ${isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}