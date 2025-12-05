// components/Navbar.tsx
import React, { useEffect } from 'react';
import { Menu, Search, LogOut } from 'lucide-react';
import type { UserType } from '../Types/Types';

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: UserType;
  showLogout: boolean;
  setShowLogout: (show: boolean) => void;
  handleLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  currentUser,
  showLogout,
  setShowLogout,
  handleLogout
}) => {
  
  // Debug effect - remove after fixing
  useEffect(() => {
    console.log("🔄 Navbar received currentUser:", currentUser);
    console.log("📝 Name:", currentUser?.name);
    console.log("📧 Email:", currentUser?.email);
    console.log("🆔 ID:", currentUser?.id);
  }, [currentUser]);

  // Get display avatar (first letter)
  const getDisplayAvatar = () => {
    if (!currentUser) return 'U';
    
    // Try name first letter
    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name.charAt(0).toUpperCase();
    }
    
    // Try email first letter
    if (currentUser.email && currentUser.email.trim() !== '') {
      return currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (!currentUser) return 'User';
    
    // If name exists and is not empty
    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name;
    }
    
    // Fallback to email username
    if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    
    return 'User';
  };

  // Get display email
  const getDisplayEmail = () => {
    if (!currentUser) return;
    
    return currentUser.email;
  };

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="h-5 w-5" />
              </div>
              <input
                className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search tasks..."
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <button
            className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            aria-label="Notifications"
          >
            {/* Notification icon can be added here */}
          </button>

          {/* User Profile Section */}
          <div className="relative">
            <button
              className="flex items-center space-x-3 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setShowLogout(!showLogout);
              }}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {getDisplayAvatar()} {/* ✅ HERE - Function used! */}
                </span>
              </div>

              {/* Name and Email Display */}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-700">
                  {getDisplayName()} {/* ✅ HERE */}
                </div>
                <div className="text-xs text-gray-500">
                  {getDisplayEmail()} {/* ✅ HERE */}
                </div>
              </div>
            </button>

            {/* Logout Dropdown */}
            {showLogout && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {getDisplayName()} {/* ✅ HERE */}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {getDisplayEmail()} {/* ✅ HERE */}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;