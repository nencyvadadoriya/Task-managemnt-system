import React, { useState, useMemo, type JSX } from 'react';
import {
    Search,
    Edit,
    Trash2,
    Plus,
    User,
    Users,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Clock,
    AlertCircle,
    Filter,
    Shield,
    Mail,
    MoreVertical,
} from 'lucide-react';

import type { Task, UserType } from '../Types/Types';
import toast from 'react-hot-toast';

interface TeamPageProps {
    users: UserType[];
    tasks: Task[];
    onEditUser: (user: UserType) => void;
    onDeleteUser: (userId: string) => Promise<void>;
    onAddUser: () => void;
    getAssignedByInfo: (task: Task) => { name: string; email: string };
    formatDate: (dateString: string) => string;
    isOverdue: (dueDate: string, status: string) => boolean;
}

const TeamPage: React.FC<TeamPageProps> = ({
    users,
    tasks,
    onEditUser,
    onDeleteUser,
    onAddUser,
    getAssignedByInfo,
    formatDate,
    isOverdue
}) => {

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // ✅ FIXED: Safe user with fallback values
    const getSafeUser = (user: UserType) => ({
        id: user?.id || 'unknown',
        name: user?.name || 'Unknown User',
        email: user?.email || 'unknown@example.com',
        role: user?.role || 'user',
        phone: user?.phone || 'Not provided'
    });

    // ✅ FIXED: Get tasks assigned to user
    const getTasksForUser = useMemo(() => {
        return (userId: string) => {
            return tasks.filter(task => {
                if (typeof task.assignedTo === 'string') {
                    return task.assignedTo === userId;
                }
                if (task.assignedToUser && task.assignedToUser.id) {
                    return task.assignedToUser.id === userId;
                }
                return false;
            });
        };
    }, [tasks]);

    // ✅ FIXED: Get tasks created by user
    const getTasksCreatedByUser = useMemo(() => {
        return (userId: string) => {
            return tasks.filter(task => {
                // assignedBy can be string | UserType
                if (typeof task.assignedBy === 'string') {
                    return task.assignedBy === userId;
                }

                if (task.assignedBy && typeof task.assignedBy === 'object' && 'id' in task.assignedBy) {
                    return task.assignedBy.id === userId;
                }

                return false;
            });
        };
    }, [tasks]);

    // ✅ FIXED: Filter and sort users
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const safeUser = getSafeUser(user);

            if (filterRole !== 'all' && safeUser.role !== filterRole) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    safeUser.name.toLowerCase().includes(term) ||
                    safeUser.email.toLowerCase().includes(term) ||
                    safeUser.role.toLowerCase().includes(term)
                );
            }

            return true;
        });

        filtered.sort((a, b) => {
            const userA = getSafeUser(a);
            const userB = getSafeUser(b);

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = userA.name.localeCompare(userB.name);
                    break;
                case 'role':
                    comparison = userA.role.localeCompare(userB.role);
                    break;
                case 'tasks':
                    const tasksA = getTasksForUser(userA.id).length;
                    const tasksB = getTasksForUser(userB.id).length;
                    comparison = tasksA - tasksB;
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [users, searchTerm, filterRole, sortBy, sortOrder, getSafeUser, getTasksForUser]);

    // ✅ FIXED: Get user stats
    const getUserStats = (userId: string) => {
        const userTasks = getTasksForUser(userId);
        const createdTasks = getTasksCreatedByUser(userId);

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = userTasks.filter(t => t.status !== 'completed').length;
        const overdueTasks = userTasks.filter(t => isOverdue(t.dueDate, t.status)).length;
        const tasksCreated = createdTasks.length;

        return {
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            tasksCreated,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    };

    // ✅ FIXED: Get role badge color
    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'developer':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'designer':
                return 'bg-pink-100 text-pink-800 border-pink-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // ✅ FIXED: Handle delete user
    const handleDeleteClick = (userId: string) => {
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        setDeletingUserId(userToDelete);
        try {
            await onDeleteUser(userToDelete);
            toast.success('User deleted successfully');
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    // ✅ FIXED: Toggle user details
    const toggleUserDetails = (userId: string) => {
        setExpandedUserId(expandedUserId === userId ? null : userId);
    };

    // ✅ FIXED: Get user initials
    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    // ✅ FIXED: Get user avatar (initials only, no image)
    const getUserAvatar = (user: UserType): JSX.Element => {
        const safeUser = getSafeUser(user);
        const initials = getUserInitials(safeUser.name);

        return (
            <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow">
                    {initials}
                </div>
            </div>
        );
    };

    // ✅ FIXED: Get user tasks for display
    const getUserTaskCards = (userId: string) => {
        const userTasks = getTasksForUser(userId);

        if (userTasks.length === 0) {
            return (
                <div className="text-center py-4 text-gray-500 text-sm">
                    No tasks assigned to this user
                </div>
            );
        }

        return userTasks.slice(0, 5).map(task => {
            const assignedByInfo = getAssignedByInfo(task);
            const isTaskOverdue = isOverdue(task.dueDate, task.status);

            return (
                <div
                    key={task.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                                {task.title || 'Untitled Task'}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                                {task.description || 'No description'}
                            </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ml-2 ${task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {task.status.replace('-', ' ')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="text-xs">
                            <div className="text-gray-500">Due Date</div>
                            <div className={`font-medium ${isTaskOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatDate(task.dueDate)}
                            </div>
                        </div>
                        <div className="text-xs">
                            <div className="text-gray-500">Priority</div>
                            <div className={`font-medium ${task.priority === 'high' ? 'text-red-600'
                                : task.priority === 'medium' ? 'text-yellow-600'
                                    : 'text-green-600'
                                }`}>
                                {task.priority}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>Assigned by: {assignedByInfo.name}</span>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // ✅ FIXED: Main render
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Team Management
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage your team members and their tasks
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onAddUser}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team Member
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Team Members</p>
                            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Active Tasks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tasks.filter(t => t.status !== 'completed').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Shield className="h-8 w-8 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Admins</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter(u => u.role === 'admin').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Overdue Tasks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tasks.filter(t => isOverdue(t.dueDate, t.status)).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="search"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Search team members by name, email or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <select
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="developer">Developer</option>
                                <option value="designer">Designer</option>
                                <option value="user">User</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <select
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="role">Sort by Role</option>
                                <option value="tasks">Sort by Tasks</option>
                            </select>

                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                            >
                                {sortOrder === 'asc' ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Grid View"
                            >
                                <div className="grid grid-cols-2 gap-0.5">
                                    <div className="h-1.5 w-1.5 bg-current"></div>
                                    <div className="h-1.5 w-1.5 bg-current"></div>
                                    <div className="h-1.5 w-1.5 bg-current"></div>
                                    <div className="h-1.5 w-1.5 bg-current"></div>
                                </div>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                title="List View"
                            >
                                <div className="flex flex-col space-y-0.5">
                                    <div className="h-1.5 w-4 bg-current"></div>
                                    <div className="h-1.5 w-4 bg-current"></div>
                                    <div className="h-1.5 w-4 bg-current"></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Grid/List */}
            <div className={viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
                {filteredAndSortedUsers.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-900 mb-1">No team members found</p>
                        <p className="text-gray-500">
                            {searchTerm
                                ? 'Try adjusting your search or filters'
                                : 'Add your first team member to get started'}
                        </p>
                    </div>
                ) : (
                    filteredAndSortedUsers.map((user) => {
                        const safeUser = getSafeUser(user);
                        const userStats = getUserStats(safeUser.id);
                        const isExpanded = expandedUserId === safeUser.id;

                        return (
                            <div
                                key={safeUser.id}
                                className={`bg-white rounded-lg shadow ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'} transition-all duration-200 overflow-hidden`}
                            >
                                {/* User Card Header */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            {getUserAvatar(user)}
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {safeUser.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 flex items-center">
                                                    <Mail className="h-3 w-3 mr-1" />
                                                    {safeUser.email}
                                                </p>
                                                <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(safeUser.role)}`}>
                                                    {safeUser.role}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => toggleUserDetails(safeUser.id)}
                                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5" />
                                                )}
                                            </button>

                                            <div className="relative">
                                                <button
                                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // You can add dropdown menu here
                                                    }}
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Stats */}
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-gray-50 rounded p-2">
                                            <div className="text-xs text-gray-500">Assigned Tasks</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.totalTasks}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-2">
                                            <div className="text-xs text-gray-500">Completion Rate</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.completionRate}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200">
                                        <div className="p-4">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="text-center">
                                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2 ${userStats.completedTasks > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                        <CheckCircle className={`h-6 w-6 ${userStats.completedTasks > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {userStats.completedTasks}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Completed</div>
                                                </div>

                                                <div className="text-center">
                                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2 ${userStats.overdueTasks > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                                                        <AlertCircle className={`h-6 w-6 ${userStats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {userStats.overdueTasks}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Overdue</div>
                                                </div>
                                            </div>

                                            {/* Recent Tasks */}
                                            <div>
                                                <h4 className="font-medium text-gray-900 mb-2">Recent Tasks</h4>
                                                <div className="space-y-2">
                                                    {getUserTaskCards(safeUser.id)}
                                                </div>

                                                {userStats.totalTasks > 5 && (
                                                    <div className="mt-3 text-center">
                                                        <button className="text-sm text-blue-600 hover:text-blue-800">
                                                            View all {userStats.totalTasks} tasks →
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => onEditUser(user)}
                                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    <Edit className="h-3 w-3 inline mr-1" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(safeUser.id)}
                                                    disabled={deletingUserId === safeUser.id}

                                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    {deletingUserId === safeUser.id ? (
                                                        <>
                                                            <span className="animate-spin h-3 w-3 inline mr-1">⏳</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="h-3 w-3 inline mr-1" />
                                                            Delete
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>

                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            <p className="text-sm text-red-800">
                                <strong>Warning:</strong> All tasks assigned to this user will also be removed.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancelDelete}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={!!deletingUserId}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={!!deletingUserId}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {deletingUserId ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamPage;