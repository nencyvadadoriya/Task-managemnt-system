import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    ListTodo,
    PlusCircle,
    AlertCircle,
    CheckCircle,
    Clock,
    X,
    Grid,
    List,
    MoreVertical,
    Filter,
    TrendingUp,
    TrendingDown,
    BarChart3,
    CalendarDays,
    UserCheck,
    Flag,
    Building,
    Tag,
    Edit,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AllTasksPage from './AllTasksPage';
import CalendarView from './CalendarView';
import TeamPage from './TeamPage';
import UserProfilePage from './UserProfilePage';
import BrandsListPage from './BrandsListPage';
import BrandDetailPage from './BrandDetailPage';
import AdvancedFilters from './AdvancedFilters';

import type {
    Brand,
    CommentType,
    Company,
    Task,
    TaskHistory,
    TaskPriority,
    TaskStatus,
    TaskTypeItem,
    UserType,
} from '../Types/Types';
import { taskService } from '../Services/Task.services';
import { authService } from '../Services/User.Services';
import { brandService } from '../Services/Brand.service';
import { companyService } from '../Services/Company.service';
import { taskTypeService } from '../Services/TaskType.service';
import { routepath } from '../Routes/route';

interface NewTaskForm {
    title: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string;
}

interface EditTaskForm {
    id: string;
    title: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string;
    status: TaskStatus;
}

interface StatMeta {
    name: string;
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    icon: any;
    id: string;
    color: string;
    bgColor: string;
}

interface FilterState {
    status: string;
    priority: string;
    assigned: string;
    date: string;
    taskType: string;
    company: string;
    brand: string;
}

const DashboardPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedStatFilter, setSelectedStatFilter] = useState<string>('all');
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showBulkBrandModal, setShowBulkBrandModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [users, setUsers] = useState<UserType[]>([]);
    const [apiBrands, setApiBrands] = useState<Brand[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'all-tasks' | 'calendar' | 'team' | 'profile' | 'brands' | 'brand-detail'>('dashboard');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [currentUser, setCurrentUser] = useState<UserType>({
        id: '',
        name: 'Loading...',
        role: 'user',
        email: '',
        phone: '',
        avatar: '',
        department: '',
        position: '',
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
    });

    const normalizedRole = useMemo(() => {
        const readRoleFromLocalStorageUser = (): string => {
            try {
                const raw = localStorage.getItem('currentUser');
                if (!raw) return '';
                const parsed = JSON.parse(raw);
                return parsed?.role ?? parsed?.userType ?? '';
            } catch {
                return '';
            }
        };

        const readRoleFromToken = (): string => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return '';
                const parts = token.split('.');
                if (parts.length < 2) return '';
                const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
                const payloadJson = atob(padded);
                const payload = JSON.parse(payloadJson);
                return payload?.role ?? '';
            } catch {
                return '';
            }
        };

        const candidates = [
            (currentUser as any)?.role,
            (currentUser as any)?.user?.role,
            (currentUser as any)?.result?.role,
            readRoleFromLocalStorageUser(),
            readRoleFromToken(),
        ]
            .map(v => String(v || '').toLowerCase().trim())
            .filter(Boolean);

        return candidates.find(r => r === 'admin' || r === 'manager') ?? candidates[0] ?? '';
    }, [currentUser]);

    const isAdmin = useMemo(() => normalizedRole === 'admin', [normalizedRole]);
    const isAdminOrManager = useMemo(() => {
        return normalizedRole === 'admin' || normalizedRole === 'manager';
    }, [normalizedRole]);

    useEffect(() => {
        if (!showAddTaskModal) return;

        let storedRole = '';
        try {
            const raw = localStorage.getItem('currentUser');
            if (raw) {
                const parsed = JSON.parse(raw);
                storedRole = (parsed?.role ?? parsed?.userType ?? '').toString();
            }
        } catch {
            storedRole = '';
        }

        console.log('[Create Task Modal] role debug', {
            currentUserRole: (currentUser as any)?.role,
            normalizedRole,
            isAdminOrManager,
            storedRole,
        });
    }, [showAddTaskModal, currentUser, normalizedRole, isAdminOrManager]);

    const [newTask, setNewTask] = useState<NewTaskForm>({
        title: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: '',
        companyName: '',
        brand: '',
    });

    const [editFormData, setEditFormData] = useState<EditTaskForm>({
        id: '',
        title: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: '',
        companyName: '',
        brand: '',
        status: 'pending'
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
    const [bulkBrandForm, setBulkBrandForm] = useState({ company: '', brandNames: '' });
    const [isCreatingBulkBrands, setIsCreatingBulkBrands] = useState(false);
    const [showBulkCompanyModal, setShowBulkCompanyModal] = useState(false);
    const [bulkCompanyNames, setBulkCompanyNames] = useState('');
    const [isCreatingBulkCompanies, setIsCreatingBulkCompanies] = useState(false);
    const [showBulkTaskTypeModal, setShowBulkTaskTypeModal] = useState(false);
    const [bulkTaskTypeNames, setBulkTaskTypeNames] = useState('');
    const [isCreatingBulkTaskTypes, setIsCreatingBulkTaskTypes] = useState(false);

    useEffect(() => {
        if (isAdmin) return;

        if (showBulkBrandModal) setShowBulkBrandModal(false);
        if (showBulkCompanyModal) setShowBulkCompanyModal(false);
        if (showBulkTaskTypeModal) setShowBulkTaskTypeModal(false);
    }, [isAdmin, showBulkBrandModal, showBulkCompanyModal, showBulkTaskTypeModal]);

    const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);

    const [showAddTaskTypeModal, setShowAddTaskTypeModal] = useState(false);
    const [newTaskTypeName, setNewTaskTypeName] = useState('');
    const [isCreatingTaskType, setIsCreatingTaskType] = useState(false);

    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [singleBrandForm, setSingleBrandForm] = useState({ company: '', name: '' });
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        priority: 'all',
        assigned: 'all',
        date: 'all',
        taskType: 'all',
        company: 'all',
        brand: 'all',
    });

    const mainContentClasses = useMemo(() => {
        return `
            flex-1 flex flex-col
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
            min-w-0
        `;
    }, [isSidebarCollapsed]);

    const dashboardContainerClasses = useMemo(() => {
        return `
            w-full max-w-full mx-auto px-4 sm:px-6 md:px-8
            transition-all duration-300 ease-in-out
        `;
    }, []);

    const brands = useMemo(() => {
        return [...apiBrands];
    }, [apiBrands]);

    const availableCompanies = useMemo(() => {
        const fromCompanies = (companies || []).map(c => (c?.name || '').toString().trim()).filter(Boolean);
        if (fromCompanies.length > 0) {
            return [...new Set(fromCompanies)].sort();
        }

        const uniqueCompanies = [...new Set(brands.map(brand => brand.company))];
        return uniqueCompanies.filter(Boolean).sort();
    }, [brands, companies]);

    const availableTaskTypes = useMemo(() => {
        const normalized = (taskTypes || [])
            .map(t => (t?.name || '').toString().trim())
            .filter(Boolean);

        if (normalized.length > 0) {
            return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
        }

        return [];
    }, [taskTypes]);

    const availableBrands = useMemo(() => {
        if (filters.company === 'all') {
            return brands.map(brand => brand.name).sort();
        }
        return brands
            .filter(brand => brand.company.toLowerCase() === filters.company.toLowerCase())
            .map(brand => brand.name)
            .sort();
    }, [brands, filters.company]);

    const formatDate = useCallback((dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return 'Invalid Date';
        }
    }, []);

    const isMongoObjectId = useCallback((value: unknown) => {
        if (typeof value !== 'string') return false;
        return /^[a-f\d]{24}$/i.test(value);
    }, []);

    const navigateTo = (page: string) => {
        const viewMap: Record<string, 'dashboard' | 'all-tasks' | 'calendar' | 'team' | 'profile' | 'brands' | 'brand-detail'> = {
            'dashboard': 'dashboard',
            'tasks': 'all-tasks',
            'all-tasks': 'all-tasks',
            'calendar': 'calendar',
            'team': 'team',
            'profile': 'profile',
            'brands': 'brands',
            'brand-detail': 'brand-detail'
        };

        const targetView = viewMap[page];
        if (targetView) {
            setCurrentView(targetView);
        }
    };

    useEffect(() => {
        const path = (location.pathname || '').toLowerCase();
        if (path === routepath.tasks) {
            setCurrentView('all-tasks');
            return;
        }
        if (path === routepath.calendar) {
            setCurrentView('calendar');
            return;
        }
        if (path === routepath.team) {
            setCurrentView('team');
            return;
        }
        if (path === routepath.profile) {
            setCurrentView('profile');
            return;
        }
        if (path === routepath.brands) {
            setCurrentView('brands');
            return;
        }
        if (path.startsWith('/brands/')) {
            setCurrentView('brand-detail');
            return;
        }
        if (path === routepath.dashboard || path === '/') {
            setCurrentView('dashboard');
        }
    }, [location.pathname]);

    const isOverdue = useCallback((dueDate: string, status: string) => {
        if (status === 'completed') return false;
        try {
            return new Date(dueDate) < new Date();
        } catch {
            return false;
        }
    }, []);

    const getTaskBorderColor = useCallback((task: Task): string => {
        const isCompleted = task.status === 'completed' || task.completedApproval;

        if (isCompleted) {
            if (task.completedApproval) {
                return 'border-l-4 border-l-blue-500';
            }
            return 'border-l-4 border-l-green-500';
        } else if (isOverdue(task.dueDate, task.status)) {
            return 'border-l-4 border-l-red-500';
        } else if (task.priority === 'high') {
            return 'border-l-4 border-l-orange-500';
        } else if (task.priority === 'medium') {
            return 'border-l-4 border-l-yellow-500';
        } else if (task.priority === 'low') {
            return 'border-l-4 border-l-blue-500';
        } else {
            return 'border-l-4 border-l-gray-300';
        }
    }, [isOverdue]);

    const canEditDeleteTask = useCallback(
        (task: Task) => {
            if (normalizedRole === 'admin') return true;
            return currentUser?.email ? task.assignedBy === currentUser.email : false;
        },
        [currentUser, normalizedRole],
    );

    const canMarkTaskDone = useCallback(
        (task: Task) => {
            if (task.completedApproval) return false;
            return currentUser?.email ? task.assignedTo === currentUser.email : false;
        },
        [currentUser],
    );

    const handleUpdateUser = useCallback(async (userId: string, updatedData: Partial<UserType>) => {
        if (normalizedRole !== 'admin') {
            throw new Error('Only administrators can edit users');
        }

        try {
            const response = await authService.updateUser(userId, updatedData);
            if (response.success) {
                setUsers(prev => prev.map(user => {
                    const uid = user.id || (user as any)._id;
                    return uid === userId ? { ...user, ...updatedData } : user;
                }));
                return;
            } else {
                throw new Error(response.message || 'Failed to update user');
            }
        } catch (error: any) {
            console.error('Error updating user:', error);
            throw error;
        }
    }, [normalizedRole]);

    const handleCreateUser = useCallback(async (newUser: Partial<UserType>) => {
        if (normalizedRole !== 'admin') {
            throw new Error('Only administrators can create users');
        }

        try {
            const payload = {
                name: newUser.name || '',
                email: newUser.email || '',
                password: newUser.password || '',
                role: (newUser.role as 'admin' | 'user') || 'user',
                phone: newUser.phone,
                department: newUser.department,
                position: newUser.position
            };

            const response = await authService.createUser(payload);

            if (response.success && response.data) {
                setUsers(prev => [...prev, response.data as UserType]);
            } else {
                throw new Error(response.message || 'Failed to create user');
            }
        } catch (error: any) {
            console.error('Error creating user:', error);
            throw error;
        }
    }, [normalizedRole]);

    const handleDeleteUser = useCallback(async (userId: string) => {
        if (normalizedRole !== 'admin') {
            throw new Error('Only administrators can delete users');
        }

        if (userId === currentUser.id) {
            throw new Error('You cannot delete your own account');
        }

        try {
            const response = await authService.deleteUser(userId);
            const isSuccess = response && (response.success === true || !response.error);

            if (isSuccess) {
                setUsers(prev => prev.filter(user => (user.id || (user as any)._id) !== userId));
            } else {
                throw new Error(response?.message || 'Failed to delete user');
            }
        } catch (error: any) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }, [currentUser, normalizedRole]);

    const getAssignedUserInfo = useCallback(
        (task: Task): { name: string; email: string } => {
            if (task.assignedToUser?.email) {
                return {
                    name: task.assignedToUser.name || 'User',
                    email: task.assignedToUser.email,
                };
            }

            if (task.assignedTo) {
                if (typeof task.assignedTo === 'string') return {
                    name: task.assignedTo.split('@')[0] || 'User',
                    email: task.assignedTo,
                };

                if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
                    return {
                        name: task.assignedTo.name || 'User',
                        email: task.assignedTo.email,
                    };
                }

                return {
                    name: 'Unknown User',
                    email: 'unknown@example.com',
                };
            }

            return {
                name: 'Unknown User',
                email: 'unknown@example.com',
            };
        },
        [users],
    );

    const getAvailableBrands = useCallback(() => {
        const company = newTask.companyName;
        if (!company) return [];

        return brands
            .filter(brand => brand.company.toLowerCase() === company.toLowerCase())
            .map(brand => brand.name)
            .sort();
    }, [newTask.companyName, brands]);

    const getEditFormAvailableBrands = useCallback(() => {
        const company = editFormData.companyName;
        if (!company) return [];

        return brands
            .filter(brand => brand.company.toLowerCase() === company.toLowerCase())
            .map(brand => brand.name)
            .sort();
    }, [editFormData.companyName, brands]);

    const handleSaveComment = useCallback(async (taskId: string, comment: string): Promise<CommentType> => {
        try {
            const response = await taskService.addComment(taskId, comment);

            if (response.success && response.data) {
                const commentData = response.data;

                const formattedComment: CommentType = {
                    id: commentData.id || commentData._id || `comment-${Date.now()}`,
                    taskId: commentData.taskId || taskId,
                    userId: commentData.userId || currentUser.id,
                    userName: commentData.userName || currentUser.name,
                    userEmail: commentData.userEmail || currentUser.email,
                    userRole: commentData.userRole || currentUser.role,
                    content: commentData.content || comment,
                    createdAt: commentData.createdAt || new Date().toISOString(),
                    updatedAt: commentData.updatedAt || commentData.createdAt || new Date().toISOString(),
                };

                toast.success('Comment saved successfully!');
                return formattedComment;
            } else {
                toast.error(response.message || 'Failed to save comment');
                throw new Error(response.message || 'Failed to save comment');
            }
        } catch (error: any) {
            console.error('Error saving comment:', error);

            const mockComment: CommentType = {
                id: `mock-${Date.now()}`,
                taskId: taskId,
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
                userRole: currentUser.role,
                content: comment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            toast.success('Comment saved locally (offline mode)');
            return mockComment;
        }
    }, [currentUser]);

    const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
        try {
            if (!taskService.deleteComment) {
                toast.success('Comment deleted (mock)');
                return;
            }

            const response = await taskService.deleteComment(taskId, commentId);

            if (response && response.success) {
                toast.success('Comment deleted successfully');
            } else {
                toast.error(response?.message || 'Failed to delete comment');
            }
        } catch (error: any) {
            console.error('Error deleting comment:', error);
            toast.error('Failed to delete comment');
        }
    }, []);

    const handleFetchTaskComments = useCallback(async (taskId: string): Promise<CommentType[]> => {
        try {
            const response = await taskService.fetchComments(taskId);

            if (!response) {
                return [];
            }

            if (response.success && Array.isArray(response.data)) {
                return response.data.map((comment: any): CommentType => ({
                    id: comment.id?.toString() || comment._id?.toString() || `${taskId}-${Date.now()}`,
                    taskId: comment.taskId?.toString() || taskId,
                    userId: comment.userId?.toString() || 'unknown-user',
                    userName: comment.userName || 'User',
                    userEmail: comment.userEmail || 'unknown@example.com',
                    userRole: comment.userRole || 'user',
                    content: comment.content || '',
                    createdAt: comment.createdAt || new Date().toISOString(),
                    updatedAt: comment.updatedAt || comment.createdAt || new Date().toISOString()
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
    }, []);

    const handleReassignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            const newAssignee = users.find(u => u.id === newAssigneeId);
            if (!newAssignee) {
                toast.error('User not found');
                return;
            }

            const updatedTask = {
                ...task,
                assignedTo: newAssignee.email,
                assignedToUser: {
                    id: newAssignee.id,
                    name: newAssignee.name,
                    email: newAssignee.email,
                    role: newAssignee.role
                }
            };

            const response = await taskService.updateTask(taskId, {
                assignedTo: newAssignee.email,
                assignedToUser: {
                    id: newAssignee.id,
                    name: newAssignee.name,
                    email: newAssignee.email,
                    role: newAssignee.role
                }
            });

            if (response.success) {
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? updatedTask : t
                ));
                toast.success(`Task reassigned to ${newAssignee.name}`);
            } else {
                toast.error(response.message || 'Failed to reassign task');
            }
        } catch (error) {
            console.error('Error reassigning task:', error);
            toast.error('Failed to reassign task');
        }
    }, [tasks, users]);

    const handleAddTaskHistory = useCallback(
        async (
            taskId: string,
            history: Omit<TaskHistory, 'id' | 'timestamp'>,
            additionalData?: Record<string, any>
        ) => {
            try {
                const payload = {
                    ...history,
                    additionalData,
                };

                const response = await taskService.addTaskHistory(taskId, payload);

                if (!response.success) {
                    toast.error(response.message || 'Failed to record history');
                    return;
                }

                if (response.data) {
                    const entry: any = response.data;
                    const normalized: TaskHistory = {
                        ...history,
                        id: entry.id || entry._id || `temp-${Date.now()}`,
                        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
                        ...(entry || {}),
                    };

                    setTasks(prev => prev.map(t =>
                        t.id === taskId
                            ? { ...t, history: [...(t.history || []), normalized] }
                            : t
                    ));
                }

                toast.success('History recorded');
            } catch (error) {
                console.error('Error adding history:', error);
                toast.error('Failed to record history');
            }
        },
        []
    );

    const handleApproveTask = useCallback(async (taskId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            if (currentUser.role !== 'admin') {
                toast.error('Only administrators can approve tasks');
                return;
            }

            const updatedTask = {
                ...task,
                completedApproval: !task.completedApproval
            };

            const response = await taskService.updateTask(taskId, {
                completedApproval: !task.completedApproval
            });

            if (response.success) {
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? updatedTask : t
                ));

                await handleAddTaskHistory(taskId, {
                    taskId,
                    action: task.completedApproval ? 'rejected_by_admin' : 'admin_approved',
                    description: `Task ${task.completedApproval ? 'approval removed' : 'approved'} by Admin ${currentUser.name}`,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userRole: currentUser.role,
                });

                toast.success(
                    task.completedApproval
                        ? 'Approval removed'
                        : 'Task approved by admin!'
                );
            } else {
                toast.error(response.message || 'Failed to approve task');
            }
        } catch (error) {
            console.error('Error in approval:', error);
            toast.error('Failed to process approval');
        }
    }, [tasks, currentUser, handleAddTaskHistory]);

    const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            const isAssigner = task.assignedBy === currentUser.email;
            if (!isAssigner) {
                toast.error('Only the task assigner can permanently approve tasks');
                return;
            }

            const updatedTask = {
                ...task,
                completedApproval: completedApproval
            };

            const response = await taskService.updateTask(taskId, {
                completedApproval: completedApproval
            });

            if (response.success) {
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? updatedTask : t
                ));

                await handleAddTaskHistory(taskId, {
                    taskId,
                    action: completedApproval ? 'assigner_permanent_approved' : 'permanent_approval_removed',
                    description: `Task ${completedApproval ? 'permanently approved' : 'permanent approval removed'} by Assigner ${currentUser.name}`,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userRole: currentUser.role,
                });

                toast.success(
                    completedApproval
                        ? 'Task PERMANENTLY approved by assigner!'
                        : 'Permanent approval removed'
                );
            } else {
                toast.error(response.message || 'Failed to update approval status');
            }
        } catch (error) {
            console.error('Error updating task approval:', error);
            toast.error('Failed to update approval status');
        }
    }, [tasks, currentUser, handleAddTaskHistory]);

    const handleFetchTaskHistory = useCallback(async (taskId: string): Promise<TaskHistory[]> => {
        try {
            const response = await taskService.getTaskHistory(taskId);

            if (!response.success) {
                toast.error(response.message || 'Failed to fetch history');
                return [];
            }

            return response.data as TaskHistory[];
        } catch (error) {
            console.error('Error fetching task history:', error);
            toast.error('Failed to load task history');
            return [];
        }
    }, []);

    const getFilteredTasksByStat = useCallback(() => {
        if (!currentUser?.email) return [];

        let filtered = tasks.filter((task) => {
            if (currentUser.role === 'admin') return true;
            return task.assignedTo === currentUser.email || task.assignedBy === currentUser.email;
        });

        if (selectedStatFilter === 'completed') {
            filtered = filtered.filter((task) => task.status === 'completed');
        } else if (selectedStatFilter === 'pending') {
            filtered = filtered.filter((task) => task.status !== 'completed');
        } else if (selectedStatFilter === 'overdue') {
            filtered = filtered.filter((task) => task.status !== 'completed' && isOverdue(task.dueDate, task.status));
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter((task) => task.status === filters.status);
        }

        if (filters.priority !== 'all') {
            filtered = filtered.filter((task) => task.priority === filters.priority);
        }

        if (filters.taskType !== 'all') {
            const filterType = filters.taskType.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskType = (task.taskType || (task as any).type || '').toLowerCase();
                return taskType === filterType;
            });
        }

        if (filters.company !== 'all') {
            const filterCompany = filters.company.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskCompany = (task.companyName || (task as any).company || '').toLowerCase();
                return taskCompany === filterCompany;
            });
        }

        if (filters.brand !== 'all') {
            const filterBrand = filters.brand.toLowerCase();
            filtered = filtered.filter((task) => {
                const taskBrand = (task.brand || '').toLowerCase();
                return taskBrand === filterBrand;
            });
        }

        if (filters.date === 'today') {
            filtered = filtered.filter((task) => new Date(task.dueDate).toDateString() === new Date().toDateString());
        } else if (filters.date === 'week') {
            filtered = filtered.filter((task) => {
                const taskDate = new Date(task.dueDate);
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                return taskDate >= today && taskDate <= nextWeek;
            });
        } else if (filters.date === 'overdue') {
            filtered = filtered.filter((task) => isOverdue(task.dueDate, task.status));
        }

        if (filters.assigned === 'assigned-to-me') {
            filtered = filtered.filter((task) => task.assignedTo === currentUser.email);
        } else if (filters.assigned === 'assigned-by-me') {
            filtered = filtered.filter((task) => task.assignedBy === currentUser.email);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((task) => {
                const title = (task.title || '').toLowerCase();
                const company = (task.companyName || (task as any).company || '').toLowerCase();
                const brand = (task.brand || '').toLowerCase();
                const typeVal = (task.taskType || (task as any).type || '').toLowerCase();
                return (
                    title.includes(term) ||
                    company.includes(term) ||
                    brand.includes(term) ||
                    typeVal.includes(term)
                );
            });
        }

        return filtered;
    }, [currentUser, filters, isOverdue, searchTerm, selectedStatFilter, tasks]);

    const displayTasks = useMemo(() => getFilteredTasksByStat(), [getFilteredTasksByStat]);

    const stats: StatMeta[] = useMemo(() => {
        const userTasks = tasks.filter(task => {
            if (currentUser.role === 'admin') return true;
            return task.assignedTo === currentUser.email || task.assignedBy === currentUser.email;
        });

        const completedTasks = userTasks.filter((t) => t.status === 'completed');
        const pendingTasks = userTasks.filter((t) => t.status !== 'completed');
        const overdueTasks = userTasks.filter((t) => isOverdue(t.dueDate, t.status));

        return [
            {
                name: 'Total Tasks',
                value: userTasks.length,
                change: '+12%',
                changeType: 'positive',
                icon: BarChart3,
                id: 'total',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
            },
            {
                name: 'Completed',
                value: completedTasks.length,
                change: '+8%',
                changeType: 'positive',
                icon: CheckCircle,
                id: 'completed',
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
            },
            {
                name: 'Pending',
                value: pendingTasks.length,
                change: '-3%',
                changeType: 'negative',
                icon: Clock,
                id: 'pending',
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
            },
            {
                name: 'Overdue',
                value: overdueTasks.length,
                change: '+5%',
                changeType: 'negative',
                icon: AlertCircle,
                id: 'overdue',
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
            }
        ];
    }, [isOverdue, tasks, currentUser]);

    const getPriorityColor = useCallback((priority?: TaskPriority) => {
        switch (priority) {
            case 'high': return 'border-red-300 bg-red-50 text-red-700';
            case 'medium': return 'border-amber-300 bg-amber-50 text-amber-700';
            case 'low': return 'border-blue-300 bg-blue-50 text-blue-700';
            default: return 'border-gray-300 bg-gray-50 text-gray-700';
        }
    }, []);

    const getStatusColor = useCallback((status: TaskStatus) => {
        switch (status) {
            case 'completed': return 'border-emerald-300 bg-emerald-50 text-emerald-700';
            case 'in-progress': return 'border-blue-300 bg-blue-50 text-blue-700';
            case 'pending': return 'border-amber-300 bg-amber-50 text-amber-700';
            default: return 'border-gray-300 bg-gray-50 text-gray-700';
        }
    }, []);

    const getCompanyColor = useCallback((companyName?: string) => {
        const value = (companyName || '').toLowerCase().trim();
        if (!value) return 'border-gray-300 bg-gray-50 text-gray-700';

        const palette = [
            'border-purple-300 bg-purple-50 text-purple-700',
            'border-indigo-300 bg-indigo-50 text-indigo-700',
            'border-blue-300 bg-blue-50 text-blue-700',
            'border-emerald-300 bg-emerald-50 text-emerald-700',
            'border-amber-300 bg-amber-50 text-amber-700',
            'border-rose-300 bg-rose-50 text-rose-700',
        ];

        const hash = value.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }, []);

    const getBrandColor = useCallback((brand: string) => {
        const value = (brand || '').toLowerCase().trim();
        if (!value) return 'border-gray-300 bg-gray-50 text-gray-700';

        const palette = [
            'border-purple-300 bg-purple-50 text-purple-700',
            'border-indigo-300 bg-indigo-50 text-indigo-700',
            'border-blue-300 bg-blue-50 text-blue-700',
            'border-emerald-300 bg-emerald-50 text-emerald-700',
            'border-amber-300 bg-amber-50 text-amber-700',
            'border-rose-300 bg-rose-50 text-rose-700',
        ];

        const hash = value.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }, []);

    const getActiveFilterCount = useCallback(() => {
        let count = 0;
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== 'all' && key !== 'brand') {
                count++;
            }
        });
        return count;
    }, [filters]);

    const handleStatClick = useCallback((statId: string) => {
        setSelectedStatFilter(selectedStatFilter === statId ? 'all' : statId);
    }, [selectedStatFilter]);

    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value,
        }));

        // If company changes, reset brand
        if (filterType === 'company') {
            setFilters(prev => ({
                ...prev,
                brand: 'all'
            }));
        }
    }, []);

    const handleAdvancedFilterChange = useCallback((filterType: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value,
        }));

        // If company changes, reset brand
        if (filterType === 'company') {
            setFilters(prev => ({
                ...prev,
                brand: 'all'
            }));
        }
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            status: 'all',
            priority: 'all',
            assigned: 'all',
            date: 'all',
            taskType: 'all',
            company: 'all',
            brand: 'all',
        });
        setSelectedStatFilter('all');
        setSearchTerm('');
    }, []);

    const handleInputChange = useCallback((field: keyof NewTaskForm, value: string) => {
        setNewTask(prev => ({
            ...prev,
            [field]: value,
        }));

        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        if (field === 'companyName') {
            setNewTask(prev => ({
                ...prev,
                brand: '',
            }));
        }
    }, [formErrors]);

    const handleEditInputChange = useCallback((field: keyof EditTaskForm, value: string) => {
        setEditFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        if (editFormErrors[field]) {
            setEditFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        if (field === 'companyName') {
            setEditFormData(prev => ({
                ...prev,
                brand: '',
            }));
        }
    }, [editFormErrors]);

    const validateForm = useCallback(() => {
        const errors: Record<string, string> = {};

        if (!newTask.title.trim()) {
            errors.title = 'Title is required';
        }
        if (!newTask.assignedTo) {
            errors.assignedTo = 'Please assign the task to a user';
        }
        if (!newTask.dueDate) {
            errors.dueDate = 'Due date is required';
        } else {
            const selectedDate = new Date(newTask.dueDate);
            const today = new Date();

            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (selectedDate < yesterday) {
                errors.dueDate = 'Due date cannot be in the past';
            }
        }

        // Company validation
        if (!newTask.companyName || newTask.companyName.trim() === '') {
            errors.companyName = 'Company is required';
        }

        // Brand validation
        if (!newTask.brand || newTask.brand.trim() === '') {
            errors.brand = 'Brand is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [newTask]);

    const validateEditForm = useCallback(() => {
        const errors: Record<string, string> = {};

        if (!editFormData.title.trim()) {
            errors.title = 'Title is required';
        }
        if (!editFormData.assignedTo) {
            errors.assignedTo = 'Please assign the task to a user';
        }
        if (!editFormData.dueDate) {
            errors.dueDate = 'Due date is required';
        } else {
            const selectedDate = new Date(editFormData.dueDate);
            const today = new Date();

            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            if (selectedDate < oneYearAgo) {
                errors.dueDate = 'Due date cannot be more than 1 year in the past';
            }
        }

        setEditFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [editFormData]);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const response = await taskService.getAllTasks();
            if (response.success && response.data) {
                setTasks(response.data as Task[]);
            } else {
                toast.error(response.message || 'Failed to fetch tasks');
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await authService.getAllUsers();
            if (!response) return;

            let rawUsers: any[] = [];

            if (Array.isArray(response)) {
                rawUsers = response;
            } else if (Array.isArray((response as any).data)) {
                rawUsers = (response as any).data;
            } else if (Array.isArray((response as any).result)) {
                rawUsers = (response as any).result;
            } else if ((response as any).success && Array.isArray((response as any).data)) {
                rawUsers = (response as any).data;
            }

            if (!rawUsers.length) return;

            const normalizedUsers = rawUsers.map((user: any) => {
                const id = user.id || user._id || user.userId || user.userid || '';
                return {
                    ...user,
                    id,
                } as UserType;
            });

            setUsers(normalizedUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }, []);

    const fetchBrands = useCallback(async () => {
        try {
            const response = await brandService.getBrands();
            if (response && response.data) {
                setApiBrands(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch brands:', error);
        }
    }, []);

    const fetchCompanies = useCallback(async () => {
        try {
            const response = await companyService.getCompanies();
            if (response && response.data) {
                setCompanies(response.data as Company[]);
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    }, []);

    const fetchTaskTypes = useCallback(async () => {
        try {
            const response = await taskTypeService.getTaskTypes();
            if (response && response.data) {
                setTaskTypes(response.data as TaskTypeItem[]);
            }
        } catch (error) {
            console.error('Failed to fetch task types:', error);
        }
    }, []);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate(routepath.login);
                return;
            }

            const response = await authService.getCurrentUser();
            if (response.success && response.data) {
                setCurrentUser(response.data as UserType);
            } else {
                navigate(routepath.login);
            }
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            navigate(routepath.login);
        }
    }, [navigate]);

    const getAssignedToValue = useCallback((assignedTo: any): string => {
        if (!assignedTo) return '';

        if (typeof assignedTo === 'string') return assignedTo;

        if (typeof assignedTo === 'object' && assignedTo !== null) {
            return assignedTo.email || assignedTo.name || '';
        }

        return '';
    }, []);

    const updateTaskInState = useCallback((updatedTask: Task) => {
        setTasks(prev => prev.map(t =>
            t.id === updatedTask.id ? updatedTask : t
        ));
    }, []);

    useEffect(() => {
        fetchCurrentUser();
        fetchTasks();
        fetchUsers();
        fetchBrands();
        fetchCompanies();
        fetchTaskTypes();

        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState) {
            setIsSidebarCollapsed(JSON.parse(savedSidebarState));
        }
    }, [fetchCurrentUser, fetchTasks, fetchUsers, fetchBrands, fetchCompanies, fetchTaskTypes]);

    const handleOpenEditModal = useCallback((task: Task) => {
        setEditingTask(task);

        const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

        setEditFormData({
            id: task.id,
            title: task.title || '',
            assignedTo: getAssignedToValue(task.assignedTo),
            dueDate: dueDate,
            priority: task.priority || 'medium',
            taskType: task.taskType || '',
            companyName: task.companyName || '',
            brand: task.brand || '',
            status: task.status || 'pending'
        });

        setEditFormErrors({});
        setShowEditTaskModal(true);
        setOpenMenuId(null);
    }, [getAssignedToValue]);

    const handleSaveTaskFromModal = useCallback(async () => {
        if (!validateForm()) return;

        setIsCreatingTask(true);
        try {
            const selectedBrandObj = brands.find(b =>
                b.name === newTask.brand && (b.company === newTask.companyName || (b as any).companyName === newTask.companyName)
            );

            const resolvedBrandId = (() => {
                const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                return isMongoObjectId(candidate) ? candidate : null;
            })();

            const taskData = {
                title: newTask.title,
                assignedTo: newTask.assignedTo,
                dueDate: newTask.dueDate,
                priority: newTask.priority === 'urgent' ? 'high' : newTask.priority,
                taskType: newTask.taskType,
                companyName: newTask.companyName,
                brand: newTask.brand,
                brandId: resolvedBrandId,
                status: 'pending' as TaskStatus,
                assignedBy: currentUser.email,
                assignedToUser: users.find(u => u.email === newTask.assignedTo),
            };

            const response = await taskService.createTask(taskData);
            if (response.success && response.data) {
                setTasks(prev => [...prev, response.data as Task]);
                setShowAddTaskModal(false);
                setNewTask({
                    title: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: 'medium',
                    taskType: '',
                    companyName: '',
                    brand: '',
                });
                toast.success('Task created successfully!');
            } else {
                toast.error(response.message || 'Failed to create task');
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        } finally {
            setIsCreatingTask(false);
        }
    }, [brands, newTask, currentUser, users, validateForm, isMongoObjectId]);

    const handleBulkCreateTasks = useCallback(
        async (payloads: any[]): Promise<{ created: Task[]; failures: { index: number; rowNumber: number; title: string; reason: string }[] }> => {
            const created: Task[] = [];
            const failures: { index: number; rowNumber: number; title: string; reason: string }[] = [];

            for (let index = 0; index < payloads.length; index++) {
                const payload = payloads[index];

                try {
                    const selectedBrandObj = brands.find(b =>
                        b.name === payload.brand && (b.company === payload.companyName || (b as any).companyName === payload.companyName)
                    );

                    const resolvedBrandId = (() => {
                        const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                        return isMongoObjectId(candidate) ? candidate : null;
                    })();

                    const taskData = {
                        title: payload.title,
                        assignedTo: payload.assignedTo,
                        dueDate: payload.dueDate,
                        priority: payload.priority === 'urgent' ? 'high' : payload.priority,
                        taskType: payload.taskType || '',
                        companyName: payload.companyName || '',
                        brand: payload.brand || '',
                        brandId: resolvedBrandId,
                        status: 'pending' as TaskStatus,
                        assignedBy: currentUser.email,
                        assignedToUser: users.find(u => u.email === payload.assignedTo),
                    };

                    const response = await taskService.createTask(taskData);

                    if (response.success && response.data) {
                        created.push(response.data as Task);
                    } else {
                        failures.push({
                            index,
                            rowNumber: payload.rowNumber ?? index + 1,
                            title: payload.title || 'Untitled Task',
                            reason: response.message || 'Failed to create task',
                        });
                    }
                } catch (error: any) {
                    console.error('Failed to create task in bulk:', error);
                    failures.push({
                        index,
                        rowNumber: payload.rowNumber ?? index + 1,
                        title: payload.title || 'Untitled Task',
                        reason: error?.message || 'Unexpected error while creating task',
                    });
                }
            }

            if (created.length > 0) {
                setTasks(prev => [...prev, ...created]);
            }

            return { created, failures };
        },
        [brands, currentUser, users, isMongoObjectId]
    );

    const handleSaveEditedTask = useCallback(async () => {
        if (!validateEditForm() || !editingTask) return;

        setIsUpdatingTask(true);
        try {
            const selectedBrandObj = brands.find(b =>
                b.name === editFormData.brand && (b.company === editFormData.companyName || (b as any).companyName === editFormData.companyName)
            );

            const resolvedBrandId = (() => {
                const candidate = (selectedBrandObj as any)?.id || (selectedBrandObj as any)?._id;
                return isMongoObjectId(candidate) ? candidate : null;
            })();

            const updateData = {
                title: editFormData.title,
                assignedTo: editFormData.assignedTo,
                dueDate: editFormData.dueDate,
                priority: editFormData.priority,
                taskType: editFormData.taskType,
                companyName: editFormData.companyName,
                brand: editFormData.brand,
                brandId: resolvedBrandId,
                status: editFormData.status,
                assignedToUser: users.find(u => u.email === editFormData.assignedTo),
            };

            const response = await taskService.updateTask(editFormData.id, updateData);

            if (response.success && response.data) {
                updateTaskInState(response.data as Task);
                setShowEditTaskModal(false);
                setEditingTask(null);
                toast.success('Task updated successfully!');
            } else {
                toast.error(response.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            toast.error('Failed to update task');
        } finally {
            setIsUpdatingTask(false);
        }
    }, [validateEditForm, editingTask, editFormData, brands, users, isMongoObjectId, updateTaskInState]);

    const handleToggleTaskStatus = useCallback(async (taskId: string, currentStatus: TaskStatus, doneByAdmin: boolean = false) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            toast.error('Task not found');
            return;
        }

        if (task.completedApproval && currentStatus === 'completed') {
            toast.error('This task has been permanently approved and cannot be changed');
            return;
        }

        if (!canMarkTaskDone(task) && !doneByAdmin) {
            toast.error('You can only mark tasks assigned to you as done');
            return;
        }

        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

        try {
            const response = await taskService.updateTask(taskId, {
                status: newStatus,
                ...(newStatus === 'pending'
                    ? { completedApproval: false }
                    : doneByAdmin
                        ? { completedApproval: true }
                        : {}),
            });

            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to update task');
                return;
            }

            updateTaskInState(response.data as Task);

            try {
                await handleAddTaskHistory(taskId, {
                    taskId,
                    action: newStatus === 'completed' ? 'marked_completed' : 'marked_pending',
                    description: `Task marked as ${newStatus} by ${currentUser.name} (${currentUser.role})`,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userRole: currentUser.role,
                });
            } catch (error) {
                console.error('Error adding task history:', error);
            }

            toast.success(`Task marked as ${newStatus}`);
        } catch (error) {
            console.error('Failed to update task status:', error);
            toast.error('Failed to update task');
        }
    }, [tasks, canMarkTaskDone, updateTaskInState, handleAddTaskHistory, currentUser]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!canEditDeleteTask(task)) {
            toast.error('Only the task creator can delete this task');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await taskService.deleteTask(taskId);
            if (!response.success) {
                toast.error(response.message || 'Failed to delete task');
                return;
            }

            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success('Task deleted');
        } catch (error) {
            console.error('Failed to delete task:', error);
            toast.error('Failed to delete task');
        }
    }, [tasks, canEditDeleteTask]);

    const handleUpdateTask = useCallback(async (taskId: string, updatedData: Partial<Task>): Promise<Task | null> => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            toast.error('Task not found');
            return null;
        }

        if (!canEditDeleteTask(task)) {
            toast.error('Only the task creator can edit this task');
            return null;
        }

        try {
            const updatePayload = {
                ...updatedData,
                updatedAt: new Date().toISOString()
            };

            const response = await taskService.updateTask(taskId, updatePayload);

            if (!response.success) {
                toast.error(response.message || 'Failed to update task');
                return null;
            }

            if (!response.data) {
                toast.error('No data received from server');
                return null;
            }

            const updatedTask = response.data as Task;

            updateTaskInState(updatedTask);
            toast.success('Task updated successfully');

            return updatedTask;

        } catch (error: any) {
            console.error('Error updating task:', error);

            let errorMessage = 'Failed to update task';
            if (error.response?.status === 401) {
                errorMessage = 'Session expired. Please login again.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to edit this task';
            } else if (error.response?.status === 404) {
                errorMessage = 'Task not found on server';
            }

            toast.error(errorMessage);
            return null;
        }
    }, [tasks, canEditDeleteTask, updateTaskInState]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
                <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 animate-pulse">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
                            <div className="h-6 w-32 bg-gray-400 rounded"></div>
                        </div>
                    </div>

                    <div className="flex-1 p-4 space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                                <div className="h-5 w-5 bg-gray-300 rounded"></div>
                                <div className="h-4 w-28 bg-gray-300 rounded"></div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 w-24 bg-gray-400 rounded mb-2"></div>
                                <div className="h-8 w-16 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 animate-pulse">
                        <div className="px-4 sm:px-6 md:px-8 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                                    <div className="h-6 w-32 bg-gray-400 rounded"></div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-48 bg-gray-300 rounded"></div>
                                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 p-6 overflow-auto">
                        <div className="py-8">
                            <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8">
                                <div className="mb-10">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                                                <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
                                            </div>
                                            <div className="h-4 w-64 bg-gray-300 rounded mb-3"></div>
                                            <div className="h-4 w-full bg-gray-300 rounded mb-3"></div>
                                            <div className="h-4 w-2/3 bg-gray-300 rounded"></div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-10 w-32 bg-gray-300 rounded-xl"></div>
                                            <div className="h-10 w-32 bg-gray-300 rounded-xl"></div>
                                            <div className="h-10 w-32 bg-gray-300 rounded-xl"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-pulse">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="h-12 w-12 bg-gray-300 rounded-xl"></div>
                                                            <div>
                                                                <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
                                                                <div className="h-8 w-16 bg-gray-400 rounded"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="h-5 w-5 bg-gray-300 rounded"></div>
                                                <div className="h-6 w-32 bg-gray-400 rounded"></div>
                                            </div>
                                            <div className="h-4 w-48 bg-gray-300 rounded"></div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-8 w-20 bg-gray-300 rounded-lg"></div>
                                            <div className="h-8 w-20 bg-gray-300 rounded-lg"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 animate-pulse">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                                                        <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
                                                    </div>
                                                    <div className="h-6 w-3/4 bg-gray-400 rounded mb-3"></div>
                                                    <div className="h-4 w-full bg-gray-300 rounded mb-3"></div>
                                                    <div className="h-4 w-2/3 bg-gray-300 rounded"></div>
                                                </div>
                                                <div className="h-6 w-6 bg-gray-300 rounded-lg"></div>
                                            </div>
                                            <div className="space-y-3 mb-5">
                                                {[...Array(4)].map((_, j) => (
                                                    <div key={j} className="flex items-center justify-between">
                                                        <div className="h-4 w-20 bg-gray-300 rounded"></div>
                                                        <div className="h-4 w-24 bg-gray-400 rounded"></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                                <div className="flex-1 h-8 bg-gray-300 rounded-lg"></div>
                                                <div className="w-16 h-8 bg-gray-300 rounded-lg"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                navigateTo={navigateTo}
                currentUser={currentUser}
                handleLogout={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
                    navigate('/login');
                }}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                currentView={currentView}
            />

            <div className={mainContentClasses}>
                <Navbar
                    setSidebarOpen={setSidebarOpen}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    currentUser={currentUser}
                    showLogout={showLogout}
                    setShowLogout={setShowLogout}
                    handleLogout={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        navigate('/login');
                    }}
                    isSidebarCollapsed={isSidebarCollapsed}
                />

                <main className="flex-1 overflow-auto">
                    <div className="py-8">
                        <div className={dashboardContainerClasses}>
                            {currentView === 'dashboard' ? (
                                <>
                                    <div className="mb-10">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                                        <LayoutDashboard className="h-6 w-6 text-white" />
                                                    </div>
                                                    <h1 className="text-3xl font-bold text-gray-900">
                                                        Dashboard
                                                    </h1>
                                                </div>
                                                <p className="text-gray-600">
                                                    {currentUser.role === 'admin'
                                                        ? `Welcome Admin ${currentUser.name}. Manage all tasks.`
                                                        : `Welcome back, ${currentUser.name}. Here are your tasks.`
                                                    }
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                                                >
                                                    <Filter className="mr-2 h-4 w-4" />
                                                    Advanced Filters
                                                    {getActiveFilterCount() > 0 && (
                                                        <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                            {getActiveFilterCount()}
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setCurrentView('all-tasks')}
                                                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                                >
                                                    <ListTodo className="mr-2 h-4 w-4" />
                                                    View All Tasks
                                                </button>
                                                <button
                                                    onClick={() => setShowAddTaskModal(true)}
                                                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                                >
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    New Task
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Filters Component */}
                                    <AdvancedFilters
                                        filters={filters}
                                        availableCompanies={availableCompanies}
                                        availableTaskTypes={availableTaskTypes}
                                        availableBrands={availableBrands}
                                        users={users}
                                        currentUser={currentUser}
                                        onFilterChange={handleAdvancedFilterChange}
                                        onResetFilters={resetFilters}
                                        showFilters={showAdvancedFilters}
                                        onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    />

                                    <div className="mb-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                            {stats.map((stat) => (
                                                <div
                                                    key={stat.name}
                                                    onClick={() => handleStatClick(stat.id)}
                                                    className={`bg-white p-6 rounded-2xl shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${selectedStatFilter === stat.id
                                                        ? 'border-blue-500 shadow-lg shadow-blue-50'
                                                        : 'border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                                                        <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.changeType === 'positive'
                                                                            ? 'bg-emerald-50 text-emerald-700'
                                                                            : stat.changeType === 'negative'
                                                                                ? 'bg-rose-50 text-rose-700'
                                                                                : 'bg-gray-50 text-gray-700'
                                                                            }`}>
                                                                            {stat.changeType === 'positive' ? (
                                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                                            ) : stat.changeType === 'negative' ? (
                                                                                <TrendingDown className="h-3 w-3 mr-1" />
                                                                            ) : null}
                                                                            {stat.change}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-500">
                                                                    {stat.id === 'completed' ? 'From last week' :
                                                                        stat.id === 'overdue' ? 'Needs attention' :
                                                                            'View details'}
                                                                </span>
                                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${selectedStatFilter === stat.id
                                                                    ? 'bg-blue-100 text-blue-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    Click to filter
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <ListTodo className="h-5 w-5 text-blue-600" />
                                                    <h2 className="text-xl font-semibold text-gray-900">
                                                        {displayTasks.length} Tasks
                                                    </h2>
                                                    <span className="text-sm text-gray-500">
                                                        • {selectedStatFilter !== 'all' ? `${getActiveFilterCount()} active filter(s)` : 'All tasks'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {selectedStatFilter === 'overdue'
                                                        ? 'Tasks that require immediate attention'
                                                        : selectedStatFilter === 'high-priority'
                                                            ? 'High priority tasks requiring focus'
                                                            : 'Your current tasks at a glance'}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                                                    <button
                                                        onClick={() => setViewMode('grid')}
                                                        className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'grid'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <Grid className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'list'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <List className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="flex gap-2">
                                                    {getActiveFilterCount() > 0 && (
                                                        <button
                                                            onClick={resetFilters}
                                                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {displayTasks.length === 0 ? (
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                                            <div className="max-w-md mx-auto">
                                                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl inline-flex mb-6">
                                                    <ListTodo className="h-12 w-12 text-blue-600" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                    No tasks found
                                                </h3>
                                                <p className="text-gray-500 mb-6">
                                                    {searchTerm
                                                        ? `No tasks match "${searchTerm}"`
                                                        : getActiveFilterCount() > 0
                                                            ? 'Try adjusting your filters'
                                                            : 'Get started by creating your first task'}
                                                </p>
                                                <button
                                                    onClick={() => setShowAddTaskModal(true)}
                                                    className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm"
                                                >
                                                    <PlusCircle className="mr-2 h-5 w-5" />
                                                    Create New Task
                                                </button>
                                            </div>
                                        </div>
                                    ) : viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {displayTasks
                                                .filter((task: Task) => {
                                                    if (filters.taskType !== 'all') {
                                                        const filterType = filters.taskType.toLowerCase();
                                                        const taskType = (task.taskType || (task as any).type || '').toLowerCase();
                                                        if (taskType !== filterType) return false;
                                                    }

                                                    if (filters.company !== 'all') {
                                                        const filterCompany = filters.company.toLowerCase();
                                                        const taskCompany = (task.companyName || (task as any).company || '').toLowerCase();
                                                        if (taskCompany !== filterCompany) return false;
                                                    }

                                                    if (filters.brand !== 'all') {
                                                        const filterBrand = filters.brand.toLowerCase();
                                                        const taskBrand = (task.brand || '').toLowerCase();
                                                        if (taskBrand !== filterBrand) return false;
                                                    }

                                                    return true;
                                                })
                                                .map((task: Task) => (
                                                    <div
                                                        key={task.id}
                                                        className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative"
                                                    >
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority || 'medium')}`}>
                                                                        <span className="flex items-center gap-1">
                                                                            <Flag className="h-3 w-3" />
                                                                            {task.priority}
                                                                        </span>
                                                                    </span>
                                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                                                                        {task.status}
                                                                        {task.completedApproval && (
                                                                            <span className="ml-1 text-blue-500">By Admin</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                                    {task.title}
                                                                    {task.completedApproval && (
                                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                                                            Approved
                                                                        </span>
                                                                    )}
                                                                </h3>
                                                            </div>
                                                            <button
                                                                onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                                                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg"
                                                            >
                                                                <MoreVertical className="h-5 w-5" />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-3 mb-5">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-500 flex items-center gap-2">
                                                                    <UserCheck className="h-4 w-4" />
                                                                    Assigned To
                                                                </span>
                                                                <span className="font-medium text-gray-900">
                                                                    {getAssignedUserInfo(task).name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-500 flex items-center gap-2">
                                                                    <CalendarDays className="h-4 w-4" />
                                                                    Due Date
                                                                </span>
                                                                <span className={`font-medium ${isOverdue(task.dueDate, task.status)
                                                                    ? 'text-rose-600'
                                                                    : 'text-gray-900'
                                                                    }`}>
                                                                    {formatDate(task.dueDate)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-500 flex items-center gap-2">
                                                                    <Building className="h-4 w-4" />
                                                                    Company
                                                                </span>
                                                                <span className={`px-2 py-1 text-xs rounded-full border ${getCompanyColor(task.companyName)}`}>
                                                                    {task.companyName}
                                                                </span>
                                                            </div>
                                                            {task.brand && (
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-gray-500 flex items-center gap-2">
                                                                        <Tag className="h-4 w-4" />
                                                                        Brand
                                                                    </span>
                                                                    <span className={`px-2 py-1 text-xs rounded-full border ${getBrandColor(task.brand)}`}>
                                                                        {task.brand}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                                                            <button
                                                                onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                                                disabled={!canMarkTaskDone(task)}
                                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${canMarkTaskDone(task)
                                                                    ? task.status === 'completed'
                                                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {task.status === 'completed' ? 'Mark Pending' : 'Complete'}
                                                            </button>
                                                            {canEditDeleteTask(task) && (
                                                                <button
                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                    className="px-3 py-2 text-sm font-medium bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="absolute top-4 right-4">
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Tag className="h-3 w-3" />
                                                                {task.taskType}
                                                            </span>
                                                        </div>

                                                        {openMenuId === task.id && (
                                                            <div className="absolute right-5 top-12 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                                                                <button
                                                                    onClick={() => {
                                                                        handleOpenEditModal(task);
                                                                    }}
                                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                    Edit Task
                                                                </button>
                                                                {canEditDeleteTask(task) && (
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDeleteTask(task.id);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                                                    >
                                                                        Delete Task
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : viewMode === 'list' ? (
                                        <div className="space-y-4">
                                            {displayTasks
                                                .filter((task: Task) => {
                                                    if (filters.taskType !== 'all') {
                                                        const filterType = filters.taskType.toLowerCase();
                                                        const taskType = (task.taskType || (task as any).type || '').toLowerCase();
                                                        if (taskType !== filterType) return false;
                                                    }

                                                    if (filters.company !== 'all') {
                                                        const filterCompany = filters.company.toLowerCase();
                                                        const taskCompany = (task.companyName || (task as any).company || '').toLowerCase();
                                                        if (taskCompany !== filterCompany) return false;
                                                    }

                                                    if (filters.brand !== 'all') {
                                                        const filterBrand = filters.brand.toLowerCase();
                                                        const taskBrand = (task.brand || '').toLowerCase();
                                                        if (taskBrand !== filterBrand) return false;
                                                    }

                                                    return true;
                                                })
                                                .map((task: Task) => (
                                                    <div
                                                        key={task.id}
                                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority || 'medium')}`}>
                                                                        <span className="flex items-center gap-1">
                                                                            <Flag className="h-3 w-3" />
                                                                            {task.priority}
                                                                        </span>
                                                                    </span>
                                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                                                                        {task.status}
                                                                        {task.completedApproval && (
                                                                            <span className="ml-1 text-blue-500">By Admin</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                                                                    <p className="text-sm text-gray-500">{getAssignedUserInfo(task).name}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenEditModal(task)}
                                                                className="p-1 text-gray-400 hover:text-gray-600"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : null}
                                </>
                            ) : currentView === 'all-tasks' ? (
                                <AllTasksPage
                                    tasks={tasks}
                                    filter={filters.status}
                                    setFilter={(value) => handleFilterChange('status', value)}
                                    dateFilter={filters.date}
                                    setDateFilter={(value) => handleFilterChange('date', value)}
                                    assignedFilter={filters.assigned}
                                    setAssignedFilter={(value) => handleFilterChange('assigned', value)}
                                    // NEW PROPS ADDED
                                    advancedFilters={filters} // Pass complete filters object
                                    onAdvancedFilterChange={(filterType: string, value: string) =>
                                        handleFilterChange(filterType as keyof FilterState, value)
                                    }
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    currentUser={currentUser}
                                    users={users}
                                    onEditTask={async (taskId: string, updatedTask: Partial<Task>) => {
                                        return await handleUpdateTask(taskId, updatedTask);
                                    }}
                                    onDeleteTask={handleDeleteTask}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                    getTaskBorderColor={getTaskBorderColor}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    onToggleTaskStatus={handleToggleTaskStatus}
                                    onCreateTask={async () => {
                                        setShowAddTaskModal(true);
                                        return undefined;
                                    }}
                                    onSaveComment={handleSaveComment}
                                    onDeleteComment={handleDeleteComment}
                                    onFetchTaskComments={handleFetchTaskComments}
                                    onReassignTask={handleReassignTask}
                                    onAddTaskHistory={handleAddTaskHistory}
                                    onApproveTask={handleApproveTask}
                                    onUpdateTaskApproval={handleUpdateTaskApproval}
                                    onFetchTaskHistory={handleFetchTaskHistory}
                                    onBulkCreateTasks={handleBulkCreateTasks}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    brands={brands}
                                    // EDIT MODAL PROPS
                                    showEditModal={showEditTaskModal}
                                    editingTask={editingTask}
                                    onOpenEditModal={handleOpenEditModal}
                                    onCloseEditModal={() => setShowEditTaskModal(false)}
                                    onSaveEditedTask={handleSaveEditedTask}
                                />
                            ) : currentView === 'calendar' ? (
                                <CalendarView
                                    tasks={tasks}
                                    currentUser={{
                                        id: currentUser.id || '',
                                        name: currentUser.name || 'User',
                                        email: currentUser.email || '',
                                        role: currentUser.role || 'user',
                                        avatar: currentUser.avatar || 'U'
                                    }}
                                    handleToggleTaskStatus={async (taskId: string, currentStatus: TaskStatus) => {
                                        try {
                                            await handleToggleTaskStatus(taskId, currentStatus, false);
                                        } catch (error) {
                                            console.error('Error toggling task status:', error);
                                            toast.error('Failed to update task status');
                                        }
                                    }}
                                    handleDeleteTask={async (taskId: string) => {
                                        try {
                                            await handleDeleteTask(taskId);
                                        } catch (error) {
                                            console.error('Error deleting task:', error);
                                            toast.error('Failed to delete task');
                                        }
                                    }}
                                    handleUpdateTask={async (taskId: string, updatedData: Partial<Task>) => {
                                        try {
                                            await handleUpdateTask(taskId, updatedData);
                                        } catch (error) {
                                            console.error('Error updating task:', error);
                                            toast.error('Failed to update task');
                                        }
                                    }}
                                    canEditDeleteTask={canEditDeleteTask}
                                    canMarkTaskDone={canMarkTaskDone}
                                    getAssignedUserInfo={getAssignedUserInfo}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                />
                            ) : currentView === 'team' ? (
                                <TeamPage
                                    users={users}
                                    tasks={tasks}
                                    onUpdateUser={handleUpdateUser}
                                    onDeleteUser={handleDeleteUser}
                                    onAddUser={handleCreateUser}
                                    isOverdue={isOverdue}
                                    currentUser={currentUser}
                                />
                            ) : currentView === 'profile' ? (
                                <UserProfilePage
                                    user={currentUser}
                                    formatDate={formatDate}
                                />
                            ) : currentView === 'brands' ? (
                                <BrandsListPage
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    currentUser={currentUser}
                                    onSelectBrand={(brandId) => {
                                        setSelectedBrandId(brandId);
                                        setCurrentView('brand-detail');
                                    }}
                                />
                            ) : currentView === 'brand-detail' ? (
                                <BrandDetailPage
                                    brandId={selectedBrandId || ''}
                                    brands={apiBrands}
                                    currentUser={currentUser}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    onBack={() => setCurrentView('brands')}
                                    tasks={tasks}
                                />
                            ) : null}
                        </div>
                    </div>
                </main>
            </div>

            {/* Add Task Modal */}
            {showAddTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddTaskModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <PlusCircle className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Create New Task
                                        </h3>
                                        <p className="text-sm text-blue-100 mt-0.5">
                                            Fill in the details below to create a new task
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddTaskModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Task Title *
                                        </label>

                                        <input
                                            type="text"
                                            placeholder="What needs to be done?"
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            value={newTask.title}
                                            onChange={e => handleInputChange('title', e.target.value)}
                                        />
                                        {formErrors.title && (
                                            <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Assign To *
                                        </label>

                                        <select
                                            value={newTask.assignedTo}
                                            onChange={e => handleInputChange('assignedTo', e.target.value)}
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        >
                                            <option value="">Select team member</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.email}>
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.assignedTo && (
                                            <p className="mt-1 text-sm text-red-600">{formErrors.assignedTo}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Due Date *
                                        </label>
                                        <input
                                            type="date"
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            value={newTask.dueDate}
                                            onChange={e => handleInputChange('dueDate', e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        {formErrors.dueDate && (
                                            <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                                        )}
                                    </div>

                                    {/* Improved Priority and Task Type Layout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Priority Section - Left */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-900">
                                                    Priority
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['low', 'medium', 'high'].map((priority) => (
                                                    <button
                                                        key={priority}
                                                        type="button"
                                                        onClick={() => handleInputChange('priority', priority as TaskPriority)}
                                                        className={`py-2.5 text-xs font-medium rounded-lg border transition-all ${newTask.priority === priority
                                                            ? priority === 'high'
                                                                ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm'
                                                                : priority === 'medium'
                                                                    ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                                                                    : 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                                                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Task Type Section - Right */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-900">
                                                    Task Type
                                                </label>
                                                {isAdminOrManager && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddTaskTypeModal(true)}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                                                        >
                                                            <PlusCircle className="h-3 w-3" />
                                                            Add Type
                                                        </button>
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowBulkTaskTypeModal(true)}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                                                            >
                                                                <PlusCircle className="h-3 w-3" />
                                                                Bulk Add
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <select
                                                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${availableTaskTypes.length === 0
                                                    ? 'border-gray-200 bg-gray-50 text-gray-400'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                                value={newTask.taskType}
                                                onChange={e => handleInputChange('taskType', e.target.value)}
                                                disabled={availableTaskTypes.length === 0}
                                            >
                                                {availableTaskTypes.length === 0 ? (
                                                    <option value="">No task types available</option>
                                                ) : (
                                                    <>
                                                        <option value="" disabled>Select task type</option>
                                                        {availableTaskTypes.map((typeName) => (
                                                            <option key={typeName} value={typeName.toLowerCase()}>
                                                                {typeName}
                                                            </option>
                                                        ))}
                                                    </>
                                                )}
                                            </select>
                                            {availableTaskTypes.length === 0 && isAdminOrManager && (
                                                <p className="mt-1 text-xs text-amber-600">
                                                    Add task types to continue
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Company Section - Full Width */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-900">
                                                Company *
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {isAdminOrManager && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddCompanyModal(true)}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                        >
                                                            <PlusCircle className="h-3 w-3" />
                                                            Add
                                                        </button>
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowBulkCompanyModal(true)}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                            >
                                                                <PlusCircle className="h-3 w-3" />
                                                                Bulk Add
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <select
                                            value={newTask.companyName}
                                            onChange={e => handleInputChange('companyName', e.target.value)}
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.companyName ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        >
                                            <option value="">Select a company</option>
                                            {availableCompanies.map(company => (
                                                <option key={company} value={company}>
                                                    {company}
                                                </option>
                                            ))}
                                        </select>

                                        {availableCompanies.length === 0 ? (
                                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-xs text-yellow-700">
                                                    No companies available. Add a company to get started.
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {availableCompanies.length} companies available
                                            </p>
                                        )}

                                        {formErrors.companyName && (
                                            <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>
                                        )}
                                    </div>

                                    {/* Brand Section - Full Width */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-900">
                                                Brand *
                                            </label>
                                            {isAdminOrManager && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSingleBrandForm({ company: newTask.companyName || '', name: '' });
                                                            setShowAddBrandModal(true);
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                    >
                                                        <PlusCircle className="h-3 w-3" />
                                                        Add Brand
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBulkBrandForm(prev => ({ ...prev, company: newTask.companyName || prev.company }));
                                                                setShowBulkBrandModal(true);
                                                            }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                        >
                                                            <PlusCircle className="h-3 w-3" />
                                                            Bulk Add
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <select
                                            value={newTask.brand}
                                            onChange={e => handleInputChange('brand', e.target.value)}
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.brand ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            disabled={!newTask.companyName}
                                        >
                                            <option value="">Select a brand</option>
                                            {getAvailableBrands().map((brand) => (
                                                <option key={brand} value={brand}>
                                                    {brand}
                                                </option>
                                            ))}
                                        </select>

                                        {newTask.companyName && (
                                            <div className="mt-2">
                                                {getAvailableBrands().length === 0 ? (
                                                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-xs text-yellow-700">
                                                            No brands found for {newTask.companyName}. Add a brand to continue.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500">
                                                        {getAvailableBrands().length} brands available for {newTask.companyName}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {!newTask.companyName && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Select a company first to see available brands
                                            </p>
                                        )}

                                        {formErrors.brand && (
                                            <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTaskModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTaskFromModal}
                                    disabled={isCreatingTask}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingTask
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                >
                                    {isCreatingTask ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Creating Task...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <PlusCircle className="h-4 w-4" />
                                            Create Task
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Brands Modal */}
            {isAdmin && showBulkBrandModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowBulkBrandModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Tag className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Bulk Add Brands
                                        </h3>
                                        <p className="text-sm text-emerald-100 mt-0.5">
                                            Add multiple brands for a company
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBulkBrandModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Company *
                                    </label>
                                    <select
                                        value={bulkBrandForm.company}
                                        onChange={(e) => setBulkBrandForm(prev => ({ ...prev, company: e.target.value }))}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Select a company</option>
                                        {availableCompanies.map(company => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Brand Names *
                                    </label>
                                    <textarea
                                        placeholder="Enter brand names (comma or new line separated)\nExample:\nBrand 1, Brand 2, Brand 3\nor\nBrand 1\nBrand 2\nBrand 3"
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                                        value={bulkBrandForm.brandNames}
                                        onChange={(e) => setBulkBrandForm(prev => ({ ...prev, brandNames: e.target.value }))}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Separate brand names with commas or new lines
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkBrandModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!bulkBrandForm.company) {
                                            toast.error('Please select a company');
                                            return;
                                        }

                                        if (!bulkBrandForm.brandNames.trim()) {
                                            toast.error('Please enter brand names');
                                            return;
                                        }

                                        const requestedBrands = bulkBrandForm.brandNames
                                            .split(/\r?\n|,/)
                                            .map(s => s.trim())
                                            .filter(Boolean);

                                        if (requestedBrands.length === 0) {
                                            toast.error('No valid brand names provided');
                                            return;
                                        }

                                        const existingBrandsLower = new Set(
                                            brands
                                                .filter(b => b.company === bulkBrandForm.company)
                                                .map(b => b.name.toLowerCase())
                                        );

                                        const toCreate = requestedBrands.filter(b => !existingBrandsLower.has(b.toLowerCase()));

                                        if (toCreate.length === 0) {
                                            toast.error('All brands already exist for this company');
                                            return;
                                        }

                                        setIsCreatingBulkBrands(true);
                                        try {
                                            const created: Brand[] = [];
                                            for (const brandName of toCreate) {
                                                const res = await brandService.createBrand({
                                                    name: brandName,
                                                    company: bulkBrandForm.company,
                                                    description: `Brand for ${bulkBrandForm.company}`,
                                                    status: 'active',
                                                });

                                                if (res.success && res.data) {
                                                    created.push(res.data);
                                                }
                                            }

                                            if (created.length > 0) {
                                                setApiBrands(prev => [...prev, ...created]);
                                                setBulkBrandForm({ company: '', brandNames: '' });
                                                setShowBulkBrandModal(false);
                                                // Emit event to notify other components of brand updates
                                                const event = new CustomEvent('brandUpdated', { detail: { brands: created } });
                                                window.dispatchEvent(event);
                                                // Refresh brands from backend to ensure latest data
                                                fetchBrands();
                                                toast.success(`${created.length} brand(s) added successfully!`);
                                            } else {
                                                toast.error('Failed to add brands');
                                            }
                                        } catch (err) {
                                            console.error('Error bulk creating brands:', err);
                                            toast.error('Failed to add brands');
                                        } finally {
                                            setIsCreatingBulkBrands(false);
                                        }
                                    }}
                                    disabled={isCreatingBulkBrands}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingBulkBrands
                                        ? 'bg-emerald-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                                        }`}
                                >
                                    {isCreatingBulkBrands ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Adding Brands...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            Add Brands
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Companies Modal */}
            {isAdmin && showBulkCompanyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowBulkCompanyModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Building className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Bulk Add Companies
                                        </h3>
                                        <p className="text-sm text-blue-100 mt-0.5">
                                            Add multiple companies (comma or new line separated)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBulkCompanyModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Company Names *
                                    </label>
                                    <textarea
                                        placeholder="Enter company names (comma or new line separated)\nExample:\nCompany A, Company B\nor\nCompany A\nCompany B"
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                                        value={bulkCompanyNames}
                                        onChange={(e) => setBulkCompanyNames(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkCompanyModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!bulkCompanyNames.trim()) {
                                            toast.error('Please enter company names');
                                            return;
                                        }

                                        const requested = bulkCompanyNames
                                            .split(/\r?\n|,/)
                                            .map(s => s.trim())
                                            .filter(Boolean);

                                        if (requested.length === 0) {
                                            toast.error('No valid company names provided');
                                            return;
                                        }

                                        setIsCreatingBulkCompanies(true);
                                        try {
                                            const res = await companyService.bulkUpsertCompanies({
                                                companies: requested.map(name => ({ name }))
                                            });

                                            if (res.success && res.data) {
                                                setCompanies(res.data as any);
                                                setBulkCompanyNames('');
                                                setShowBulkCompanyModal(false);
                                                toast.success(`${res.data.length} company(ies) processed successfully!`);
                                            } else {
                                                toast.error('Failed to add companies');
                                            }
                                        } catch (err) {
                                            console.error('Error bulk creating companies:', err);
                                            toast.error('Failed to add companies');
                                        } finally {
                                            setIsCreatingBulkCompanies(false);
                                        }
                                    }}
                                    disabled={isCreatingBulkCompanies}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingBulkCompanies
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                >
                                    {isCreatingBulkCompanies ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Adding Companies...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Building className="h-4 w-4" />
                                            Add Companies
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Add Task Types Modal */}
            {isAdmin && showBulkTaskTypeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowBulkTaskTypeModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Tag className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Bulk Add Task Types
                                        </h3>
                                        <p className="text-sm text-indigo-100 mt-0.5">
                                            Add multiple task types (comma or new line separated)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBulkTaskTypeModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Task Types *
                                    </label>
                                    <textarea
                                        placeholder="Enter task types (comma or new line separated)\nExample:\nBug, Feature\nor\nBug\nFeature"
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
                                        value={bulkTaskTypeNames}
                                        onChange={(e) => setBulkTaskTypeNames(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkTaskTypeModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!bulkTaskTypeNames.trim()) {
                                            toast.error('Please enter task types');
                                            return;
                                        }

                                        const requested = bulkTaskTypeNames
                                            .split(/\r?\n|,/)
                                            .map(s => s.trim())
                                            .filter(Boolean);

                                        if (requested.length === 0) {
                                            toast.error('No valid task types provided');
                                            return;
                                        }

                                        setIsCreatingBulkTaskTypes(true);
                                        try {
                                            const res = await taskTypeService.bulkUpsertTaskTypes({
                                                types: requested.map(name => ({ name }))
                                            });

                                            if (res.success && res.data) {
                                                setTaskTypes(res.data as any);
                                                setBulkTaskTypeNames('');
                                                setShowBulkTaskTypeModal(false);
                                                toast.success(`${res.data.length} task type(s) processed successfully!`);
                                            } else {
                                                toast.error('Failed to add task types');
                                            }
                                        } catch (err) {
                                            console.error('Error bulk creating task types:', err);
                                            toast.error('Failed to add task types');
                                        } finally {
                                            setIsCreatingBulkTaskTypes(false);
                                        }
                                    }}
                                    disabled={isCreatingBulkTaskTypes}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingBulkTaskTypes
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
                                        }`}
                                >
                                    {isCreatingBulkTaskTypes ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Adding Types...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            Add Types
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Company Modal */}
            {showAddCompanyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddCompanyModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Building className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Add Company
                                        </h3>
                                        <p className="text-sm text-blue-100 mt-0.5">
                                            Add one company
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddCompanyModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter company name"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCompanyModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const name = (newCompanyName || '').toString().trim();
                                        if (!name) {
                                            toast.error('Please enter a company name');
                                            return;
                                        }
                                        setIsCreatingCompany(true);
                                        try {
                                            const res = await companyService.createCompany({ name });
                                            if (res.success && res.data) {
                                                await fetchCompanies();
                                                setNewCompanyName('');
                                                setShowAddCompanyModal(false);
                                                toast.success('Company added successfully!');
                                            } else {
                                                toast.error('Failed to add company');
                                            }
                                        } catch (err) {
                                            console.error('Error creating company:', err);
                                            toast.error('Failed to add company');
                                        } finally {
                                            setIsCreatingCompany(false);
                                        }
                                    }}
                                    disabled={isCreatingCompany}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingCompany
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                >
                                    {isCreatingCompany ? 'Adding...' : 'Add Company'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Task Type Modal */}
            {showAddTaskTypeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddTaskTypeModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Tag className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Add Task Type
                                        </h3>
                                        <p className="text-sm text-indigo-100 mt-0.5">
                                            Add one task type
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddTaskTypeModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Task Type *
                                    </label>
                                    <input
                                        type="text"
                                        value={newTaskTypeName}
                                        onChange={(e) => setNewTaskTypeName(e.target.value)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter task type"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTaskTypeModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const name = (newTaskTypeName || '').toString().trim();
                                        if (!name) {
                                            toast.error('Please enter a task type');
                                            return;
                                        }
                                        setIsCreatingTaskType(true);
                                        try {
                                            const res = await taskTypeService.createTaskType({ name });
                                            if (res.success && res.data) {
                                                await fetchTaskTypes();
                                                setNewTaskTypeName('');
                                                setShowAddTaskTypeModal(false);
                                                toast.success('Task type added successfully!');
                                            } else {
                                                toast.error('Failed to add task type');
                                            }
                                        } catch (err) {
                                            console.error('Error creating task type:', err);
                                            toast.error('Failed to add task type');
                                        } finally {
                                            setIsCreatingTaskType(false);
                                        }
                                    }}
                                    disabled={isCreatingTaskType}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingTaskType
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
                                        }`}
                                >
                                    {isCreatingTaskType ? 'Adding...' : 'Add Type'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Brand Modal */}
            {showAddBrandModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddBrandModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Tag className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Add Brand
                                        </h3>
                                        <p className="text-sm text-emerald-100 mt-0.5">
                                            Add one brand for a company
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddBrandModal(false)}
                                    className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 overflow-y-auto flex-1">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Company *
                                    </label>
                                    <select
                                        value={singleBrandForm.company}
                                        onChange={(e) => setSingleBrandForm(prev => ({ ...prev, company: e.target.value }))}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Select a company</option>
                                        {availableCompanies.map(company => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Brand Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={singleBrandForm.name}
                                        onChange={(e) => setSingleBrandForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter brand name"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBrandModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const company = (singleBrandForm.company || '').toString().trim();
                                        const name = (singleBrandForm.name || '').toString().trim();

                                        if (!company) {
                                            toast.error('Please select a company');
                                            return;
                                        }
                                        if (!name) {
                                            toast.error('Please enter a brand name');
                                            return;
                                        }

                                        setIsCreatingBrand(true);
                                        try {
                                            const res = await brandService.createBrand({
                                                name,
                                                company,
                                                description: '',
                                                status: 'active',
                                            });
                                            if (res.success && res.data) {
                                                setApiBrands(prev => [...prev, res.data]);
                                                setShowAddBrandModal(false);
                                                setSingleBrandForm({ company: '', name: '' });
                                                const event = new CustomEvent('brandUpdated', { detail: { brands: [res.data] } });
                                                window.dispatchEvent(event);
                                                await fetchBrands();
                                                toast.success('Brand added successfully!');
                                            } else {
                                                toast.error('Failed to add brand');
                                            }
                                        } catch (err) {
                                            console.error('Error creating brand:', err);
                                            toast.error('Failed to add brand');
                                        } finally {
                                            setIsCreatingBrand(false);
                                        }
                                    }}
                                    disabled={isCreatingBrand}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isCreatingBrand
                                        ? 'bg-emerald-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                                        }`}
                                >
                                    {isCreatingBrand ? 'Adding...' : 'Add Brand'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;