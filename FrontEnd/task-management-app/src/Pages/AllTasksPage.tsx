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
  MessageSquare,
  Trash2,
  MoreHorizontal,
  RefreshCcw,
  Upload,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Building,
  Layers,
  FileClock,
} from 'lucide-react';

import type { Task, UserType, CommentType, TaskHistory, Brand } from '../Types/Types';
import toast from 'react-hot-toast';
import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { taskTypeService, type TaskTypeItem } from '../Services/TaskType.service';

// ==================== TYPES ====================
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
  onEditTask: (taskId: string, updatedTask: Partial<Task>) => Promise<Task | null>;
  onDeleteTask: (taskId: string) => Promise<void>;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onToggleTaskStatus: (taskId: string, currentStatus: Task['status'], doneByAdmin?: boolean) => Promise<void>;
  onCreateTask: () => Promise<Task | void>;
  onSaveComment?: (taskId: string, content: string) => Promise<CommentType>;
  onDeleteComment?: (taskId: string, commentId: string) => Promise<void>;
  onFetchTaskComments?: (taskId: string) => Promise<CommentType[]>;
  onReassignTask?: (taskId: string, newAssigneeId: string) => Promise<void>;
  onAddTaskHistory?: (taskId: string, history: Omit<TaskHistory, 'id' | 'timestamp'>, additionalData?: Record<string, any>) => Promise<void>;
  onApproveTask?: (taskId: string, approve: boolean) => Promise<void>;
  onUpdateTaskApproval?: (taskId: string, completedApproval: boolean) => Promise<void>;
  onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
  onBulkCreateTasks?: (tasks: BulkTaskPayload[]) => Promise<BulkCreateResult>;
  // Optional sidebar collapsed state from DashboardPage
  isSidebarCollapsed?: boolean;
  brands: Brand[];

  // NEW PROPS FOR INTEGRATION
  advancedFilters?: {
    status: string;
    priority: string;
    assigned: string;
    date: string;
    taskType: string;
    company: string;
    brand: string;
  };
  onAdvancedFilterChange?: (filterType: string, value: string) => void;
  showEditModal?: boolean;
  editingTask?: Task | null;
  onOpenEditModal?: (task: Task) => void;
  onCloseEditModal?: () => void;
  getBrandsByCompany?: (companyName: string) => string[];
}

type BulkPriority = 'low' | 'medium' | 'high' | 'urgent';

interface BulkTaskPayload {
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: BulkPriority;
  taskType?: string;
  companyName?: string;
  brand?: string;
  rowNumber: number;
}

interface BulkCreateFailure {
  index: number;
  rowNumber: number;
  title: string;
  reason: string;
}

interface BulkTaskDraft {
  id: string;
  rowNumber: number;
  title: string;
  assigner: string;
  dueDate: string;
  priority: BulkPriority | '';
  taskType: string;
  companyName: string;
  brand: string;
  errors: string[];
}

interface AdvancedFilters {
  status: string;
  priority: string;
  assigned: string;
  date: string;
  taskType: string;
  company: string;
  brand: string;
}

interface TaskStatusInfo {
  isCompleted: boolean;
  isPermanentlyApproved: boolean;
  isPendingApproval: boolean;
  isAdminApproved: boolean;
  statusText: string;
  badgeColor: string;
}

interface HistoryDisplayItem {
  id: string;
  type: 'history' | 'comment';
  data: TaskHistory | CommentType;
  timestamp: string;
  displayTime: string;
  actionType: string;
  color: string;
  icon: React.ReactNode;
  label: string;
}

interface MobileTaskItemProps {
  task: Task;
  isToggling: boolean;
  isDeleting: boolean;
  isApproving: boolean;
  isUpdatingApproval: boolean;
  openMenuId: string | null;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  getTaskStatusIcon: (taskId: string, isCompleted: boolean) => React.ReactNode;
  getUserInfoForDisplay: (task: Task) => { name: string; email: string };
  onToggleStatus: (taskId: string, originalTask: Task) => Promise<void>;
  onEditTaskClick: (task: Task) => void;
  onOpenCommentSidebar: (task: Task) => Promise<void>;
  onOpenReassignModal: (task: Task) => void;
  onPermanentApproval: (taskId: string, value: boolean) => Promise<void>;
  onOpenApprovalModal: (task: Task, action: 'approve' | 'reject') => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSetOpenMenuId: (id: string | null) => void;
  isTaskAssignee: (task: Task) => boolean;
  isTaskAssigner: (task: Task) => boolean;
  isTaskCompleted: (taskId: string) => boolean;
  isTaskPermanentlyApproved: (taskId: string) => boolean;
  isTaskPendingApproval: (taskId: string) => boolean;
  onOpenHistoryModal: (task: Task) => Promise<void>;
}

interface DesktopTaskItemProps {
  task: Task;
  isToggling: boolean;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskBorderColor: (task: Task) => string;
  getTaskStatusIcon: (taskId: string, isCompleted: boolean) => React.ReactNode;
  getUserInfoForDisplay: (task: Task) => { name: string; email: string };
  onToggleStatus: (taskId: string, originalTask: Task) => Promise<void>;
  onEditTaskClick: (task: Task) => void;
  onOpenCommentSidebar: (task: Task) => Promise<void>;
  onOpenHistoryModal: (task: Task) => Promise<void>;
  isTaskCompleted: (taskId: string) => boolean;
  isTaskPermanentlyApproved: (taskId: string) => boolean;
  isTaskAssignee: (task: Task) => boolean;
  isTaskAssigner: (task: Task) => boolean;
  onPermanentApproval: (taskId: string, value: boolean) => Promise<void>;
  isUpdatingApproval: boolean;
}

interface BulkActionsProps {
  selectedTasks: string[];
  bulkDeleting: boolean;
  onBulkComplete: () => void;
  onBulkPending: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

interface CommentSidebarProps {
  showCommentSidebar: boolean;
  selectedTask: Task | null;
  newComment: string;
  commentLoading: boolean;
  deletingCommentId: string | null;
  loadingComments: boolean;
  loadingHistory: boolean;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  onCloseSidebar: () => void;
  onSetNewComment: (comment: string) => void;
  onSaveComment: () => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  getTaskComments: (taskId: string) => CommentType[];
  getUserInfoForDisplay: (task: Task) => { name: string; email: string };
  isTaskCompleted: (taskId: string) => boolean;
  getStatusBadgeColor: (taskId: string) => string;
  getStatusText: (taskId: string) => string;
  formatDateTime: (timestamp: string) => string;
}

interface ApprovalModalProps {
  showApprovalModal: boolean;
  taskToApprove: Task | null;
  approvalAction: 'approve' | 'reject';
  approvingTasks: string[];
  onClose: () => void;
  onApprove: (approve: boolean) => Promise<void>;
}

interface ReassignModalProps {
  showReassignModal: boolean;
  reassignTask: Task | null;
  newAssigneeId: string;
  reassignLoading: boolean;
  users: UserType[];
  onClose: () => void;
  onAssigneeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onReassign: () => Promise<void>;
}

interface TaskHistoryModalProps {
  showHistoryModal: boolean;
  historyTask: Task | null;
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  users: UserType[];
  onClose: () => void;
  formatDate: (date: string) => string;
  getEmailByIdInternal: (userId: any) => string;
  getAssignerEmail: (task: Task) => string;
}

// ==================== CONSTANTS ====================

// History action type constants
const HISTORY_ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  'task_created': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Plus className="h-3 w-3" />, label: 'Task Created' },
  'task_edited': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Task Edited' },
  'task_deleted': { color: 'bg-red-100 text-red-800 border-red-200', icon: <Trash2 className="h-3 w-3" />, label: 'Task Deleted' },
  'marked_completed': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Check className="h-3 w-3" />, label: 'Marked Completed' },
  'marked_pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-3 w-3" />, label: 'Marked Pending' },
  'admin_approved': { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <CheckCircle className="h-3 w-3" />, label: 'Admin Approved' },
  'rejected_by_admin': { color: 'bg-red-100 text-red-800 border-red-200', icon: <X className="h-3 w-3" />, label: 'Rejected by Admin' },
  'assigner_permanent_approved': { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <Eye className="h-3 w-3" />, label: 'Permanently Approved' },
  'permanent_approval_removed': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <EyeOff className="h-3 w-3" />, label: 'Permanent Approval Removed' },
  'task_reassigned': { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: <UserPlus className="h-3 w-3" />, label: 'Task Reassigned' },
  'priority_changed': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Priority Changed' },
  'due_date_changed': { color: 'bg-pink-100 text-pink-800 border-pink-200', icon: <Calendar className="h-3 w-3" />, label: 'Due Date Changed' },
  'status_changed': { color: 'bg-teal-100 text-teal-800 border-teal-200', icon: <RefreshCcw className="h-3 w-3" />, label: 'Status Changed' },
  'comment_added': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <MessageSquare className="h-3 w-3" />, label: 'Comment Added' },
  'comment_deleted': { color: 'bg-red-100 text-red-800 border-red-200', icon: <Trash2 className="h-3 w-3" />, label: 'Comment Deleted' },
  'title_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Title Changed' },
  'description_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Description Changed' },
  'type_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Edit className="h-3 w-3" />, label: 'Task Type Changed' },
  'company_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Building className="h-3 w-3" />, label: 'Company Changed' },
  'brand_changed': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Layers className="h-3 w-3" />, label: 'Brand Changed' },
  'task_edit_failed': { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Edit Failed' },
  'bulk_completed': { color: 'bg-green-100 text-green-800 border-green-200', icon: <Check className="h-3 w-3" />, label: 'Bulk Completed' },
  'bulk_pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-3 w-3" />, label: 'Bulk Pending' },
  'default': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <History className="h-3 w-3" />, label: 'Activity' }
};

// ==================== UTILITY FUNCTIONS ====================
const formatDateTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return timestamp;
  }
};

const getTaskWithDemoData = (task: Task): Task => {
  const rawCompany = (task.companyName || (task as any).company || (task as any).companyName || '').toString();
  const rawBrand = (typeof task.brand === 'string'
    ? task.brand
    : (task.brand as any)?.name || (task as any).brand || ''
  ).toString();
  const rawType = ((task as any).taskType || (task as any).type || '').toString();

  return {
    ...task,
    company: rawCompany.toLowerCase(),
    brand: rawBrand.toLowerCase(),
    type: rawType.toLowerCase(),
  };
};

const validateBulkDraft = (draft: BulkTaskDraft): BulkTaskDraft => {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push('Title is required');
  }

  if (!draft.assigner.trim()) {
    errors.push('Assigner email is required');
  } else if (!draft.assigner.includes('@')) {
    errors.push('Invalid email format for assigner');
  }

  if (!draft.dueDate) {
    errors.push('Due date is required');
  } else {
    const dueDateObj = new Date(draft.dueDate);
    if (isNaN(dueDateObj.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  return {
    ...draft,
    errors
  };
};

// ==================== COMPONENTS ====================

// ==================== BULK ACTIONS COMPONENT ====================
const BulkActions = memo(({
  selectedTasks,
  bulkDeleting,
  onBulkComplete,
  onBulkPending,
  onBulkDelete,
  onClearSelection
}: BulkActionsProps) => {
  if (selectedTasks.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear selection
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBulkComplete}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium flex items-center gap-2"
          >
            <Check className="h-3.5 w-3.5" />
            Mark as Completed
          </button>
          <button
            onClick={onBulkPending}
            className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg font-medium flex items-center gap-2"
          >
            <Clock className="h-3.5 w-3.5" />
            Mark as Pending
          </button>
          <button
            onClick={onBulkDelete}
            disabled={bulkDeleting}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {bulkDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      </div>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';

// ==================== BULK IMPORTER COMPONENT ===================
const BulkImporter = memo(({
  draftTasks = [],
  defaults,
  users = [],
  companyBrandMap,
  availableTaskTypes,
  onDefaultsChange,
  onDraftsChange,
  onClose,
  onSubmit,
  submitting = false,
  summary = null,
  getBrandsByCompany
}: {
  draftTasks?: BulkTaskDraft[];
  defaults: BulkImportDefaults;
  users?: UserType[];
  companyBrandMap: Record<string, string[]>;
  availableTaskTypes: string[];
  onDefaultsChange: (defaults: Partial<BulkImportDefaults>) => void;
  onDraftsChange: (drafts: BulkTaskDraft[]) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting?: boolean;
  summary?: BulkCreateResult | null;
  getBrandsByCompany?: (companyName: string) => string[];
}) => {
  const [bulkTaskInput, setBulkTaskInput] = useState<string>('');

  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  // Filter brands based on selected company
  const filteredBrands = useMemo(() => {
    if (!defaults.companyName || defaults.companyName === 'all') {
      // Return all unique brands when no company or "all" selected
      if (getBrandsByCompany) {
        return getBrandsByCompany('all');
      }
      const allBrands = Object.values(companyBrandMap).flat();
      return [...new Set(allBrands)];
    }
    return companyBrandMap[defaults.companyName] || [];
  }, [defaults.companyName, companyBrandMap, getBrandsByCompany]);

  const handleFieldChange = useCallback((id: string, field: keyof BulkTaskDraft, value: string) => {
    onDraftsChange(draftTasks.map(task =>
      task.id === id ? { ...task, [field]: value, errors: [] } : task
    ));
  }, [draftTasks, onDraftsChange]);

  const handleRemoveDraft = useCallback((id: string) => {
    onDraftsChange(draftTasks.filter(task => task.id !== id));
  }, [draftTasks, onDraftsChange]);

  const handleParseBulkInput = useCallback(() => {
    if (!bulkTaskInput.trim()) {
      toast.error('Please enter task titles');
      return;
    }

    // Validate due date if provided
    if (defaults.dueDate && defaults.dueDate < today) {
      toast.error('Due date cannot be in the past');
      return;
    }

    const taskTitles = bulkTaskInput.trim().split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0);

    if (taskTitles.length === 0) {
      toast.error('No valid tasks found');
      return;
    }

    const newDrafts: BulkTaskDraft[] = taskTitles.map((title, index) => {
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
      const errors: string[] = [];

      if (!title.trim()) {
        errors.push('Task title is required');
      }

      // Validate due date for each task
      if (defaults.dueDate && defaults.dueDate < today) {
        errors.push('Due date cannot be in the past');
      }

      return {
        id: draftId,
        rowNumber: draftTasks.length + index + 1,
        title,
        assigner: defaults.assigner,
        dueDate: defaults.dueDate,
        priority: defaults.priority,
        taskType: defaults.taskType,
        companyName: defaults.companyName,
        brand: defaults.brand,
        errors
      };
    });

    // Add new tasks at the TOP of existing tasks
    onDraftsChange([...newDrafts, ...draftTasks]);
    setBulkTaskInput('');
    toast.success(`✅ ${taskTitles.length} tasks added successfully`);
  }, [bulkTaskInput, defaults, draftTasks, onDraftsChange, today]);

  // Handle company change - reset brand when company changes
  const handleCompanyChange = useCallback((companyName: string) => {
    onDefaultsChange({
      companyName: companyName,
      brand: '' // Reset brand when company changes
    });
  }, [onDefaultsChange]);

  // Apply default assigner to all tasks
  const handleApplyAssignerToAll = useCallback(() => {
    if (!defaults.assigner) {
      toast.error('Please select an assigner first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      assigner: defaults.assigner
    })));

    toast.success(`✅ Assigner applied to all ${draftTasks.length} tasks`);
  }, [defaults.assigner, draftTasks, onDraftsChange]);

  // Apply default company to all tasks
  const handleApplyCompanyToAll = useCallback(() => {
    if (!defaults.companyName) {
      toast.error('Please select a company first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      companyName: defaults.companyName
    })));

    toast.success(`✅ Company applied to all ${draftTasks.length} tasks`);
  }, [defaults.companyName, draftTasks, onDraftsChange]);

  // Apply default brand to all tasks
  const handleApplyBrandToAll = useCallback(() => {
    if (!defaults.brand) {
      toast.error('Please select a brand first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      brand: defaults.brand
    })));

    toast.success(`✅ Brand applied to all ${draftTasks.length} tasks`);
  }, [defaults.brand, draftTasks, onDraftsChange]);

  // Apply default due date to all tasks
  const handleApplyDueDateToAll = useCallback(() => {
    if (!defaults.dueDate) {
      toast.error('Please select a due date first');
      return;
    }

    // Validate due date is not in past
    if (defaults.dueDate < today) {
      toast.error('Due date cannot be in the past');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      dueDate: defaults.dueDate
    })));

    toast.success(`✅ Due date applied to all ${draftTasks.length} tasks`);
  }, [defaults.dueDate, draftTasks, onDraftsChange, today]);

  // Apply default priority to all tasks
  const handleApplyPriorityToAll = useCallback(() => {
    if (!defaults.priority) {
      toast.error('Please select a priority first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      priority: defaults.priority
    })));

    toast.success(`✅ Priority applied to all ${draftTasks.length} tasks`);
  }, [defaults.priority, draftTasks, onDraftsChange]);

  // Apply default task type to all tasks
  const handleApplyTaskTypeToAll = useCallback(() => {
    if (!defaults.taskType) {
      toast.error('Please select a task type first');
      return;
    }

    onDraftsChange(draftTasks.map(task => ({
      ...task,
      taskType: defaults.taskType
    })));

    toast.success(`✅ Task type applied to all ${draftTasks.length} tasks`);
  }, [defaults.taskType, draftTasks, onDraftsChange]);

  // Handle due date change with validation
  const handleDueDateChange = useCallback((date: string) => {
    if (date && date < today) {
      toast.error('Due date cannot be in the past');
      // Reset to empty or keep current value
      onDefaultsChange({ dueDate: '' });
    } else {
      onDefaultsChange({ dueDate: date });
    }
  }, [onDefaultsChange, today]);

  const errorCount = draftTasks.reduce((count, task) => count + task.errors.length, 0);

  // Get all unique brands for dropdown
  const getAllBrands = useCallback(() => {
    if (getBrandsByCompany) {
      return getBrandsByCompany('all');
    }
    const allBrands = Object.values(companyBrandMap).flat();
    return [...new Set(allBrands)];
  }, [companyBrandMap, getBrandsByCompany]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Task Creator</h2>
            <p className="text-sm text-gray-500 mt-1">Add tasks with selected filters</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Controls - All Dropdowns */}
        <div className="px-6 py-4 border-b bg-gray-50">
          {/* Filter Dropdowns Grid - Updated to 6 columns (no description in defaults) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            {/* Default Assigner */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Assigner *</label>
                <button
                  onClick={handleApplyAssignerToAll}
                  disabled={!defaults.assigner || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <select
                value={defaults.assigner}
                onChange={(e) => onDefaultsChange({ assigner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select assigner</option>
                {users.map(user => (
                  <option key={user.id || user.email} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Default Company */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Company *</label>
                <button
                  onClick={handleApplyCompanyToAll}
                  disabled={!defaults.companyName || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <select
                value={defaults.companyName}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select company</option>
                <option value="all">All Companies</option>
                {Object.keys(companyBrandMap).map(company => (
                  <option key={company} value={company}>
                    {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Brand (filtered by company) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Brand</label>
                <button
                  onClick={handleApplyBrandToAll}
                  disabled={!defaults.brand || !defaults.companyName || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <select
                value={defaults.brand}
                onChange={(e) => onDefaultsChange({ brand: e.target.value })}
                disabled={!defaults.companyName}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${!defaults.companyName ? 'bg-gray-100 text-gray-500' : ''}`}
              >
                <option value="">Select brand</option>
                {filteredBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Due Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Due Date</label>
                <button
                  onClick={handleApplyDueDateToAll}
                  disabled={!defaults.dueDate || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <input
                type="date"
                value={defaults.dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Default Priority */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Priority</label>
                <button
                  onClick={handleApplyPriorityToAll}
                  disabled={!defaults.priority || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <select
                value={defaults.priority}
                onChange={(e) => onDefaultsChange({ priority: e.target.value as BulkPriority })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Default Task Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Task Type</label>
                <button
                  onClick={handleApplyTaskTypeToAll}
                  disabled={!defaults.taskType || draftTasks.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Apply to all
                </button>
              </div>
              <select
                value={defaults.taskType}
                onChange={(e) => onDefaultsChange({ taskType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={availableTaskTypes.length === 0}
              >
                {availableTaskTypes.length === 0 ? (
                  <option value="">No task types available</option>
                ) : (
                  <>
                    <option value="">Select type</option>
                    {availableTaskTypes.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {typeName}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Bulk Input Section */}
          <div className="mt-4 pt-4">
            <div className="flex gap-3">
              <textarea
                value={bulkTaskInput}
                onChange={(e) => setBulkTaskInput(e.target.value)}
                placeholder="Enter multiple task titles (one per line):
Fix login issue
Update documentation
Test mobile responsiveness
Add user notifications
..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleParseBulkInput}
                  disabled={!bulkTaskInput.trim() || !defaults.assigner || !defaults.companyName}
                  className={`px-6 py-3 rounded-lg font-medium ${!bulkTaskInput.trim() || !defaults.assigner || !defaults.companyName
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  Add Bulk Tasks
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {draftTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No tasks added yet</h3>
              <p className="text-gray-500 text-sm">Use the form above to add tasks individually or in bulk</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{draftTasks.length} task(s) to create</span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {errorCount} error(s) need fixing
                    </span>
                  )}
                  {summary && summary.failures.length > 0 && (
                    <span className="inline-flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {summary.failures.length} failed to create
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(draftTasks.map(d => d.title).join('\n'))}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Copy All Titles
                  </button>
                  <button
                    onClick={() => onDraftsChange([])}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-left w-16">#</th>
                      <th className="px-4 py-3 text-left">Task Title *</th>
                      <th className="px-4 py-3 text-left w-48">Assigner *</th>
                      <th className="px-4 py-3 text-left w-48">Company & Brand</th>
                      <th className="px-4 py-3 text-left w-36">Due Date</th>
                      <th className="px-4 py-3 text-left w-28">Priority</th>
                      <th className="px-4 py-3 text-left w-32">Task Type</th>
                      <th className="px-4 py-3 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {draftTasks.map((draft, index) => {
                      const draftCompanyBrands = draft.companyName && draft.companyName !== 'all'
                        ? (getBrandsByCompany ? getBrandsByCompany(draft.companyName) : companyBrandMap[draft.companyName] || [])
                        : getAllBrands();

                      return (
                        <tr key={draft.id} className={draft.errors.length ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-500 font-medium">#{index + 1}</div>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) => handleFieldChange(draft.id, 'title', e.target.value)}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Title')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                              placeholder="Enter task title"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.assigner}
                              onChange={(e) => handleFieldChange(draft.id, 'assigner', e.target.value)}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Assigner') || e.includes('email')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
                            >
                              <option value="">Select assigner</option>
                              {users.map(user => (
                                <option key={user.id || user.email} value={user.email}>
                                  {user.name} ({user.email})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <select
                                value={draft.companyName}
                                onChange={(e) => {
                                  handleFieldChange(draft.id, 'companyName', e.target.value);
                                  handleFieldChange(draft.id, 'brand', '');
                                }}
                                className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Company')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                              >
                                <option value="">Select company</option>
                                <option value="all">All Companies</option>
                                {Object.keys(companyBrandMap).map(company => (
                                  <option key={company} value={company}>
                                    {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={draft.brand}
                                onChange={(e) => handleFieldChange(draft.id, 'brand', e.target.value)}
                                disabled={!draft.companyName}
                                className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Brand')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${!draft.companyName ? 'bg-gray-100 text-gray-500' : ''}`}
                              >
                                <option value="">Select brand</option>
                                {draftCompanyBrands.map(brand => (
                                  <option key={brand} value={brand}>
                                    {brand.split(' ').map(word =>
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={draft.dueDate}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                if (newDate && newDate < today) {
                                  toast.error('Due date cannot be in the past');
                                } else {
                                  handleFieldChange(draft.id, 'dueDate', newDate);
                                }
                              }}
                              min={today}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('date')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                            />
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.priority}
                              onChange={(e) => handleFieldChange(draft.id, 'priority', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">Select priority</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={draft.taskType}
                              onChange={(e) => handleFieldChange(draft.id, 'taskType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              disabled={availableTaskTypes.length === 0}
                            >
                              {availableTaskTypes.length === 0 ? (
                                <option value="">No task types available</option>
                              ) : (
                                <>
                                  <option value="">Select type</option>
                                  {availableTaskTypes.map((typeName) => (
                                    <option key={typeName} value={typeName.toLowerCase()}>
                                      {typeName}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveDraft(draft.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {draftTasks.length === 0
              ? 'Add tasks using the form above'
              : `Ready to create ${draftTasks.length} task(s)`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={draftTasks.length === 0 || submitting || errorCount > 0}
              className={`px-6 py-2 text-sm font-medium rounded-lg text-white transition-colors flex items-center gap-2 ${draftTasks.length === 0 || errorCount > 0
                ? 'bg-gray-300 cursor-not-allowed'
                : submitting
                  ? 'bg-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Tasks...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create {draftTasks.length} Task{draftTasks.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BulkImporter.displayName = 'BulkImporter';

// ==================== TASK FILTERS ====================
const TaskFilters = memo(({
  advancedFilters,
  availableBrands,
  COMPANY_BRAND_MAP,
  availableTaskTypes,
  showAdvancedFilters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onToggleFilters,
  getBrandsByCompany
}: {
  advancedFilters: AdvancedFilters;
  availableBrands: string[];
  COMPANY_BRAND_MAP: Record<string, string[]>;
  availableTaskTypes: string[];
  showAdvancedFilters: boolean;
  onFilterChange: (filterType: keyof AdvancedFilters, value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onToggleFilters: () => void;
  getBrandsByCompany?: (companyName: string) => string[];
}) => {
  if (!showAdvancedFilters) return null;

  // Get all brands when no company is selected
  const getAllBrands = useCallback(() => {
    if (getBrandsByCompany) {
      return getBrandsByCompany('all');
    }
    const allBrands = Object.values(COMPANY_BRAND_MAP).flat();
    return [...new Set(allBrands)];
  }, [COMPANY_BRAND_MAP, getBrandsByCompany]);

  const displayBrands = advancedFilters.company === 'all' ? getAllBrands() : availableBrands;

  return (
    <div className="mt-4 mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onResetFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear all
          </button>
          <button
            onClick={onToggleFilters}
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
            value={advancedFilters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Priority
          </label>
          <select
            value={advancedFilters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
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
            value={advancedFilters.assigned}
            onChange={(e) => onFilterChange('assigned', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Tasks</option>
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
            value={advancedFilters.date}
            onChange={(e) => onFilterChange('date', e.target.value)}
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
            value={advancedFilters.taskType}
            onChange={(e) => onFilterChange('taskType', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {availableTaskTypes.map((typeName) => (
              <option key={typeName} value={typeName.toLowerCase()}>
                {typeName}
              </option>
            ))}
          </select>
        </div>

        {/* Company Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Company
          </label>
          <select
            value={advancedFilters.company}
            onChange={(e) => onFilterChange('company', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Companies</option>
            {Object.keys(COMPANY_BRAND_MAP).map(company => (
              <option key={company} value={company}>
                {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Brand
          </label>
          <select
            value={advancedFilters.brand}
            onChange={(e) => onFilterChange('brand', e.target.value)}
            disabled={advancedFilters.company === 'all' && displayBrands.length === 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Brands</option>
            {displayBrands.map(brand => (
              <option key={brand} value={brand}>
                {brand.split(' ').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
          {advancedFilters.company === 'all' && (
            <p className="text-xs text-gray-500 mt-1">
              Showing all brands from all companies
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onApplyFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
});

TaskFilters.displayName = 'TaskFilters';

// ==================== MOBILE TASK ITEM ====================
const MobileTaskItem = memo(({
  task,
  isToggling,
  isDeleting,
  isApproving,
  isUpdatingApproval,
  openMenuId,
  currentUser,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  onOpenReassignModal,
  onPermanentApproval,
  onOpenApprovalModal,
  onDeleteTask,
  onSetOpenMenuId,
  isTaskAssigner,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskPendingApproval,
  onOpenHistoryModal
}: MobileTaskItemProps) => {
  const userInfo = getUserInfoForDisplay(task);
  const isCompleted = isTaskCompleted(task.id);
  const isPendingApproval = isTaskPendingApproval(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const userIsAssigner = isTaskAssigner(task);
  const isOverdueTask = isOverdue(task.dueDate, task.status);

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${getTaskBorderColor(task)} mb-4 overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggleStatus(task.id, task)}
                disabled={isToggling}
                className="mt-1 flex-shrink-0"
              >
                {getTaskStatusIcon(task.id, isCompleted)}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  {isOverdueTask && !isCompleted && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {userInfo.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => onSetOpenMenuId(openMenuId === task.id ? null : task.id)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
            {openMenuId === task.id && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEditTaskClick(task);
                      onSetOpenMenuId(null);
                    }}
                    disabled={isCompleted}
                    className={`w-full px-4 py-2 text-left text-sm ${isCompleted ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-2`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Task
                    {isCompleted && <span className="text-xs text-gray-500 ml-auto">(Not allowed)</span>}
                  </button>
                  <button
                    onClick={async () => {
                      await onOpenCommentSidebar(task);
                      onSetOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    View Comments
                  </button>
                  <button
                    onClick={async () => {
                      await onOpenHistoryModal(task);
                      onSetOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <History className="h-3.5 w-3.5" />
                    View History
                  </button>
                  <button
                    onClick={() => {
                      onOpenReassignModal(task);
                      onSetOpenMenuId(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Reassign Task
                  </button>
                  {userIsAssigner && isCompleted && (
                    <button
                      onClick={() => {
                        onPermanentApproval(task.id, !isPermanentlyApproved);
                        onSetOpenMenuId(null);
                      }}
                      disabled={isUpdatingApproval}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingApproval ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isPermanentlyApproved ? (
                        <EyeOff className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      {isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
                    </button>
                  )}
                  {currentUser.role === 'admin' && isPendingApproval && (
                    <>
                      <button
                        onClick={() => {
                          onOpenApprovalModal(task, 'approve');
                          onSetOpenMenuId(null);
                        }}
                        disabled={isApproving}
                        className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isApproving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Approve Task
                      </button>
                      <button
                        onClick={() => {
                          onOpenApprovalModal(task, 'reject');
                          onSetOpenMenuId(null);
                        }}
                        disabled={isApproving}
                        className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject Task
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      onDeleteTask(task.id);
                      onSetOpenMenuId(null);
                    }}
                    disabled={isDeleting}
                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete Task
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className={`text-xs px-2 py-1 rounded-full ${isPermanentlyApproved ? 'bg-blue-100 text-blue-800' : isPendingApproval ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {isPermanentlyApproved ? '✅ PERMANENTLY Approved' : isPendingApproval ? '⏳ Pending Approval' : '✅ Approved'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.type && (
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                {task.type}
              </span>
            )}
            {task.company && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                {task.company}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MobileTaskItem.displayName = 'MobileTaskItem';

/// ==================== DESKTOP TASK ITEM ====================
const DesktopTaskItem = memo(({
  task,
  isToggling,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  onOpenHistoryModal,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskAssigner,
  onPermanentApproval,
  isUpdatingApproval
}: DesktopTaskItemProps) => {
  const userInfo = getUserInfoForDisplay(task);
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const userIsAssigner = isTaskAssigner(task);
  const isOverdueTask = isOverdue(task.dueDate, task.status);

  // Priority configuration
  const priorityConfig = {
    urgent: { color: 'bg-red-500 text-white', label: 'Urgent' },
    high: { color: 'bg-orange-500 text-white', label: 'High' },
    medium: { color: 'bg-yellow-500 text-white', label: 'Medium' },
    low: { color: 'bg-green-500 text-white', label: 'Low' },
    default: { color: 'bg-gray-200 text-gray-700', label: 'Not Set' }
  };

  // Status configuration
  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Pending' },
    completed: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Completed' },
    approved: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'PERMANENTLY Approved' }
  };

  // Get config based on priority
  const getPriorityConfig = () => {
    const priority = task.priority?.toLowerCase() || '';
    return priorityConfig[priority] || priorityConfig.default;
  };

  // Get config based on status
  const getStatusConfig = () => {
    if (isCompleted) {
      return isPermanentlyApproved ? statusConfig.approved : statusConfig.completed;
    }
    return statusConfig.pending;
  };

  return (
    <div className={`relative bg-white rounded-lg border-l-4 ${getTaskBorderColor(task)} border shadow-sm hover:shadow-md transition-all duration-200 mb-3`}>
      <div className="grid grid-cols-12 gap-4 p-4 items-center">
        
        {/* Column 1: Status Checkbox & Task Title */}
        <div className="col-span-3">
          <div className="flex items-start gap-3">
            <div className="pt-1">
              <button
                onClick={() => onToggleStatus(task.id, task)}
                disabled={isToggling}
                className={`p-1.5 rounded-lg transition-all ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
              >
                {getTaskStatusIcon(task.id, isCompleted)}
              </button>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate text-sm">{task.title}</h3>
                {isOverdueTask && !isCompleted && (
                  <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {task.description || 'No description provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Assigned User */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-medium text-sm flex-shrink-0 border border-blue-200">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">{userInfo.name}</div>
              <div className="text-xs text-gray-500 truncate max-w-[120px]">{userInfo.email}</div>
            </div>
          </div>
        </div>

        {/* Column 3: Due Date */}
        <div className="col-span-1">
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 ${isOverdueTask && !isCompleted ? 'text-red-600' : 'text-gray-700'}`}>
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium text-sm truncate">
                {formatDate(task.dueDate)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {isOverdueTask && !isCompleted ? 'Overdue' : 'Due date'}
            </div>
          </div>
        </div>

        {/* Column 4: Priority */}
        <div className="col-span-1">
          <div className="space-y-1">
            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityConfig().color} w-full`}>
              {getPriorityConfig().label}
            </span>
            <div className="text-xs text-gray-400 text-center">Priority</div>
          </div>
        </div>

        {/* Column 5: Type */}
        <div className="col-span-1">
          <div className="space-y-1">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 w-full">
              {task.type ? task.type.charAt(0).toUpperCase() + task.type.slice(1) : 'Not Set'}
            </span>
            <div className="text-xs text-gray-400 text-center">Type</div>
          </div>
        </div>

        {/* Column 6: Company */}
        <div className="col-span-1">
          <div className="space-y-1">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 w-full truncate">
              {task.company || 'Not Set'}
            </span>
            <div className="text-xs text-gray-400 text-center">Company</div>
          </div>
        </div>

        {/* Column 7: Brand */}
        <div className="col-span-1">
          <div className="space-y-1">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 w-full truncate">
              {task.brand || 'Not Set'}
            </span>
            <div className="text-xs text-gray-400 text-center">Brand</div>
          </div>
        </div>

        {/* Column 8: Status & Actions */}
        <div className="col-span-2">
          <div className="flex flex-col items-end gap-2">
            {/* Status Badge */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusConfig().color}`}>
              {getStatusConfig().label}
            </span>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
              <button
                onClick={async () => await onOpenCommentSidebar(task)}
                className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors"
                title="View comments"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              
              <button
                onClick={async () => await onOpenHistoryModal(task)}
                className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors"
                title="View history"
              >
                <History className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onEditTaskClick(task)}
                disabled={isCompleted}
                className={`p-1.5 rounded-md transition-colors ${isCompleted ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-white'}`}
                title={isCompleted ? "Editing not allowed for completed tasks" : "Edit task"}
              >
                <Edit className="h-4 w-4" />
              </button>
              
              {userIsAssigner && isCompleted && (
                <button
                  onClick={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                  disabled={isUpdatingApproval}
                  className="p-1.5 hover:bg-white rounded-md text-gray-600 disabled:opacity-50 transition-colors"
                  title={isPermanentlyApproved ? 'Remove permanent approval' : 'Permanently approve'}
                >
                  {isUpdatingApproval ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPermanentlyApproved ? (
                    <EyeOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-blue-500" />
                  )}
                  {isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopTaskItem.displayName = 'DesktopTaskItem';

// ==================== COMMENT SIDEBAR ====================
const CommentSidebar = memo(({
  showCommentSidebar,
  selectedTask,
  newComment,
  commentLoading,
  currentUser,
  formatDate,
  isOverdue,
  onCloseSidebar,
  onSetNewComment,
  onSaveComment,
  getTaskComments,
  getUserInfoForDisplay,
  isTaskCompleted,
  getStatusBadgeColor,
  getStatusText,
  loadingComments,
  loadingHistory
}: any) => {
  if (!showCommentSidebar || !selectedTask) return null;

  const taskComments = getTaskComments(selectedTask.id);
  const userInfo = getUserInfoForDisplay(selectedTask);
  const isCompleted = isTaskCompleted(selectedTask.id);
  const [activeTab, setActiveTab] = useState<'details' | 'permanent-history'>('details');

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onCloseSidebar}
      />
      <div className="absolute inset-0 right-0">
        <div className="h-full bg-white shadow-xl overflow-y-auto w-full md:w-[500px] transform transition-transform duration-300 ease-in-out">
          {/* Sidebar Header */}
          <div className="sticky top-0 bg-white border-b z-10">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Task Details</h2>
                  <p className="text-gray-600 text-sm mt-1">{selectedTask.title}</p>
                </div>
                <button
                  onClick={onCloseSidebar}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('permanent-history')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'permanent-history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                History
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="p-4">
            {activeTab === 'details' ? (
              <>
                {/* Task Details Summary */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                      <div className={`inline-block px-2 py-1 text-xs rounded ${getStatusBadgeColor(selectedTask.id)}`}>
                        {getStatusText(selectedTask.id)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Priority</div>
                      <div className={`inline-block px-2 py-1 text-xs rounded ${selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                        selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        {selectedTask.priority || 'Not set'}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">Assigned To</div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 truncate">
                          {userInfo.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {userInfo.email}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-500 mb-1">Due Date</div>
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {formatDate(selectedTask.dueDate)}
                        </div>
                        {isOverdue(selectedTask.dueDate, selectedTask.status) && !isCompleted && (
                          <div className="text-red-600 text-xs">Overdue</div>
                        )}
                      </div>
                    </div>

                    {selectedTask.type && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Type</div>
                        <div className="text-sm text-gray-900">
                          {selectedTask.type}
                        </div>
                      </div>
                    )}

                    {selectedTask.company && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Company</div>
                        <div className="text-sm text-gray-900">
                          {selectedTask.company}
                        </div>
                      </div>
                    )}

                    {selectedTask.brand && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Brand</div>
                        <div className="text-sm text-gray-900">
                          {selectedTask.brand}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Add Comment</h4>
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => onSetNewComment(e.target.value)}
                      placeholder="Type your comment here..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <button
                      onClick={onSaveComment}
                      disabled={!newComment.trim() || commentLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      {commentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Add Comment
                        </>
                      )}
                    </button>
                  </div>
                  {!onSaveComment && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      ⚠️ Comment saving functionality is not available.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Permanent History Tab */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileClock className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">History</h3>
                    <span className="ml-auto text-xs text-gray-500">
                      {taskComments ? taskComments.length : 0} records
                    </span>
                  </div>
                </div>

                {/* Loading State */}
                {(loadingHistory || loadingComments) ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Loading history...</p>
                  </div>
                ) : taskComments && taskComments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileClock className="h-12 w-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-gray-500">No history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskComments?.map((comment: CommentType) => (
                      <div key={comment.id} className="border-l-2 border-blue-400 pl-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Comment</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatDateTime(comment.createdAt)}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{comment.content}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            By: {comment.userName} ({comment.userRole})
                            {comment.userId === currentUser.id && (
                              <span className="text-blue-600 ml-2">✓ You</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CommentSidebar.displayName = 'CommentSidebar';


// ==================== APPROVAL MODAL ====================
const ApprovalModal = memo(({
  showApprovalModal,
  taskToApprove,
  approvalAction,
  approvingTasks,
  onClose,
  onApprove
}: ApprovalModalProps) => {
  if (!showApprovalModal || !taskToApprove) return null;

  const isApproving = approvingTasks.includes(taskToApprove.id);
  const isApproveAction = approvalAction === 'approve';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${isApproveAction ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isApproveAction ? <CheckCircle className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isApproveAction ? 'Approve Task' : 'Reject Task'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isApproveAction ? 'Confirm approval of this task' : 'Confirm rejection of this task completion'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{taskToApprove.title}</h3>
            <p className="text-sm text-gray-600">{taskToApprove.description}</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              disabled={isApproving}
            >
              Cancel
            </button>
            <button
              onClick={() => onApprove(isApproveAction)}
              disabled={isApproving}
              className={`px-6 py-2 text-sm font-medium rounded-lg text-white ${isApproveAction ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50 flex items-center gap-2`}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isApproveAction ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {isApproving ? 'Processing...' : isApproveAction ? 'Approve Task' : 'Reject Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ApprovalModal.displayName = 'ApprovalModal';

const PermanentHistoryTimeline = memo(({
  timelineItems,
  loadingHistory,
  loadingComments,
  currentUser,
  formatDateTime
}: {
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  formatDateTime: (date: string) => string;
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // 1. Duplicate items remove karne ke liye
  const uniqueTimelineItems = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueItems: HistoryDisplayItem[] = [];
    
    timelineItems.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    });
    
    return uniqueItems;
  }, [timelineItems]);

  // 2. Agar comment ID same hai to unhe bhi group kar sakte hain
  const groupedTimelineItems = useMemo(() => {
    const commentMap = new Map<string, HistoryDisplayItem>();
    const nonCommentItems: HistoryDisplayItem[] = [];
    
    uniqueTimelineItems.forEach(item => {
      if (item.type === 'comment') {
        const commentData = item.data as CommentType;
        // Same content wale comments check karein
        const key = `${commentData.content}-${commentData.userId}`;
        if (!commentMap.has(key)) {
          commentMap.set(key, item);
        }
      } else {
        nonCommentItems.push(item);
      }
    });
    
    return [...Array.from(commentMap.values()), ...nonCommentItems]
      .sort((a, b) => new Date(b.displayTime).getTime() - new Date(a.displayTime).getTime());
  }, [uniqueTimelineItems]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  if (loadingHistory || loadingComments) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">Loading history...</p>
      </div>
    );
  }

  const displayItems = groupedTimelineItems.length > 0 ? groupedTimelineItems : uniqueTimelineItems;

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8">
        <FileClock className="h-12 w-12 mx-auto text-gray-300" />
        <p className="mt-2 text-gray-500">No history available</p>
        <p className="text-xs text-gray-400 mt-1">All activities will be permanently recorded here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayItems.map((item, index) => {
        const isComment = item.type === 'comment';
        const isExpanded = expandedItems.includes(item.id);
        const isCurrentUserAuthor = isComment && (item.data as CommentType).userId === currentUser.id;

        return (
          <div
            key={`${item.id}-${index}`} // Index add kiya unique key ke liye
            className={`border-l-2 pl-4 pb-4 relative ${index !== displayItems.length - 1 ? '' : ''}`}
            style={{
              borderLeftColor: isComment ? '#3b82f6' : '#10b981'
            }}
          >
            {/* Timeline dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isComment ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300'}`}>
              <div className="flex items-center justify-center w-full h-full">
                {isComment ? (
                  <MessageSquare className="h-2.5 w-2.5 text-blue-600" />
                ) : (
                  <History className="h-2.5 w-2.5 text-green-600" />
                )}
              </div>
            </div>

            <div className="ml-2">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isComment ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {isComment ? <MessageSquare className="h-3 w-3" /> : <History className="h-3 w-3" />}
                    {isComment ? 'Comment' : item.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.displayTime}
                  </span>
                </div>
                {isComment && (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* User info */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="text-sm font-medium text-gray-900">
                  {isComment
                    ? (item.data as CommentType).userName 
                    : (item.data as TaskHistory).userName }
                </div>
                <div className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {isComment
                    ? (item.data as CommentType).userRole 
                    : (item.data as TaskHistory).userRole}
                </div>
                <div className="text-xs text-gray-500">
                  {isComment
                    ? (item.data as CommentType).userEmail
                    : (item.data as TaskHistory).userEmail}
                </div>
              </div>

              {/* Content */}
              <div className="mt-2">
                {isComment ? (
                  <div>
                    <div className={`bg-gray-50 p-3 rounded-lg border ${isExpanded ? '' : 'max-h-20 overflow-hidden'}`}>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {(item.data as CommentType).content || 'No content'}
                      </p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="font-medium">Permanent Comment</div>
                      <div>Added on: {formatDateTime((item.data as CommentType).createdAt)}</div>
                      {isCurrentUserAuthor && (
                        <div className="text-blue-600 mt-1">✓ You are the author</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                    <p className="font-medium mb-1">{(item.data as TaskHistory).description || 'No description'}</p>
                    <div className="text-xs text-gray-500 space-y-1 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Action:</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100">{(item.data as TaskHistory).action?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Time:</span>
                        <span>{formatDateTime((item.data as TaskHistory).timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

PermanentHistoryTimeline.displayName = 'PermanentHistoryTimeline';
// ==================== REASSIGN MODAL ====================
const ReassignModal = memo(({
  showReassignModal,
  reassignTask,
  newAssigneeId,
  reassignLoading,
  users,
  onClose,
  onAssigneeChange,
  onReassign
}: ReassignModalProps) => {
  if (!showReassignModal || !reassignTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Reassign Task</h2>
              <p className="text-sm text-gray-500 mt-1">Assign this task to another user</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-1">{reassignTask.title}</h3>
              <p className="text-sm text-gray-600 truncate">{reassignTask.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Assignee
              </label>
              <select
                value={newAssigneeId}
                onChange={onAssigneeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={reassignLoading}
              >
                <option value="">Select a user</option>
                {users
                  .filter(user => user.id !== reassignTask.assignedTo)
                  .map(user => (
                    <option key={user.id || user.email} value={user.id || user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              disabled={reassignLoading}
            >
              Cancel
            </button>
            <button
              onClick={onReassign}
              disabled={!newAssigneeId || reassignLoading}
              className="px-6 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {reassignLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {reassignLoading ? 'Reassigning...' : 'Reassign Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ReassignModal.displayName = 'ReassignModal';

// ==================== TASK HISTORY MODAL ====================
const TaskHistoryModal = memo(({
  showHistoryModal,
  historyTask,
  timelineItems,
  loadingHistory,
  loadingComments,
  currentUser,
  users,
  onClose,
  formatDate,
  getEmailByIdInternal,
  getAssignerEmail
}: {
  showHistoryModal: boolean;
  historyTask: Task | null;
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  users: UserType[];
  onClose: () => void;
  formatDate: (date: string) => string;
  getEmailByIdInternal?: (userId: any) => string;
  getAssignerEmail?: (task: Task) => string;
}) => {
  if (!showHistoryModal || !historyTask) return null;

  // Format creation date for display
  const formattedCreatedAt = formatDateTime(historyTask.createdAt || historyTask.updatedAt || new Date().toISOString());

  // Get creator and assignee emails
  const getCreatorEmail = () => {
    if (getAssignerEmail) {
      return getAssignerEmail(historyTask);
    }

    // Fallback logic
    if (!historyTask.assignedBy) return 'Unknown';

    if (typeof historyTask.assignedBy === 'object' && historyTask.assignedBy !== null) {
      const assignerObj = historyTask.assignedBy as any;
      if (assignerObj.email) return assignerObj.email;
      if (assignerObj.name) return assignerObj.name;
    }

    // Try to find in users
    const creatorUser = users.find(u =>
      u.id === historyTask.assignedBy ||
      u._id === historyTask.assignedBy ||
      u.email === historyTask.assignedBy
    );

    return creatorUser?.email || historyTask.assignedBy || 'Unknown';
  };

  const getAssigneeEmail = () => {
    if (getEmailByIdInternal) {
      return getEmailByIdInternal(historyTask.assignedTo);
    }

    // Fallback logic
    const assignedTo = historyTask.assignedTo;
    if (typeof assignedTo === 'string') {
      if (assignedTo.includes('@')) {
        return assignedTo;
      } else {
        const user = users.find(u =>
          u.id === assignedTo ||
          u._id === assignedTo ||
          u.email === assignedTo
        );
        return user?.email || assignedTo || 'Unknown';
      }
    }

    return 'Unknown';
  };

  const creatorEmail = getCreatorEmail();
  const assigneeEmail = getAssigneeEmail();

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Task History</h2>
                <p className="text-gray-600 text-sm mt-1">{historyTask.title}</p>
                <div className="mt-2 text-sm text-gray-500">
                  Created: {formattedCreatedAt}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="ml-auto text-xs text-gray-500">
                  {timelineItems.length} records
                </span>
              </div>
            </div>

            {/* Task Creation Summary - UPDATED WITH CREATOR AND ASSIGNEE INFO */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Task Created</h4>
                  <p className="text-sm text-blue-800">
                    This task was created on {formattedCreatedAt}
                  </p>
                </div>
              </div>

              {/* Creator and Assignee Info - NEW SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <h5 className="font-medium text-gray-700">Created By</h5>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium truncate">
                      {creatorEmail}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Task Creator/Assigner
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-4 w-4 text-green-500" />
                    <h5 className="font-medium text-gray-700">Assigned To</h5>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium truncate">
                      {assigneeEmail}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Task Assignee
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-white p-3 rounded-lg border border-blue-100">
                <div>
                  <span className="font-medium text-gray-600">Priority:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${historyTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                    historyTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}`}>
                    {historyTask.priority || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Due Date:</span>
                  <span className="ml-2">{formatDate(historyTask.dueDate)}</span>
                </div>
                {historyTask.type && (
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                      {historyTask.type}
                    </span>
                  </div>
                )}
                {historyTask.company && (
                  <div>
                    <span className="font-medium text-gray-600">Company:</span>
                    <span className="ml-2">{historyTask.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* History Timeline */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            </div>

            <PermanentHistoryTimeline
              timelineItems={timelineItems}
              loadingHistory={loadingHistory}
              loadingComments={loadingComments}
              currentUser={currentUser}
              formatDateTime={formatDateTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

TaskHistoryModal.displayName = 'TaskHistoryModal';

// ==================== MAIN COMPONENT ====================
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
  onDeleteTask,
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
  onFetchTaskHistory,
  onBulkCreateTasks,
  brands = [],

  // NEW PROPS
  advancedFilters,
  onAdvancedFilterChange,
  onOpenEditModal,
  getBrandsByCompany,
}) => {
  // Derive dynamic company-brand map and options
  const COMPANY_BRAND_MAP = useMemo(() => {
    const map: Record<string, string[]> = {};
    brands.forEach(b => {
      const companyKey = b.company.toLowerCase();
      if (!map[companyKey]) map[companyKey] = [];
      if (!map[companyKey].includes(b.name)) {
        map[companyKey].push(b.name);
      }
    });
    return map;
  }, [brands]);

  // State
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [deletingTasks, setDeletingTasks] = useState<string[]>([]);
  const [togglingStatusTasks, setTogglingStatusTasks] = useState<string[]>([]);
  const [approvingTasks, setApprovingTasks] = useState<string[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isLoading, ] = useState(false);

  // Use DashboardPage's filters if provided, otherwise use local state
  const [localAdvancedFilters, setLocalAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all',
    priority: 'all',
    assigned: 'all',
    date: 'all',
    taskType: 'all',
    company: 'all',
    brand: 'all'
  });

  const effectiveAdvancedFilters = advancedFilters || localAdvancedFilters;
  const handleAdvancedFilterChange = onAdvancedFilterChange || ((filterType: string, value: string) => {
    setLocalAdvancedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  });

  // Company-Brand mapping state
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);

  const availableTaskTypes = useMemo(() => {
    const normalized = (taskTypes || [])
      .map(t => (t?.name || '').toString().trim())
      .filter(Boolean);

    if (normalized.length > 0) {
      return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
    }

    return [];
  }, [taskTypes]);

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

  useEffect(() => {
    fetchTaskTypes();
  }, [fetchTaskTypes]);

  // Comment related states
  const [showCommentSidebar, setShowCommentSidebar] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [taskComments, setTaskComments] = useState<Record<string, CommentType[]>>({});

  // Task History State
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [taskToApprove, setTaskToApprove] = useState<Task | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // ==================== BULK IMPORT STATE ====================
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [bulkImportDefaults, setBulkImportDefaults] = useState<BulkImportDefaults>({
    assigner: currentUser.email || '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    taskType: '',
    companyName: '',
    brand: ''
  });
  const [bulkDraftTasks, setBulkDraftTasks] = useState<BulkTaskDraft[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkCreateSummary, setBulkCreateSummary] = useState<BulkCreateResult | null>(null);

  // ==================== UTILITY FUNCTIONS ====================
  const getBrandsByCompanyInternal = useCallback((companyName: string): string[] => {
    if (getBrandsByCompany) {
      return getBrandsByCompany(companyName);
    }
    
    if (!companyName || companyName === 'all') {
      // Return all unique brands
      const allBrands = Object.values(COMPANY_BRAND_MAP).flat();
      return [...new Set(allBrands)];
    }
    
    return COMPANY_BRAND_MAP[companyName.toLowerCase()] || [];
  }, [COMPANY_BRAND_MAP, getBrandsByCompany]);

  const getEmailByIdInternal = useCallback((userId: any): string => {
    if (userId && userId.includes('@')) {
      return userId;
    }

    const user = users.find(u =>
      u.id === userId ||
      u._id === userId ||
      u.email === userId
    );

    if (user) {
      return user.email || user.name || 'Unknown';
    }

    return 'Unknown';
  }, [users]);

  const getAssignerEmail = useCallback((task: Task): string => {
    if (!task.assignedBy) return 'Unknown';

    if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
      const assignerObj = task.assignedBy as any;
      if (assignerObj.email) return assignerObj.email;
      if (assignerObj.name) return assignerObj.name;
    }

    // Try to find in users
    const creatorUser = users.find(u =>
      u.id === task.assignedBy ||
      u._id === task.assignedBy ||
      u.email === task.assignedBy
    );

    return creatorUser?.email || task.assignedBy || 'Unknown';
  }, [users]);

  const isTaskAssigner = useCallback((task: Task): boolean => {
    const assignerEmail = getAssignerEmail(task);
    const currentUserEmail = currentUser?.email;

    if (!assignerEmail || assignerEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assignerEmail.toLowerCase() === currentUserEmail.toLowerCase();
  }, [getAssignerEmail, currentUser]);

  const isTaskAssignee = useCallback((task: Task): boolean => {
    const assigneeEmail = getEmailByIdInternal(task.assignedTo);
    const currentUserEmail = currentUser?.email;

    if (!assigneeEmail || assigneeEmail === 'Unknown' || !currentUserEmail) {
      return false;
    }

    return assigneeEmail.toLowerCase() === currentUserEmail.toLowerCase();
  }, [getEmailByIdInternal, currentUser]);

  const getUserInfoForDisplay = useCallback((task: Task): { name: string; email: string } => {
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
  }, [users]);

  // ==================== MISSING FUNCTIONS ====================
  const fetchAndStoreTaskHistory = useCallback(async (taskId: string) => {
    if (!onFetchTaskHistory) return;

    setLoadingHistory(prev => ({ ...prev, [taskId]: true }));
    try {
      const history = await onFetchTaskHistory(taskId);
      setTaskHistory(prev => ({ ...prev, [taskId]: history }));
    } catch (error) {
      console.error('Error fetching task history:', error);
      toast.error('Failed to load task history');
    } finally {
      setLoadingHistory(prev => ({ ...prev, [taskId]: false }));
    }
  }, [onFetchTaskHistory]);

  const isTaskPermanentlyApproved = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return Boolean(task?.completedApproval);
  }, [tasks]);

  const isTaskCompleted = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status === 'completed';
  }, [tasks]);

  const isTaskPendingApproval = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'completed') return false;
    if (isTaskPermanentlyApproved(taskId)) return false;

    const adminApproved = task.history?.some(h =>
      h.action === 'admin_approved' ||
      (h.action === 'marked_completed' && h.userRole === 'admin')
    );

    return !adminApproved;
  }, [tasks, isTaskPermanentlyApproved]);

  const getTaskStatusIcon = useCallback((taskId: string, isCompleted: boolean, isToggling: boolean) => {
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
        return <Check className="h-4 w-4 text-green-500" />;
      }
    } else {
      return <div className="h-4 w-4 border border-gray-400 rounded"></div>;
    }
  }, [isTaskPermanentlyApproved]);

  const getStatusBadgeColor = useCallback((taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isPendingApproval = isTaskPendingApproval(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      } else if (isPendingApproval) {
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      } else {
        return 'bg-green-100 text-green-800 border border-green-200';
      }
    }
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  }, [isTaskCompleted, isTaskPermanentlyApproved, isTaskPendingApproval]);

  const getStatusText = useCallback((taskId: string) => {
    const isCompleted = isTaskCompleted(taskId);
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isPendingApproval = isTaskPendingApproval(taskId);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return '✅ PERMANENTLY Approved';
      } else if (isPendingApproval) {
        return '⏳ Pending Admin Approval';
      } else {
        return '✅ Approved';
      }
    }
    return 'Pending';
  }, [isTaskCompleted, isTaskPermanentlyApproved, isTaskPendingApproval]);

  const getTaskCommentsInternal = useCallback((taskId: string): CommentType[] => {
    return taskComments[taskId] || [];
  }, [taskComments]);

  const getTimelineItems = useCallback((taskId: string): HistoryDisplayItem[] => {
    const items: HistoryDisplayItem[] = [];

    // Add task history from state
    if (taskHistory[taskId]) {
      taskHistory[taskId].forEach(history => {
        const config = HISTORY_ACTION_CONFIG[history.action] || HISTORY_ACTION_CONFIG.default;
        items.push({
          id: `history-${history.id}`,
          type: 'history',
          data: history,
          timestamp: history.timestamp,
          displayTime: formatDateTime(history.timestamp),
          actionType: history.action,
          color: config.color,
          icon: config.icon,
          label: config.label
        });
      });
    }

    // Add from task object
    const task = tasks.find(t => t.id === taskId);
    if (task?.history && Array.isArray(task.history)) {
      task.history.forEach(history => {
        if (!items.some(item => item.type === 'history' && (item.data as TaskHistory).id === history.id)) {
          const config = HISTORY_ACTION_CONFIG[history.action] || HISTORY_ACTION_CONFIG.default;
          items.push({
            id: `history-${history.id}`,
            type: 'history',
            data: history,
            timestamp: history.timestamp,
            displayTime: formatDateTime(history.timestamp),
            actionType: history.action,
            color: config.color,
            icon: config.icon,
            label: config.label
          });
        }
      });
    }

    // Add comments from state
    if (taskComments[taskId]) {
      taskComments[taskId].forEach(comment => {
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          data: comment,
          timestamp: comment.createdAt,
          displayTime: formatDateTime(comment.createdAt),
          actionType: 'comment_added',
          color: HISTORY_ACTION_CONFIG.comment_added.color,
          icon: HISTORY_ACTION_CONFIG.comment_added.icon,
          label: 'Comment Added'
        });
      });
    }

    // Add comments from task object
    if (task?.comments && Array.isArray(task.comments)) {
      task.comments.forEach(comment => {
        if (!items.some(item => item.type === 'comment' && (item.data as CommentType).id === comment.id)) {
          items.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            data: comment,
            timestamp: comment.createdAt,
            displayTime: formatDateTime(comment.createdAt),
            actionType: 'comment_added',
            color: HISTORY_ACTION_CONFIG.comment_added.color,
            icon: HISTORY_ACTION_CONFIG.comment_added.icon,
            label: 'Comment Added'
          });
        }
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [taskComments, taskHistory, tasks]);

  // ==================== HISTORY TRACKING FUNCTIONS ====================
  const addHistoryRecord = useCallback(async (
    taskId: string,
    action: TaskHistory['action'],
    description: string,
    additionalData?: Record<string, any>
  ) => {
    const historyPayload: Omit<TaskHistory, 'id' | 'timestamp'> = {
      taskId,
      action,
      description,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      additionalData
    };

    try {
      if (onAddTaskHistory) {
        await onAddTaskHistory(taskId, historyPayload, additionalData);
        // Refresh history after adding new record
        if (onFetchTaskHistory) {
          await fetchAndStoreTaskHistory(taskId);
        }
      }
    } catch (error) {
      console.error('Error recording history:', error);
      // Still update local state even if API fails
      const newHistory: TaskHistory = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...historyPayload
      };

      setTaskHistory(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newHistory]
      }));
    }
  }, [currentUser, onAddTaskHistory, onFetchTaskHistory, fetchAndStoreTaskHistory]);

  // ==================== CREATE TASK WITH HISTORY ====================
  const handleCreateTaskWithHistory = useCallback(async () => {
    try {
      // Call the original create task function
      const newTask = await onCreateTask();

      if (newTask && typeof newTask === 'object' && newTask.id) {
        // Add history record for task creation
        await addHistoryRecord(
          newTask.id,
          'task_created',
          `Task created by ${currentUser.role} (${currentUser.name})`,
          {
            taskTitle: newTask.title,
            assignedTo: getEmailByIdInternal(newTask.assignedTo),
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            createdAt: new Date().toISOString()
          }
        );

        toast.success('✅ Task created successfully!');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }, [onCreateTask, addHistoryRecord, currentUser, getEmailByIdInternal]);

  // ==================== EDIT TASK FUNCTIONS ====================
  const handleOpenEditModal = useCallback((task: Task) => {
    if (onOpenEditModal) {
      // Use DashboardPage's edit modal
      onOpenEditModal(task);
    } else {
      // Fallback to local edit modal (you can implement this if needed)
      console.log('Edit task:', task);
      toast.error('Edit functionality not available');
    }
    setOpenMenuId(null);
  }, [onOpenEditModal]);

  // ==================== BULK IMPORT FUNCTIONS ====================
  const handleOpenBulkImporter = useCallback(() => {
    setShowBulkImporter(true);
    setBulkCreateSummary(null);
    setBulkDraftTasks([]);

    // Set current user as default assigner
    setBulkImportDefaults(prev => ({
      ...prev,
      assigner: currentUser.email || '',
      dueDate: new Date().toISOString().split('T')[0]
    }));
  }, [currentUser]);

  const handleBulkDefaultsChange = useCallback((defaults: Partial<BulkImportDefaults>) => {
    setBulkImportDefaults(prev => ({ ...prev, ...defaults }));
  }, []);

  const handleBulkDraftsChange = useCallback((drafts: BulkTaskDraft[]) => {
    setBulkDraftTasks(drafts);
  }, []);

  const handleBulkImportSubmit = useCallback(async () => {
    if (!onBulkCreateTasks) {
      toast.error('Bulk create functionality not available');
      return;
    }

    if (bulkDraftTasks.length === 0) {
      toast.error('No tasks to import');
      return;
    }

    // Validate all drafts
    const validatedDrafts = bulkDraftTasks.map(validateBulkDraft);
    const hasErrors = validatedDrafts.some(draft => draft.errors.length > 0);

    if (hasErrors) {
      setBulkDraftTasks(validatedDrafts);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setBulkSubmitting(true);

    try {
      // Convert assigner back to assignedTo for API
      const payloads: BulkTaskPayload[] = validatedDrafts.map(draft => ({
        title: draft.title,
        assignedTo: draft.assigner, // Map assigner to assignedTo
        dueDate: draft.dueDate,
        priority: (draft.priority || bulkImportDefaults.priority) as BulkPriority,
        taskType: (draft.taskType || bulkImportDefaults.taskType) || undefined,
        companyName: draft.companyName || bulkImportDefaults.companyName,
        brand: draft.brand || bulkImportDefaults.brand,
        rowNumber: draft.rowNumber
      }));

      const result = await onBulkCreateTasks(payloads);
      setBulkCreateSummary(result);

      if (result.failures.length === 0) {
        toast.success(`✅ Successfully created ${result.created.length} tasks`);

        // Add history for each created task
        for (const task of result.created) {
          try {
            await addHistoryRecord(
              task.id,
              'task_created',
              `Task created in bulk import by ${currentUser.role} (${currentUser.name})`,
              {
                bulkImport: true,
                createdBy: currentUser.email,
                createdAt: new Date().toISOString()
              }
            );
          } catch (error) {
            console.error('Error adding history for bulk task:', error);
          }
        }

        setShowBulkImporter(false);
        setBulkDraftTasks([]);
      } else {
        toast.success(`✅ Created ${result.created.length} tasks, ${result.failures.length} failed`);

        // Add history for successfully created tasks
        for (const task of result.created) {
          try {
            await addHistoryRecord(
              task.id,
              'task_created',
              `Task created in bulk import by ${currentUser.role} (${currentUser.name})`,
              {
                bulkImport: true,
                createdBy: currentUser.email,
                createdAt: new Date().toISOString()
              }
            );
          } catch (error) {
            console.error('Error adding history for bulk task:', error);
          }
        }

        // Keep only failed tasks in drafts for retry
        const failedDrafts = validatedDrafts.filter(draft =>
          result.failures.some(failure => failure.rowNumber === draft.rowNumber)
        );
        setBulkDraftTasks(failedDrafts);
      }
    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(`❌ Failed to create tasks: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkDraftTasks, bulkImportDefaults, onBulkCreateTasks, addHistoryRecord, currentUser]);

  // ==================== EVENT HANDLERS ====================
  const handleFilterChange = useCallback((filterType: keyof AdvancedFilters, value: string) => {
    if (filterType === 'company') {
      handleAdvancedFilterChange(filterType, value);
      handleAdvancedFilterChange('brand', 'all');

      const brands = getBrandsByCompanyInternal(value);
      setAvailableBrands(brands);
    } else {
      handleAdvancedFilterChange(filterType, value);
    }
  }, [getBrandsByCompanyInternal, handleAdvancedFilterChange]);

  const applyAdvancedFilters = useCallback(() => {
    if (effectiveAdvancedFilters.status !== 'all') {
      setFilter(effectiveAdvancedFilters.status);
    } else {
      setFilter('all');
    }

    if (effectiveAdvancedFilters.assigned !== 'all') {
      setAssignedFilter?.(effectiveAdvancedFilters.assigned);
    } else if (setAssignedFilter) {
      setAssignedFilter('all');
    }

    if (effectiveAdvancedFilters.date !== 'all') {
      setDateFilter(effectiveAdvancedFilters.date);
    } else {
      setDateFilter('all');
    }

    setShowAdvancedFilters(false);
    toast.success('Filters applied successfully');
  }, [effectiveAdvancedFilters, setFilter, setAssignedFilter, setDateFilter]);

  const resetFilters = useCallback(() => {
    const emptyFilters = {
      status: 'all',
      priority: 'all',
      assigned: 'all',
      date: 'all',
      taskType: 'all',
      company: 'all',
      brand: 'all'
    };

    // Reset both local and DashboardPage filters
    if (onAdvancedFilterChange) {
      Object.keys(emptyFilters).forEach(key => {
        onAdvancedFilterChange(key, emptyFilters[key as keyof typeof emptyFilters]);
      });
    } else {
      setLocalAdvancedFilters(emptyFilters);
    }

    setAvailableBrands(getBrandsByCompanyInternal('all'));
    setFilter('all');
    setDateFilter('all');
    if (setAssignedFilter) setAssignedFilter('all');
    setSearchTerm('');

    setShowAdvancedFilters(false);
    toast.success('All filters cleared');
  }, [setFilter, setAssignedFilter, setDateFilter, setSearchTerm, onAdvancedFilterChange, getBrandsByCompanyInternal]);

  const handleBulkStatusChange = useCallback(async (status: 'completed' | 'pending') => {
    if (selectedTasks.length === 0) return;

    const confirmMessage = status === 'completed'
      ? `Mark ${selectedTasks.length} tasks as completed?`
      : `Mark ${selectedTasks.length} tasks as pending?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await onToggleTaskStatus(taskId, task.status, false);
          await addHistoryRecord(
            taskId,
            `bulk_${status}`,
            `Task marked as ${status.toUpperCase()} in bulk operation by ${currentUser.role} on ${new Date().toLocaleString()}`,
            { bulkOperation: true, affectedTasks: selectedTasks.length }
          );
        }
      }

      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks marked as ${status}`);
    } catch (error) {
      console.error('Error in bulk status change:', error);
      toast.error('Failed to update tasks');
    }
  }, [selectedTasks, tasks, onToggleTaskStatus, addHistoryRecord, currentUser]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTasks.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks? This action cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await addHistoryRecord(
            taskId,
            'task_deleted',
            `Task deleted by ${currentUser.role} (${currentUser.name})`,
            { deletedAt: new Date().toISOString(), deletedBy: currentUser.email }
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
  }, [selectedTasks, tasks, addHistoryRecord, currentUser, onDeleteTask]);

  const handlePermanentApproval = useCallback(async (taskId: string, value: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      toast.error("Task not found");
      return;
    }

    if (!isTaskAssigner(task)) {
      toast.error("Only the task assigner can permanently approve tasks");
      return;
    }

    if (!isTaskCompleted(taskId)) {
      toast.error("Task must be completed first before permanent approval");
      return;
    }

    setUpdatingApproval(prev => [...prev, taskId]);

    try {
      if (onUpdateTaskApproval) {
        await onUpdateTaskApproval(taskId, value);
      } else {
        toast.error("Update function not available");
        return;
      }

      if (value) {
        await addHistoryRecord(
          taskId,
          'assigner_permanent_approved',
          `Task PERMANENTLY approved by Assigner (${currentUser.name})`,
          { permanentApproval: true, approvedAt: new Date().toISOString() }
        );
        toast.success("✅ Task PERMANENTLY approved!");
      } else {
        await addHistoryRecord(
          taskId,
          'permanent_approval_removed',
          `Permanent approval REMOVED by Assigner (${currentUser.name})`,
          { permanentApproval: false, removedAt: new Date().toISOString() }
        );
        toast.success("🔄 Permanent approval removed!");
      }

      setOpenMenuId(null);
    } catch (error) {
      console.error('Error updating permanent approval:', error);
      toast.error("Failed to update approval status");
    } finally {
      setUpdatingApproval(prev => prev.filter(id => id !== taskId));
    }
  }, [tasks, isTaskAssigner, isTaskCompleted, onUpdateTaskApproval, addHistoryRecord, currentUser]);

  const handleToggleTaskStatus = useCallback(async (taskId: string, originalTask: Task) => {
    const isPermanentlyApproved = isTaskPermanentlyApproved(taskId);
    const isAssignee = isTaskAssignee(originalTask);
    const isAssigner = isTaskAssigner(originalTask);

    if (isPermanentlyApproved && isAssignee && !isAssigner) {
      toast.error("This task has been PERMANENTLY approved by assigner and cannot be changed.");
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTogglingStatusTasks(prev => [...prev, taskId]);

    try {
      const isCompleted = isTaskCompleted(taskId);

      if (isCompleted) {
        await onToggleTaskStatus(taskId, 'completed', false);

        await addHistoryRecord(
          taskId,
          'marked_pending',
          `Task marked as PENDING by ${isAssigner ? 'Assigner' : 'Assignee'} (${currentUser.name})`,
          {
            previousStatus: 'completed',
            newStatus: 'pending',
            changedBy: currentUser.role
          }
        );

        toast.success('Task marked as pending');
      } else {
        await onToggleTaskStatus(taskId, task.status, false);

        await addHistoryRecord(
          taskId,
          'marked_completed',
          `Task marked as COMPLETED by ${isAssigner ? 'Assigner' : 'Assignee'} (${currentUser.name})`,
          {
            previousStatus: 'pending',
            newStatus: 'completed',
            changedBy: currentUser.role,
            needsAdminApproval: !isAssigner
          }
        );

        toast.success('✅ Task marked as completed! Waiting for admin approval.');
      }
    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setTogglingStatusTasks(prev => prev.filter(id => id !== taskId));
    }
  }, [isTaskPermanentlyApproved, isTaskAssignee, isTaskAssigner, tasks, isTaskCompleted, onToggleTaskStatus, addHistoryRecord, currentUser]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await addHistoryRecord(
        taskId,
        'task_deleted',
        `Task deleted by ${currentUser.role} (${currentUser.name})`,
        {
          taskTitle: task.title,
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.email
        }
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
  }, [tasks, addHistoryRecord, currentUser, onDeleteTask]);

  const handleOpenCommentSidebar = useCallback(async (task: Task) => {
    if (!task || !task.id) {
      toast.error("Invalid task selected");
      return;
    }

    setSelectedTask(task);
    setShowCommentSidebar(true);

    // Load task history
    if (onFetchTaskHistory) {
      await fetchAndStoreTaskHistory(task.id);
    }

    if (onFetchTaskComments) {
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
  }, [onFetchTaskComments, onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleCloseCommentSidebar = useCallback(() => {
    setShowCommentSidebar(false);
    setSelectedTask(null);
    setNewComment('');
    setCommentLoading(false);
    setDeletingCommentId(null);
  }, []);

  const handleSaveComment = useCallback(async () => {
    if (!selectedTask) {
      toast.error("No task selected");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    if (!selectedTask.id) {
      toast.error("Task ID not found");
      return;
    }

    const optimisticComment: CommentType = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: selectedTask.id,
      content: newComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role
    };

    setTaskComments(prev => {
      const taskId = selectedTask.id;
      if (!taskId) return prev;

      const currentComments = prev[taskId] || [];
      return {
        ...prev,
        [taskId]: [...currentComments, optimisticComment]
      };
    });

    const commentToSave = newComment;
    setNewComment('');
    setCommentLoading(true);

    if (onSaveComment && typeof onSaveComment === 'function') {
      try {
        const savedComment = await onSaveComment(selectedTask.id, commentToSave);

        if (savedComment) {
          // Add history for comment
          await addHistoryRecord(
            selectedTask.id,
            'comment_added',
            `Comment added by ${currentUser.role} (${currentUser.name})`,
            {
              commentId: savedComment.id,
              commentPreview: savedComment.content.substring(0, 100)
            }
          );

          setTaskComments(prev => {
            const taskId = selectedTask.id;
            if (!taskId) return prev;

            const currentComments = prev[taskId] || [];
            const updatedComments = currentComments.map(comment =>
              comment.id === optimisticComment.id ? savedComment : comment
            );

            if (!currentComments.some(c => c.id === optimisticComment.id)) {
              updatedComments.push(savedComment);
            }

            return {
              ...prev,
              [taskId]: updatedComments
            };
          });

          toast.success('✅ Comment added successfully!');
        }
      } catch (error: any) {
        setTaskComments(prev => {
          const taskId = selectedTask.id;
          if (!taskId) return prev;

          const currentComments = prev[taskId] || [];
          return {
            ...prev,
            [taskId]: currentComments.filter(
              comment => !comment.id.startsWith('optimistic-')
            )
          };
        });

        if (error.message?.includes('Network') || error.message?.includes('fetch')) {
          toast.error('🌐 Network error. Please check your connection.');
        } else if (error.response?.status === 401) {
          toast.error('🔐 Authentication error. Please login again.');
        } else {
          toast.error('❌ Failed to save comment. Please try again.');
        }

        setNewComment(commentToSave);
      } finally {
        setCommentLoading(false);
      }
    } else {
      toast.success('💾 Comment saved locally (offline mode)');
      setCommentLoading(false);
    }
  }, [selectedTask, newComment, currentUser, onSaveComment, addHistoryRecord]);

  const handleDeleteComment = useCallback(async (taskId: string, commentId: string) => {
    if (!onDeleteComment) {
      toast.error("Delete comment functionality not available");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    setDeletingCommentId(commentId);

    try {
      await onDeleteComment(taskId, commentId);

      // Remove comment from local state
      setTaskComments(prev => {
        const currentComments = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: currentComments.filter(comment => comment.id !== commentId)
        };
      });

      // Add history record for comment deletion
      await addHistoryRecord(
        taskId,
        'comment_deleted',
        `Comment deleted by ${currentUser.role} (${currentUser.name})`,
        {
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.email
        }
      );

      toast.success("Comment deleted successfully");
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(`Failed to delete comment: ${error.message || 'Unknown error'}`);
    } finally {
      setDeletingCommentId(null);
    }
  }, [onDeleteComment, addHistoryRecord, currentUser]);

  const handleOpenApprovalModal = useCallback((task: Task, action: 'approve' | 'reject') => {
    setTaskToApprove(task);
    setApprovalAction(action);
    setShowApprovalModal(true);
  }, []);

  const handleCloseApprovalModal = useCallback(() => {
    setShowApprovalModal(false);
    setTaskToApprove(null);
  }, []);

  const handleApproveTask = useCallback(async (approve: boolean) => {
    if (!taskToApprove || !onApproveTask) return;

    setApprovingTasks(prev => [...prev, taskToApprove.id]);

    try {
      await onApproveTask(taskToApprove.id, approve);

      if (approve) {
        await addHistoryRecord(
          taskToApprove.id,
          'admin_approved',
          `Task APPROVED by Admin (${currentUser.name})`,
          {
            approvedBy: currentUser.email,
            approvedAt: new Date().toISOString(),
            taskStatus: 'completed'
          }
        );

        toast.success('✅ Task approved by Admin!');
      } else {
        await addHistoryRecord(
          taskToApprove.id,
          'rejected_by_admin',
          `Task completion REJECTED by Admin (${currentUser.name})`,
          {
            rejectedBy: currentUser.email,
            rejectedAt: new Date().toISOString(),
            taskStatus: 'pending'
          }
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
  }, [taskToApprove, onApproveTask, addHistoryRecord, currentUser, handleCloseApprovalModal]);

  const handleOpenReassignModal = useCallback((task: Task) => {
    setReassignTask(task);
    setShowReassignModal(true);
  }, []);

  const handleCloseReassignModal = useCallback(() => {
    setShowReassignModal(false);
    setReassignLoading(false);
    setReassignTask(null);
    setNewAssigneeId('');
  }, []);

  const handleReassignTask = useCallback(async () => {
    if (!reassignTask || !newAssigneeId || !onReassignTask) return;

    setReassignLoading(true);

    try {
      await onReassignTask(reassignTask.id, newAssigneeId);

      await addHistoryRecord(
        reassignTask.id,
        'task_reassigned',
        `Task reassigned by ${currentUser.role} (${currentUser.name})`,
        {
          previousAssignee: getEmailByIdInternal(reassignTask.assignedTo),
          newAssignee: getEmailByIdInternal(newAssigneeId),
          reassignedAt: new Date().toISOString()
        }
      );

      toast.success('✅ Task reassigned successfully!');
      handleCloseReassignModal();
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error('Failed to reassign task');
    } finally {
      setReassignLoading(false);
    }
  }, [reassignTask, newAssigneeId, onReassignTask, addHistoryRecord, currentUser, getEmailByIdInternal, handleCloseReassignModal]);

  const handleOpenHistoryModal = useCallback(async (task: Task) => {
    setHistoryTask(task);
    setShowHistoryModal(true);

    // Load task history
    if (onFetchTaskHistory) {
      await fetchAndStoreTaskHistory(task.id);
    }
  }, [onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleCloseHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
    setHistoryTask(null);
  }, []);

  // Update available brands when company filter changes
  useEffect(() => {
    const brands = getBrandsByCompanyInternal(effectiveAdvancedFilters.company);
    setAvailableBrands(brands);
  }, [effectiveAdvancedFilters.company, getBrandsByCompanyInternal]);

  // ==================== FILTERED TASKS ====================
  const filteredTasks = useMemo(() => {
    const tasksWithDemoData = tasks.map(task => getTaskWithDemoData(task));

    let filtered = tasksWithDemoData.filter((task: Task) => {
      const isCompleted = isTaskCompleted(task.id);

      // 🔥 CRITICAL FIX: Handle assigned filter correctly
      if (assignedFilter && assignedFilter !== 'all') {
        if (assignedFilter === 'assigned-to-me' && !isTaskAssignee(task)) {
          return false;
        }
        if (assignedFilter === 'assigned-by-me' && !isTaskAssigner(task)) {
          return false;
        }
      }

      // Apply advanced filters for assigned if set
      if (effectiveAdvancedFilters.assigned !== 'all') {
        if (effectiveAdvancedFilters.assigned === 'assigned-to-me' && !isTaskAssignee(task)) return false;
        if (effectiveAdvancedFilters.assigned === 'assigned-by-me' && !isTaskAssigner(task)) return false;
      }

      // Status Filter
      let statusPass = true;
      if (effectiveAdvancedFilters.status !== 'all') {
        const status = effectiveAdvancedFilters.status.toLowerCase();
        if (status === 'completed' && !isCompleted) statusPass = false;
        else if (status === 'pending' && isCompleted) statusPass = false;
        else if (status === 'in-progress' && task.status !== 'in-progress') statusPass = false;
      } else if (filter !== 'all') {
        if (filter === 'completed' && !isCompleted) statusPass = false;
        else if (filter === 'pending' && isCompleted) statusPass = false;
      }
      if (!statusPass) return false;

      // Priority Filter
      if (effectiveAdvancedFilters.priority !== 'all') {
        const filterPriority = effectiveAdvancedFilters.priority.toLowerCase();
        const taskPriority = task.priority?.toLowerCase() || '';
        if (taskPriority !== filterPriority) return false;
      }

      // Task Type Filter
      if (effectiveAdvancedFilters.taskType !== 'all') {
        const filterType = effectiveAdvancedFilters.taskType.toLowerCase();
        const taskType = task.type?.toLowerCase() || '';
        if (taskType !== filterType) return false;
      }

      // Company Filter
      if (effectiveAdvancedFilters.company !== 'all') {
        const filterCompany = effectiveAdvancedFilters.company.toLowerCase();
        const taskCompany = task.company?.toLowerCase() || '';
        if (taskCompany !== filterCompany) return false;
      }

      // Brand Filter
      if (effectiveAdvancedFilters.brand !== 'all') {
        const filterBrand = effectiveAdvancedFilters.brand.toLowerCase();
        const taskBrand = task.brand?.toLowerCase() || '';
        if (taskBrand !== filterBrand) return false;
      }

      // Date Filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      const dateFilterToUse = effectiveAdvancedFilters.date !== 'all' ? effectiveAdvancedFilters.date : dateFilter;

      if (dateFilterToUse === 'today' && taskDate.getTime() !== today.getTime()) return false;
      if (dateFilterToUse === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        if (taskDate > weekFromNow || taskDate < today) return false;
      }
      if (dateFilterToUse === 'overdue') {
        const isTaskOverdue = isOverdue(task.dueDate, task.status);
        if (!isTaskOverdue) return false;
      }

      // Search Filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(searchLower);
        const matchesAssignee = getEmailByIdInternal(task.assignedTo)?.toLowerCase().includes(searchLower);
        const matchesAssigner = getAssignerEmail(task)?.toLowerCase().includes(searchLower);
        const matchesType = task.type?.toLowerCase().includes(searchLower) || false;
        const matchesCompany = task.company?.toLowerCase().includes(searchLower) || false;
        const matchesBrand = task.brand?.toLowerCase().includes(searchLower) || false;

        if (!matchesTitle && !matchesAssignee && !matchesAssigner &&
          !matchesType && !matchesCompany && !matchesBrand) {
          return false;
        }
      }

      return true;
    });

    // Sorting - Show newest tasks first by creation date
    filtered.sort((a, b) => {
      const aValue = new Date(a.createdAt || a.id).getTime();
      const bValue = new Date(b.createdAt || b.id).getTime();
      return bValue - aValue; // Descending order (newest first)
    });

    return filtered;
  }, [
    tasks,
    filter,
    dateFilter,
    assignedFilter,
    searchTerm,
    effectiveAdvancedFilters,
    isTaskCompleted,
    isTaskAssignee,
    isTaskAssigner,
    isOverdue,
    getEmailByIdInternal,
    getAssignerEmail
  ]);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {assignedFilter === 'assigned-by-me'
                  ? 'Tasks Assigned By Me'
                  : assignedFilter === 'assigned-to-me'
                    ? 'My Tasks'
                    : 'All Tasks'}
              </h1>
              <p className="text-gray-600 mt-1">
                {assignedFilter === 'assigned-by-me'
                  ? 'Tasks you have assigned to others'
                  : assignedFilter === 'assigned-to-me'
                    ? 'Tasks assigned to you'
                    : 'Manage and track all tasks in one place'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              <button
                onClick={handleOpenBulkImporter}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </button>

              <button
                onClick={handleCreateTaskWithHistory}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <TaskFilters
            advancedFilters={effectiveAdvancedFilters}
            availableBrands={availableBrands}
            COMPANY_BRAND_MAP={COMPANY_BRAND_MAP}
            availableTaskTypes={availableTaskTypes}
            showAdvancedFilters={showAdvancedFilters}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyAdvancedFilters}
            onResetFilters={resetFilters}
            onToggleFilters={() => setShowAdvancedFilters(false)}
            getBrandsByCompany={getBrandsByCompanyInternal}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedTasks={selectedTasks}
            bulkDeleting={bulkDeleting}
            onBulkComplete={() => handleBulkStatusChange('completed')}
            onBulkPending={() => handleBulkStatusChange('pending')}
            onBulkDelete={handleBulkDelete}
            onClearSelection={() => setSelectedTasks([])}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No tasks found</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {searchTerm || filter !== 'all' || dateFilter !== 'all' || assignedFilter !== 'all'
                ? 'Try changing your filters or search term to find what you\'re looking for'
                : 'Get started by creating your first task or importing tasks in bulk'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleOpenBulkImporter}
                className="inline-flex items-center px-5 py-3 border-2 border-gray-200 rounded-xl bg-white text-base font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all"
              >
                <Upload className="h-5 w-5 mr-2" />
                Bulk Import Tasks
              </button>
              <button
                onClick={handleCreateTaskWithHistory}
                className="inline-flex items-center px-5 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Task
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-sm font-semibold text-gray-700">
              <div className="col-span-4">Task Details</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Task List */}
            {filteredTasks.map((task) => {
              const isToggling = togglingStatusTasks.includes(task.id);
              const isDeleting = deletingTasks.includes(task.id);
              const isApproving = approvingTasks.includes(task.id);
              const isUpdatingApproval = updatingApproval.includes(task.id);

              return (
                <div key={task.id}>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    <MobileTaskItem
                      task={task}
                      isToggling={isToggling}
                      isDeleting={isDeleting}
                      isApproving={isApproving}
                      isUpdatingApproval={isUpdatingApproval}
                      openMenuId={openMenuId}
                      currentUser={currentUser}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={(taskId: string, isCompleted: boolean) => getTaskStatusIcon(taskId, isCompleted, isToggling)}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTaskClick={handleOpenEditModal}
                      onOpenCommentSidebar={handleOpenCommentSidebar}
                      onOpenReassignModal={handleOpenReassignModal}
                      onPermanentApproval={handlePermanentApproval}
                      onOpenApprovalModal={handleOpenApprovalModal}
                      onDeleteTask={handleDeleteTask}
                      onSetOpenMenuId={setOpenMenuId}
                      isTaskAssignee={isTaskAssignee}
                      isTaskAssigner={isTaskAssigner}
                      isTaskCompleted={isTaskCompleted}
                      isTaskPermanentlyApproved={isTaskPermanentlyApproved}
                      isTaskPendingApproval={isTaskPendingApproval}
                      onOpenHistoryModal={handleOpenHistoryModal}
                    />
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <DesktopTaskItem
                      task={task}
                      isToggling={isToggling}
                      currentUser={currentUser}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={(taskId: string, isCompleted: boolean) => getTaskStatusIcon(taskId, isCompleted, isToggling)}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTaskClick={handleOpenEditModal}
                      onOpenCommentSidebar={handleOpenCommentSidebar}
                      onOpenHistoryModal={handleOpenHistoryModal}
                      isTaskCompleted={isTaskCompleted}
                      isTaskPermanentlyApproved={isTaskPermanentlyApproved}
                      isTaskAssignee={isTaskAssignee}
                      isTaskAssigner={isTaskAssigner}
                      onPermanentApproval={handlePermanentApproval}
                      isUpdatingApproval={isUpdatingApproval}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImporter && (
        <BulkImporter
          draftTasks={bulkDraftTasks}
          defaults={bulkImportDefaults}
          users={users}
          companyBrandMap={COMPANY_BRAND_MAP}
          availableTaskTypes={availableTaskTypes}
          onDefaultsChange={handleBulkDefaultsChange}
          onDraftsChange={handleBulkDraftsChange}
          onClose={() => setShowBulkImporter(false)}
          onSubmit={handleBulkImportSubmit}
          submitting={bulkSubmitting}
          summary={bulkCreateSummary}
          getBrandsByCompany={getBrandsByCompanyInternal}
        />
      )}

      {/* Comment Sidebar */}
      <CommentSidebar
        showCommentSidebar={showCommentSidebar}
        selectedTask={selectedTask}
        newComment={newComment}
        commentLoading={commentLoading}
        deletingCommentId={deletingCommentId}
        loadingComments={loadingComments}
        loadingHistory={selectedTask ? loadingHistory[selectedTask.id] : false}
        currentUser={currentUser}
        formatDate={formatDate}
        isOverdue={isOverdue}
        onCloseSidebar={handleCloseCommentSidebar}
        onSetNewComment={setNewComment}
        onSaveComment={handleSaveComment}
        onDeleteComment={onDeleteComment ? (commentId: string) => handleDeleteComment(selectedTask?.id || '', commentId) : undefined}
        getTaskComments={getTaskCommentsInternal}
        getUserInfoForDisplay={getUserInfoForDisplay}
        isTaskCompleted={isTaskCompleted}
        getStatusBadgeColor={getStatusBadgeColor}
        getStatusText={getStatusText}
        formatDateTime={formatDateTime}
      />

      {/* Approval Modal */}
      <ApprovalModal
        showApprovalModal={showApprovalModal}
        taskToApprove={taskToApprove}
        approvalAction={approvalAction}
        approvingTasks={approvingTasks}
        onClose={handleCloseApprovalModal}
        onApprove={handleApproveTask}
      />

      {/* Reassign Modal */}
      <ReassignModal
        showReassignModal={showReassignModal}
        reassignTask={reassignTask}
        newAssigneeId={newAssigneeId}
        reassignLoading={reassignLoading}
        users={users}
        onClose={handleCloseReassignModal}
        onAssigneeChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAssigneeId(e.target.value)}
        onReassign={handleReassignTask}
      />

      {/* Task History Modal - UPDATED WITH NEW PROPS */}
      <TaskHistoryModal
        showHistoryModal={showHistoryModal}
        historyTask={historyTask}
        timelineItems={getTimelineItems(historyTask?.id || '')}
        loadingHistory={historyTask ? loadingHistory[historyTask.id] : false}
        loadingComments={loadingComments}
        currentUser={currentUser}
        users={users}
        onClose={handleCloseHistoryModal}
        formatDate={formatDate}
        getEmailByIdInternal={getEmailByIdInternal}
        getAssignerEmail={getAssignerEmail}
      />
    </div>
  );
};

export default AllTasksPage;