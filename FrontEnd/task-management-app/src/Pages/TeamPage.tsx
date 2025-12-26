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
    EyeOff,
    UserCog,
    User,
    AlertCircle,
    Briefcase,
} from 'lucide-react';

import type { Task, UserType } from '../Types/Types';
import toast from 'react-hot-toast';

interface TeamPageProps {
    users?: UserType[];
    tasks?: Task[];
    onDeleteUser?: (userId: string) => Promise<void>;
    onAddUser?: (newUser: Partial<UserType>) => Promise<void>;
    onUpdateUser?: (userId: string, updatedUser: Partial<UserType>) => Promise<void>;
    isOverdue?: (dueDate: string, status: string) => boolean;
    currentUser?: UserType;
}

const TeamPage: React.FC<TeamPageProps> = ({
    users = [],
    tasks = [],
    onDeleteUser,
    onAddUser,
    onUpdateUser,
    isOverdue = () => false,
    currentUser = {} as UserType,
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
        department: string;
        position: string;
        phone: string;
    }>({
        name: '',
        email: '',
        role: 'user',
        password: '',
        department: '',
        position: '',
        phone: ''
    });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks' | 'completion'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showPassword, setShowPassword] = useState(false);

    // Check if current user is admin
    const isCurrentUserAdmin = useMemo(() => {
        return currentUser?.role === 'admin';
    }, [currentUser]);

    // Calculate tasks for each user
    const getTasksForUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
            return tasks.filter(task => {
                // Check if assigned to this user by ID or email
                if (task.assignedTo === userId || task.assignedTo === userEmail) {
                    return true;
                }
                // Check if assigned by user object
                if (task.assignedToUser && task.assignedToUser.id === userId) {
                    return true;
                }
                return false;
            });
        };
    }, [tasks]);

    const getTasksCreatedByUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
            return tasks.filter(task => {
                // Check if created by this user by ID or email
                if (task.assignedBy === userId || task.assignedBy === userEmail) {
                    return true;
                }
                // Check if created by user object
                if (task.assignedBy && typeof task.assignedBy === 'object' && 'id' in task.assignedBy) {
                    return (task.assignedBy as any).id === userId;
                }
                return false;
            });
        };
    }, [tasks]);

    // Get dynamic user stats
    const getUserStats = useMemo(() => {
        return (userId: string, userEmail: string) => {
            const assignedTasks = getTasksForUser(userId, userEmail);
            const createdTasks = getTasksCreatedByUser(userId, userEmail);

            const totalAssigned = assignedTasks.length;
            const completed = assignedTasks.filter(t => t.status === 'completed').length;
            const pending = assignedTasks.filter(t =>
                t.status === 'pending' || t.status === 'in-progress'
            ).length;
            const overdue = assignedTasks.filter(t => isOverdue(t.dueDate, t.status)).length;

            return {
                totalAssigned,
                completed,
                pending,
                overdue,
                completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
                tasksCreated: createdTasks.length
            };
        };
    }, [getTasksForUser, getTasksCreatedByUser, isOverdue]);

    // Filter and sort users
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter(user => {
            // If not admin, only show their own profile
            if (!isCurrentUserAdmin && user.id !== currentUser.id) {
                return false;
            }

            // Role filter
            if (filterRole !== 'all' && user.role !== filterRole) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    user.name?.toLowerCase().includes(term) ||
                    user.email?.toLowerCase().includes(term) ||
                    user.role?.toLowerCase().includes(term) ||
                    user.department?.toLowerCase().includes(term) ||
                    user.position?.toLowerCase().includes(term)
                );
            }

            return true;
        });

        // Sort users
        filtered.sort((a, b) => {
            const statsA = getUserStats(a.id, a.email);
            const statsB = getUserStats(b.id, b.email);

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'role':
                    comparison = (a.role || '').localeCompare(b.role || '');
                    break;
                case 'tasks':
                    comparison = statsA.totalAssigned - statsB.totalAssigned;
                    break;
                case 'completion':
                    comparison = statsA.completionRate - statsB.completionRate;
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [users, searchTerm, filterRole, sortBy, sortOrder, isCurrentUserAdmin, currentUser, getUserStats]);

    // Role badge colors
    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'manager':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'developer':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'designer':
                return 'bg-pink-100 text-pink-800 border border-pink-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    // Get role icon
    const getRoleIcon = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return <Shield className="h-3.5 w-3.5" />;
            case 'manager':
                return <UserCog className="h-3.5 w-3.5" />;
            case 'developer':
                return <Briefcase className="h-3.5 w-3.5" />;
            case 'designer':
                return <User className="h-3.5 w-3.5" />;
            default:
                return <User className="h-3.5 w-3.5" />;
        }
    };

    // Delete user function
    const handleDeleteClick = (userId: string) => {
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can delete users');
            return;
        }
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        setDeletingUserId(userToDelete);
        try {
            if (onDeleteUser) {
                await onDeleteUser(userToDelete);
            }
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

    // Edit user function
    const handleEditClick = (user: UserType) => {
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can edit users');
            return;
        }
        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setSavingUserId(editingUser.id);
        try {
            if (onUpdateUser) {
                await onUpdateUser(editingUser.id, editingUser);
            }
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

    // Add user function
    const handleAddClick = () => {
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can add new users');
            return;
        }
        setNewUser({
            name: '',
            email: '',
            role: 'user',
            password: '',
            department: '',
            position: '',
            phone: ''
        });
        setShowPassword(false);
        setShowAddModal(true);
    };

    const handleSaveNewUser = async () => {
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can add new users');
            return;
        }

        // Validation
        if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (newUser.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setAddingUser(true);
        try {
            const userData = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: newUser.role,
                department: newUser.department || '',
                position: newUser.position || '',
                phone: newUser.phone || ''
            };
            if (onAddUser) {
                await onAddUser(userData);
            }
            toast.success('User added successfully');
            setShowAddModal(false);
            setNewUser({
                name: '',
                email: '',
                role: 'user',
                password: '',
                department: '',
                position: '',
                phone: ''
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
            password: '',
            department: '',
            position: '',
            phone: ''
        });
        setShowPassword(false);
    };

    // Get user initials for avatar
    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const getUserAvatar = (user: UserType): JSX.Element => {
        const initials = getUserInitials(user.name);

        // Get gradient based on role
        let gradient = 'from-gray-600 to-gray-800';
        switch (user.role?.toLowerCase()) {
            case 'admin':
                gradient = 'from-purple-600 to-purple-800';
                break;
            case 'manager':
                gradient = 'from-blue-600 to-blue-800';
                break;
            case 'developer':
                gradient = 'from-green-600 to-green-800';
                break;
            case 'designer':
                gradient = 'from-pink-600 to-pink-800';
                break;
        }

        return (
            <div className="flex-shrink-0">
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg`}>
                    {initials}
                </div>
            </div>
        );
    };

    // If not admin, show limited view message
    if (!isCurrentUserAdmin) {
        return (
            <div className="space-y-8">
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h1>
                                <p className="mt-1 text-sm text-gray-500">This page is available to administrators only</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="max-w-xl">
                        <div className="text-lg font-semibold text-gray-900">Access denied</div>
                        <div className="mt-2 text-sm text-gray-600">
                            Your account does not have permission to view team members.
                        </div>
                        <div className="mt-4 text-sm text-gray-600">
                            If you believe this is a mistake, contact an administrator.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // For Admin: Show all users
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Team Management
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage all team members and their tasks
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 md:mt-0">
                    <button
                        onClick={handleAddClick}
                        className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Member
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
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

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Admins</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {users.filter(u => u.role === 'admin').length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Shield className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Active Tasks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tasks.filter(t => t.status !== 'completed').length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Overdue Tasks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tasks.filter(t => isOverdue(t.dueDate, t.status)).length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-red-50 rounded-lg flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 max-w-lg">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="search"
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Search team members by name, email, role, department..."
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
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="role">Sort by Role</option>
                                <option value="tasks">Sort by Tasks</option>
                                <option value="completion">Sort by Completion</option>
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

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="h-20 w-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">No team members found</p>
                        <p className="text-gray-500 max-w-md mx-auto text-sm">
                            {searchTerm || filterRole !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Start by adding your first team member'}
                        </p>
                    </div>
                ) : (
                    filteredAndSortedUsers.map((user) => {
                        const userStats = getUserStats(user.id, user.email);

                        return (
                            <div
                                key={user.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-blue-300"
                            >
                                <div className="p-6">
                                    {/* User Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-4">
                                            {getUserAvatar(user)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 truncate">
                                                            {user.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                                            <Mail className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                                            <span className="truncate">{user.email}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-3 space-x-2">
                                                    <span className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${getRoleBadgeColor(user.role)}`}>
                                                        {getRoleIcon(user.role)}
                                                        {user.role || 'User'}
                                                    </span>
                                                    {userStats.completionRate > 0 && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                                            {userStats.completionRate}% complete
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Department & Position */}
                                    {(user.department || user.position) && (
                                        <div className="mt-4 flex items-center space-x-3 text-sm text-gray-600">
                                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">
                                                {user.department || 'No department'} • {user.position || 'No position'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Dynamic Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-5">
                                        <div className="bg-blue-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-blue-600 mb-1">Total Tasks</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.totalAssigned}
                                            </div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-green-600 mb-1">Completed</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.completed}
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-amber-600 mb-1">Pending</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.pending}
                                            </div>
                                        </div>
                                        <div className="bg-red-50 rounded-lg p-3">
                                            <div className="text-xs font-medium text-red-600 mb-1">Overdue</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {userStats.overdue}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Created Tasks */}
                                    <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Tasks Created</span>
                                        <span className="font-medium text-gray-900">{userStats.tasksCreated}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-5">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="flex-1 bg-white rounded-lg border border-gray-200 p-2 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-center group"
                                        >
                                            <div className="h-7 w-7 bg-blue-50 rounded-lg flex items-center justify-center mr-2 group-hover:bg-blue-100 transition-colors">
                                                <Edit className="h-3.5 w-3.5 text-blue-600" />
                                            </div>
                                            <div className="text-xs font-medium text-gray-700 group-hover:text-blue-700">Edit</div>
                                        </button>

                                        {user.id !== currentUser.id && (
                                            <button
                                                onClick={() => handleDeleteClick(user.id)}
                                                className="flex-1 bg-white rounded-lg border border-gray-200 p-2 hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-center group"
                                            >
                                                <div className="h-7 w-7 bg-red-50 rounded-lg flex items-center justify-center mr-2 group-hover:bg-red-100 transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                                </div>
                                                <div className="text-xs font-medium text-gray-700 group-hover:text-red-700">Delete</div>
                                            </button>
                                        )}
                                        {user.id === currentUser.id && (
                                            <div className="flex-1 bg-blue-50 rounded-lg border border-blue-100 p-2 flex items-center justify-center">
                                                <span className="text-xs font-medium text-blue-700">This is you</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="h-12 w-12 mx-auto mb-4 bg-red-50 rounded-lg flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Remove Team Member</h3>
                            <p className="text-gray-600 text-center mb-6 text-sm">
                                This action cannot be undone. All assigned tasks will be unassigned.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={!!deletingUserId}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={!!deletingUserId}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deletingUserId ? 'Removing...' : 'Remove Member'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Team Member</h3>
                                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={editingUser.name || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={editingUser.email || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={editingUser.role || 'user'}
                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="developer">Developer</option>
                                        <option value="designer">Designer</option>
                                        <option value="user">User</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <input
                                            type="text"
                                            value={editingUser.department || ''}
                                            onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Department"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                        <input
                                            type="text"
                                            value={editingUser.position || ''}
                                            onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Position"
                                        />
                                    </div>
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

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
                                <button onClick={handleCancelAdd} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
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
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="developer">Developer</option>
                                        <option value="designer">Designer</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <input
                                            type="text"
                                            value={newUser.department}
                                            onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Department (optional)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                        <input
                                            type="text"
                                            value={newUser.position}
                                            onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Position (optional)"
                                        />
                                    </div>
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
                                    {addingUser ? 'Adding...' : 'Add Member'}
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