import React, { useState, useMemo, type JSX } from 'react';
import {
    Search,
    Edit,
    Trash2,
    Plus,
    Users,
    ChevronDown,
    ChevronUp,
    Filter,
    Shield,
    Mail,
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
    currentUser: UserType;
}

const TeamPage: React.FC<TeamPageProps> = ({
    users,
    tasks,
    onEditUser,
    onDeleteUser,
    onAddUser,
    isOverdue,
    currentUser
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showTotalUsers, setShowTotalUsers] = useState(false);
    const [showAdminsOnly, setShowAdminsOnly] = useState(false);

    const getSafeUser = (user: UserType) => ({
        id: user?.id || 'unknown',
        name: user?.name || 'Unknown',
        email: user?.email || '',
        role: user?.role || 'user',
        phone: user?.phone || ''
    });

    const isCurrentUserAdmin = useMemo(() => {
        return currentUser?.role === 'admin';
    }, [currentUser]);

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

    const getTasksCreatedByUser = useMemo(() => {
        return (userId: string) => {
            return tasks.filter(task => {
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

    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const safeUser = getSafeUser(user);

            if (filterRole !== 'all' && safeUser.role !== filterRole) return false;
            if (showAdminsOnly && safeUser.role !== 'admin') return false;

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
    }, [users, searchTerm, filterRole, sortBy, sortOrder, showAdminsOnly, getSafeUser, getTasksForUser]);

    const getUserStats = (userId: string) => {
        const userTasks = getTasksForUser(userId);
        const createdTasks = getTasksCreatedByUser(userId);

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const overdueTasks = userTasks.filter(t => isOverdue(t.dueDate, t.status)).length;
        const tasksCreated = createdTasks.length;

        return {
            totalTasks,
            completedTasks,
            overdueTasks,
            tasksCreated,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-purple-50 text-purple-700 border border-purple-200';
            case 'manager':
                return 'bg-blue-50 text-blue-700 border border-blue-200';
            case 'developer':
                return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            case 'designer':
                return 'bg-pink-50 text-pink-700 border border-pink-200';
            default:
                return 'bg-gray-50 text-gray-700 border border-gray-200';
        }
    };

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
    const handleTotalUsersClick = () => {
        setShowTotalUsers(true);
        setShowAdminsOnly(false);
        setFilterRole('all');
    };

    const handleAdminsClick = () => {
        setShowAdminsOnly(true);
        setShowTotalUsers(false);
        setFilterRole('admin');
    };

    const clearAllFilters = () => {
        setShowTotalUsers(false);
        setShowAdminsOnly(false);
        setFilterRole('all');
    };

    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const getUserAvatar = (user: UserType): JSX.Element => {
        const safeUser = getSafeUser(user);
        const initials = getUserInitials(safeUser.name);

        return (
            <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white font-semibold text-lg">
                    {initials}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Team Members
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage and organize your team effectively
                            </p>
                        </div>
                    </div>
                </div>
                {isCurrentUserAdmin && (
                    <div className="mt-4 md:mt-0">
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
                            onClick={onAddUser}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Member
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                    className={`bg-white rounded-xl border ${showTotalUsers ? 'border-blue-300 shadow-sm' : 'border-gray-200'} p-5 cursor-pointer transition-all hover:border-gray-300 hover:shadow-sm`}
                    onClick={handleTotalUsersClick}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Total Members</p>
                            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-white rounded-xl border ${showAdminsOnly ? 'border-purple-300 shadow-sm' : 'border-gray-200'} p-5 cursor-pointer transition-all hover:border-gray-300 hover:shadow-sm`}
                    onClick={handleAdminsClick}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Administrators</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter(u => u.role === 'admin').length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Shield className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Status */}
            {(showTotalUsers || showAdminsOnly) && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${showTotalUsers ? 'bg-blue-500' : 'bg-purple-500'}`} />
                            <span className="text-sm font-medium text-gray-800">
                                {showTotalUsers && "Showing all team members"}
                                {showAdminsOnly && "Showing administrators only"}
                            </span>
                        </div>
                        <button
                            onClick={clearAllFilters}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Clear filter
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 max-w-lg">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="search"
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Search members by name, email or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <select
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={filterRole}
                                onChange={(e) => {
                                    setFilterRole(e.target.value);
                                    if (e.target.value === 'admin') {
                                        setShowAdminsOnly(true);
                                        setShowTotalUsers(false);
                                    } else if (e.target.value === 'all') {
                                        setShowAdminsOnly(false);
                                        setShowTotalUsers(false);
                                    }
                                }}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="developer">Developer</option>
                                <option value="designer">Designer</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <select
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="role">Sort by Role</option>
                                <option value="tasks">Sort by Tasks</option>
                            </select>

                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="h-10 w-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                            >
                                {sortOrder === 'asc' ? (
                                    <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="h-20 w-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">No members found</p>
                        <p className="text-gray-500 max-w-md mx-auto text-sm">
                            {searchTerm || filterRole !== 'all' || showAdminsOnly
                                ? 'Try adjusting your search or filter criteria'
                                : 'Start by adding your first team member'}
                        </p>
                        {/* // *** IMPORTANT *** // The Add Team Member button logic was here and has been moved outside the grid conditional block below
                */}
                    </div>
                ) : (
                    filteredAndSortedUsers.map((user) => {
                        const safeUser = getSafeUser(user);
                        const userStats = getUserStats(safeUser.id);
                      

                        return (
                            <div
                                key={safeUser.id}
                                className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 shadow-md border-gray-300 `}
                            >
                                {/* User Card Header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-4">
                                            {getUserAvatar(user)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 truncate">
                                                            {safeUser.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                                            <Mail className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                                            <span className="truncate">{safeUser.email}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-3 space-x-2">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-lg ${getRoleBadgeColor(safeUser.role)}`}>
                                                        {safeUser.role}
                                                    </span>
                                                    {userStats.completionRate > 0 && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                                            {userStats.completionRate}% completion
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Stats */}
                                    <div className="grid grid-cols-2 gap-3 mt-5">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-gray-600 mb-1">Total Tasks</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.totalTasks}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-gray-600 mb-1">Completed</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.completedTasks}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-5">
                                        <button
                                            onClick={() => onEditUser(user)}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                        >
                                            <Edit className="h-4 w-4 inline mr-2" />
                                            Edit
                                        </button>
                                        {isCurrentUserAdmin && (
                                            <button
                                                onClick={() => handleDeleteClick(safeUser.id)}
                                                disabled={deletingUserId === safeUser.id}
                                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingUserId === safeUser.id ? (
                                                    <>
                                                        <span className="animate-spin h-4 w-4 inline mr-2">⏳</span>
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4 inline mr-2" />
                                                        Remove
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {isCurrentUserAdmin && (
                <div className="mt-6 flex justify-start">
                    <button
                        onClick={onAddUser}
                        className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team Member
                    </button>
                </div>
            )}


            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="h-12 w-12 mx-auto mb-4 bg-red-50 rounded-lg flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Remove Team Member</h3>
                            <p className="text-gray-600 text-center mb-6 text-sm">
                                This action cannot be undone. All assigned tasks will be removed.
                            </p>

                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                    disabled={!!deletingUserId}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={!!deletingUserId}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                                >
                                    {deletingUserId ? 'Removing...' : 'Remove User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamPage;