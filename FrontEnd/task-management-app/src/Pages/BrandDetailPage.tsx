import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Building,
    Calendar,
    Activity,
    Edit,
    Search,
    UserCheck,
    CheckCircle,
    Loader2,
    Grid,
    List,
    Play,
    Pause,
    Tag,
    MessageSquare,
    History,
    FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, BrandInvite, UserType, Task } from '../Types/Types';
import { taskService } from '../Services/Task.services';
import { brandService } from '../Services/Brand.service';

interface BrandDetailPageProps {
    brands?: Brand[];
    currentUser?: UserType;
    isSidebarCollapsed?: boolean;
    brandId?: string;
    onBack?: () => void;
    availableUsers?: UserType[];
    onInviteCollaborator?: (invite: BrandInvite) => void;
    tasks?: Task[];
}

const BrandDetailPage: React.FC<BrandDetailPageProps> = ({
    brands = [],
    isSidebarCollapsed = false,
    brandId: brandIdProp,
    onBack,
    availableUsers = [],
    tasks: globalTasks = [],
}) => {
    const navigate = useNavigate();
    const { brandId: brandIdFromParams } = useParams<{ brandId: string }>();
    const brandId = brandIdProp || brandIdFromParams;

    const [, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [assigneeFilter] = useState<string>('all');
    const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [brandLoading, setBrandLoading] = useState(true);
    const [, setInviteTaskId] = useState<string | null>(null);
    const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);

    const [localBrand, setLocalBrand] = useState<Brand | null>(null);

    // Get brand from props or API using brandId
    useEffect(() => {
        if (brands.length > 0 && brandId) {
            const foundBrand = brands.find(b => b.id === brandId);
            if (foundBrand) {
                setLocalBrand(foundBrand);
                setBrandLoading(false);
                return;
            }
        }

        if (brandId) {
            const fetchBrandFromAPI = async () => {
                try {
                    setBrandLoading(true);
                    const res = await brandService.getBrandById(brandId);
                    if (res.success && res.data) {
                        setLocalBrand(res.data);
                    }
                } catch (error) {
                    console.error('Error fetching brand from API:', error);
                    toast.error('Failed to load brand details');
                } finally {
                    setBrandLoading(false);
                }
            };

            fetchBrandFromAPI();
        } else {
            setBrandLoading(false);
        }
    }, [brands, brandId]);

    // Helper functions for assignee names - FIXED VERSION
    const getAssignedByName = useCallback((task: Task): string => {
        if ((task as any).assignedByName) {
            return (task as any).assignedByName;
        }

        if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
            return (task.assignedBy as any).name || 'Unknown';
        }

        if (typeof task.assignedBy === 'string') {
            const user = availableUsers.find(u => u.email === task.assignedBy || u.id === task.assignedBy);
            if (user) return user.name;
            // FIX: Use optional chaining before split
            return task.assignedBy?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [availableUsers]);

    const getAssignedToName = useCallback((task: Task): string => {
        if (task.assignedToUser?.name) {
            return task.assignedToUser.name;
        }

        if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
            return (task.assignedTo as any).name || 'Unknown';
        }

        if (typeof task.assignedTo === 'string') {
            const user = availableUsers.find(u => u.email === task.assignedTo || u.id === task.assignedTo);
            if (user) return user.name;
            // FIX: Use optional chaining before split
            return task.assignedTo?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [availableUsers]);

    // Fetch brand tasks
    useEffect(() => {
        if (!localBrand) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const brandTasks = globalTasks.filter(task =>
                task.brand === localBrand.name ||
                task.company === localBrand.company ||
                String(task.brandId) === String(localBrand.id)
            );

            setTasks(brandTasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [localBrand, globalTasks]);

    // Calculate brand statistics
    const brandStats = useMemo(() => {
        if (!localBrand) {
            return {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                inProgressTasks: 0,
                overdueTasks: 0,
                highPriority: 0,
                mediumPriority: 0,
                lowPriority: 0,
            };
        }

        const brandTasks = tasks.filter(task =>
            task.brand === localBrand.name ||
            task.company === localBrand.company ||
            task.brandId === localBrand.id
        );

        return {
            totalTasks: brandTasks.length,
            completedTasks: brandTasks.filter(t => t.status === 'completed').length,
            pendingTasks: brandTasks.filter(t => t.status === 'pending').length,
            inProgressTasks: brandTasks.filter(t => t.status === 'in-progress').length,
            overdueTasks: brandTasks.filter(t => {
                if (t.status === 'completed') return false;
                return new Date(t.dueDate) < new Date();
            }).length,
            highPriority: brandTasks.filter(t => t.priority === 'high').length,
            mediumPriority: brandTasks.filter(t => t.priority === 'medium').length,
            lowPriority: brandTasks.filter(t => t.priority === 'low').length,
        };
    }, [localBrand, tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        if (!localBrand) return [];

        return tasks.filter(task => {
            if (task.brand !== localBrand.name &&
                task.company !== localBrand.company &&
                task.brandId !== localBrand.id) {
                return false;
            }

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesTitle = task.title?.toLowerCase().includes(searchLower);
                const matchesAssignee = getAssignedToName(task).toLowerCase().includes(searchLower);
            }

            // Handle status filter with special case for 'overdue'
            if (statusFilter !== 'all') {
                if (statusFilter === 'overdue') {
                    // Overdue: not completed and due date has passed
                    const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
                    if (!isOverdue) return false;
                } else {
                    // Regular status filter
                    if (task.status !== statusFilter) return false;
                }
            }

            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
            if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
            if (taskTypeFilter !== 'all' && task.taskType !== taskTypeFilter) return false;

            return true;
        });
    }, [tasks, localBrand, searchTerm, statusFilter, priorityFilter, assigneeFilter, taskTypeFilter, getAssignedToName]);

    // Get ALL task history (for history tab)
    const allTaskHistory = useMemo(() => {
        const allHistory: any[] = [];

        tasks.forEach(task => {
            if (task.history) {
                allHistory.push(...task.history.map(hist => ({
                    ...hist,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    brandId: localBrand?.id,
                    brandName: localBrand?.name,
                })));
            }

            // Add task creation as history
            allHistory.push({
                id: `task-created-${task.id}`,
                action: 'task_created',
                taskId: task.id,
                taskTitle: task.title,
                taskStatus: task.status,
                userName: getAssignedByName(task),
                timestamp: task.createdAt || new Date().toISOString(),
                brandId: localBrand?.id,
                brandName: localBrand?.name,
            });

            // Add status changes
            if (task.updatedAt && task.createdAt !== task.updatedAt) {
                allHistory.push({
                    id: `task-updated-${task.id}`,
                    action: 'task_updated',
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    userName: getAssignedByName(task),
                    timestamp: task.updatedAt,
                    brandId: localBrand?.id,
                    brandName: localBrand?.name,
                });
            }
        });

        return allHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [tasks, getAssignedByName, localBrand]);

    // Get specific task history (when a task is selected)
    const selectedTaskHistory = useMemo(() => {
        if (!selectedTaskForHistory) return [];

        const task = tasks.find(t => t.id === selectedTaskForHistory);
        if (!task) return [];

        const taskHistory: any[] = [];

        // Add task history
        if (task.history) {
            taskHistory.push(...task.history.map(hist => ({
                ...hist,
                taskId: task.id,
                taskTitle: task.title,
                taskStatus: task.status,
                brandId: localBrand?.id,
                brandName: localBrand?.name,
            })));
        }

        // Add task creation
        taskHistory.push({
            id: `task-created-${task.id}`,
            action: 'task_created',
            taskId: task.id,
            taskTitle: task.title,
            taskStatus: task.status,
            userName: getAssignedByName(task),
            timestamp: task.createdAt || new Date().toISOString(),
            brandId: localBrand?.id,
            brandName: localBrand?.name,
        });

        // Add updates
        if (task.updatedAt && task.createdAt !== task.updatedAt) {
            taskHistory.push({
                id: `task-updated-${task.id}`,
                action: 'task_updated',
                taskId: task.id,
                taskTitle: task.title,
                taskStatus: task.status,
                userName: getAssignedByName(task),
                timestamp: task.updatedAt,
                brandId: localBrand?.id,
                brandName: localBrand?.name,
            });
        }

        return taskHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [selectedTaskForHistory, tasks, getAssignedByName, localBrand]);

    // Get displayed history based on selection
    const displayedHistory = useMemo(() => {
        return selectedTaskForHistory ? selectedTaskHistory : allTaskHistory;
    }, [selectedTaskForHistory, selectedTaskHistory, allTaskHistory]);

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, []);

    const getPriorityColor = useCallback((priority: string | undefined) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200'; // default for undefined
        }
    }, []);

    const getActionIcon = useCallback((action: string) => {
        switch (action) {
            case 'task_created': return <FileText className="h-4 w-4" />;
            case 'task_completed': return <CheckCircle className="h-4 w-4" />;
            case 'task_updated': return <Edit className="h-4 w-4" />;
            case 'status_changed': return <Activity className="h-4 w-4" />;
            case 'comment_added': return <MessageSquare className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    }, []);

    const handleInviteCollaborator = useCallback((taskId?: string) => {
        if (taskId && typeof taskId === 'string') {
            setInviteTaskId(taskId);
        } else {
            setInviteTaskId(null);
        }
        setShowInviteModal(true);
    }, []);
    const handleBack = useCallback(() => {
        if (onBack) {
            onBack();
            return;
        }
        navigate('/brands');
    }, [navigate, onBack]);

    const handleViewTask = useCallback((taskId: string) => {
        navigate(`/task/${taskId}`);
    }, [navigate]);

    const handleTaskAction = useCallback(async (taskId: string, action: 'start' | 'pause' | 'complete') => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            let newStatus = task.status;
            switch (action) {
                case 'start':
                    newStatus = 'in-progress';
                    break;
                case 'pause':
                    newStatus = 'pending';
                    break;
                case 'complete':
                    newStatus = 'completed';
                    break;
            }

            // Use updateTask method with the updated task object
            const result = await taskService.updateTask(taskId, {
                ...task,
                status: newStatus
            });

            if (result.success) {
                toast.success(`Task ${action}ed successfully`);
                // Update local task state
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? { ...t, status: newStatus } : t
                ));
            } else {
                toast.error(result.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        }
    }, [tasks]);

    const handleViewTaskHistory = useCallback((taskId: string) => {
        setSelectedTaskForHistory(taskId);
        setActiveTab('history');
    }, []);

    const containerClasses = useMemo(() => {
        return `w-full max-w-full mx-auto px-4 sm:px-6 md:px-8 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:px-6' : 'lg:px-8'}`;
    }, [isSidebarCollapsed]);

    if (brandLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!localBrand) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-12">
                <div className="text-center">
                    <Building className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Brand not found</h3>
                    <button onClick={handleBack} className="inline-flex items-center text-blue-600 font-bold hover:underline">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Brands
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className={containerClasses}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 gap-4">
                        <div className="flex items-center gap-5">
                            <button onClick={handleBack} className="p-2 bg-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-4">
                                {localBrand.logo ? (
                                    <img src={localBrand.logo} alt={localBrand.name} className="h-12 w-12 rounded-xl object-cover border border-gray-200" />
                                ) : (
                                    <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white">
                                        <Building className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{localBrand.name}</h1>
                                    <p className="text-gray-500 text-sm">{localBrand.company} • {brandStats.totalTasks} Tasks</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-8">
                        {['tasks', 'history'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab as any);
                                    if (tab === 'history') {
                                        setSelectedTaskForHistory(null);
                                    }
                                }}
                                className={`py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab === 'history' && <History className="h-4 w-4" />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === 'history' && displayedHistory.length > 0 && (
                                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                                        {displayedHistory.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={containerClasses}>
                <div className="py-8">
                    {activeTab === 'tasks' ? (
                        <div className="w-full">
                            {/* Stats Row - Clickable Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`bg-white p-4 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${statusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <p className="text-xs text-gray-500 font-medium mb-1">Total Tasks</p>
                                    <p className="text-2xl font-bold text-gray-900">{brandStats.totalTasks}</p>
                                    {statusFilter === 'all' && (
                                        <p className="text-xs text-blue-600 font-medium mt-1">● Active Filter</p>
                                    )}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('completed')}
                                    className={`bg-white p-4 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${statusFilter === 'completed' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                                    <p className="text-2xl font-bold text-green-600">{brandStats.completedTasks}</p>
                                    {statusFilter === 'completed' && (
                                        <p className="text-xs text-green-600 font-medium mt-1">● Active Filter</p>
                                    )}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('in-progress')}
                                    className={`bg-white p-4 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${statusFilter === 'in-progress' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <p className="text-xs text-gray-500 font-medium mb-1">In Progress</p>
                                    <p className="text-2xl font-bold text-blue-600">{brandStats.inProgressTasks}</p>
                                    {statusFilter === 'in-progress' && (
                                        <p className="text-xs text-blue-600 font-medium mt-1">● Active Filter</p>
                                    )}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('overdue')}
                                    className={`bg-white p-4 rounded-xl border-2 shadow-sm text-left transition-all hover:shadow-md ${statusFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <p className="text-xs text-gray-500 font-medium mb-1">Overdue</p>
                                    <p className="text-2xl font-bold text-red-600">{brandStats.overdueTasks}</p>
                                    {statusFilter === 'overdue' && (
                                        <p className="text-xs text-red-600 font-medium mt-1">● Active Filter</p>
                                    )}
                                </button>
                            </div>

                            {/* Filters Section */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search tasks..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}
                                            >
                                                <Grid className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}
                                            >
                                                <List className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">

                                        <select
                                            value={priorityFilter}
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        >
                                            <option value="all">All Priority</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                        <select
                                            value={taskTypeFilter}
                                            onChange={(e) => setTaskTypeFilter(e.target.value)}
                                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="regular">Regular</option>
                                            <option value="troubleshoot">Troubleshoot</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="development">Development</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Tasks Grid/List */}
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                </div>
                            ) : filteredTasks.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {filteredTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{task.title}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleViewTaskHistory(task.id)}
                                                            className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View History"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mb-5">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.taskType && (
                                                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                                                            <Tag className="h-3 w-3" />
                                                            {task.taskType}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Calendar className="h-4 w-4" />
                                                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <UserCheck className="h-4 w-4" />
                                                            <span className="font-medium">{getAssignedToName(task)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            {task.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleTaskAction(task.id, 'start')}
                                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                                >
                                                                    <Play className="h-3 w-3" />
                                                                    Start
                                                                </button>
                                                            )}
                                                            {task.status === 'in-progress' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleTaskAction(task.id, 'pause')}
                                                                        className="px-3 py-1.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                                    >
                                                                        <Pause className="h-3 w-3" />
                                                                        Pause
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleTaskAction(task.id, 'complete')}
                                                                        className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                                                    >
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        Complete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleViewTask(task.id)}
                                                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >

                                                            </button>
                                                            <button
                                                                onClick={() => handleInviteCollaborator(task.id)}
                                                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Invite to Task"
                                                            >

                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Task</th>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Status</th>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Priority</th>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Due Date</th>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Assignee</th>
                                                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {filteredTasks.map((task) => (
                                                    <tr key={task.id} className="hover:bg-gray-50">
                                                        <td className="py-4 px-6">
                                                            <div>
                                                                <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                                {task.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                                {task.priority}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-sm text-gray-700">
                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="font-medium text-gray-900">{getAssignedToName(task)}</div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleViewTaskHistory(task.id)}
                                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="View History"
                                                                >
                                                                    <History className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleViewTask(task.id)}
                                                                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                                    title="View Details"
                                                                >

                                                                </button>
                                                                {task.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => handleTaskAction(task.id, 'start')}
                                                                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Start Task"
                                                                    >
                                                                        <Play className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
                                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-gray-900 mb-2">No tasks found</h3>
                                    <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                            setPriorityFilter('all');
                                            setTaskTypeFilter('all');
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // History Tab - Full Width History View (ONLY SPECIFIC TASK HISTORY)
                        // History Tab - Full Width History View (ONLY SPECIFIC TASK HISTORY)
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Task History
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {selectedTaskForHistory
                                                ? `Complete history for "${tasks.find(t => t.id === selectedTaskForHistory)?.title || 'selected task'}"`
                                                : 'Select a task to view its complete history'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {selectedTaskForHistory && (
                                            <>
                                                <button
                                                    onClick={() => setActiveTab('tasks')}
                                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                                >
                                                    <ArrowLeft className="h-4 w-4" />
                                                    Back to Tasks
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {selectedTaskForHistory ? (
                                    <>
                                        {/* Task Details Card */}
                                        {(() => {
                                            const task = tasks.find(t => t.id === selectedTaskForHistory);
                                            if (!task) return null;

                                            // Calculate overdue days
                                            const now = new Date();
                                            const dueDate = new Date(task.dueDate);
                                            const isOverdue = task.status !== 'completed' && dueDate < now;
                                            const overdueDays = isOverdue ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                                            // Calculate time taken if completed
                                            const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : null;
                                            const completedTime = task.status === 'completed' && task.updatedAt && createdTime
                                                ? new Date(task.updatedAt).getTime() - createdTime
                                                : null;

                                            // Format time taken function - INSIDE the IIFE
                                            const formatTimeTaken = (ms: number) => {
                                                if (!ms) return 'Unknown';

                                                const days = Math.floor(ms / (1000 * 60 * 60 * 24));
                                                const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

                                                if (days > 0) {
                                                    return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
                                                } else if (hours > 0) {
                                                    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
                                                } else {
                                                    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                                                }
                                            };

                                            return (
                                                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Task Basic Info */}
                                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                            Task Information
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Task Title:</span>
                                                                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Task Type:</span>
                                                                <span className="text-sm font-medium text-gray-900">{task.taskType || 'Not specified'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Brand:</span>
                                                                <span className="text-sm font-medium text-gray-900">{localBrand?.name || task.brand}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Company:</span>
                                                                <span className="text-sm font-medium text-gray-900">{localBrand?.company || task.company}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Task Status & Timing */}
                                                    <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <Calendar className="h-5 w-5 text-green-600" />
                                                            Status & Timing
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Current Status:</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                                    {task.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Priority:</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Created On:</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Last Updated:</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Never'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Due Date:</span>
                                                                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {isOverdue && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-red-600">Overdue Since:</span>
                                                                    <span className="text-sm font-medium text-red-600">
                                                                        {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {task.status === 'completed' && completedTime && completedTime > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-green-600">Time Taken:</span>
                                                                    <span className="text-sm font-medium text-green-600">
                                                                        {formatTimeTaken(completedTime)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* People Involved */}
                                                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <UserCheck className="h-5 w-5 text-purple-600" />
                                                            People Involved
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Assigned By:</span>
                                                                <span className="text-sm font-medium text-gray-900">{getAssignedByName(task)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Assigned To:</span>
                                                                <span className="text-sm font-medium text-gray-900">{getAssignedToName(task)}</span>
                                                            </div>
                                                            {task.status === 'completed' && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">Completed By:</span>
                                                                    <span className="text-sm font-medium text-gray-900">{getAssignedToName(task)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Activity Timeline Header */}
                                        <div className="mb-6 flex items-center justify-between">
                                            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <History className="h-5 w-5" />
                                                Activity Timeline
                                            </h4>
                                            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                                {selectedTaskHistory.length} {selectedTaskHistory.length === 1 ? 'activity' : 'activities'}
                                            </div>
                                        </div>

                                        {/* Task History List */}
                                        <div className="space-y-6">
                                            {selectedTaskHistory.length > 0 ? (
                                                selectedTaskHistory.map((item, index) => (
                                                    <div key={`${item.id}-${index}`} className="relative pb-6 pl-10">
                                                        <div className="absolute left-4 top-3 h-6 w-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                                                            {getActionIcon(item.action)}
                                                        </div>
                                                        {index < selectedTaskHistory.length - 1 && (
                                                            <div className="absolute left-[27px] top-9 bottom-0 w-0.5 bg-gray-200"></div>
                                                        )}

                                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-gray-900">{item.userName}</span>
                                                                        <span className="text-xs text-gray-500">•</span>
                                                                        <div className={`px-2 py-1 rounded text-xs font-medium ${item.action === 'task_created' ? 'bg-green-100 text-green-600' : item.action === 'task_completed' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                            {item.action?.replace(/_/g, ' ') || 'unknown'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                                    <span className="text-xs text-gray-500">
                                                                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>


                                                            {/* Additional details based on action type */}
                                                            {item.action === 'task_created' && (
                                                                <div className="text-xs text-gray-500 mt-2">
                                                                    Task was created by {item.userName} and assigned to {getAssignedToName(tasks.find(t => t.id === selectedTaskForHistory)!)}
                                                                </div>
                                                            )}
                                                            {item.action === 'task_completed' && (
                                                                <div className="text-xs text-green-600 mt-2 font-medium">
                                                                    ✓ Task was marked as completed
                                                                </div>
                                                            )}
                                                            {item.action === 'status_changed' && (
                                                                <div className="text-xs text-blue-600 mt-2">
                                                                    Status changed by {item.userName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12">
                                                    <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No activity history</h4>
                                                    <p className="text-gray-500">This task doesn't have any recorded activity yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    /* No Task Selected State */
                                    <div className="text-center py-16">
                                        <History className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                                        <h4 className="text-xl font-medium text-gray-900 mb-3">No Task Selected</h4>
                                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                            Click on the "View History" button on any task to see its complete history including timeline, people involved, and status details
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('tasks')}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                            Back to Tasks
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandDetailPage;  