import React, { useState, useEffect } from 'react';
import { 
  X, LogOut, ListTodo, ChevronLeft, ChevronRight, Menu, Sun, Moon
} from 'lucide-react';
import type { NavigationItem, UserType } from '../Types/Types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navigation: NavigationItem[];
  currentUser: UserType;
  handleLogout: () => void;
  isCollapsed: boolean; // ✅ Add this
  setIsCollapsed: (collapsed: boolean) => void; // ✅ Add this
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  navigation,
  currentUser,
  handleLogout,
  isCollapsed, // ✅ Receive from parent
  setIsCollapsed // ✅ Receive from parent
}) => {
  const [darkMode, setDarkMode] = useState(false);

  const getDisplayInitial = () => {
    if (!currentUser) return 'U';

    if (currentUser.name && currentUser.name.trim() !== '') {
      return currentUser.name.charAt(0).toUpperCase();
    }

    if (currentUser.email && currentUser.email.trim() !== '') {
      return currentUser.email.charAt(0).toUpperCase();
    }

    return 'U';
  };

  const toggleSidebarMode = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    // Save preference to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load sidebar preference on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, [setIsCollapsed]);

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>

        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-900">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-between px-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-white" />
                </div>
                {!isCollapsed && (
                  <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">TaskFlow</span>
                )}
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
            <nav className="mt-8 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    item.onClick();
                    setSidebarOpen(false); 
                  }} 
                  className={`group flex items-center justify-between w-full px-3 py-3 text-base font-medium rounded-xl transition-all duration-200 ${
                    item.current
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white hover:border-l-4 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-4 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{getDisplayInitial()}</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">{currentUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center transition-colors duration-200"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Logo and Toggle Button */}
          <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            {!isCollapsed ? (
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">TaskFlow</span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
            
            <button
              onClick={toggleSidebarMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`group flex items-center justify-between w-full px-3 py-3 rounded-xl transition-all duration-200 ${
                    item.current
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <div className="flex items-center">
                    <item.icon className={`flex-shrink-0 h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && item.name}
                  </div>
                  
                  {!isCollapsed && item.badge > 0 && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* User Profile & Settings */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{getDisplayInitial()}</span>
                </div>
              </div>
              
              {!isCollapsed && (
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLogout}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Sign out
                      </button>
                    </div>
                    
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Toggle Button (for collapsed state) */}
        {isCollapsed && (
          <div className="lg:hidden absolute top-4 left-4 z-50">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>     
    </>
  );
};

export default Sidebar;