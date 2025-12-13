import React, { useState, useMemo } from 'react';
import { 
    User, 
    Mail, 
    Phone, 
    Briefcase, 
    Calendar, 
    Clock, 
    Edit, 
    Save, 
    X, 
    Shield,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    FileText,
    Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';

interface UserProfilePageProps {
    user: UserType;
    tasks: Task[];
    onUpdateProfile: (updatedData: Partial<UserType>) => Promise<void>;
    formatDate: (dateString: string) => string;
    isOverdue: (dueDate: string, status: string) => boolean;
    isSidebarCollapsed?: boolean;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user,
    tasks,
    onUpdateProfile,
    formatDate,
    isOverdue,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState<UserType>({ ...user });
    const [isSaving, setIsSaving] = useState(false);

    // Calculate user stats
    const userStats = useMemo(() => {
        const userTasks = tasks.filter(task => 
            task.assignedTo === user.email || task.assignedBy === user.email
        );

        const assignedTasks = tasks.filter(task => task.assignedTo === user.email);
        const createdTasks = tasks.filter(task => task.assignedBy === user.email);

        return {
            totalTasks: userTasks.length,
            assignedTasks: assignedTasks.length,
            createdTasks: createdTasks.length,
            completedTasks: assignedTasks.filter(t => t.status === 'completed').length,
            pendingTasks: assignedTasks.filter(t => t.status !== 'completed').length,
            overdueTasks: assignedTasks.filter(t => isOverdue(t.dueDate, t.status)).length,
            efficiency: assignedTasks.length > 0 
                ? Math.round((assignedTasks.filter(t => t.status === 'completed').length / assignedTasks.length) * 100)
                : 0,
        };
    }, [tasks, user.email, isOverdue]);

    // Recent activity
    const recentActivity = useMemo(() => {
        const userTasks = tasks.filter(task => 
            task.assignedTo === user.email || task.assignedBy === user.email
        );

        return userTasks
            .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            .slice(0, 5);
    }, [tasks, user.email]);

    const handleSave = async () => {
        if (!editedUser.name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (!editedUser.email.trim()) {
            toast.error('Email is required');
            return;
        }

        setIsSaving(true);
        try {
            await onUpdateProfile(editedUser);
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedUser({ ...user });
        setIsEditing(false);
    };

    const getRoleColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin': return 'bg-red-100 text-red-800';
            case 'manager': return 'bg-purple-100 text-purple-800';
            case 'developer': return 'bg-blue-100 text-blue-800';
            case 'designer': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                            <User className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            My Profile
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        Manage your personal information and track your activity
                    </p>
                </div>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm ${isEditing
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                        }`}
                >
                    {isEditing ? (
                        <>
                            <X className="mr-2 h-4 w-4" />
                            Cancel Editing
                        </>
                    ) : (
                        <>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Profile Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    {!isEditing && (
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={editedUser.name}
                                                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={editedUser.email}
                                                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editedUser.phone || ''}
                                                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                                                    placeholder="+91 9876543210"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    Department
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editedUser.department || ''}
                                                    onChange={(e) => setEditedUser({ ...editedUser, department: e.target.value })}
                                                    placeholder="Engineering"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    Position
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editedUser.position || ''}
                                                    onChange={(e) => setEditedUser({ ...editedUser, position: e.target.value })}
                                                    placeholder="Software Engineer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                                    Role
                                                </label>
                                                <div className="px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Role cannot be changed from profile
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={handleCancel}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className={`px-4 py-2 text-sm font-medium text-white rounded-xl ${isSaving
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                                    }`}
                                            >
                                                {isSaving ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                        Saving...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Save className="h-4 w-4" />
                                                        Save Changes
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(user.role)}`}>
                                                        <Shield className="inline h-3 w-3 mr-1" />
                                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        Member since {formatDate(user.joinDate || new Date().toISOString())}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <Mail className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Email</p>
                                                    <p className="font-medium text-gray-900">{user.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Phone</p>
                                                    <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Department</p>
                                                    <p className="font-medium text-gray-900">{user.department || 'Not specified'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Position</p>
                                                    <p className="font-medium text-gray-900">{user.position || 'Not specified'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-5 w-5 text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-500">Last Login</p>
                                                    <p className="font-medium text-gray-900">
                                                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never logged in'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                    <Clock className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                            </div>
                            <span className="text-sm text-gray-500">{recentActivity.length} tasks</span>
                        </div>

                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="p-4 bg-gray-50 rounded-2xl inline-flex mb-4">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">No recent activity found</p>
                                </div>
                            ) : (
                                recentActivity.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {task.title}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {task.status}
                                                </span>
                                                {task.companyName && (
                                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                        <Building className="inline h-3 w-3 mr-1" />
                                                        {task.companyName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {task.assignedTo === user.email ? 'Assigned to you' : 'Created by you'} • 
                                                Last updated {formatDate(task.updatedAt || task.createdAt)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-medium ${isOverdue(task.dueDate, task.status) ? 'text-rose-600' : 'text-gray-900'}`}>
                                                Due: {formatDate(task.dueDate)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {isOverdue(task.dueDate, task.status) ? 'Overdue' : 'On track'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Stats */}
                <div className="space-y-8">
                    {/* Performance Stats */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">Task Efficiency</span>
                                    <span className="text-lg font-bold text-gray-900">{userStats.efficiency}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                                        style={{ width: `${userStats.efficiency}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-600 mb-1">{userStats.completedTasks}</div>
                                    <div className="text-sm text-blue-700">Completed</div>
                                </div>
                                <div className="text-center p-4 bg-amber-50 rounded-xl">
                                    <div className="text-2xl font-bold text-amber-600 mb-1">{userStats.pendingTasks}</div>
                                    <div className="text-sm text-amber-700">Pending</div>
                                </div>
                                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                                    <div className="text-2xl font-bold text-emerald-600 mb-1">{userStats.createdTasks}</div>
                                    <div className="text-sm text-emerald-700">Created</div>
                                </div>
                                <div className="text-center p-4 bg-rose-50 rounded-xl">
                                    <div className="text-2xl font-bold text-rose-600 mb-1">{userStats.overdueTasks}</div>
                                    <div className="text-sm text-rose-700">Overdue</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Task Breakdown */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Task Breakdown</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">Total Tasks</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">{userStats.totalTasks}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">Assigned to Me</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">{userStats.assignedTasks}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">Created by Me</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900">{userStats.createdTasks}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Shield className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold">Account Status</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-blue-100">Member Since</span>
                                <span className="font-medium">{formatDate(user.joinDate || new Date().toISOString())}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-blue-100">Account Type</span>
                                <span className="font-medium">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-blue-100">Active Status</span>
                                <span className="inline-flex items-center">
                                    <div className="h-2 w-2 bg-emerald-300 rounded-full mr-2"></div>
                                    Active
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-blue-400">
                            <p className="text-sm text-blue-100">
                                Your profile information is visible only to you and administrators.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;