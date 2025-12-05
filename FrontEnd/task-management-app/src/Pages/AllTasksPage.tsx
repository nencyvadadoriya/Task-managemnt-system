import {
  X,
  Send,
  User,
  Clock,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  History,
  UserPlus,
  Check,
  CheckCircle,
  Plus,
  Edit,
  Loader2,
  Search,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import type { Task, UserType, CommentType, TaskHistory } from '../Types/Types';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useState } from 'react';

interface AllTasksPageProps {
  tasks: Task[];
  filter: string;
  setFilter: (filter: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  assignedFilter: string;
  setAssignedFilter?: (filter: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: UserType;
  users: UserType[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  getEmailById?: (userId: any) => string;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onToggleTaskStatus: (taskId: string, currentStatus: Task['status'], doneByAdmin?: boolean) => Promise<void>;
  onCreateTask: () => void;
  onSaveComment?: (taskId: string, comment: string) => Promise<CommentType | null>;
  onDeleteComment?: (taskId: string, commentId: string) => Promise<void>;
  onFetchTaskComments?: (taskId: string) => Promise<CommentType[]>;
  onReassignTask?: (taskId: string, newAssigneeId: string) => Promise<void>;
  onAddTaskHistory?: (taskId: string, history: Omit<TaskHistory, 'id' | 'timestamp'>) => Promise<void>;
  onApproveTask?: (taskId: string, approve: boolean) => Promise<void>;
  onUpdateTaskApproval?: (taskId: string, completedApproval: boolean) => Promise<void>;
  onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>; // ✅ NEW: Fetch history
}

const AllTasksPage: React.FC<AllTasksPageProps> = ({
  tasks,
  filter,
  setFilter,
  dateFilter,
  setDateFilter,
  assignedFilter,
  setAssignedFilter,
  searchTerm,
  setSearchTerm,
  currentUser,
  users,
  onEditTask,
  onDeleteTask,
  getEmailById,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  openMenuId,
  setOpenMenuId,
  onToggleTaskStatus,
  onCreateTask,
  onSaveComment,
  onDeleteComment,
  onFetchTaskComments,
  onReassignTask,
  onAddTaskHistory,
  onApproveTask,
  onUpdateTaskApproval,
  onFetchTaskHistory // ✅ NEW
}) => {
  const [sortBy, setSortBy] = useState<'title' | 'dueDate' | 'status' | 'priority'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [deletingTasks, setDeletingTasks] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [togglingStatusTasks, setTogglingStatusTasks] = useState<string[]>([]);
  const [approvingTasks, setApprovingTasks] = useState<string[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string[]>([]);

  // Comment related states
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [taskComments, setTaskComments] = useState<Record<string, CommentType[]>>({});
  
  // ✅ NEW: Task History State
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, Task['status']>>({});
  const [taskDoneByMap, setTaskDoneByMap] = useState<Record<string, 'user' | 'admin' | 'pending_approval' | 'assigner_permanent'>>({});
  const [taskCompletedByMap, setTaskCompletedByMap] = useState<Record<string, string>>({});
  const [taskCompletedAtMap, setTaskCompletedAtMap] = useState<Record<string, string>>({});
  const [taskApprovalMap, setTaskApprovalMap] = useState<Record<string, boolean>>({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [taskToApprove, setTaskToApprove] = useState<Task | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [commentViewMode, setCommentViewMode] = useState<'compact' | 'expanded'>('compact');

  const isAdmin = currentUser?.role === 'admin';

  // ✅ Function to add history with timestamp
  const addHistoryRecord = async (taskId: string, action: string, description: string) => {
    if (!onAddTaskHistory) return;
    
    try {
      await onAddTaskHistory(taskId, {
        action,
        description,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userRole: currentUser.role
      });
      
      // Refresh history if sidebar is open
      if (selectedTask?.id === taskId && onFetchTaskHistory) {
        const history = await onFetchTaskHistory(taskId);
        setTaskHistory(prev => ({
          ...prev,
          [taskId]: history
        }));
      }
    } catch (error) {
      console.error('Error adding history:', error);
    }
  };

  // ✅ Load task history when sidebar opens
  useEffect(() => {
    if (selectedTask && onFetchTaskHistory && !taskHistory[selectedTask.id]) {
      const loadHistory = async () => {
        setLoadingHistory(prev => ({ ...prev, [selectedTask.id]: true }));
        try {
          const history = await onFetchTaskHistory(selectedTask.id);
          setTaskHistory(prev => ({
            ...prev,
            [selectedTask.id]: history
          }));
        } catch (error) {
          console.error('Error loading task history:', error);
        } finally {
          setLoadingHistory(prev => ({ ...prev, [selectedTask.id]: false }));
        }
      };
      loadHistory();
    }
  }, [selectedTask, onFetchTaskHistory]);

  // Initialize approval map from tasks
  useEffect(() => {
    const initialApprovalMap: Record<string, boolean> = {};
    const initialDoneByMap: Record<string, 'user' | 'admin' | 'pending_approval' | 'assigner_permanent'> = {};
    const initialStatusMap: Record<string, Task['status']> = {};
    const initialCompletedByMap: Record<string, string> = {};
    const initialCompletedAtMap: Record<string, string> = {};
    
    tasks.forEach(task => {
      initialApprovalMap[task.id] = Boolean(task.completedApproval);
      initialStatusMap[task.id] = task.status;
      initialCompletedAtMap[task.id] = task.updatedAt || new Date().toISOString();
      
      if (task.completedApproval) {
        initialDoneByMap[task.id] = 'assigner_permanent';
        initialCompletedByMap[task.id] = 'Assigner';
      } else if (task.status === 'completed') {
        const adminApproved = task.history?.some(h => 
          h.action === 'admin_approved' || 
          (h.action === 'completed' && h.userRole === 'admin')
        );
        
        if (adminApproved) {
          initialDoneByMap[task.id] = 'admin';
          initialCompletedByMap[task.id] = task.history?.find(h => h.action === 'completed' && h.userRole === 'admin')?.userName || 'Admin';
        } else {
          initialDoneByMap[task.id] = 'pending_approval';
          initialCompletedByMap[task.id] = task.history?.find(h => h.action === 'completed' && h.userRole !== 'admin')?.userName || 'User';
        }
      } else {
        initialDoneByMap[task.id] = 'user';
        initialCompletedByMap[task.id] = '';
      }
    });
    
    setTaskApprovalMap(initialApprovalMap);
    setTaskDoneByMap(initialDoneByMap);
    setTaskStatusMap(initialStatusMap);
    setTaskCompletedByMap(initialCompletedByMap);
    setTaskCompletedAtMap(initialCompletedAtMap);
  }, [tasks]);

  // ✅ Check if task is permanently approved
  const isTaskPermanentlyApproved = (taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return Boolean(task?.completedApproval) || taskApprovalMap[taskId] === true;
  };

  // ✅ Check if task is completed
  const isTaskCompleted = (taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status === 'completed' || isTaskPermanentlyApproved(taskId);
  };

  // ✅ Get task done by
  const getTaskDoneBy = (taskId: string): 'user' | 'admin' | 'pending_approval' | 'assigner_permanent' => {
    if (isTaskPermanentlyApproved(taskId)) {
      return 'assigner_permanent';
    }
    return taskDoneByMap[taskId] || 'user';
  };

  // ✅ Check if task is pending admin approval
  const isTaskPendingApproval = (taskId: string): boolean => {
    const doneBy = getTaskDoneBy(taskId);
    return doneBy === 'pending_approval';
  };

  // ✅ Check if task is admin approved
  const isTaskAdminApproved = (taskId: string): boolean => {
    const doneBy = getTaskDoneBy(taskId);
    return doneBy === 'admin';
  };

  // ✅ Handle Permanent Approval with HISTORY
  const handlePermanentApproval = async (taskId: string, value: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setUpdatingApproval(prev => [...prev, taskId]);

    try {
      // ✅ FIRST: Update database via API
      if (onUpdateTaskApproval) {
        await onUpdateTaskApproval(taskId, value);
      }

      // ✅ THEN: Update local state
      setTaskApprovalMap(prev => ({
        ...prev,
        [taskId]: value
      }));

      if (value) {
        // Mark as permanently approved
        setTaskDoneByMap(prev => ({
          ...prev,
          [taskId]: 'assigner_permanent'
        }));
        
        setTaskCompletedByMap(prev => ({
          ...prev,
          [taskId]: 'Assigner'
        }));
        
        setTaskStatusMap(prev => ({
          ...prev,
          [taskId]: 'completed'
        }));
        
        // ✅ ADD HISTORY: Task permanently approved
        await addHistoryRecord(
          taskId,
          'assigner_permanent_approved',
          `Task PERMANENTLY approved by Assigner on ${new Date().toLocaleString()}`
        );
        
        toast.success("✅ Task PERMANENTLY approved!");
      } else {
        // Remove permanent approval
        setTaskDoneByMap(prev => ({
          ...prev,
          [taskId]: 'pending_approval'
        }));
        
        setTaskCompletedByMap(prev => ({
          ...prev,
          [taskId]: 'User'
        }));
        
        // ✅ ADD HISTORY: Permanent approval removed
        await addHistoryRecord(
          taskId,
          'permanent_approval_removed',
          `Permanent approval REMOVED by Assigner on ${new Date().toLocaleString()}`
        );
        
        toast.success("🔄 Permanent approval removed!");
      }

    } catch (error) {
      console.error('Error updating permanent approval:', error);
      toast.error("Failed to update approval status");
      
      // Rollback on error
      setTaskApprovalMap(prev => ({
        ...prev,
        [taskId]: !value
      }));
    } finally {
      setUpdatingApproval(prev => prev.filter(id => id !== taskId));
    }
  };

  // ✅ Handle Admin Approval with HISTORY
  const handleApproveTask = async (approve: boolean) => {
    if (!taskToApprove || !onApproveTask) {
      toast.error('Unable to process approval');
      return;
    }

    setApprovingTasks(prev => [...prev, taskToApprove.id]);

    try {
      await onApproveTask(taskToApprove.id, approve);

      if (approve) {
        setTaskDoneByMap(prev => ({
          ...prev,
          [taskToApprove.id]: 'admin'
        }));

        // ✅ ADD HISTORY: Admin approved
        await addHistoryRecord(
          taskToApprove.id,
          'admin_approved',
          `Task APPROVED by Admin on ${new Date().toLocaleString()}`
        );

        toast.success('✅ Task approved by Admin!');
      } else {
        setTaskStatusMap(prev => ({
          ...prev,
          [taskToApprove.id]: 'pending'
        }));

        setTaskDoneByMap(prev => ({
          ...prev,
          [taskToApprove.id]: 'user'
        }));
        
        setTaskApprovalMap(prev => ({
          ...prev,
          [taskToApprove.id]: false
        }));

        // ✅ ADD HISTORY: Admin rejected
        await addHistoryRecord(
          taskToApprove.id,
          'rejected_by_admin',
          `Task completion REJECTED by Admin on ${new Date().toLocaleString()}`
        );

        toast.success('❌ Task rejected by Admin');
      }

      handleCloseApprovalModal();
    } catch (error) {
      console.error('Error in approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setApprovingTasks(prev => prev.filter(id => id !== taskToApprove.id));
    }
  };

  // ✅ Handle Task Status Toggle with HISTORY
  const handleToggleTaskStatusInternal = async (taskId: string, originalTask: Task) => {
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isAssignee = isTaskAssignee(originalTask);
    const isAssigner = isTaskAssigner(originalTask);
    const isCompleted = isTaskCompleted(taskId);

    // If task is permanently approved and user is assignee (not assigner), cannot change
    if (isPermanentlyApproved && isAssignee && !isAssigner) {
      toast.error("This task has been PERMANENTLY approved by assigner and cannot be changed.");
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTogglingStatusTasks(prev => [...prev, taskId]);

    try {
      if (isCompleted) {
        // Mark as pending
        await onToggleTaskStatus(taskId, 'completed', false);
        
        // Update local state
        if (isPermanentlyApproved) {
          setTaskApprovalMap(prev => ({ ...prev, [taskId]: false }));
          setTaskDoneByMap(prev => ({ ...prev, [taskId]: 'user' }));
        }
        
        // ✅ ADD HISTORY: Task marked pending
        await addHistoryRecord(
          taskId,
          'marked_pending',
          `Task marked as PENDING by ${isAssigner ? 'Assigner' : 'Assignee'} on ${new Date().toLocaleString()}`
        );
        
        toast.success('Task marked as pending');
      } else {
        // Mark as completed
        await onToggleTaskStatus(taskId, task.status, false);
        
        // Update local state
        setTaskDoneByMap(prev => ({ ...prev, [taskId]: 'pending_approval' }));
        setTaskCompletedByMap(prev => ({ ...prev, [taskId]: currentUser.name }));
        setTaskCompletedAtMap(prev => ({ ...prev, [taskId]: new Date().toISOString() }));
        
        // ✅ ADD HISTORY: Task marked completed
        await addHistoryRecord(
          taskId,
          'marked_completed',
          `Task marked as COMPLETED by ${isAssigner ? 'Assigner' : 'Assignee'} on ${new Date().toLocaleString()} - Waiting for admin approval`
        );
        
        toast.success('✅ Task marked as completed! Waiting for admin approval.');
      }
    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setTogglingStatusTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  // ✅ Handle Task Edit with HISTORY
  const handleEditTask = async (task: Task) => {
    try {
      await onEditTask(task);
      // ✅ ADD HISTORY: Task edited
      await addHistoryRecord(
        task.id,
        'task_edited',
        `Task EDITED by ${currentUser.role} on ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error('Error editing task:', error);
    }
  };

  // ✅ Handle Task Reassign with HISTORY
  const handleReassignTaskInternal = async () => {
    if (!reassignTask || !newAssigneeId || !onReassignTask) return;

    setReassignLoading(true);
    try {
      await onReassignTask(reassignTask.id, newAssigneeId);
      
      const newAssignee = users.find(u => u.id === newAssigneeId);
      
      // ✅ ADD HISTORY: Task reassigned
      await addHistoryRecord(
        reassignTask.id,
        'task_reassigned',
        `Task REASSIGNED from ${getEmailByIdInternal(reassignTask.assignedTo)} to ${newAssignee?.email || newAssigneeId} by ${currentUser.role} on ${new Date().toLocaleString()}`
      );
      
      toast.success('Task reassigned successfully');
      handleCloseReassignModal();
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error('Failed to reassign task');
    } finally {
      setReassignLoading(false);
    }
  };

  // ✅ Handle Task Delete with HISTORY (but task delete hone se pehle)
  const handleDeleteTaskInternal = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // ✅ ADD HISTORY: Task deletion (before actual deletion)
    try {
      await addHistoryRecord(
        taskId,
        'task_deleted',
        `Task DELETED by ${currentUser.role} on ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error('Error adding delete history:', error);
    }

    setDeletingTasks(prev => [...prev, taskId]);
    try {
      await onDeleteTask(taskId);
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  // ✅ Get Combined Timeline Items (Comments + History)
  const getTimelineItems = (taskId: string): Array<{
    id: string;
    type: 'comment' | 'history';
    data: CommentType | TaskHistory;
    timestamp: string;
    displayTime: string;
  }> => {
    const items: Array<{
      id: string;
      type: 'comment' | 'history';
      data: CommentType | TaskHistory;
      timestamp: string;
      displayTime: string;
    }> = [];

    // Add comments
    if (taskComments[taskId]) {
      taskComments[taskId].forEach(comment => {
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          data: comment,
          timestamp: comment.createdAt,
          displayTime: formatCommentTime(comment.createdAt)
        });
      });
    }

    // Add task history from state (fetched from API)
    if (taskHistory[taskId]) {
      taskHistory[taskId].forEach(history => {
        items.push({
          id: `history-${history.id}`,
          type: 'history',
          data: history,
          timestamp: history.timestamp,
          displayTime: new Date(history.timestamp).toLocaleString()
        });
      });
    }

    // Add task history from task object (initial load)
    const task = tasks.find(t => t.id === taskId);
    if (task?.history && Array.isArray(task.history)) {
      task.history.forEach(history => {
        // Avoid duplicates
        if (!items.some(item => item.type === 'history' && (item.data as TaskHistory).id === history.id)) {
          items.push({
            id: `history-${history.id}`,
            type: 'history',
            data: history,
            timestamp: history.timestamp,
            displayTime: new Date(history.timestamp).toLocaleString()
          });
        }
      });
    }

    // Sort by timestamp, most recent first
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getCommentCount = (task: Task): number => {
    if (task.comments && Array.isArray(task.comments)) {
      return task.comments.length;
    }
    return taskComments[task.id]?.length || 0;
  };

  const handleOpenCommentSidebar = async (task: Task) => {
    setSelectedTask(task);
    setShowCommentSidebar(true);
    
    if (onFetchTaskComments && !taskComments[task.id]) {
      setLoadingComments(true);
      try {
        const comments = await onFetchTaskComments(task.id);
        setTaskComments(prev => ({
          ...prev,
          [task.id]: comments
        }));
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleCloseCommentSidebar = () => {
    setShowCommentSidebar(false);
    setSelectedTask(null);
    setNewComment('');
    setCommentLoading(false);
    setDeletingCommentId(null);
  };

  const handleSaveComment = async () => {
    if (!selectedTask || !newComment.trim() || !onSaveComment) return;

    setCommentLoading(true);
    try {
      const comment = await onSaveComment(selectedTask.id, newComment);
      if (comment) {
        setTaskComments(prev => ({
          ...prev,
          [selectedTask.id]: [...(prev[selectedTask.id] || []), comment]
        }));
        setNewComment('');
        toast.success('Comment added successfully');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask || !onDeleteComment) return;

    setDeletingCommentId(commentId);
    try {
      await onDeleteComment(selectedTask.id, commentId);
      setTaskComments(prev => ({
        ...prev,
        [selectedTask.id]: (prev[selectedTask.id] || []).filter(comment => comment.id !== commentId)
      }));
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatCommentTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleOpenReassignModal = (task: Task) => {
    setReassignTask(task);
    setShowReassignModal(true);
  };

  const handleCloseReassignModal = () => {
    setShowReassignModal(false);
    setReassignTask(null);
    setNewAssigneeId('');
    setReassignLoading(false);
  };

  const getEmailByIdInternal = (userId: any): string => {
    if (getEmailById) {
      const email = getEmailById(userId);
      if (email && email !== 'Unknown') return email;
    }

    if (typeof userId === 'string' && userId.includes('@')) {
      return userId;
    }

    const searchStr = String(userId || '').trim();
    if (!searchStr || searchStr === 'undefined' || searchStr === 'null') {
      return 'Unknown';
    }

    const user = users.find(u => {
      if (u.email && u.email.toLowerCase() === searchStr.toLowerCase()) return true;
      if (u.id && u.id.toString() === searchStr) return true;
      if (u._id && u._id.toString() === searchStr) return true;
      if (u.name && u.name.toLowerCase() === searchStr.toLowerCase()) return true;
      return false;
    });

    if (user) {
      return user.email || user.name || 'Unknown';
    }

    if (typeof userId === 'object' && userId !== null) {
      const userObj = userId as any;
      if (userObj.email) return userObj.email;
      if (userObj.name) return userObj.name;
    }

    if (typeof userId === 'string') {
      if (userId.includes('@')) return userId;
      return 'Unknown';
    }

    return 'Unknown';
  };

  const getAssignerEmail = (task: Task): string => {
    if (!task.assignedBy) return 'Unknown';

    if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
      const assignerObj = task.assignedBy as any;
      if (assignerObj.email) return assignerObj.email;
      if (assignerObj.name) return assignerObj.name;
    }

    return getEmailByIdInternal(task.assignedBy);
  };

  const isTaskAssigner = (task: Task): boolean => {
    const assignerEmail = getAssignerEmail(task);
    const currentUserEmail = currentUser?.email;

    if (!assignerEmail || assignerEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assignerEmail.toLowerCase() === currentUserEmail.toLowerCase();
  };

  const isTaskAssignee = (task: Task): boolean => {
    const assigneeEmail = getEmailByIdInternal(task.assignedTo);
    const currentUserEmail = currentUser?.email;

    if (!assigneeEmail || assigneeEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assigneeEmail.toLowerCase() === currentUserEmail.toLowerCase();
  };

  const getUserInfoForDisplay = (task: Task): { name: string; email: string } => {
    if (task.assignedToUser && task.assignedToUser.email) {
      return {
        name: task.assignedToUser.name || task.assignedToUser.email.split('@')[0] || 'User',
        email: task.assignedToUser.email
      };
    }

    const assignedTo = task.assignedTo;
    if (typeof assignedTo === 'string') {
      if (assignedTo.includes('@')) {
        return {
          name: assignedTo.split('@')[0] || 'User',
          email: assignedTo
        };
      } else {
        const user = users.find(u =>
          u.id === assignedTo ||
          u._id === assignedTo ||
          u.email === assignedTo
        );

        if (user) {
          return {
            name: user.name || user.email?.split('@')[0] || 'User',
            email: user.email || 'unknown@example.com'
          };
        }

        return {
          name: 'User',
          email: assignedTo
        };
      }
    }

    return {
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTasks(filteredTasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => (
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    ));
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks? This action cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          // ✅ ADD HISTORY: Task deletion
          await addHistoryRecord(
            taskId,
            'task_deleted',
            `Task DELETED by ${currentUser.role} on ${new Date().toLocaleString()}`
          );
        }
        await onDeleteTask(taskId);
      }
      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks deleted successfully`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Failed to delete selected tasks');
    } finally {
      setBulkDeleting(false);
    }
  };

  // ✅ Get task status icon
  const getTaskStatusIcon = (taskId: string, isCompleted: boolean, isToggling: boolean) => {
    if (isToggling) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (isCompleted) {
      const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);

      if (isPermanentlyApproved) {
        return (
          <div className="relative" title="PERMANENTLY Approved by Assigner">
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </div>
        );
      } else {
        return <Check className="h-4 w-4 text-green-500" title="Completed" />;
      }
    } else {
      return <div className="h-4 w-4 border border-gray-400 rounded"></div>;
    }
  };

  // ✅ Get status badge color
  const getStatusBadgeColor = (taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      } else {
        return 'bg-green-100 text-green-800 border border-green-200';
      }
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  // ✅ Get status text
  const getStatusText = (taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return '✅ PERMANENTLY Approved';
      } else {
        return '⏳ Pending Admin Approval';
      }
    }
    return 'Pending';
  };

  // ✅ Handle admin approval modal
  const handleOpenApprovalModal = (task: Task, action: 'approve' | 'reject') => {
    setTaskToApprove(task);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setTaskToApprove(null);
    setApprovalAction('approve');
  };

  // ✅ Filter tasks
  const filteredTasks = useMemo(() => {
    const safeCurrentUserId = currentUser?.id || 'unknown';

    let filtered = tasks.filter(task => {
      const isCompleted = isTaskCompleted(task.id);
      
      if (filter !== 'all') {
        if (filter === 'completed' && !isCompleted) return false;
        if (filter === 'pending' && isCompleted) return false;
        if (filter === 'in-progress' && task.status !== 'in-progress') return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      if (dateFilter === 'today' && taskDate.getTime() !== today.getTime()) return false;
      if (dateFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        if (taskDate > weekFromNow) return false;
      }
      if (dateFilter === 'overdue' && !isOverdue(task.dueDate, task.status)) return false;

      const taskAssigneeEmail = getEmailByIdInternal(task.assignedTo);
      const taskAssignerEmail = getAssignerEmail(task);
      const currentUserEmail = currentUser?.email;

      if (assignedFilter) {
        if (assignedFilter === 'assigned-to-me' && !isTaskAssignee(task)) return false;
        if (assignedFilter === 'assigned-by-me' && !isTaskAssigner(task)) return false;
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(searchLower);
        const matchesDescription = task.description?.toLowerCase().includes(searchLower);
        const matchesAssignee = taskAssigneeEmail?.toLowerCase().includes(searchLower);
        const matchesAssigner = taskAssignerEmail?.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesDescription && !matchesAssignee && !matchesAssigner) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'status':
          aValue = isTaskCompleted(a.id) ? 1 : 0;
          bValue = isTaskCompleted(b.id) ? 1 : 0;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = {
            'high': 3,
            'medium': 2,
            'low': 1,
            '': 0
          };
          aValue = priorityOrder[a.priority?.toLowerCase() || ''] || 0;
          bValue = priorityOrder[b.priority?.toLowerCase() || ''] || 0;
          break;
        default:
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, filter, dateFilter, assignedFilter, searchTerm, currentUser, sortBy, sortOrder, isOverdue]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow border-b">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
              <p className="text-gray-600 mt-1">
                Manage and track all tasks in one place
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={onCreateTask}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </button>
            </div>
          </div>
          
          {/* Filters Section */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>
                
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">Next 7 Days</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                {/* Assigned Filter */}
                {setAssignedFilter && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned
                    </label>
                    <select
                      value={assignedFilter}
                      onChange={(e) => setAssignedFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="all">All Tasks</option>
                      <option value="assigned-to-me">Assigned to Me</option>
                      <option value="assigned-by-me">Assigned by Me</option>
                    </select>
                  </div>
                )}
                
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="dueDate">Due Date</option>
                      <option value="title">Title</option>
                      <option value="priority">Priority</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Tasks
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, description, assignee..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-blue-700 font-medium">
                  {selectedTasks.length} task(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  {bulkDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedTasks([])}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No tasks found</div>
            <p className="text-gray-500 mb-6">
              {searchTerm || filter !== 'all' || dateFilter !== 'all' || assignedFilter !== 'all'
                ? 'Try changing your filters or search term'
                : 'Create your first task to get started'}
            </p>
            <button
              onClick={onCreateTask}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 rounded-t-lg border text-sm font-medium text-gray-700">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
              <div className="col-span-4">Task</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
            
            {/* Task List */}
            {filteredTasks.map((task) => {
              const isCompleted = isTaskCompleted(task.id);
              const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
              const isToggling = togglingStatusTasks.includes(task.id);
              const isDeleting = deletingTasks.includes(task.id);
              const isApproving = approvingTasks.includes(task.id);
              const isUpdatingApproval = updatingApproval.includes(task.id);
              const userInfo = getUserInfoForDisplay(task);
              const isAssignee = isTaskAssignee(task);
              const isAssigner = isTaskAssigner(task);
              
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg border ${getTaskBorderColor(task)} transition-all duration-200 hover:shadow-md`}
                >
                  {/* Mobile View */}
                  <div className="md:hidden p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        
                        <button
                          onClick={() => handleToggleTaskStatusInternal(task.id, task)}
                          disabled={togglingStatusTasks.includes(task.id)}
                          className={`p-1.5 rounded-full border ${
                            isCompleted
                              ? 'bg-green-100 border-green-200 text-green-700'
                              : 'bg-gray-100 border-gray-200 text-gray-500'
                          }`}
                          title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {getTaskStatusIcon(task.id, isCompleted, isToggling)}
                        </button>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(task.id)}`}>
                              {getStatusText(task.id)}
                            </span>
                            {task.priority && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {openMenuId === task.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Task
                            </button>
                            <button
                              onClick={() => handleOpenCommentSidebar(task)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Comments ({getCommentCount(task)})
                            </button>
                            {isAdmin && onReassignTask && (
                              <button
                                onClick={() => handleOpenReassignModal(task)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <UserPlus className="h-4 w-4" />
                                Reassign
                              </button>
                            )}
                            {isAssigner && onUpdateTaskApproval && (
                              <button
                                onClick={() => handlePermanentApproval(task.id, !isPermanentlyApproved)}
                                disabled={isUpdatingApproval}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                {isUpdatingApproval ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isPermanentlyApproved ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                {isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
                              </button>
                            )}
                            {isAdmin && isTaskPendingApproval(task.id) && (
                              <>
                                <button
                                  onClick={() => handleOpenApprovalModal(task, 'approve')}
                                  disabled={isApproving}
                                  className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Check className="h-4 w-4" />
                                  {isApproving ? 'Processing...' : 'Approve Completion'}
                                </button>
                                <button
                                  onClick={() => handleOpenApprovalModal(task, 'reject')}
                                  disabled={isApproving}
                                  className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Reject Completion
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteTaskInternal(task.id)}
                              disabled={isDeleting}
                              className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete Task
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Assigned to: {userInfo.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatDate(task.dueDate)}</span>
                        {isOverdue(task.dueDate, task.status) && !isCompleted && (
                          <span className="text-red-600 font-medium">(Overdue)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Created: {formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                    
                    {task.description && (
                      <div className="mt-3 text-sm text-gray-600">
                        {task.description.length > 100
                          ? `${task.description.substring(0, 100)}...`
                          : task.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Desktop View */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 items-center">
                    {/* Checkbox */}
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => handleSelectTask(task.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </div>
                    
                    {/* Task Info */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskStatusInternal(task.id, task)}
                          disabled={togglingStatusTasks.includes(task.id)}
                          className={`p-1.5 rounded-full border ${
                            isCompleted
                              ? 'bg-green-100 border-green-200 text-green-700'
                              : 'bg-gray-100 border-gray-200 text-gray-500'
                          }`}
                          title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {getTaskStatusIcon(task.id, isCompleted, isToggling)}
                        </button>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assigned To */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="text-gray-900">{userInfo.name}</div>
                          <div className="text-gray-500 text-xs">{userInfo.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Due Date */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="text-gray-900">{formatDate(task.dueDate)}</div>
                          {isOverdue(task.dueDate, task.status) && !isCompleted && (
                            <div className="text-red-600 text-xs font-medium">Overdue</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full text-center ${getStatusBadgeColor(task.id)}`}>
                          {getStatusText(task.id)}
                        </span>
                        {task.priority && (
                          <span className={`px-2 py-1 text-xs rounded-full text-center ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenCommentSidebar(task)}
                          className="p-1.5 hover:bg-gray-100 rounded-full relative"
                          title="Comments & History"
                        >
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          {getCommentCount(task) > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {getCommentCount(task)}
                            </span>
                          )}
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-full"
                          >
                            <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {openMenuId === task.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Task
                              </button>
                              <button
                                onClick={() => handleOpenCommentSidebar(task)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <MessageSquare className="h-4 w-4" />
                                Comments & History ({getCommentCount(task)})
                              </button>
                              {isAdmin && onReassignTask && (
                                <button
                                  onClick={() => handleOpenReassignModal(task)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Reassign Task
                                </button>
                              )}
                              {isAssigner && onUpdateTaskApproval && (
                                <button
                                  onClick={() => handlePermanentApproval(task.id, !isPermanentlyApproved)}
                                  disabled={isUpdatingApproval}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  {isUpdatingApproval ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isPermanentlyApproved ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  {isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
                                </button>
                              )}
                              {isAdmin && isTaskPendingApproval(task.id) && (
                                <>
                                  <button
                                    onClick={() => handleOpenApprovalModal(task, 'approve')}
                                    disabled={isApproving}
                                    className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                  >
                                    <Check className="h-4 w-4" />
                                    {isApproving ? 'Processing...' : 'Approve Completion'}
                                  </button>
                                  <button
                                    onClick={() => handleOpenApprovalModal(task, 'reject')}
                                    disabled={isApproving}
                                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Reject Completion
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteTaskInternal(task.id)}
                                disabled={isDeleting}
                                className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Delete Task
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comment & History Sidebar */}
      {showCommentSidebar && selectedTask && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCloseCommentSidebar} />
          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full bg-white shadow-xl overflow-y-auto">
                <div className="sticky top-0 bg-white border-b z-10">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        Task: {selectedTask.title}
                      </h2>
                      <button
                        onClick={handleCloseCommentSidebar}
                        className="p-1.5 hover:bg-gray-100 rounded-full"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setCommentViewMode('compact')}
                        className={`px-3 py-1 text-sm rounded ${
                          commentViewMode === 'compact'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Compact
                      </button>
                      <button
                        onClick={() => setCommentViewMode('expanded')}
                        className={`px-3 py-1 text-sm rounded ${
                          commentViewMode === 'expanded'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Expanded
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-6 sm:px-6">
                  {/* Task Details Summary */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(selectedTask.id)}`}>
                        {getStatusText(selectedTask.id)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Assigned To:</span>
                      <span className="text-sm text-gray-600">
                        {getUserInfoForDisplay(selectedTask).email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Due Date:</span>
                      <span className="text-sm text-gray-600">
                        {formatDate(selectedTask.dueDate)}
                        {isOverdue(selectedTask.dueDate, selectedTask.status) && !isTaskCompleted(selectedTask.id) && (
                          <span className="ml-2 text-red-600">(Overdue)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  {/* Timeline Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
                  </div>
                  
                  {/* Timeline Items */}
                  <div className="space-y-4">
                    {loadingHistory[selectedTask.id] || loadingComments ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Loading activity...</p>
                      </div>
                    ) : getTimelineItems(selectedTask.id).length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">No activity yet</p>
                      </div>
                    ) : (
                      getTimelineItems(selectedTask.id).map((item) => (
                        <div
                          key={item.id}
                          className={`border-l-4 pl-4 py-3 ${
                            item.type === 'comment'
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-400 bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full ${
                                item.type === 'comment'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {item.type === 'comment' ? (
                                  <MessageSquare className="h-4 w-4" />
                                ) : (
                                  <History className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.type === 'comment'
                                    ? (item.data as CommentType).userName || 'User'
                                    : (item.data as TaskHistory).userName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.type === 'comment'
                                    ? 'Commented'
                                    : (item.data as TaskHistory).action.replace(/_/g, ' ')}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.displayTime}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-700">
                            {item.type === 'comment' ? (
                              <div>
                                {(item.data as CommentType).content}
                                {currentUser.id === (item.data as CommentType).userId && (
                                  <button
                                    onClick={() => handleDeleteComment((item.data as CommentType).id)}
                                    disabled={deletingCommentId === (item.data as CommentType).id}
                                    className="ml-2 text-xs text-red-600 hover:text-red-800"
                                  >
                                    {deletingCommentId === (item.data as CommentType).id ? 'Deleting...' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium mb-1">
                                  {(item.data as TaskHistory).action.replace(/_/g, ' ')}
                                </div>
                                <div>{(item.data as TaskHistory).description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  By: {(item.data as TaskHistory).userRole} - {(item.data as TaskHistory).userEmail}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Add Comment Section */}
                  <div className="mt-8 border-t pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add Comment</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your comment here..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveComment()}
                      />
                      <button
                        onClick={handleSaveComment}
                        disabled={!newComment.trim() || commentLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {commentLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && taskToApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve Task Completion' : 'Reject Task Completion'}
            </h3>
            <p className="text-gray-600 mb-6">
              {approvalAction === 'approve'
                ? `Are you sure you want to approve the completion of "${taskToApprove.title}"? This will mark the task as officially completed.`
                : `Are you sure you want to reject the completion of "${taskToApprove.title}"? The task will be marked as pending again.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseApprovalModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveTask(approvalAction === 'approve')}
                disabled={approvingTasks.includes(taskToApprove.id)}
                className={`px-4 py-2 rounded-lg text-white ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 flex items-center gap-2`}
              >
                {approvingTasks.includes(taskToApprove.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && reassignTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reassign Task
            </h3>
            <p className="text-gray-600 mb-4">
              Reassign "{reassignTask.title}" to another user
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Assignee
              </label>
              <select
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseReassignModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignTaskInternal}
                disabled={!newAssigneeId || reassignLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {reassignLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTasksPage;