import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    ListTodo,
    Calendar as CalendarIcon,
    Users,
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
} from 'lucide-react';
import toast from 'react-hot-toast';

import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AllTasksPage from './AllTasksPage';
import CalendarView from './CalendarView';
import TeamPage from './TeamPage';

import type {
    CommentType,
    NavigationItem,
    Task,
    TaskHistory,
    TaskPriority,
    TaskStatus,
    UserType,
} from '../Types/Types';
import { taskService } from '../Services/Task.services';
import { authService } from '../Services/User.Services';
import { routepath } from '../Routes/route';

interface NewTaskForm {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string;
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

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedStatFilter, setSelectedStatFilter] = useState<string>('all');
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [users, setUsers] = useState<UserType[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'all-tasks' | 'calendar' | 'team'>('dashboard');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [currentUser, setCurrentUser] = useState<UserType>({
        id: '',
        name: 'Loading...',
        role: 'user',
        email: '',
        avatar: 'U',
    });

    const [newTask, setNewTask] = useState<NewTaskForm>({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: 'regular',
        companyName: 'company name',
        brand: '',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        priority: 'all',
        assigned: 'all',
        date: 'all',
        taskType: 'all',
        company: 'all',
        brand: 'all',
    });

    // Company to brand mapping
    const companyBrands = useMemo(() => ({
        'acs': ['Chips', 'Soy', 'Saffola', 'Lays', 'Pepsi', '7Up'],
        'md inpex': ['Inpex Pro', 'Inpex Lite', 'Inpex Max'],
        'tech solutions': ['TechX', 'TechPro', 'TechLite'],
        'global inc': ['Global Pro', 'Global Elite', 'Global Standard'],
        'company name': ['Standard', 'Premium', 'Enterprise'],
    }), []);

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

    const isOverdue = useCallback((dueDate: string, status: string) => {
        if (status === 'completed') return false;
        try {
            return new Date(dueDate) < new Date();
        } catch {
            return false;
        }
    }, []);

    const canEditDeleteTask = useCallback(
        (task: Task) => (currentUser?.email ? task.assignedBy === currentUser.email : false),
        [currentUser],
    );

    const canMarkTaskDone = useCallback(
        (task: Task) => (task.completedApproval ? false : currentUser?.email ? task.assignedTo === currentUser.email : false),
        [currentUser],
    );

    const getAssignedUserInfo = useCallback(
        (task: Task): { name: string; email: string } => {
            if (task.assignedToUser?.email) {
                return {
                    name: task.assignedToUser.name || 'User',
                    email: task.assignedToUser.email,
                };
            }

            if (task.assignedTo) {
                const user = users.find((u) => u.email === task.assignedTo);
                if (user) {
                    return {
                        name: user.name || user.email.split('@')[0] || 'User',
                        email: user.email,
                    };
                }

                return {
                    name: task.assignedTo.split('@')[0] || 'User',
                    email: task.assignedTo,
                };
            }

            return {
                name: 'Unknown User',
                email: 'unknown@example.com',
            };
        },
        [users],
    );

    const getAssignedByInfo = useCallback(
        (task: Task): { name: string; email: string } => {
            if (task.assignedBy) {
                const user = users.find((u) => u.email === task.assignedBy);
                if (user) {
                    return {
                        name: user.name || user.email.split('@')[0] || 'User',
                        email: user.email,
                    };
                }

                return {
                    name: task.assignedBy.split('@')[0] || 'User',
                    email: task.assignedBy,
                };
            }

            return {
                name: 'Unknown User',
                email: 'unknown@example.com',
            };
        },
        [users],
    );

    const getEmailFromId = useCallback(
        (userId: string): string => {
            if (!userId) return '';
            if (userId.includes('@')) return userId;
            const user = users.find((u) => u.id === userId || u._id === userId || u.email === userId);
            return user?.email || '';
        },
        [users],
    );

    const getFilteredTasksByStat = useCallback(() => {
        if (!currentUser?.email) return [];

        let filtered = tasks.filter((task) => (currentUser.role === 'admin' ? true : task.assignedTo === currentUser.email));

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
            filtered = filtered.filter((task) => task.taskType === filters.taskType);
        }
        if (filters.company !== 'all') {
            filtered = filtered.filter((task) => task.companyName === filters.company);
        }
        if (filters.brand !== 'all') {
            filtered = filtered.filter((task) => task.brand === filters.brand);
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
                const description = (task.description || '').toLowerCase();
                const company = (task.companyName || '').toLowerCase();
                const brand = (task.brand || '').toLowerCase();
                return title.includes(term) || description.includes(term) || company.includes(term) || brand.includes(term);
            });
        }

        return filtered;
    }, [currentUser, filters, isOverdue, searchTerm, selectedStatFilter, tasks]);

    const displayTasks = useMemo(() => getFilteredTasksByStat(), [getFilteredTasksByStat]);

    const navigation: NavigationItem[] = useMemo(
        () => [
            {
                name: 'Dashboard',
                icon: LayoutDashboard,
                current: currentView === 'dashboard',
                onClick: () => setCurrentView('dashboard'),
                badge: 0,
            },
            {
                name: 'Tasks',
                icon: ListTodo,
                current: currentView === 'all-tasks',
                onClick: () => setCurrentView('all-tasks'),
                badge: tasks.filter((t) => t.status !== 'completed').length,
            },
            {
                name: 'Calendar',
                icon: CalendarIcon,
                current: currentView === 'calendar',
                onClick: () => setCurrentView('calendar'),
                badge: 0,
            },
            {
                name: 'Team',
                icon: Users,
                current: currentView === 'team',
                onClick: () => setCurrentView('team'),
                badge: users.length,
            },
        ],
        [currentView, tasks, users],
    );

    const stats: StatMeta[] = useMemo(() => {
        const completedTasks = tasks.filter((t) => t.status === 'completed');
        const pendingTasks = tasks.filter((t) => t.status !== 'completed');
        const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status));
        const highPriorityTasks = tasks.filter((t) => t.priority === 'high');

        return [
            {
                name: 'Total Tasks',
                value: tasks.length,
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
            },
            {
                name: 'High Priority',
                value: highPriorityTasks.length,
                change: '+15%',
                changeType: 'neutral',
                icon: Flag,
                id: 'high-priority',
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
            },
        ];
    }, [isOverdue, tasks]);

    // Utility functions for styling
    const getPriorityColor = useCallback((priority: TaskPriority) => {
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

    const getCompanyColor = useCallback((companyName: string) => {
        const company = companyName.toLowerCase();
        switch (company) {
            case 'acs': return 'border-purple-300 bg-purple-50 text-purple-700';
            case 'md inpex': return 'border-indigo-300 bg-indigo-50 text-indigo-700';
            case 'tech solutions': return 'border-cyan-300 bg-cyan-50 text-cyan-700';
            case 'global inc': return 'border-emerald-300 bg-emerald-50 text-emerald-700';
            default: return 'border-gray-300 bg-gray-50 text-gray-700';
        }
    }, []);

    const getBrandColor = useCallback((brand: string) => {
        if (brand.toLowerCase().includes('pro')) return 'border-purple-300 bg-purple-50 text-purple-700';
        if (brand.toLowerCase().includes('lite')) return 'border-blue-300 bg-blue-50 text-blue-700';
        if (brand.toLowerCase().includes('max')) return 'border-red-300 bg-red-50 text-red-700';
        if (brand.toLowerCase().includes('elite')) return 'border-amber-300 bg-amber-50 text-amber-700';
        if (brand.toLowerCase().includes('standard')) return 'border-gray-300 bg-gray-50 text-gray-700';
        if (brand.toLowerCase().includes('premium')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
        if (brand.toLowerCase().includes('enterprise')) return 'border-indigo-300 bg-indigo-50 text-indigo-700';
        return 'border-gray-300 bg-gray-50 text-gray-700';
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

        // Clear error for this field
        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        // Reset brand if company changes
        if (field === 'companyName') {
            setNewTask(prev => ({
                ...prev,
                brand: '',
            }));
        }
    }, [formErrors]);

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
        } else if (new Date(newTask.dueDate) < new Date()) {
            errors.dueDate = 'Due date cannot be in the past';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [newTask]);

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
            if (response.success && response.data) {
                setUsers(response.data as UserType[]);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
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

    useEffect(() => {
        fetchCurrentUser();
        fetchTasks();
        fetchUsers();
    }, [fetchCurrentUser, fetchTasks, fetchUsers]);

    const handleSaveTaskFromModal = useCallback(async () => {
        if (!validateForm()) return;

        setIsCreatingTask(true);
        try {
            const taskData = {
                title: newTask.title,
                description: newTask.description,
                assignedTo: newTask.assignedTo,
                dueDate: newTask.dueDate,
                priority: newTask.priority,
                taskType: newTask.taskType,
                companyName: newTask.companyName,
                brand: newTask.brand,
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
                    description: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: 'medium',
                    taskType: 'regular',
                    companyName: 'company name',
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
    }, [newTask, currentUser, users, validateForm]);

    const updateTaskInState = useCallback((updatedTask: Task) => {
        setTasks(prev => prev.map(task =>
            task.id === updatedTask.id
                ? {
                    ...task,
                    ...updatedTask,
                    assignedToUser: updatedTask.assignedToUser || task.assignedToUser,
                }
                : task
        ));
    }, [setTasks]);

    const handleToggleTaskStatus = useCallback(async (
        taskId: string,
        currentStatus: TaskStatus,
        doneByAdmin?: boolean
    ) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.completedApproval && !doneByAdmin) {
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
            toast.success(`Task marked as ${newStatus}`);
        } catch (error) {
            console.error('Failed to update task status:', error);
            toast.error('Failed to update task');
        }
    }, [tasks, canMarkTaskDone, updateTaskInState]);

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

    const handleUpdateTask = useCallback(async (taskId: string, updatedData: Partial<Task>) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!canEditDeleteTask(task)) {
            toast.error('Only the task creator can edit this task');
            return;
        }

        try {
            const response = await taskService.updateTask(taskId, updatedData);

            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to update task');
                return;
            }

            updateTaskInState(response.data as Task);
            toast.success('Task updated successfully');
        } catch (error) {
            console.error('Failed to update task:', error);
            toast.error('Failed to update task');
        }
    }, [tasks, canEditDeleteTask, updateTaskInState]);

    const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.assignedBy !== currentUser.email) {
            toast.error('Only the task assigner can approve tasks');
            return;
        }

        if (task.status !== 'completed') {
            toast.error('Only completed tasks can be approved');
            return;
        }

        try {
            const response = await taskService.updateTask(taskId, { completedApproval });

            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to update approval status');
                return;
            }

            updateTaskInState(response.data as Task);
            toast.success(
                completedApproval
                    ? 'Task permanently approved by assigner!'
                    : 'Task approval removed',
            );
        } catch (error) {
            console.error('Error updating task approval:', error);
            toast.error('Failed to update approval status');
        }
    }, [tasks, currentUser, updateTaskInState]);

    const handleApproveTask = useCallback(async (taskId: string, approve: boolean) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (currentUser.role !== 'admin') {
            toast.error('Only admin can approve/reject tasks');
            return;
        }

        const updatePayload: Partial<Task> = approve
            ? { completedApproval: true }
            : { status: 'pending', completedApproval: false };

        try {
            const response = await taskService.updateTask(taskId, updatePayload);

            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to process approval');
                return;
            }

            updateTaskInState(response.data as Task);
            toast.success(approve ? 'Task approved by admin!' : 'Task rejected and marked as pending');
        } catch (error) {
            console.error('Error in approval:', error);
            toast.error('Failed to process approval');
        }
    }, [tasks, currentUser, updateTaskInState]);

    const handleReassignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!canEditDeleteTask(task) && currentUser.role !== 'admin') {
            toast.error('Only task creator or admin can reassign tasks');
            return;
        }

        const newAssigneeEmail = getEmailFromId(newAssigneeId);
        if (!newAssigneeEmail) {
            toast.error('Please select a valid user');
            return;
        }

        try {
            const response = await taskService.updateTask(taskId, { assignedTo: newAssigneeEmail });

            if (!response.success || !response.data) {
                toast.error(response.message || 'Failed to reassign task');
                return;
            }

            updateTaskInState(response.data as Task);
            toast.success(`Task reassigned to ${newAssigneeEmail}`);
        } catch (error) {
            console.error('Error reassigning task:', error);
            toast.error('Failed to reassign task');
        }
    }, [tasks, canEditDeleteTask, currentUser, getEmailFromId, updateTaskInState]);

    const handleAddTaskHistory = useCallback((taskId: string, history: Omit<TaskHistory, 'id' | 'timestamp'>) => {
        const newHistory: TaskHistory = {
            ...history,
            id: `history-${Date.now()}`,
            taskId,
            timestamp: new Date().toISOString(),
        };

        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? {
                    ...task,
                    history: [...(task.history || []), newHistory],
                }
                : task
        ));
    }, [setTasks]);

    const handleSaveComment = useCallback(async (taskId: string, comment: string): Promise<CommentType | null> => {
        try {
            const newComment: CommentType = {
                id: `comment-${Date.now()}`,
                taskId,
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
                content: comment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            setTasks(prev => prev.map(task =>
                task.id === taskId
                    ? {
                        ...task,
                        comments: [...(task.comments || []), newComment],
                    }
                    : task
            ));

            await handleAddTaskHistory(taskId, {
                action: 'commented',
                description: `Added a comment: "${comment}"`,
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
            });

            toast.success('Comment added successfully!');
            return newComment;
        } catch (error) {
            console.error('Error saving comment:', error);
            toast.error('Failed to add comment');
            return null;
        }
    }, [currentUser, handleAddTaskHistory]);

    const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? {
                    ...task,
                    comments: (task.comments || []).filter(c => c.id !== commentId),
                }
                : task
        ));

        toast.success('Comment deleted successfully');
    }, [setTasks]);

    const handleFetchTaskComments = useCallback(async (taskId: string): Promise<CommentType[]> => {
        const task = tasks.find(t => t.id === taskId);
        return task?.comments || [];
    }, [tasks]);

    const getEmailById = useCallback((userId: string): string => {
        const user = users.find(u => u.id === userId || u._id === userId);
        return user?.email || userId;
    }, [users]);

    const getTaskBorderColor = useCallback((task: Task) => {
        if (isOverdue(task.dueDate, task.status)) return 'border-red-300';
        if (task.priority === 'high') return 'border-red-200';
        if (task.priority === 'medium') return 'border-amber-200';
        return 'border-gray-200';
    }, [isOverdue]);

    // Get available brands based on selected company
    const getAvailableBrands = useCallback(() => {
        const company = newTask.companyName.toLowerCase();
        return companyBrands[company as keyof typeof companyBrands] || companyBrands['company name'];
    }, [newTask.companyName]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ListTodo className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                navigation={navigation}
                currentUser={currentUser}
                handleLogout={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('currentUser');
                    navigate('/login');
                }}
            />

            <div className="lg:pl-64 flex flex-col flex-1">
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
                />

                <main className="flex-1">
                    <div className="py-8">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            {currentView === 'dashboard' ? (
                                <>
                                    {/* Header with Welcome */}
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
                                                    Welcome back, <span className="font-semibold text-blue-600">{currentUser.name}</span>. Here's what's happening with your tasks.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                                                >
                                                    <Filter className="mr-2 h-4 w-4" />
                                                    Filters
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

                                    {/* Advanced Filters Panel */}
                                    {showAdvancedFilters && (
                                        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Filter className="h-5 w-5 text-gray-600" />
                                                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={resetFilters}
                                                        className="text-sm text-gray-500 hover:text-gray-700"
                                                    >
                                                        Clear all
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAdvancedFilters(false)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                                                {/* Status Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Status
                                                    </label>
                                                    <select
                                                        value={filters.status}
                                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Status</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                </div>

                                                {/* Priority Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Priority
                                                    </label>
                                                    <select
                                                        value={filters.priority}
                                                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Priority</option>
                                                        <option value="high">High</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="low">Low</option>
                                                    </select>
                                                </div>

                                                {/* Assigned Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Assigned
                                                    </label>
                                                    <select
                                                        value={filters.assigned}
                                                        onChange={(e) => handleFilterChange('assigned', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">Everyone</option>
                                                        <option value="assigned-to-me">Assigned To Me</option>
                                                        <option value="assigned-by-me">Assigned By Me</option>
                                                    </select>
                                                </div>

                                                {/* Date Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Due Date
                                                    </label>
                                                    <select
                                                        value={filters.date}
                                                        onChange={(e) => handleFilterChange('date', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Dates</option>
                                                        <option value="today">Today</option>
                                                        <option value="week">This Week</option>
                                                        <option value="overdue">Overdue</option>
                                                    </select>
                                                </div>

                                                {/* Task Type Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Type
                                                    </label>
                                                    <select
                                                        value={filters.taskType}
                                                        onChange={(e) => handleFilterChange('taskType', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Types</option>
                                                        <option value="regular">Regular</option>
                                                        <option value="troubleshoot">Troubleshoot</option>
                                                        <option value="maintenance">Maintenance</option>
                                                        <option value="development">Development</option>
                                                    </select>
                                                </div>

                                                {/* Company Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Company
                                                    </label>
                                                    <select
                                                        value={filters.company}
                                                        onChange={(e) => handleFilterChange('company', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Companies</option>
                                                        <option value="acs">ACS</option>
                                                        <option value="md inpex">MD Inpex</option>
                                                        <option value="tech solutions">Tech Solutions</option>
                                                        <option value="global inc">Global Inc</option>
                                                    </select>
                                                </div>

                                                {/* Brand Filter */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                        Brand
                                                    </label>
                                                    <select
                                                        value={filters.brand}
                                                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="all">All Brands</option>
                                                        <option value="chips">Chips</option>
                                                        <option value="soy">Soy</option>
                                                        <option value="saffola">Saffola</option>
                                                        <option value="lays">Lays</option>
                                                        <option value="pepsi">Pepsi</option>
                                                        <option value="7up">7Up</option>
                                                        <option value="inpex pro">Inpex Pro</option>
                                                        <option value="inpex lite">Inpex Lite</option>
                                                        <option value="inpex max">Inpex Max</option>
                                                        <option value="techx">TechX</option>
                                                        <option value="techpro">TechPro</option>
                                                        <option value="techlite">TechLite</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats Grid - Enhanced */}
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

                                    {/* Tasks Header */}
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
                                                {/* View Toggle */}
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

                                                {/* Quick Actions */}
                                                <div className="flex gap-2">
                                                    {getActiveFilterCount() > 0 && (
                                                        <button
                                                            onClick={resetFilters}
                                                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowAddTaskModal(true)}
                                                        className="px-3 py-2 text-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        Quick Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tasks Display - Enhanced Grid */}
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
                                        // Enhanced Grid View
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {displayTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative"
                                                >
                                                    {/* Task Header */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                                                                    <span className="flex items-center gap-1">
                                                                        <Flag className="h-3 w-3" />
                                                                        {task.priority}
                                                                    </span>
                                                                </span>
                                                                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                                                                    {task.status}
                                                                    {task.completedApproval && (
                                                                        <span className="ml-1 text-blue-500">✅</span>
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
                                                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                                                {task.description || 'No description provided'}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                                                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg"
                                                        >
                                                            <MoreVertical className="h-5 w-5" />
                                                        </button>
                                                    </div>

                                                    {/* Task Metadata */}
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

                                                    {/* Action Buttons */}
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

                                                    {/* Task Type Badge */}
                                                    <div className="absolute top-4 right-4">
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Tag className="h-3 w-3" />
                                                            {task.taskType}
                                                        </span>
                                                    </div>

                                                    {/* Dropdown Menu */}
                                                    {openMenuId === task.id && (
                                                        <div className="absolute right-5 top-12 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                                                            <button
                                                                onClick={() => {
                                                                    handleUpdateTask(task.id, task);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
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
                                    ) : (
                                        // Enhanced List View
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Task Details
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Assignee
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Due Date
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Status
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Priority
                                                            </th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {displayTasks.map((task) => (
                                                            <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-sm font-semibold text-gray-900">
                                                                                {task.title}
                                                                            </span>
                                                                            {task.completedApproval && (
                                                                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                                                                    ✅ Approved
                                                                                </span>
                                                                            )}
                                                                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getCompanyColor(task.companyName)}`}>
                                                                                {task.companyName}
                                                                            </span>
                                                                            {task.brand && (
                                                                                <span className={`px-2 py-0.5 text-xs rounded-full border ${getBrandColor(task.brand)}`}>
                                                                                    {task.brand}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                            {task.description || 'No description'}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                                                            <Tag className="h-3 w-3" />
                                                                            {task.taskType}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                                            {getAssignedUserInfo(task).name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-medium text-gray-900">
                                                                                {getAssignedUserInfo(task).name}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {getAssignedUserInfo(task).email}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className={`text-sm font-medium ${isOverdue(task.dueDate, task.status)
                                                                        ? 'text-rose-600'
                                                                        : 'text-gray-900'
                                                                        }`}>
                                                                        {formatDate(task.dueDate)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {isOverdue(task.dueDate, task.status) ? 'Overdue' : 'On track'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                                                                        {task.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                                                                        {task.priority}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                                                            disabled={!canMarkTaskDone(task)}
                                                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${canMarkTaskDone(task)
                                                                                ? task.status === 'completed'
                                                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                }`}
                                                                        >
                                                                            {task.status === 'completed' ? 'Pending' : 'Complete'}
                                                                        </button>
                                                                        {canEditDeleteTask(task) && (
                                                                            <button
                                                                                onClick={() => handleUpdateTask(task.id, task)}
                                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
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
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    currentUser={currentUser}
                                    users={users}
                                    onEditTask={(task) => handleUpdateTask(task.id, task)}
                                    onDeleteTask={handleDeleteTask}
                                    getEmailById={getEmailById}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                    getTaskBorderColor={getTaskBorderColor}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    onToggleTaskStatus={handleToggleTaskStatus}
                                    onCreateTask={() => setShowAddTaskModal(true)}
                                    onSaveComment={handleSaveComment}
                                    onDeleteComment={handleDeleteComment}
                                    onFetchTaskComments={handleFetchTaskComments}
                                    onReassignTask={handleReassignTask}
                                    onAddTaskHistory={handleAddTaskHistory}
                                    onApproveTask={handleApproveTask}
                                    onUpdateTaskApproval={handleUpdateTaskApproval}
                                />
                            ) : currentView === 'calendar' ? (
                                <CalendarView
                                    tasks={tasks}
                                    currentUser={currentUser}
                                    handleToggleTaskStatus={handleToggleTaskStatus}
                                    handleDeleteTask={handleDeleteTask}
                                    handleUpdateTask={handleUpdateTask}
                                    canEditDeleteTask={canEditDeleteTask}
                                    canMarkTaskDone={canMarkTaskDone}
                                    getAssignedUserInfo={getAssignedUserInfo}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                />
                            ) : currentView === 'team' ? (
                                <TeamPage
                                    users={users}
                                    currentUser={currentUser}
                                    tasks={tasks}
                                    onEditUser={(user) => console.log('Edit user:', user)}
                                    onDeleteUser={(userId) => userId}
                                    onAddUser={() => console.log('Add user')}
                                    getAssignedUserInfo={getAssignedUserInfo}
                                    getAssignedByInfo={getAssignedByInfo}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                />
                            ) : null}
                        </div>
                    </div>
                </main>
            </div>

            {/* Enhanced Add Task Modal */}
            {showAddTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddTaskModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                                {/* Left Column */}
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
                                            Description
                                        </label>
                                        <textarea
                                            placeholder="Describe the task in detail..."
                                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                                            value={newTask.description}
                                            onChange={e => handleInputChange('description', e.target.value)}
                                        />
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

                                {/* Right Column */}
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Priority
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['low', 'medium', 'high'].map((priority) => (
                                                    <button
                                                        key={priority}
                                                        type="button"
                                                        onClick={() => handleInputChange('priority', priority as TaskPriority)}
                                                        className={`py-2.5 text-xs font-medium rounded-lg border ${newTask.priority === priority
                                                            ? priority === 'high'
                                                                ? 'bg-rose-100 text-rose-700 border-rose-300'
                                                                : priority === 'medium'
                                                                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                                    : 'bg-blue-100 text-blue-700 border-blue-300'
                                                            : 'bg-gray-100 text-gray-600 border-gray-300'
                                                            }`}
                                                    >
                                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                                Task Type
                                            </label>
                                            <select
                                                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newTask.taskType}
                                                onChange={e => handleInputChange('taskType', e.target.value)}
                                            >
                                                <option value="regular">Regular</option>
                                                <option value="troubleshoot">Troubleshoot</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="development">Development</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Company
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['ACS', 'MD Inpex', 'Tech Solutions', 'Global Inc', 'Company'].map((company) => (
                                                <button
                                                    key={company}
                                                    type="button"
                                                    onClick={() => handleInputChange('companyName', company.toLowerCase())}
                                                    className={`py-2.5 text-xs font-medium rounded-lg border ${newTask.companyName === company.toLowerCase()
                                                        ? company === 'ACS'
                                                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                                                            : company === 'MD Inpex'
                                                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                                                : company === 'Tech Solutions'
                                                                    ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                                                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                                        }`}
                                                >
                                                    {company}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Brand
                                        </label>
                                        <select
                                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newTask.brand}
                                            onChange={e => handleInputChange('brand', e.target.value)}
                                            disabled={!newTask.companyName}
                                        >
                                            <option value="">Select a brand</option>
                                            {getAvailableBrands().map((brand) => (
                                                <option key={brand} value={brand.toLowerCase()}>
                                                    {brand}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Select a company first to see available brands
                                        </p>
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
        </div>
    );
};

export default DashboardPage;