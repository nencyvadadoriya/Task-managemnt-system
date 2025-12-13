import React, { useState, useMemo, type JSX } from 'react';
import {
    Search,
    Edit,
    Trash2,
    Users,
    ChevronDown,
    ChevronUp,
    Filter,
    Shield,
    Mail,
    PlusCircle,
    Save,
    X,
    Eye,
    EyeOff
} from 'lucide-react';

import type { Task, UserType } from '../Types/Types';
import toast from 'react-hot-toast';

interface TeamPageProps {
    users: UserType[];
    tasks: Task[];
    onDeleteUser: (userId: string) => Promise<void>;
    onAddUser: (newUser: Partial<UserType>) => Promise<void>;
    onUpdateUser: (userId: string, updatedUser: Partial<UserType>) => Promise<void>;
    isOverdue: (dueDate: string, status: string) => boolean;
    currentUser: UserType;
}

const TeamPage: React.FC<TeamPageProps> = ({
    users,
    tasks,
    onDeleteUser,
    onAddUser,
    onUpdateUser,
    isOverdue,
    currentUser,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [newUser, setNewUser] = useState<{
        name: string;
        email: string;
        role: string;
        password: string;
    }>({
        name: '',
        email: '',
        role: 'user',
        password: ''
    });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showTotalUsers, setShowTotalUsers] = useState(false);
    const [showAdminsOnly, setShowAdminsOnly] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
            default:
                return 'bg-gray-50 text-gray-700 border border-gray-200';
        }
    };

    // ✅ Delete User Functions
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

    // ✅ Edit User Functions
    const handleEditClick = (user: UserType) => {
        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setSavingUserId(editingUser.id);
        try {
            await onUpdateUser(editingUser.id, editingUser);
            toast.success('User updated successfully');
            setShowEditModal(false);
            setEditingUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        } finally {
            setSavingUserId(null);
        }
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingUser(null);
    };

    // ✅ Add User Functions - UPDATED FOR BACKEND
    const handleAddClick = () => {
        setNewUser({
            name: '',
            email: '',
            role: 'user',
            password: ''
        });
        setShowPassword(false);
        setShowAddModal(true);
    };

    const handleSaveNewUser = async () => {
        // ✅ Backend requirements: name, email, password, role
        if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        // ✅ Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        // ✅ Password strength check
        if (newUser.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setAddingUser(true);
        try {
            // ✅ Prepare data according to backend requirements
            const userData = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: newUser.role || 'user'
            };

            await onAddUser(userData);
            toast.success('User added successfully');
            setShowAddModal(false);
            setNewUser({
                name: '',
                email: '',
                role: 'user',
                password: ''
            });
            setShowPassword(false);
        } catch (error) {
            console.error('Error adding user:', error);
            toast.error('Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddModal(false);
        setNewUser({
            name: '',
            email: '',
            role: 'user',
            password: ''
        });
        setShowPassword(false);
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
                            onClick={handleAddClick}
                            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New User
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
                                        {isCurrentUserAdmin && (
                                            <>
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="flex-1 bg-white rounded-lg border border-gray-200 p-2 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-center group"
                                                >
                                                    <div className="h-7 w-7 bg-blue-50 rounded-lg flex items-center justify-center mr-2 group-hover:bg-blue-100 transition-colors">
                                                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-700 group-hover:text-blue-700">Edit</div>
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteClick(user.id)}
                                                    className="flex-1 bg-white rounded-lg border border-gray-200 p-2 hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-center group"
                                                >
                                                    <div className="h-7 w-7 bg-red-50 rounded-lg flex items-center justify-center mr-2 group-hover:bg-red-100 transition-colors">
                                                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-700 group-hover:text-red-700">Delete</div>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ✅ Delete Confirmation Modal - Updated Background */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Light White Blur Background */}
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>

                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
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

            {/* ✅ Edit User Modal - Updated Background */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Light White Blur Background */}
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>

                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                                <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.name || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter user name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={editingUser.email || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={editingUser.role || 'user'}
                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={!!savingUserId}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!!savingUserId}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {savingUserId ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Add User Modal - Updated Background */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Light White Blur Background */}
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>

                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                                <button
                                    onClick={handleCancelAdd}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter user name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                                            placeholder="Enter password (min 6 characters)"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Password must be at least 6 characters long
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={handleCancelAdd}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={addingUser}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNewUser}
                                    disabled={addingUser}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    {addingUser ? 'Adding...' : 'Add User'}
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