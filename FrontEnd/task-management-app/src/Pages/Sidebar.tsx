// components/Sidebar.tsx
import React from 'react';
import { X, LogOut } from 'lucide-react';
import type { NavigationItem, UserType } from '../Types/Types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navigation: NavigationItem[];
  currentUser: UserType;
  handleLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  navigation,
  currentUser,
  handleLogout
}) => {
  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>

        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{currentUser.avatar}</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">TaskFlow</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    item.onClick();
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between w-full px-2 py-2 text-base font-medium rounded-md transition-colors duration-200 ${item.current
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-4 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{currentUser.avatar}</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-base font-medium text-gray-700">{currentUser.name}</p>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
                <button
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center mt-1 transition-colors duration-200"
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

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">TaskFlow</span>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${item.current
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
                <button
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center mt-1 transition-colors duration-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;