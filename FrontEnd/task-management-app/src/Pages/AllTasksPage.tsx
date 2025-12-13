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
  Save,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building,
  Layers,
  FileClock,
} from 'lucide-react';

import type { Task, UserType, CommentType, TaskHistory } from '../Types/Types';
import toast from 'react-hot-toast';
import { useMemo, useCallback, useState, memo } from 'react';

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
}

type BulkPriority = 'low' | 'medium' | 'high' | 'urgent';

interface BulkTaskPayload {
  title: string;
  description?: string;
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

interface BulkCreateResult {
  created: Task[];
  failures: BulkCreateFailure[];
}

interface BulkImportDefaults {
  assignedTo: string;
  dueDate: string;
  priority: BulkPriority;
  taskType: string;
  companyName: string;
  brand: string;
}

interface BulkTaskDraft {
  id: string;
  rowNumber: number;
  title: string;
  description: string;
  assignedTo: string;
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

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  taskType: string;
  company: string;
  brand: string;
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

// ==================== CONSTANTS ====================
const COMPANY_BRAND_MAP: Record<string, string[]> = {
  'acs': ['chips', 'soy', 'saffola'],
  'md inpex': ['inpex pro', 'inpex lite', 'inpex max'],
  'tech solutions': ['techx', 'techpro', 'techlite'],
  'global inc': ['lays', 'pepsi', '7up']
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
const TASK_TYPE_OPTIONS = ['regular', 'troubleshoot', 'maintenance', 'development', 'bug', 'feature'] as const;
const COMPANY_OPTIONS = ['acs', 'md inpex', 'tech solutions', 'global inc', 'other'] as const;

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
  if (task.company && task.brand && task.type) {
    return {
      ...task,
      company: task.company.toLowerCase(),
      brand: task.brand.toLowerCase(),
      type: task.type.toLowerCase()
    };
  }

  const companies = ['acs', 'md inpex', 'tech solutions', 'global inc'];
  const brands = ['chips', 'soy', 'saffola', 'lays', 'pepsi', '7up', 'inpex pro', 'inpex lite', 'inpex max', 'techx', 'techpro', 'techlite'];
  const types = ['regular', 'troubleshoot', 'maintenance', 'development'];

  const hash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    ...task,
    company: (task.company || companies[hash % companies.length]).toLowerCase(),
    brand: (task.brand || brands[hash % brands.length]).toLowerCase(),
    type: (task.type || types[hash % types.length]).toLowerCase(),
  };
};

const validateBulkDraft = (draft: BulkTaskDraft): BulkTaskDraft => {
  const errors: string[] = [];

  if (!draft.title.trim()) {
    errors.push('Title is required');
  }

  if (!draft.assignedTo.trim()) {
    errors.push('Assignee email is required');
  } else if (!draft.assignedTo.includes('@')) {
    errors.push('Invalid email format for assignee');
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

// Edit Task Modal Component
const EditTaskModal = memo(({
  showEditModal,
  editingTask,
  editFormData,
  editLoading,
  users,
  onClose,
  onFormChange,
  onSubmit
}: {
  showEditModal: boolean;
  editingTask: Task | null;
  editFormData: TaskFormData;
  editLoading: boolean;
  users: UserType[];
  onClose: () => void;
  onFormChange: (field: keyof TaskFormData, value: string) => void;
  onSubmit: () => Promise<void>;
}) => {
  if (!showEditModal || !editingTask) return null;

  const availableBrands = editFormData.company && COMPANY_BRAND_MAP[editFormData.company]
    ? COMPANY_BRAND_MAP[editFormData.company]
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
            <p className="text-sm text-gray-500">Update task details below</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => onFormChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => onFormChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Enter task description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To *
                </label>
                <select
                  value={editFormData.assignedTo}
                  onChange={(e) => onFormChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select assignee</option>
                  {users.map(user => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => onFormChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Can be today's date or any future date
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={editFormData.priority}
                  onChange={(e) => onFormChange('priority', e.target.value as TaskFormData['priority'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PRIORITY_OPTIONS.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Type
                </label>
                <select
                  value={editFormData.taskType}
                  onChange={(e) => onFormChange('taskType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select type</option>
                  {TASK_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <select
                  value={editFormData.company}
                  onChange={(e) => onFormChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select company</option>
                  {COMPANY_OPTIONS.map(company => (
                    <option key={company} value={company}>
                      {company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={editFormData.brand}
                  onChange={(e) => onFormChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!editFormData.company}
                >
                  <option value="">Select brand</option>
                  {availableBrands.map(brand => (
                    <option key={brand} value={brand}>
                      {brand.split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
                {!editFormData.company && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select a company first
                  </p>
                )}
              </div>
            </div>

            {editFormData.brand === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Brand Name
                </label>
                <input
                  type="text"
                  value={editFormData.brand === 'other' ? '' : editFormData.brand}
                  onChange={(e) => onFormChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom brand name"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Make changes and save to update the task
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={editLoading || !editFormData.title.trim() || !editFormData.assignedTo.trim() || !editFormData.dueDate}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2 ${editLoading || !editFormData.title.trim() || !editFormData.assignedTo.trim() || !editFormData.dueDate
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {editLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

EditTaskModal.displayName = 'EditTaskModal';

// Task Status Badge Component
const TaskStatusBadge = memo(({ taskId, tasks, }: {
  taskId: string;
  tasks: Task[];
  currentUser: UserType;
}) => {
  const task = tasks.find(t => t.id === taskId);

  const getStatusInfo = (): TaskStatusInfo => {
    if (!task) {
      return {
        isCompleted: false,
        isPermanentlyApproved: false,
        isPendingApproval: false,
        isAdminApproved: false,
        statusText: 'Unknown',
        badgeColor: 'bg-gray-100 text-gray-800 border border-gray-200'
      };
    }

    const isCompleted = task.status === 'completed';
    const isPermanentlyApproved = Boolean(task.completedApproval);

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return {
          isCompleted: true,
          isPermanentlyApproved: true,
          isPendingApproval: false,
          isAdminApproved: true,
          statusText: '✅ PERMANENTLY Approved',
          badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200'
        };
      } else {
        const adminApproved = task.history?.some(h =>
          h.action === 'admin_approved' ||
          (h.action === 'completed' && h.userRole === 'admin')
        );

        if (adminApproved) {
          return {
            isCompleted: true,
            isPermanentlyApproved: false,
            isPendingApproval: false,
            isAdminApproved: true,
            statusText: '✅ Approved',
            badgeColor: 'bg-green-100 text-green-800 border border-green-200'
          };
        } else {
          return {
            isCompleted: true,
            isPermanentlyApproved: false,
            isPendingApproval: true,
            isAdminApproved: false,
            statusText: '⏳ Pending Admin Approval',
            badgeColor: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          };
        }
      }
    }

    return {
      isCompleted: false,
      isPermanentlyApproved: false,
      isPendingApproval: false,
      isAdminApproved: false,
      statusText: 'Pending',
      badgeColor: 'bg-gray-100 text-gray-800 border border-gray-200'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`px-2 py-1 text-xs rounded text-center ${statusInfo.badgeColor}`}>
      {statusInfo.statusText}
    </div>
  );
});

TaskStatusBadge.displayName = 'TaskStatusBadge';

// Task Filters Component
const TaskFilters = memo(({
  advancedFilters,
  availableBrands,
  showAdvancedFilters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onToggleFilters
}: {
  advancedFilters: AdvancedFilters;
  availableBrands: string[];
  showAdvancedFilters: boolean;
  onFilterChange: (filterType: keyof AdvancedFilters, value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onToggleFilters: () => void;
}) => {
  if (!showAdvancedFilters) return null;

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
            value={advancedFilters.company}
            onChange={(e) => onFilterChange('company', e.target.value)}
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
            value={advancedFilters.brand}
            onChange={(e) => onFilterChange('brand', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={advancedFilters.company === 'all'}
          >
            {advancedFilters.company === 'all' ? (
              <>
                <option value="all">All Brands</option>
                <option value="soy">Soy</option>
                <option value="lays">Lays</option>
                <option value="pepsi">Pepsi</option>
                <option value="7up">7Up</option>
                <option value="inpex pro">Inpex Pro</option>
                <option value="inpex lite">Inpex Lite</option>
                <option value="inpex max">Inpex Max</option>
                <option value="techx">TechX</option>
                <option value="techpro">TechPro</option>
                <option value="techlite">TechLite</option>
              </>
            ) : (
              <>
                <option value="all">All {advancedFilters.company} Brands</option>
                {availableBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand.split(' ').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </>
            )}
          </select>
          {advancedFilters.company === 'all' && (
            <p className="text-xs text-gray-500 mt-1">
              Select a company first to filter brands
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

// Bulk Importer Component
const BulkImporter = memo(({
  draftTasks,
  defaults,
  users,
  onDefaultsChange,
  onDraftsChange,
  onClose,
  onSubmit,
  submitting,
  summary
}: {
  draftTasks: BulkTaskDraft[];
  defaults: BulkImportDefaults;
  users: UserType[];
  onDefaultsChange: (defaults: Partial<BulkImportDefaults>) => void;
  onDraftsChange: (drafts: BulkTaskDraft[]) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  summary: BulkCreateResult | null;
}) => {
  const [bulkTaskInput, setBulkTaskInput] = useState<string>('');

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

    const taskTitles = bulkTaskInput.trim().split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0);

    if (taskTitles.length === 0) {
      toast.error('No valid tasks found');
      return;
    }

    const drafts: BulkTaskDraft[] = taskTitles.map((title, index) => {
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const errors: string[] = [];

      if (!title.trim()) {
        errors.push('Task title is required');
      }

      return {
        id: draftId,
        rowNumber: index + 1,
        title,
        description: '',
        assignedTo: defaults.assignedTo,
        dueDate: defaults.dueDate,
        priority: defaults.priority as BulkPriority,
        taskType: defaults.taskType,
        companyName: defaults.companyName,
        brand: defaults.brand,
        errors
      };
    });

    onDraftsChange(drafts);
    setBulkTaskInput('');
    toast.success(`✅ ${taskTitles.length} tasks parsed successfully`);
  }, [bulkTaskInput, defaults, onDraftsChange]);

  const handleAddSingleTask = useCallback(() => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newDraft: BulkTaskDraft = {
      id: draftId,
      rowNumber: draftTasks.length + 1,
      title: '',
      description: '',
      assignedTo: defaults.assignedTo,
      dueDate: defaults.dueDate,
      priority: defaults.priority as BulkPriority,
      taskType: defaults.taskType,
      companyName: defaults.companyName,
      brand: defaults.brand,
      errors: []
    };

    onDraftsChange([...draftTasks, newDraft]);
  }, [draftTasks, defaults, onDraftsChange]);

  const errorCount = draftTasks.reduce((count, task) => count + task.errors.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Task Creator</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Default Settings */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Assignee</label>
              <select
                value={defaults.assignedTo}
                onChange={(e) => onDefaultsChange({ assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select assignee</option>
                {users.map(user => (
                  <option key={user.id || user.email} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Due Date</label>
              <input
                type="date"
                value={defaults.dueDate}
                onChange={(e) => onDefaultsChange({ dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Priority</label>
              <select
                value={defaults.priority}
                onChange={(e) => onDefaultsChange({ priority: e.target.value as BulkPriority })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddSingleTask}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Single Task
              </button>
            </div>
          </div>

          {/* Bulk Input Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">Quick Paste Multiple Tasks</label>
              <span className="text-xs text-gray-500">One task per line</span>
            </div>
            <div className="flex gap-2">
              <textarea
                value={bulkTaskInput}
                onChange={(e) => setBulkTaskInput(e.target.value)}
                placeholder="Enter task titles (one per line):
Fix login issue
Update documentation
Test mobile responsiveness
Add user notifications
..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px]"
                rows={4}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleParseBulkInput}
                  disabled={!bulkTaskInput.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  Add Tasks
                </button>
                <button
                  onClick={() => {
                    const sampleTasks = [
                      "Fix login authentication issue",
                      "Update API documentation",
                      "Test mobile responsiveness",
                      "Add user notification system",
                      "Optimize database queries",
                      "Fix CSS styling issues"
                    ].join('\n');
                    setBulkTaskInput(sampleTasks);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Load Sample
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
                <div className="flex items-center gap-2">
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

              {/* Tasks Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-left w-16">#</th>
                      <th className="px-4 py-3 text-left">Task Title *</th>
                      <th className="px-4 py-3 text-left w-56">Assigned To *</th>
                      <th className="px-4 py-3 text-left w-40">Due Date *</th>
                      <th className="px-4 py-3 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {draftTasks.map((draft) => (
                      <tr key={draft.id} className={draft.errors.length ? 'bg-red-50/30' : 'hover:bg-gray-50'}>
                        {/* Index */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500 font-medium">#{draft.rowNumber}</div>
                        </td>

                        {/* Task Title */}
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(e) => handleFieldChange(draft.id, 'title', e.target.value)}
                              className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Title')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                              placeholder="Enter task title"
                            />
                          </div>
                          {draft.errors.some(e => e.includes('Title')) && (
                            <p className="text-xs text-red-600 mt-1">Task title is required</p>
                          )}
                        </td>

                        {/* Assignee */}
                        <td className="px-4 py-3">
                          <select
                            value={draft.assignedTo}
                            onChange={(e) => handleFieldChange(draft.id, 'assignedTo', e.target.value)}
                            className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('Assignee') || e.includes('email')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
                          >
                            <option value="">Select assignee</option>
                            {users.map(user => (
                              <option key={user.id || user.email} value={user.email}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                          </select>
                          {draft.errors.some(e => e.includes('Assignee') || e.includes('email')) && (
                            <p className="text-xs text-red-600 mt-1">Please select a valid assignee</p>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={draft.dueDate}
                            onChange={(e) => handleFieldChange(draft.id, 'dueDate', e.target.value)}
                            className={`w-full px-3 py-2 border ${draft.errors.some(e => e.includes('date')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                          />
                          {draft.errors.some(e => e.includes('date')) && (
                            <p className="text-xs text-red-600 mt-1">Please select a valid date</p>
                          )}
                        </td>

                        {/* Actions */}
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors Summary */}
              {draftTasks.some(draft => draft.errors.length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    Please fix the following errors before creating tasks:
                  </div>
                  <div className="space-y-2">
                    {draftTasks.map(draft =>
                      draft.errors.map((error, idx) => (
                        <div key={`${draft.id}-error-${idx}`} className="text-sm text-red-600">
                          <span className="font-medium">Row #{draft.rowNumber}:</span> {error}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Previous Summary (if any) */}
              {summary && summary.failures.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    Previous run had {summary.failures.length} failure(s)
                  </div>
                  <ul className="list-disc ml-5 text-sm text-yellow-700 space-y-1">
                    {summary.failures.map(failure => (
                      <li key={failure.index}>
                        Row #{failure.rowNumber} - "{failure.title}" → {failure.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
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

// Bulk Actions Component
const BulkActions = memo(({
  selectedTasks,
  bulkDeleting,
  onBulkComplete,
  onBulkPending,
  onBulkDelete,
  onClearSelection
}: {
  selectedTasks: string[];
  bulkDeleting: boolean;
  onBulkComplete: () => void;
  onBulkPending: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}) => {
  if (selectedTasks.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-blue-700 font-medium">
          {selectedTasks.length} task(s) selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onBulkComplete}
          className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded text-sm font-medium text-green-700 bg-white hover:bg-green-50"
        >
          <Check className="h-4 w-4 mr-2" />
          Mark Completed
        </button>
        <button
          onClick={onBulkPending}
          className="inline-flex items-center px-3 py-1.5 border border-yellow-300 rounded text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50"
        >
          <Clock className="h-4 w-4 mr-2" />
          Mark Pending
        </button>
        <button
          onClick={onBulkDelete}
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
          onClick={onClearSelection}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Selection
        </button>
      </div>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';

// Task Item Component (Mobile View)
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
  getStatusBadgeColor,
  getStatusText,
  getUserInfoForDisplay,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  onOpenReassignModal,
  onPermanentApproval,
  onOpenApprovalModal,
  onDeleteTask,
  onSetOpenMenuId,
  isTaskAssignee,
  isTaskAssigner,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskPendingApproval,
  onOpenHistoryModal
}: any) => {
  const userInfo = getUserInfoForDisplay(task);
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const isPendingApproval = isTaskPendingApproval(task.id);
  const isAssigner = isTaskAssigner(task);
  const isAssignee = isTaskAssignee(task);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className={`bg-white rounded-lg border ${getTaskBorderColor(task)} transition-all duration-200 hover:shadow-md`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {isAssigner && !isPermanentlyApproved && isCompleted && (
              <input
                type="checkbox"
                checked={isPermanentlyApproved}
                onChange={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                disabled={isUpdatingApproval}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                title="Permanently approve this task"
              />
            )}

            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling || (isPermanentlyApproved && isAssignee && !isAssigner)}
              className={`p-1.5 rounded-full border ${isCompleted
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
                  <span className={`px-2 py-0.5 text-xs rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {task.priority}
                  </span>
                )}
                {task.type && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 text-xs rounded-full">
                    {task.type}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetOpenMenuId(openMenuId === task.id ? null : task.id);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Task Actions"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-500" />
            </button>

            {openMenuId === task.id && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                <button
                  onClick={() => {
                    onOpenCommentSidebar(task);
                    onSetOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  View Details & Comments
                </button>

                <button
                  onClick={() => onEditTaskClick(task)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Task
                </button>

                <button
                  onClick={() => {
                    onOpenHistoryModal(task);
                    onSetOpenMenuId(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FileClock className="h-4 w-4" />
                  View History
                </button>

                {isAdmin && (
                  <button
                    onClick={() => onOpenReassignModal(task)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Reassign
                  </button>
                )}

                {isAssigner && (
                  <button
                    onClick={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
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

                {isAdmin && isPendingApproval && (
                  <>
                    <button
                      onClick={() => onOpenApprovalModal(task, 'approve')}
                      disabled={isApproving}
                      className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve Completion
                    </button>
                    <button
                      onClick={() => onOpenApprovalModal(task, 'reject')}
                      disabled={isApproving}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject Completion
                    </button>
                  </>
                )}

                <button
                  onClick={() => onDeleteTask(task.id)}
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
          {task.company && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4" />
              <span>{task.company}</span>
            </div>
          )}
          {task.brand && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Layers className="h-4 w-4" />
              <span>{task.brand}</span>
            </div>
          )}
        </div>

        {task.description && (
          <div className="mt-3 text-sm text-gray-600">
            {task.description.length > 100
              ? `${task.description.substring(0, 100)}...`
              : task.description}
          </div>
        )}
      </div>
    </div>
  );
});

MobileTaskItem.displayName = 'MobileTaskItem';

// Desktop Task Item Component
const DesktopTaskItem = memo(({
  task,
  isToggling,
  currentUser,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskAssignee,
  isTaskAssigner,
  onPermanentApproval,
  isUpdatingApproval,
  onOpenHistoryModal
}: any) => {
  const userInfo = getUserInfoForDisplay(task);
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const isAssignee = isTaskAssignee(task);
  const isAssigner = isTaskAssigner(task);

  return (
    <div className={`bg-white rounded-lg border ${getTaskBorderColor(task)} transition-all duration-200 hover:shadow-md`}>
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center">
        {/* Task Info - col-span-4 */}
        <div className="col-span-4">
          <div className="flex items-start gap-2">
            {isAssigner && !isPermanentlyApproved && isCompleted && (
              <input
                type="checkbox"
                checked={isPermanentlyApproved}
                onChange={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                disabled={isUpdatingApproval}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 mt-0.5"
                title="Permanently approve this task"
              />
            )}

            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling || (isPermanentlyApproved && isAssignee && !isAssigner)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded mt-0.5"
              title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            >
              {getTaskStatusIcon(task.id, isCompleted, isToggling)}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {task.title}
                </h3>
                {task.priority && (
                  <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {task.priority}
                  </span>
                )}
                {task.type && (
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                    {task.type}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                {task.company && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {task.company}
                  </span>
                )}
                {task.brand && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {task.brand}
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assigned To - col-span-2 */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-gray-900 truncate">
                {userInfo.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {userInfo.email}
              </div>
            </div>
          </div>
        </div>

        {/* Due Date - col-span-2 */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <div className="text-sm text-gray-900">
                {formatDate(task.dueDate)}
              </div>
              {isOverdue(task.dueDate, task.status) && !isCompleted && (
                <div className="text-red-600 text-xs">Overdue</div>
              )}
            </div>
          </div>
        </div>

        {/* Status Column - col-span-2 */}
        <div className="col-span-2">
          <TaskStatusBadge
            taskId={task.id}
            tasks={[task]}
            currentUser={currentUser}
          />
        </div>

        {/* Actions - col-span-2 */}
        <div className="col-span-2">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onEditTaskClick(task)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit Task"
            >
              <Edit className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="p-1 hover:bg-gray-100 rounded relative"
              title="View Details & Comments"
            >
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={() => onOpenHistoryModal(task)}
              className="p-1 hover:bg-gray-100 rounded"
              title="View Task History"
            >
              <FileClock className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopTaskItem.displayName = 'DesktopTaskItem';

// History Timeline Component
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

  if (timelineItems.length === 0) {
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
      {timelineItems.map((item, index) => {
        const isComment = item.type === 'comment';
        const isExpanded = expandedItems.includes(item.id);
        const isCurrentUserAuthor = isComment && (item.data as CommentType).userId === currentUser.id;

        return (
          <div
            key={item.id}
            className={`border-l-2 pl-4 pb-4 relative ${index !== timelineItems.length - 1 ? '' : ''}`}
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
                    ? (item.data as CommentType).userName || 'User'
                    : (item.data as TaskHistory).userName || 'System'}
                </div>
                <div className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {isComment
                    ? (item.data as CommentType).userRole || 'User'
                    : (item.data as TaskHistory).userRole || 'System'}
                </div>
                <div className="text-xs text-gray-500">
                  {isComment
                    ? (item.data as CommentType).userEmail || ''
                    : (item.data as TaskHistory).userEmail || ''}
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
                      {(item.data as TaskHistory).additionalData && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-100">
                          <span className="font-medium">Details:</span>
                          <pre className="text-xs mt-1 whitespace-pre-wrap">
                            {JSON.stringify((item.data as TaskHistory).additionalData, null, 2)}
                          </pre>
                        </div>
                      )}
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

// Comment Sidebar Component
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
  onDeleteComment,
  deletingCommentId,
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
      <div className="absolute inset-y-0 right-0">
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
                        <div className="text-gray-600 text-xs truncate">
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
                  {/* Add Comment Section */}
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

// Approval Modal Component
const ApprovalModal = memo(({
  showApprovalModal,
  taskToApprove,
  approvalAction,
  approvingTasks,
  onClose,
  onApprove
}: any) => {
  if (!showApprovalModal || !taskToApprove) return null;

  return (
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
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onApprove(approvalAction === 'approve')}
            disabled={approvingTasks.includes(taskToApprove.id)}
            className={`px-4 py-2 rounded-lg text-white ${approvalAction === 'approve'
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
  );
});

ApprovalModal.displayName = 'ApprovalModal';

// Reassign Modal Component
const ReassignModal = memo(({
  showReassignModal,
  reassignTask,
  newAssigneeId,
  reassignLoading,
  users,
  onClose,
  onAssigneeChange,
  onReassign
}: any) => {
  if (!showReassignModal || !reassignTask) return null;

  return (
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
            onChange={onAssigneeChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Select a user</option>
            {users.map((user: UserType) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onReassign}
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
  );
});

ReassignModal.displayName = 'ReassignModal';

// Task History Modal Component
const TaskHistoryModal = memo(({
  showHistoryModal,
  historyTask,
  timelineItems,
  loadingHistory,
  loadingComments,
  currentUser,
  onClose,
  formatDate
}: {
  showHistoryModal: boolean;
  historyTask: Task | null;
  timelineItems: HistoryDisplayItem[];
  loadingHistory: boolean;
  loadingComments: boolean;
  currentUser: UserType;
  onClose: () => void;
  formatDate: (date: string) => string;
}) => {
  if (!showHistoryModal || !historyTask) return null;

  // Format creation date for display
  const formattedCreatedAt = formatDateTime(historyTask.createdAt || historyTask.updatedAt || new Date().toISOString());

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

            {/* Task Creation Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
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
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
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
              </div>
            </div>

            {/* History Timeline */}
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
  onEditTask,
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
  onBulkCreateTasks
}) => {
  // State
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [deletingTasks, setDeletingTasks] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [togglingStatusTasks, setTogglingStatusTasks] = useState<string[]>([]);
  const [approvingTasks, setApprovingTasks] = useState<string[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Edit Task Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    taskType: '',
    company: '',
    brand: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editChanges, setEditChanges] = useState<Partial<Task> | null>(null);

  // Filter state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all',
    priority: 'all',
    assigned: 'all',
    date: 'all',
    taskType: 'all',
    company: 'all',
    brand: 'all'
  });

  // Company-Brand mapping state
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

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
    assignedTo: currentUser.email || '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    taskType: 'regular',
    companyName: 'ACS',
    brand: 'chips'
  });
  const [bulkDraftTasks, setBulkDraftTasks] = useState<BulkTaskDraft[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkCreateSummary, setBulkCreateSummary] = useState<BulkCreateResult | null>(null);

  // ==================== UTILITY FUNCTIONS ====================
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

    return getEmailByIdInternal(task.assignedBy);
  }, [getEmailByIdInternal]);

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

  // ==================== TASK STATUS FUNCTIONS ====================
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
      (h.action === 'completed' && h.userRole === 'admin')
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
  }, [currentUser, onAddTaskHistory, onFetchTaskHistory]);

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

  const trackFieldChange = useCallback((originalTask: Task, updatedTask: Partial<Task>) => {
    const changes: string[] = [];

    if (updatedTask.title !== undefined && updatedTask.title !== originalTask.title) {
      changes.push(`Title changed from "${originalTask.title}" to "${updatedTask.title}"`);
    }

    if (updatedTask.description !== undefined && updatedTask.description !== originalTask.description) {
      changes.push('Description updated');
    }

    if (updatedTask.assignedTo !== undefined && updatedTask.assignedTo !== originalTask.assignedTo) {
      const oldAssignee = getEmailByIdInternal(originalTask.assignedTo);
      const newAssignee = getEmailByIdInternal(updatedTask.assignedTo);
      changes.push(`Assignee changed from ${oldAssignee} to ${newAssignee}`);
    }

    if (updatedTask.dueDate !== undefined && updatedTask.dueDate !== originalTask.dueDate) {
      const oldDate = new Date(originalTask.dueDate).toLocaleDateString();
      const newDate = new Date(updatedTask.dueDate).toLocaleDateString();
      changes.push(`Due date changed from ${oldDate} to ${newDate}`);
    }

    if (updatedTask.priority !== undefined && updatedTask.priority !== originalTask.priority) {
      changes.push(`Priority changed from ${originalTask.priority} to ${updatedTask.priority}`);
    }

    if (updatedTask.type !== undefined && updatedTask.type !== originalTask.type) {
      changes.push(`Type changed from ${originalTask.type} to ${updatedTask.type}`);
    }

    if (updatedTask.company !== undefined && updatedTask.company !== originalTask.company) {
      changes.push(`Company changed from ${originalTask.company} to ${updatedTask.company}`);
    }

    if (updatedTask.brand !== undefined && updatedTask.brand !== originalTask.brand) {
      changes.push(`Brand changed from ${originalTask.brand} to ${updatedTask.brand}`);
    }

    return changes;
  }, [getEmailByIdInternal]);

  const fetchAndStoreTaskHistory = useCallback(async (taskId: string) => {
    if (!onFetchTaskHistory) return;

    setLoadingHistory(prev => ({
      ...prev,
      [taskId]: true
    }));

    try {
      const history = await onFetchTaskHistory(taskId);
      setTaskHistory(prev => ({
        ...prev,
        [taskId]: history
      }));
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load task history');
    } finally {
      setLoadingHistory(prev => ({
        ...prev,
        [taskId]: false
      }));
    }
  }, [onFetchTaskHistory]);

  // ==================== EDIT TASK FUNCTIONS ====================
  const handleOpenEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setEditChanges(null);

    // Get user email for assignedTo field
    const assignedToEmail = getEmailByIdInternal(task.assignedTo);

    setEditFormData({
      title: task.title || '',
      description: task.description || '',
      assignedTo: assignedToEmail || '',
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      priority: (task.priority as TaskFormData['priority']) || 'medium',
      taskType: task.type || '',
      company: task.company || '',
      brand: task.brand || ''
    });

    setShowEditModal(true);
    setOpenMenuId(null);
  }, [getEmailByIdInternal]);

  const handleEditFormChange = useCallback((field: keyof TaskFormData, value: string) => {
    setEditFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      return newData;
    });

    // Track changes
    if (editingTask) {
      const updatedTask: Partial<Task> = {
        ...editChanges,
        [field === 'assignedTo' ? 'assignedTo' : field]: value
      };

      // Store changes for history tracking
      setEditChanges(updatedTask);
    }

    // If company changes, reset brand
    if (field === 'company') {
      setEditFormData(prev => ({
        ...prev,
        company: value,
        brand: ''
      }));
    }
  }, [editingTask, editChanges]);

  const handleEditSubmit = useCallback(async () => {
    if (!editingTask || !onEditTask) {
      toast.error('Edit functionality not available');
      return;
    }

    if (!editFormData.title.trim() || !editFormData.assignedTo.trim() || !editFormData.dueDate) {
      toast.error('Please fill all required fields');
      return;
    }

    setEditLoading(true);

    try {
      const updatedTaskData: Partial<Task> = {
        title: editFormData.title,
        description: editFormData.description,
        assignedTo: editFormData.assignedTo,
        dueDate: editFormData.dueDate,
        priority: editFormData.priority,
        type: editFormData.taskType,
        company: editFormData.company,
        brand: editFormData.brand,
        updatedAt: new Date().toISOString()
      };

      // Track changes for history
      const changes = trackFieldChange(editingTask, updatedTaskData);

      const updatedTask = await onEditTask(editingTask.id, updatedTaskData);

      if (updatedTask) {
        // Add detailed history record for each change
        if (changes.length > 0) {
          const changeDescription = changes.join(', ');
          await addHistoryRecord(
            editingTask.id,
            'task_edited',
            `Task edited by ${currentUser.role} (${currentUser.name}): ${changeDescription}`,
            { changes }
          );
        } else {
          await addHistoryRecord(
            editingTask.id,
            'task_edited',
            `Task edited by ${currentUser.role} (${currentUser.name}) - No significant changes detected`
          );
        }

        toast.success('✅ Task updated successfully!');
        setShowEditModal(false);
        setEditChanges(null);
      }
    } catch (error: any) {
      console.error('Error editing task:', error);
      toast.error(`Failed to update task: ${error.message || 'Unknown error'}`);
    } finally {
      setEditLoading(false);
    }
  }, [editingTask, editFormData, editChanges, onEditTask, trackFieldChange, addHistoryRecord, currentUser]);

  // ==================== BULK IMPORT FUNCTIONS ====================
  const handleOpenBulkImporter = useCallback(() => {
    setShowBulkImporter(true);
    setBulkCreateSummary(null);
    setBulkDraftTasks([]);

    // Set current user as default assignee
    setBulkImportDefaults(prev => ({
      ...prev,
      assignedTo: currentUser.email || '',
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
      const payloads: BulkTaskPayload[] = validatedDrafts.map(draft => ({
        title: draft.title,
        description: draft.description || undefined,
        assignedTo: draft.assignedTo,
        dueDate: draft.dueDate,
        priority: (draft.priority || bulkImportDefaults.priority) as BulkPriority,
        taskType: draft.taskType || bulkImportDefaults.taskType,
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
      setAdvancedFilters(prev => ({
        ...prev,
        company: value,
        brand: 'all'
      }));

      if (value !== 'all' && COMPANY_BRAND_MAP[value.toLowerCase()]) {
        setAvailableBrands(COMPANY_BRAND_MAP[value.toLowerCase()]);
      } else {
        setAvailableBrands([]);
      }
    } else {
      setAdvancedFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  }, []);

  const applyAdvancedFilters = useCallback(() => {
    if (advancedFilters.status !== 'all') {
      setFilter(advancedFilters.status);
    } else {
      setFilter('all');
    }

    if (advancedFilters.priority !== 'all') {
      // Handle priority filter if needed
    }

    if (advancedFilters.assigned !== 'all') {
      setAssignedFilter?.(advancedFilters.assigned);
    } else if (setAssignedFilter) {
      setAssignedFilter('all');
    }

    if (advancedFilters.date !== 'all') {
      setDateFilter(advancedFilters.date);
    } else {
      setDateFilter('all');
    }

    setShowAdvancedFilters(false);
    toast.success('Filters applied successfully');
  }, [advancedFilters, setFilter, setAssignedFilter, setDateFilter]);

  const resetFilters = useCallback(() => {
    setAdvancedFilters({
      status: 'all',
      priority: 'all',
      assigned: 'all',
      date: 'all',
      taskType: 'all',
      company: 'all',
      brand: 'all'
    });

    setAvailableBrands([]);
    setFilter('all');
    setDateFilter('all');
    if (setAssignedFilter) setAssignedFilter('all');
    setSearchTerm('');

    setShowAdvancedFilters(false);
    toast.success('All filters cleared');
  }, [setFilter, setAssignedFilter, setDateFilter, setSearchTerm]);

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
      if (advancedFilters.assigned !== 'all') {
        if (advancedFilters.assigned === 'assigned-to-me' && !isTaskAssignee(task)) return false;
        if (advancedFilters.assigned === 'assigned-by-me' && !isTaskAssigner(task)) return false;
      }

      // Status Filter
      let statusPass = true;
      if (advancedFilters.status !== 'all') {
        const status = advancedFilters.status.toLowerCase();
        if (status === 'completed' && !isCompleted) statusPass = false;
        else if (status === 'pending' && isCompleted) statusPass = false;
        else if (status === 'in-progress' && task.status !== 'in-progress') statusPass = false;
      } else if (filter !== 'all') {
        if (filter === 'completed' && !isCompleted) statusPass = false;
        else if (filter === 'pending' && isCompleted) statusPass = false;
      }
      if (!statusPass) return false;

      // Priority Filter
      if (advancedFilters.priority !== 'all') {
        const filterPriority = advancedFilters.priority.toLowerCase();
        const taskPriority = task.priority?.toLowerCase() || '';
        if (taskPriority !== filterPriority) return false;
      }

      // Task Type Filter
      if (advancedFilters.taskType !== 'all') {
        const filterType = advancedFilters.taskType.toLowerCase();
        const taskType = task.type?.toLowerCase() || '';
        if (taskType !== filterType) return false;
      }

      // Company Filter
      if (advancedFilters.company !== 'all') {
        const filterCompany = advancedFilters.company.toLowerCase();
        const taskCompany = task.company?.toLowerCase() || '';
        if (taskCompany !== filterCompany) return false;
      }

      // Brand Filter
      if (advancedFilters.brand !== 'all') {
        const filterBrand = advancedFilters.brand.toLowerCase();
        const taskBrand = task.brand?.toLowerCase() || '';
        if (taskBrand !== filterBrand) return false;
      }

      // Date Filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      const dateFilterToUse = advancedFilters.date !== 'all' ? advancedFilters.date : dateFilter;

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
        const matchesDescription = task.description?.toLowerCase().includes(searchLower);
        const matchesAssignee = getEmailByIdInternal(task.assignedTo)?.toLowerCase().includes(searchLower);
        const matchesAssigner = getAssignerEmail(task)?.toLowerCase().includes(searchLower);
        const matchesType = task.type?.toLowerCase().includes(searchLower) || false;
        const matchesCompany = task.company?.toLowerCase().includes(searchLower) || false;
        const matchesBrand = task.brand?.toLowerCase().includes(searchLower) || false;

        if (!matchesTitle && !matchesDescription && !matchesAssignee && !matchesAssigner &&
          !matchesType && !matchesCompany && !matchesBrand) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const aValue = new Date(a.dueDate).getTime();
      const bValue = new Date(b.dueDate).getTime();
      return aValue > bValue ? 1 : -1;
    });

    return filtered;
  }, [
    tasks,
    filter,
    dateFilter,
    assignedFilter,
    searchTerm,
    advancedFilters,
    isTaskCompleted,
    isTaskAssignee,
    isTaskAssigner,
    isOverdue,
    getEmailByIdInternal,
    getAssignerEmail
  ]);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow border-b">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
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
            advancedFilters={advancedFilters}
            availableBrands={availableBrands}
            showAdvancedFilters={showAdvancedFilters}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyAdvancedFilters}
            onResetFilters={resetFilters}
            onToggleFilters={() => setShowAdvancedFilters(false)}
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
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No tasks found</div>
            <p className="text-gray-500 mb-6">
              {searchTerm || filter !== 'all' || dateFilter !== 'all' || assignedFilter !== 'all'
                ? 'Try changing your filters or search term'
                : 'Create your first task to get started'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleOpenBulkImporter}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import Tasks
              </button>
              <button
                onClick={handleCreateTaskWithHistory}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Task
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 rounded-t-lg border text-sm font-medium text-gray-700">
              <div className="col-span-4">Task</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Actions</div>
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
                      getTaskStatusIcon={getTaskStatusIcon}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusText={getStatusText}
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
                      getTaskStatusIcon={getTaskStatusIcon}
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

      {/* Edit Task Modal */}
      <EditTaskModal
        showEditModal={showEditModal}
        editingTask={editingTask}
        editFormData={editFormData}
        editLoading={editLoading}
        users={users}
        onClose={() => setShowEditModal(false)}
        onFormChange={handleEditFormChange}
        onSubmit={handleEditSubmit}
      />

      {/* Bulk Import Modal */}
      {showBulkImporter && (
        <BulkImporter
          draftTasks={bulkDraftTasks}
          defaults={bulkImportDefaults}
          users={users}
          onDefaultsChange={handleBulkDefaultsChange}
          onDraftsChange={handleBulkDraftsChange}
          onClose={() => setShowBulkImporter(false)}
          onSubmit={handleBulkImportSubmit}
          submitting={bulkSubmitting}
          summary={bulkCreateSummary}
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

      {/* Task History Modal */}
      <TaskHistoryModal
        showHistoryModal={showHistoryModal}
        historyTask={historyTask}
        timelineItems={getTimelineItems(historyTask?.id || '')}
        loadingHistory={historyTask ? loadingHistory[historyTask.id] : false}
        loadingComments={loadingComments}
        currentUser={currentUser}
        onClose={handleCloseHistoryModal}
        formatDate={formatDate}
      />
    </div>
  );
};

export default AllTasksPage;