import React from 'react';
import {
    User,
    Mail,
    Calendar,
    CheckCircle,
} from 'lucide-react';

import type { UserType } from '../Types/Types';

interface UserProfilePageProps {
    user?: UserType; // The profile being viewed
    formatDate?: (dateString: string) => string;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user = {} as UserType,
    formatDate = (d) => d,
}) => {
    if (!user || Object.keys(user).length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
                    <p className="text-gray-600 mt-2">Please select a user to view their profile.</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Main Container */}
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                <User className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                    {user.name}'s Profile
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    View user profile information and activity
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Profile Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Profile Information */}
                    <div className="lg:col-span-8">
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 md:p-8">
                                {/* User Header */}
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {/* Basic Info */}
                                    <div className="flex-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                            {user.name}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-3">

                                            <span className="text-gray-600 flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Member since {formatDate(user.joinDate || new Date().toISOString())}
                                            </span>
                                        </div>
                                        {user.department && (
                                            <div className="mt-3">
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
                                                    {user.department}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                        Contact Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                                <Mail className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                                                <p className="font-medium text-gray-900 break-all">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Quick Stats Card */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <User className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-semibold">Profile Overview</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-blue-100 text-sm mb-1">Full Name</p>
                                    <p className="font-medium truncate">{user.name}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm mb-1">Email</p>
                                    <p className="font-medium truncate">{user.email}</p>
                                </div>
                                {user.department && (
                                    <div>
                                        <p className="text-blue-100 text-sm mb-1">Department</p>
                                        <p className="font-medium">{user.department}</p>
                                    </div>
                                )}
                                {user.position && (
                                    <div>
                                        <p className="text-blue-100 text-sm mb-1">Position</p>
                                        <p className="font-medium">{user.position}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-blue-400">
                                <p className="text-sm text-blue-100">
                                    This profile information is read-only.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;