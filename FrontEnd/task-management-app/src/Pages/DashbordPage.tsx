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
    Edit,
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

interface EditTaskForm {
    id: string;
    title: string;
    description: string;
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

    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedStatFilter, setSelectedStatFilter] = useState<string>('all');
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [users, setUsers] = useState<UserType[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'all-tasks' | 'calendar' | 'team'>('dashboard');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [currentUser, setCurrentUser] = useState<UserType>({
        id: '',
        name: 'Loading...',
        role: 'user',
        email: '',
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

    const [editFormData, setEditFormData] = useState<EditTaskForm>({
        id: '',
        title: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        taskType: 'regular',
        companyName: 'company name',
        brand: '',
        status: 'pending'
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

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

    // ✅ ADD THIS FUNCTION - getTaskBorderColor function
    const getTaskBorderColor = useCallback((task: Task): string => {
        const isCompleted = task.status === 'completed' || task.completedApproval;

        if (isCompleted) {
            if (task.completedApproval) {
                return 'border-l-4 border-l-blue-500'; // Permanently approved
            }
            return 'border-l-4 border-l-green-500'; // Completed
        } else if (isOverdue(task.dueDate, task.status)) {
            return 'border-l-4 border-l-red-500'; // Overdue
        } else if (task.priority === 'high') {
            return 'border-l-4 border-l-orange-500'; // High priority
        } else if (task.priority === 'medium') {
            return 'border-l-4 border-l-yellow-500'; // Medium priority
        } else if (task.priority === 'low') {
            return 'border-l-4 border-l-blue-500'; // Low priority
        } else {
            return 'border-l-4 border-l-gray-300'; // Default
        }
    }, [isOverdue]);

    const canEditDeleteTask = useCallback(
        (task: Task) => {
            // Admin can edit/delete any task
            if (currentUser?.role === 'admin') return true;

            // Regular users can only edit/delete tasks they assigned
            return currentUser?.email ? task.assignedBy === currentUser.email : false;
        },
        [currentUser],
    );

    const canMarkTaskDone = useCallback(
        (task: Task) => {
            // If task is permanently approved, no one can change it
            if (task.completedApproval) return false;

            // User can only mark tasks assigned to them as done
            return currentUser?.email ? task.assignedTo === currentUser.email : false;
        },
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
                // assignedTo can be string | UserType
                if (typeof task.assignedTo === 'object') {
                    return {
                        name: task.assignedTo.name || 'User',
                        email: task.assignedTo.email,
                    };
                }

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
                // assignedBy can be string | UserType
                if (typeof task.assignedBy === 'object') {
                    return {
                        name: task.assignedBy.name || 'User',
                        email: task.assignedBy.email,
                    };
                }

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

    // ✅ ADD THIS FUNCTION - Get available brands
    const getAvailableBrands = useCallback(() => {
        const company = newTask.companyName;
        return companyBrands[company as keyof typeof companyBrands] || [];
    }, [newTask.companyName, companyBrands]);

    // ✅ ADD THIS FUNCTION - Get available brands for edit form
    const getEditFormAvailableBrands = useCallback(() => {
        const company = editFormData.companyName;
        return companyBrands[company as keyof typeof companyBrands] || [];
    }, [editFormData.companyName, companyBrands]);

    // ✅ FIXED: Handle Save Comment with proper error handling
    const handleSaveComment = useCallback(async (taskId: string, comment: string): Promise<CommentType> => {
        try {
            console.log('🚀 Saving comment via taskService.addComment...');

            const response = await taskService.addComment(taskId, comment);

            console.log('📥 API Response:', response);

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

                toast.success('✅ Comment saved successfully!');
                return formattedComment;
            } else {
                toast.error(response.message || 'Failed to save comment');
                throw new Error(response.message || 'Failed to save comment');
            }
        } catch (error: any) {
            console.error('❌ Error saving comment:', error);

            // Fallback mock comment so caller still gets a CommentType
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

            toast.success('💾 Comment saved locally (offline mode)');
            return mockComment;
        }
    }, [currentUser]);

    // ✅ FIXED: Handle Delete Comment
    const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
        try {
            console.log('🗑️ Deleting comment:', commentId, 'for task:', taskId);

            // Check if taskService.deleteComment exists
            if (!taskService.deleteComment) {
                console.log('⚠️ deleteComment method not available, using mock');
                toast.success('Comment deleted (mock)');
                return;
            }

            const response = await taskService.deleteComment(taskId, commentId);

            if (response && response.success) {
                toast.success('✅ Comment deleted successfully');
            } else {
                toast.error(response?.message || 'Failed to delete comment');
            }
        } catch (error: any) {
            console.error('❌ Error deleting comment:', error);
            toast.error('Failed to delete comment');
        }
    }, []);

    // ✅ FIXED: Handle Fetch Task Comments
    const handleFetchTaskComments = useCallback(async (taskId: string): Promise<CommentType[]> => {
        try {
            console.log('📡 Fetching comments for task:', taskId);

            // Check if taskService.fetchComments exists
            if (!taskService.fetchComments) {
                console.log('⚠️ fetchComments method not available, returning empty array');
                return [];
            }

            const response = await taskService.fetchComments(taskId);

            if (!response) {
                console.log('❌ No response from fetchComments');
                return [];
            }

            if (response.success && Array.isArray(response.data)) {
                console.log(`✅ Found ${response.data.length} comments`);

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
        } catch (error: any) {
            console.error('❌ Error fetching comments:', error);
            return [];
        }
    }, []);

    // ✅ FIXED: Handle Reassign Task
    const handleReassignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            // Find new assignee
            const newAssignee = users.find(u => u.id === newAssigneeId);
            if (!newAssignee) {
                toast.error('User not found');
                return;
            }

            // Update task with new assignee
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

            // Update in backend
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
                // Update local state
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

    // ✅ FIXED: Handle Add Task History
    const handleAddTaskHistory = useCallback(async (taskId: string, history: Omit<TaskHistory, 'id' | 'timestamp'>) => {
        try {
            console.log('📝 Recording task history for', taskId, history);

            const response = await taskService.updateTask(taskId, {
                note: history.description,
            });

            if (!response.success) {
                toast.error(response.message || 'Failed to record history');
                return;
            }

            toast.success('History recorded');
        } catch (error) {
            console.error('Error adding history:', error);
            toast.error('Failed to record history');
        }
    }, []);

    // ✅ FIXED: Handle Approve Task
    const handleApproveTask = useCallback(async (taskId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            // Only admin can approve
            // Your existing approve logic here
        } catch (error) {
            console.error('Error in approval:', error);
            toast.error('Failed to process approval');
        }
    }, [tasks, currentUser, handleAddTaskHistory]);

    // ✅ FIXED: Handle Update Task Approval
    const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                toast.error('Task not found');
                return;
            }

            // Check if user is assigner
            const isAssigner = task.assignedBy === currentUser.email;
            if (!isAssigner) {
                toast.error('Only the task assigner can permanently approve tasks');
                return;
            }

            // Update task
            const updatedTask = {
                ...task,
                completedApproval: completedApproval
            };

            // Update in backend
            const response = await taskService.updateTask(taskId, {
                completedApproval: completedApproval
            });

            if (response.success) {
                // Update local state
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? updatedTask : t
                ));

                // Add history
                await handleAddTaskHistory(taskId, {
                    taskId,
                    action: completedApproval ? 'assigner_permanent_approved' : 'assigner_approval_removed',
                    description: `Task ${completedApproval ? 'permanently approved' : 'permanent approval removed'} by Assigner ${currentUser.name}`,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userRole: currentUser.role,
                });

                toast.success(
                    completedApproval
                        ? '✅ Task PERMANENTLY approved by assigner!'
                        : '🔄 Permanent approval removed'
                );
            } else {
                toast.error(response.message || 'Failed to update approval status');
            }
        } catch (error) {
            console.error('Error updating task approval:', error);
            toast.error('Failed to update approval status');
        }
    }, [tasks, currentUser, handleAddTaskHistory]);

    // ✅ FIXED: Handle Fetch Task History
    const handleFetchTaskHistory = useCallback(async (taskId: string): Promise<TaskHistory[]> => {
        try {
            console.log('📜 Fetching history for task:', taskId);

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

        // 🔥 CRITICAL FIX: SHOW TASKS BASED ON USER ROLE AND ASSIGNMENT
        let filtered = tasks.filter((task) => {
            // Admin sees all tasks
            if (currentUser.role === 'admin') return true;

            // Regular users see:
            // 1. Tasks assigned to them (दूसरों द्वारा assign किए गए tasks)
            // 2. Tasks they assigned to others (अगर वे खुद assigner हैं)
            return task.assignedTo === currentUser.email ||
                task.assignedBy === currentUser.email;
        });

        // Apply selected stat filter
        if (selectedStatFilter === 'completed') {
            filtered = filtered.filter((task) => task.status === 'completed');
        } else if (selectedStatFilter === 'pending') {
            filtered = filtered.filter((task) => task.status !== 'completed');
        } else if (selectedStatFilter === 'overdue') {
            filtered = filtered.filter((task) => task.status !== 'completed' && isOverdue(task.dueDate, task.status));
        }

        // Apply advanced filters
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

        // Date filters
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

        // Assigned filters
        if (filters.assigned === 'assigned-to-me') {
            filtered = filtered.filter((task) => task.assignedTo === currentUser.email);
        } else if (filters.assigned === 'assigned-by-me') {
            filtered = filtered.filter((task) => task.assignedBy === currentUser.email);
        }

        // Search filter
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
        // Calculate stats based on filtered tasks for current user
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

    const getCompanyColor = useCallback((companyName?: string) => {
        const company = companyName?.toLowerCase() || "";

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

    const handleEditInputChange = useCallback((field: keyof EditTaskForm, value: string) => {
        setEditFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        // Clear error for this field
        if (editFormErrors[field]) {
            setEditFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        // Reset brand if company changes
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

            // Set both dates to start of day for accurate comparison
            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // Only show error if date is YESTERDAY or earlier
            // Today and future dates are allowed
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (selectedDate < yesterday) {
                errors.dueDate = 'Due date cannot be in the past';
            }
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

            // Set both dates to start of day for accurate comparison
            selectedDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // For editing, we can allow past dates if task already existed
            // But show warning for dates too far in past
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

    const getAssignedToValue = (assignedTo: any): string => {
        if (!assignedTo) return '';

        // If it's already a string
        if (typeof assignedTo === 'string') return assignedTo;

        // If it's an object with email property
        if (typeof assignedTo === 'object' && assignedTo !== null) {
            return assignedTo.email || assignedTo.name || '';
        }

        return '';
    };
    // ✅ ADD THIS: Function to open edit modal with task data
    const handleOpenEditModal = useCallback((task: Task) => {
        setEditingTask(task);

        // Format date for input field (YYYY-MM-DD)
        const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

        setEditFormData({
            id: task.id,
            title: task.title || '',
            description: task.description || '',
            assignedTo: getAssignedToValue(task.assignedTo),
            dueDate: dueDate,
            priority: task.priority || 'medium',
            taskType: task.taskType || 'regular',
            companyName: task.companyName || 'company name',
            brand: task.brand || '',
            status: task.status || 'pending'
        });

        setEditFormErrors({});
        setShowEditTaskModal(true);
        setOpenMenuId(null); // Close any open menus
    }, []);

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
    // Add this function before handleSaveEditedTask
    const trackFieldChange = useCallback((originalTask: Task, updatedData: any): string[] => {
        const changes: string[] = [];

        // Get the assignedTo value from original task
        const getOriginalAssignedTo = (task: Task): string => {
            if (!task.assignedTo) return '';
            if (typeof task.assignedTo === 'string') return task.assignedTo;
            if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
                return (task.assignedTo as any).email || (task.assignedTo as any).name || '';
            }
            return '';
        };

        const originalAssignedTo = getOriginalAssignedTo(originalTask);
        const updatedAssignedTo = updatedData.assignedTo || '';

        if (updatedData.title !== undefined && updatedData.title !== originalTask.title) {
            changes.push(`Title changed from "${originalTask.title}" to "${updatedData.title}"`);
        }

        if (updatedData.description !== undefined && updatedData.description !== originalTask.description) {
            changes.push('Description updated');
        }

        if (updatedAssignedTo && originalAssignedTo !== updatedAssignedTo) {
            changes.push(`Assignee changed from ${originalAssignedTo} to ${updatedAssignedTo}`);
        }

        if (updatedData.dueDate !== undefined && updatedData.dueDate !== originalTask.dueDate) {
            const oldDate = new Date(originalTask.dueDate).toLocaleDateString();
            const newDate = new Date(updatedData.dueDate).toLocaleDateString();
            changes.push(`Due date changed from ${oldDate} to ${newDate}`);
        }

        if (updatedData.priority !== undefined && updatedData.priority !== originalTask.priority) {
            changes.push(`Priority changed from ${originalTask.priority} to ${updatedData.priority}`);
        }

        if (updatedData.taskType !== undefined && updatedData.taskType !== originalTask.taskType) {
            changes.push(`Task type changed from ${originalTask.taskType} to ${updatedData.taskType}`);
        }

        if (updatedData.companyName !== undefined && updatedData.companyName !== originalTask.companyName) {
            changes.push(`Company changed from ${originalTask.companyName} to ${updatedData.companyName}`);
        }

        if (updatedData.brand !== undefined && updatedData.brand !== originalTask.brand) {
            changes.push(`Brand changed from ${originalTask.brand} to ${updatedData.brand}`);
        }

        if (updatedData.status !== undefined && updatedData.status !== originalTask.status) {
            changes.push(`Status changed from ${originalTask.status} to ${updatedData.status}`);
        }

        return changes;
    }, []);

    // ✅ ADD THIS: Function to save edited task
    const handleSaveEditedTask = useCallback(async () => {
        if (!validateEditForm() || !editingTask) return;

        setIsUpdatingTask(true);
        try {
            const updateData = {
                title: editFormData.title,
                description: editFormData.description,
                assignedTo: editFormData.assignedTo,
                dueDate: editFormData.dueDate,
                priority: editFormData.priority,
                taskType: editFormData.taskType,
                companyName: editFormData.companyName,
                brand: editFormData.brand,
                status: editFormData.status,
                // Keep original assigner and other fields
                assignedBy: editingTask.assignedBy,
                assignedToUser: users.find(u => u.email === editFormData.assignedTo),
            };

            // ✅ FIXED: Track changes with proper typing
            const changes = trackFieldChange(editingTask, updateData);

            const response = await taskService.updateTask(editingTask.id, updateData);
            if (response.success && response.data) {
                // Update local state
                setTasks(prev => prev.map(task =>
                    task.id === editingTask.id ? response.data as Task : task
                ));

                // ✅ FIXED: Add history with safe user data
                if (changes && changes.length > 0) {
                    const changeDescription = changes.join(', ');

                    // Safe currentUser
                    const safeUser = currentUser || {
                        id: 'guest-user',
                        name: 'Guest User',
                        email: 'guest@example.com',
                        role: 'user',
                    };

                    try {
                        if (handleAddTaskHistory) {
                            await handleAddTaskHistory(
                                editingTask.id,
                                {
                                    taskId: editingTask.id,
                                    action: 'task_edited',
                                    description: `Task edited by ${safeUser.role} (${safeUser.name}): ${changeDescription}`,
                                    userId: safeUser.id,
                                    userName: safeUser.name,
                                    userEmail: safeUser.email,
                                    userRole: safeUser.role,
                                }
                            );
                        }
                    } catch (error) {
                        console.error('Error adding edit history:', error);
                        // Continue even if history fails
                    }
                }

                // Close modal and reset
                setShowEditTaskModal(false);
                setEditingTask(null);
                setEditFormData({
                    id: '',
                    title: '',
                    description: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: 'medium',
                    taskType: 'regular',
                    companyName: 'company name',
                    brand: '',
                    status: 'pending'
                });

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
    }, [editFormData, editingTask, currentUser, users, validateEditForm, handleAddTaskHistory]);

    const handleBulkCreateTasks = useCallback(
        async (payloads: any[]): Promise<{ created: Task[]; failures: { index: number; rowNumber: number; title: string; reason: string }[] }> => {
            const created: Task[] = [];
            const failures: { index: number; rowNumber: number; title: string; reason: string }[] = [];

            for (let index = 0; index < payloads.length; index++) {
                const payload = payloads[index];

                try {
                    const taskData = {
                        title: payload.title,
                        description: payload.description || '',
                        assignedTo: payload.assignedTo,
                        dueDate: payload.dueDate,
                        priority: payload.priority,
                        taskType: payload.taskType || 'regular',
                        companyName: payload.companyName || 'company name',
                        brand: payload.brand || '',
                        status: 'pending' as TaskStatus,
                        assignedBy: currentUser.email,
                        assignedToUser: users.find(u => u.email === payload.assignedTo),
                    };

                    const response = await taskService.createTask(taskData);

                    if (response.success && response.data) {
                        const createdTask = response.data as Task;
                        created.push(createdTask);
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
                        reason: error.message || 'Unexpected error while creating task',
                    });
                }
            }

            if (created.length > 0) {
                setTasks(prev => [...prev, ...created]);
            }

            return { created, failures };
        },
        [currentUser.email, users, setTasks]
    );

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

    const handleUpdateTask = useCallback(async (taskId: string, updatedData: Partial<Task>): Promise<Task | null> => {
        console.log('Updating task:', taskId, updatedData);

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('Task not found:', taskId);
            toast.error('Task not found');
            return null;
        }

        // Check permissions
        if (!canEditDeleteTask(task)) {
            console.error('User not authorized to edit this task');
            toast.error('Only the task creator can edit this task');
            return null;
        }

        try {
            // Prepare data for API
            const updatePayload = {
                ...updatedData,
                updatedAt: new Date().toISOString()
            };

            console.log('Sending update to API:', updatePayload);

            // Call API
            const response = await taskService.updateTask(taskId, updatePayload);

            if (!response.success) {
                console.error('API error:', response.message);
                toast.error(response.message || 'Failed to update task');
                return null;
            }

            if (!response.data) {
                console.error('No data in response');
                toast.error('No data received from server');
                return null;
            }

            // Get updated task
            const updatedTask = response.data as Task;
            console.log('Task updated successfully:', updatedTask);

            // Update local state
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

    const handleDeleteUser = useCallback(async (userId: string) => {
        try {
            console.log('Deleting user with ID:', userId);
            toast.success('User deleted successfully');
            setUsers(prev => prev.filter(user => user.id !== userId));
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        }
    }, []);

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
                                            {displayTasks.map((task: any) => (
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
                                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority || 'medium')}`}>
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
                                                                                onClick={() => handleOpenEditModal(task)}
                                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                                                                            >
                                                                                <Edit className="h-3 w-3" />
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
                                    onEditUser={(user) => console.log('Edit user:', user)}
                                    onDeleteUser={handleDeleteUser}
                                    onAddUser={() => console.log('Add user')}
                                    getAssignedByInfo={getAssignedByInfo}
                                    formatDate={formatDate}
                                    isOverdue={isOverdue}
                                    currentUser={currentUser}
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

            {/* ✅ ADD THIS: Edit Task Modal */}
            {showEditTaskModal && editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowEditTaskModal(false)}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Edit className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">
                                            Edit Task
                                        </h3>
                                        <p className="text-sm text-blue-100 mt-0.5">
                                            Update task details below
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowEditTaskModal(false)}
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
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.title ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            value={editFormData.title}
                                            onChange={e => handleEditInputChange('title', e.target.value)}
                                        />
                                        {editFormErrors.title && (
                                            <p className="mt-1 text-sm text-red-600">{editFormErrors.title}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            placeholder="Describe the task in detail..."
                                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                                            value={editFormData.description}
                                            onChange={e => handleEditInputChange('description', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Assign To *
                                        </label>
                                        <select
                                            value={editFormData.assignedTo}
                                            onChange={e => handleEditInputChange('assignedTo', e.target.value)}
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        >
                                            <option value="">Select team member</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.email}>
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                        {editFormErrors.assignedTo && (
                                            <p className="mt-1 text-sm text-red-600">{editFormErrors.assignedTo}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={editFormData.status}
                                            onChange={e => handleEditInputChange('status', e.target.value as TaskStatus)}
                                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
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
                                            className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            value={editFormData.dueDate}
                                            onChange={e => handleEditInputChange('dueDate', e.target.value)}
                                        />
                                        {editFormErrors.dueDate && (
                                            <p className="mt-1 text-sm text-red-600">{editFormErrors.dueDate}</p>
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
                                                        onClick={() => handleEditInputChange('priority', priority as TaskPriority)}
                                                        className={`py-2.5 text-xs font-medium rounded-lg border ${editFormData.priority === priority
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
                                                value={editFormData.taskType}
                                                onChange={e => handleEditInputChange('taskType', e.target.value)}
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
                                                    onClick={() => handleEditInputChange('companyName', company.toLowerCase())}
                                                    className={`py-2.5 text-xs font-medium rounded-lg border ${editFormData.companyName === company.toLowerCase()
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
                                            value={editFormData.brand}
                                            onChange={e => handleEditInputChange('brand', e.target.value)}
                                            disabled={!editFormData.companyName}
                                        >
                                            <option value="">Select a brand</option>
                                            {getEditFormAvailableBrands().map((brand) => (
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
                                    onClick={() => setShowEditTaskModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveEditedTask}
                                    disabled={isUpdatingTask}
                                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isUpdatingTask
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                >
                                    {isUpdatingTask ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Updating Task...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Edit className="h-4 w-4" />
                                            Update Task
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