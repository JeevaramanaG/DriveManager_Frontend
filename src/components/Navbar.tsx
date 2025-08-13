import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, HardDrive, User, Shield } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <HardDrive className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DriveManager</h1>
              <p className="text-xs text-gray-500">Drive Monitoring System</p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-1">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4 text-gray-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user?.username}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isAdmin 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;