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
} from 'lucide-react';

import type { Task, UserType, CommentType, TaskHistory } from '../Types/Types';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useCallback, useState, memo } from 'react';

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
  onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
  onBulkCreateTasks?: (tasks: BulkTaskPayload[]) => Promise<BulkCreateResult>;
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

// ==================== CONSTANTS ====================
const COMPANY_BRAND_MAP: Record<string, string[]> = {
  'acs': ['chips', 'soy', 'saffola'],
  'md inpex': ['inpex pro', 'inpex lite', 'inpex max'],
  'tech solutions': ['techx', 'techpro', 'techlite'],
  'global inc': ['lays', 'pepsi', '7up']
};

const PRIORITY_ORDER: Record<string, number> = {
  'urgent': 4,
  'high': 3,
  'medium': 2,
  'low': 1,
  '': 0
};

// ==================== UTILITY FUNCTIONS ====================
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

const formatCommentTime = (timestamp: string): string => {
  try {
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
  } catch {
    return 'Recently';
  }
};

// Bulk Import Helper Functions
const parseClipboardToDrafts = (pastedText: string, defaults: BulkImportDefaults): BulkTaskDraft[] => {
  const rows = pastedText.trim().split('\n');
  const drafts: BulkTaskDraft[] = [];

  rows.forEach((row, index) => {
    const columns = row.split('\t').map(col => col.trim());

    // Skip empty rows
    if (columns.length === 0 || columns.every(col => !col.trim())) return;

    const rowNumber = index + 1;
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Try to parse columns in different formats
    let title = '';
    let description = '';
    let assignedTo = defaults.assignedTo;
    let dueDate = defaults.dueDate;
    let priority = defaults.priority as BulkPriority | '';
    let taskType = defaults.taskType;
    let companyName = defaults.companyName;
    let brand = defaults.brand;
    const errors: string[] = [];

    // Column parsing logic
    if (columns.length >= 1) title = columns[0];
    if (columns.length >= 2) description = columns[1];
    if (columns.length >= 3) {
      const emailMatch = columns[2].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        assignedTo = emailMatch[0];
      } else {
        assignedTo = columns[2];
      }
    }
    if (columns.length >= 4) {
      // Try to parse date
      const dateStr = columns[3];
      if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
        dueDate = dateStr;
      } else if (dateStr.match(/\d{2}\/\d{2}\/\d{4}/)) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (dateStr.match(/\d{1,2}-\d{1,2}-\d{4}/)) {
        // Convert D-M-YYYY to YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    if (columns.length >= 5) {
      const priorityStr = columns[4].toLowerCase();
      if (['urgent', 'high', 'medium', 'low'].includes(priorityStr)) {
        priority = priorityStr as BulkPriority;
      } else {
        priority = '';
      }
    }
    if (columns.length >= 6) taskType = columns[5];
    if (columns.length >= 7) companyName = columns[6];
    if (columns.length >= 8) brand = columns[7];

    // Validation
    if (!title.trim()) {
      errors.push('Title is required');
    }
    if (!assignedTo.trim()) {
      errors.push('Assignee email is required');
    } else if (!assignedTo.includes('@')) {
      errors.push('Invalid email format for assignee');
    }
    if (!dueDate) {
      errors.push('Due date is required');
    } else {
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        errors.push('Invalid due date format');
      }
    }

    drafts.push({
      id: draftId,
      rowNumber,
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      taskType,
      companyName,
      brand,
      errors
    });
  });

  return drafts;
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

// Task Status Badge Component
const TaskStatusBadge = memo(({ taskId, tasks }: {
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
  const hasDrafts = draftTasks.length > 0;

  const handleFieldChange = useCallback((id: string, field: keyof BulkTaskDraft, value: string) => {
    onDraftsChange(draftTasks.map(task =>
      task.id === id ? { ...task, [field]: value, errors: [] } : task
    ));
  }, [draftTasks, onDraftsChange]);

  const handleRemoveDraft = useCallback((id: string) => {
    onDraftsChange(draftTasks.filter(task => task.id !== id));
  }, [draftTasks, onDraftsChange]);

  const errorCount = draftTasks.reduce((count, task) => count + task.errors.length, 0);

  const handleValidateDrafts = useCallback(() => {
    const validatedDrafts = draftTasks.map(draft => validateBulkDraft(draft));
    onDraftsChange(validatedDrafts);
  }, [draftTasks, onDraftsChange]);

  useEffect(() => {
    if (draftTasks.length > 0) {
      handleValidateDrafts();
    }
  }, [draftTasks, handleValidateDrafts]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Task Import</h2>
            <p className="text-sm text-gray-500">Paste rows from Excel/Sheets below and review before saving.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Assignee</label>
              <select
                value={defaults.assignedTo}
                onChange={(e) => onDefaultsChange({ assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user</option>
                {users.map(user => (
                  <option key={user.id || user.email} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Due Date</label>
              <input
                type="date"
                value={defaults.dueDate}
                onChange={(e) => onDefaultsChange({ dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Priority</label>
              <select
                value={defaults.priority}
                onChange={(e) => onDefaultsChange({ priority: e.target.value as BulkPriority })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Type</label>
              <input
                type="text"
                value={defaults.taskType}
                onChange={(e) => onDefaultsChange({ taskType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="regular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Company</label>
              <input
                type="text"
                value={defaults.companyName}
                onChange={(e) => onDefaultsChange({ companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="company name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Default Brand</label>
              <input
                type="text"
                value={defaults.brand}
                onChange={(e) => onDefaultsChange({ brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=""
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {!hasDrafts ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center bg-white">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Paste tasks from Excel or Sheets</h3>
              <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-4">
                Copy multiple rows (title, description, due date, assignee email, priority etc.) and paste directly here.
                We will parse columns automatically. You can adjust defaults above for missing values.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left text-sm">
                <p className="font-medium mb-2">Expected format (tab-separated columns):</p>
                <p className="text-gray-600">Title → Description → Assignee Email → Due Date → Priority → Type → Company → Brand</p>
                <p className="text-gray-500 text-xs mt-2">Example: Fix login issue → Users can't login → john@example.com → 2024-12-25 → high → bug → ACS → chips</p>
              </div>
              <textarea
                className="mt-4 w-full h-40 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                placeholder="Paste rows here (one task per row)..."
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  e.preventDefault();
                  const drafts = parseClipboardToDrafts(pasted, defaults);
                  onDraftsChange(drafts);
                }}
              />
              <p className="text-xs text-gray-400 mt-2">Press Ctrl+V (Cmd+V on Mac) to paste your Excel data</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-gray-700">{draftTasks.length} task(s) parsed</span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                      {errorCount} validation issue(s)
                    </span>
                  )}
                  {summary && (
                    <span className="inline-flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Created {summary.created.length}, {summary.failures.length} failed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(draftTasks.map(d => d.title).join('\n'))}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Copy Titles
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
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2 w-48">Title *</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 w-36">Assigned To *</th>
                      <th className="px-3 py-2 w-32">Due Date *</th>
                      <th className="px-3 py-2 w-28">Priority</th>
                      <th className="px-3 py-2 w-32">Type</th>
                      <th className="px-3 py-2 w-32">Company</th>
                      <th className="px-3 py-2 w-32">Brand</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100 text-sm">
                    {draftTasks.map(draft => (
                      <tr key={draft.id} className={draft.errors.length ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 align-top text-xs text-gray-500">#{draft.rowNumber}</td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={draft.title}
                            onChange={(e) => handleFieldChange(draft.id, 'title', e.target.value)}
                            className={`w-full px-2 py-1.5 border ${draft.errors.some(e => e.includes('Title')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                            placeholder="Task title"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={draft.description}
                            onChange={(e) => handleFieldChange(draft.id, 'description', e.target.value)}
                            className="w-full min-h-[60px] px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Optional details"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={draft.assignedTo}
                            onChange={(e) => handleFieldChange(draft.id, 'assignedTo', e.target.value)}
                            className={`w-full px-2 py-1.5 border ${draft.errors.some(e => e.includes('Assignee') || e.includes('email')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                            placeholder="email@example.com"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="date"
                            value={draft.dueDate}
                            onChange={(e) => handleFieldChange(draft.id, 'dueDate', e.target.value)}
                            className={`w-full px-2 py-1.5 border ${draft.errors.some(e => e.includes('date')) ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={draft.priority}
                            onChange={(e) => handleFieldChange(draft.id, 'priority', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Use default</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={draft.taskType}
                            onChange={(e) => handleFieldChange(draft.id, 'taskType', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Type"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={draft.companyName}
                            onChange={(e) => handleFieldChange(draft.id, 'companyName', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Company"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={draft.brand}
                            onChange={(e) => handleFieldChange(draft.id, 'brand', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Brand"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            onClick={() => handleRemoveDraft(draft.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {draftTasks.map(draft => (
                draft.errors.length > 0 ? (
                  <div key={`${draft.id}-errors`} className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <p className="font-medium">Row #{draft.rowNumber} has {draft.errors.length} issue(s):</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      {draft.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              ))}

              {summary && summary.failures.length > 0 && (
                <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <p className="font-medium">{summary.failures.length} task(s) failed to create:</p>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {summary.failures.map(failure => (
                      <li key={failure.index}>
                        Row #{failure.rowNumber} - "{failure.title}" &mdash; {failure.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasDrafts
              ? 'Review parsed tasks, fix validation errors, then click "Create tasks".'
              : 'Paste data from your spreadsheet to get started.'}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={onSubmit}
              disabled={!hasDrafts || submitting || errorCount > 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${(!hasDrafts || errorCount > 0)
                ? 'bg-gray-300 cursor-not-allowed'
                : submitting
                  ? 'bg-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                  Creating...
                </>
              ) : `Create ${draftTasks.length} task(s)`}
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
  isSelected,
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
  getCommentCount,
  onSelectTask,
  onToggleStatus,
  onEditTask,
  onOpenCommentSidebar,
  onOpenReassignModal,
  onPermanentApproval,
  onOpenApprovalModal,
  onDeleteTask,
  onSetOpenMenuId,
  isTaskAssigner,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskPendingApproval
}: any) => {
  const userInfo = getUserInfoForDisplay(task);
  const commentCount = getCommentCount(task);
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const isAssigner = isTaskAssigner(task);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className={`bg-white rounded-lg border ${getTaskBorderColor(task)} transition-all duration-200 hover:shadow-md`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectTask(task.id)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />

            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling}
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
                  View Details & Comments ({commentCount})
                </button>

                <button
                  onClick={() => onEditTask(task)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Task
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

                {isAdmin && isTaskPendingApproval(task.id) && (
                  <>
                    <button
                      onClick={() => onOpenApprovalModal(task, 'approve')}
                      disabled={isApproving}
                      className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {isApproving ? 'Processing...' : 'Approve Completion'}
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
              <span className="font-medium">Company:</span>
              <span>{task.company}</span>
            </div>
          )}
          {task.brand && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Brand:</span>
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
  isSelected,
  isToggling,
  currentUser,
  formatDate,
  isOverdue,
  getTaskBorderColor,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  getCommentCount,
  onSelectTask,
  onToggleStatus,
  onEditTask,
  onOpenCommentSidebar,
  isTaskCompleted,
}: any) => {
  const userInfo = getUserInfoForDisplay(task);
  const commentCount = getCommentCount(task);
  const isCompleted = isTaskCompleted(task.id);

  return (
    <div className={`bg-white rounded-lg border ${getTaskBorderColor(task)} transition-all duration-200 hover:shadow-md`}>
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center">
        {/* Task Info - col-span-4 */}
        <div className="col-span-4">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectTask(task.id)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 mt-0.5"
            />

            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling}
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
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                    {task.company}
                  </span>
                )}
                {task.brand && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
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

        {/* Actions - col-span-1 */}
        <div className="col-span-1">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onEditTask(task)}
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
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopTaskItem.displayName = 'DesktopTaskItem';

// Comment Sidebar Component
const CommentSidebar = memo(({
  showCommentSidebar,
  selectedTask,
  newComment,
  commentLoading,
  deletingCommentId,
  loadingComments,
  loadingHistory,
  currentUser,
  formatDate,
  isOverdue,
  onCloseSidebar,
  onSetNewComment,
  onSaveComment,
  onDeleteComment,
  getTimelineItems,
  getUserInfoForDisplay,
  isTaskCompleted,
  getStatusBadgeColor,
  getStatusText
}: any) => {
  if (!showCommentSidebar || !selectedTask) return null;

  const timelineItems = getTimelineItems(selectedTask.id);
  const userInfo = getUserInfoForDisplay(selectedTask);
  const isCompleted = isTaskCompleted(selectedTask.id);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onCloseSidebar}
      />
      <div className="absolute inset-y-0 right-0">
        <div className="h-full bg-white shadow-xl overflow-y-auto w-full max-w-md transform transition-transform duration-300 ease-in-out">
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
          </div>

          {/* Sidebar Content */}
          <div className="p-4">
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
                      <div className="text-red-600 text-xs mt-1">Overdue</div>
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

            {/* Timeline Header */}
            <div className="mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <h3 className="font-bold text-gray-900">Activity Timeline</h3>
              <span className="ml-auto text-xs text-gray-500">
                {timelineItems.length} activities
              </span>
            </div>

            {/* Timeline Items */}
            <div className="space-y-3">
              {loadingHistory[selectedTask.id] || loadingComments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading activity...</p>
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="mt-2 text-gray-500">No activity yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add a comment or update task status to see activity</p>
                </div>
              ) : (
                timelineItems.map((item: any, index: number) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`border-l-2 pl-3 py-2 ${item.type === 'comment'
                      ? 'border-blue-400 bg-blue-50/50'
                      : 'border-gray-400 bg-gray-50/50'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${item.type === 'comment'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                          }`}>
                          {item.type === 'comment' ? (
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <History className="h-3.5 w-3.5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {item.type === 'comment'
                              ? (item.data as CommentType).userName || 'User'
                              : (item.data as TaskHistory).userName || 'System'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.type === 'comment'
                              ? 'commented'
                              : (item.data as TaskHistory).action?.replace(/_/g, ' ') || 'activity'}
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
                          <p className="bg-white p-3 rounded-lg border border-gray-200 mt-2">
                            {(item.data as CommentType).content || 'No content'}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {(item.data as CommentType).userEmail || 'Unknown'}
                            </span>
                            {currentUser.id === (item.data as CommentType).userId && onDeleteComment && (
                              <button
                                onClick={() => onDeleteComment((item.data as CommentType).id)}
                                disabled={deletingCommentId === (item.data as CommentType).id}
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                {deletingCommentId === (item.data as CommentType).id ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Deleting...
                                  </span>
                                ) : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200 mt-2">
                            {(item.data as TaskHistory).description || 'No description'}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            <div>Changed on: {new Date((item.data as TaskHistory).timestamp).toLocaleString()}</div>
                            {(item.data as TaskHistory).userRole && (
                              <div>Role: {(item.data as TaskHistory).userRole}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Section */}
            <div className="mt-8 pt-6 border-t">
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
                <p className="text-xs text-gray-500">
                  Comments are stored with task history
                </p>
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
                      Send Comment
                    </>
                  )}
                </button>
              </div>
              {!onSaveComment && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  ⚠️ Comment saving functionality is not available. Please check if the backend function is properly connected.
                </div>
              )}
            </div>
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
  onFetchTaskHistory,
  onBulkCreateTasks
}) => {
  // State
  const [sortBy] = useState<'title' | 'dueDate' | 'status' | 'priority' | 'createdAt' | 'updatedAt' | 'assignee'>('dueDate');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [deletingTasks, setDeletingTasks] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [togglingStatusTasks, setTogglingStatusTasks] = useState<string[]>([]);
  const [approvingTasks, setApprovingTasks] = useState<string[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Minimal filter state setters used by legacy helper functions
  const [, setPriorityFilter] = useState('all');
  const [, setCategoryFilter] = useState('all');
  const [, setTagFilter] = useState('all');
  const [, setCreatedDateFilter] = useState('all');
  const [, setProjectFilter] = useState('all');
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
  const [commentViewMode, setCommentViewMode] = useState<'compact' | 'expanded'>('compact');

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
  }, [getEmailById, users]);

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
    return task?.status === 'completed' || isTaskPermanentlyApproved(taskId);
  }, [tasks, isTaskPermanentlyApproved]);

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

    if (isCompleted) {
      if (isPermanentlyApproved) {
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      } else {
        return 'bg-green-100 text-green-800 border border-green-200';
      }
    }
    return 'bg-yellow-100 text-yellow-800';
  }, [isTaskCompleted, isTaskPermanentlyApproved]);

  const getStatusText = useCallback((taskId: string) => {
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
  }, [isTaskCompleted, isTaskPermanentlyApproved]);

  // ==================== COMMENT FUNCTIONS ====================
  const getCommentCount = useCallback((task: Task): number => {
    let count = 0;

    if (taskComments[task.id]) {
      count += taskComments[task.id].length;
    }

    if (task.comments && Array.isArray(task.comments)) {
      count += task.comments.length;
    }
    return count;
  }, [taskComments]);

  const getTimelineItems = useCallback((taskId: string): Array<{
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

    // Add comments from state
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

    // Add task history from state
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

    // Add from task object
    const task = tasks.find(t => t.id === taskId);
    if (task?.history && Array.isArray(task.history)) {
      task.history.forEach(history => {
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

    // Add comments from task object
    if (task?.comments && Array.isArray(task.comments)) {
      task.comments.forEach(comment => {
        if (!items.some(item => item.type === 'comment' && (item.data as CommentType).id === comment.id)) {
          items.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            data: comment,
            timestamp: comment.createdAt,
            displayTime: formatCommentTime(comment.createdAt)
          });
        }
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [taskComments, taskHistory, tasks]);

  // ==================== BULK IMPORT FUNCTIONS ====================
  const handleOpenBulkImporter = useCallback(() => {
    setShowBulkImporter(true);
    setBulkCreateSummary(null);
    setBulkDraftTasks([]);

    // Set current user as default assignee
    setBulkImportDefaults(prev => ({
      ...prev,
      assignedTo: currentUser.email || ''
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
        toast.success(`Successfully created ${result.created.length} tasks`);
        setShowBulkImporter(false);
        setBulkDraftTasks([]);
      } else {
        toast.success(`Created ${result.created.length} tasks, ${result.failures.length} failed`);
        // Keep only failed tasks in drafts for retry
        const failedDrafts = validatedDrafts.filter(draft =>
          result.failures.some(failure => failure.rowNumber === draft.rowNumber)
        );
        setBulkDraftTasks(failedDrafts);
      }
    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(`Failed to create tasks: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkDraftTasks, bulkImportDefaults, onBulkCreateTasks]);

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
      setPriorityFilter(advancedFilters.priority);
    } else {
      setPriorityFilter('all');
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
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setTagFilter('all');
    setCreatedDateFilter('all');
    setProjectFilter('all');
    setAssignedFilter?.('all');
    setSearchTerm('');

    setShowAdvancedFilters(false);
    toast.success('All filters cleared');
  }, [setFilter, setAssignedFilter, setDateFilter, setSearchTerm]);

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

  const addHistoryRecord = useCallback(async (taskId: string, action: TaskHistory['action'], description: string) => {
    const historyPayload: Omit<TaskHistory, 'id' | 'timestamp'> = {
      taskId,
      action,
      description,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role
    };

    try {
      if (onAddTaskHistory) {
        await onAddTaskHistory(taskId, historyPayload);
      }
    } catch (error) {
      console.error('Error recording history:', error);
    } finally {
      if (onFetchTaskHistory) {
        await fetchAndStoreTaskHistory(taskId);
      }
    }
  }, [currentUser, onAddTaskHistory, onFetchTaskHistory, fetchAndStoreTaskHistory]);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => (
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    ));
  }, []);

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
            `Task marked as ${status.toUpperCase()} in bulk operation by ${currentUser.role} on ${new Date().toLocaleString()}`
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
          `Task PERMANENTLY approved by Assigner (${currentUser.name}) on ${new Date().toLocaleString()}`
        );
        toast.success("✅ Task PERMANENTLY approved!");
      } else {
        await addHistoryRecord(
          taskId,
          'permanent_approval_removed',
          `Permanent approval REMOVED by Assigner (${currentUser.name}) on ${new Date().toLocaleString()}`
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
  }, [tasks, isTaskAssigner, onUpdateTaskApproval, addHistoryRecord, currentUser]);

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
          `Task marked as PENDING by ${isAssigner ? 'Assigner' : 'Assignee'} on ${new Date().toLocaleString()}`
        );

        toast.success('Task marked as pending');
      } else {
        await onToggleTaskStatus(taskId, task.status, false);

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
  }, [isTaskPermanentlyApproved, isTaskAssignee, isTaskAssigner, tasks, isTaskCompleted, onToggleTaskStatus, addHistoryRecord]);

  const handleEditTask = useCallback(async (task: Task) => {
    try {
      await onEditTask(task);
      await addHistoryRecord(
        task.id,
        'task_edited',
        `Task EDITED by ${currentUser.role} on ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error('Error editing task:', error);
    }
  }, [onEditTask, addHistoryRecord, currentUser]);

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
  }, [tasks, addHistoryRecord, currentUser, onDeleteTask]);

 // In the handleOpenCommentSidebar function:
const handleOpenCommentSidebar = useCallback(async (task: Task) => {
    if (!task || !task.id) {
      toast.error("Invalid task selected");
      return;
    }
    
    setSelectedTask(task);
    setShowCommentSidebar(true);

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
  }, [onFetchTaskComments]);

  const handleCloseCommentSidebar = useCallback(() => {
    setShowCommentSidebar(false);
    setSelectedTask(null);
    setNewComment('');
    setCommentLoading(false);
    setDeletingCommentId(null);
  }, []);

  // In the handleSaveComment function, replace the problematic code:

  const handleSaveComment = useCallback(async () => {
    if (!selectedTask) {
      toast.error("No task selected");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    // FIX: Check if selectedTask.id exists
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

    // FIX: Safer way to update taskComments
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
  }, [selectedTask, newComment, currentUser, onSaveComment]);
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!selectedTask || !onDeleteComment) {
      return;
    }

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
  }, [selectedTask, onDeleteComment]);

  const handleOpenApprovalModal = useCallback((task: Task, action: 'approve' | 'reject') => {
    setTaskToApprove(task);
    setApprovalAction(action);
    setShowApprovalModal(true);
  }, []);

  const handleCloseApprovalModal = useCallback(() => {
    setShowApprovalModal(false);
    setTaskToApprove(null);
    setApprovalAction('approve');
  }, []);

  const handleApproveTask = useCallback(async (approve: boolean) => {
    if (!taskToApprove || !onApproveTask) {
      toast.error('Unable to process approval');
      return;
    }

    setApprovingTasks(prev => [...prev, taskToApprove.id]);

    try {
      await onApproveTask(taskToApprove.id, approve);

      if (approve) {
        await addHistoryRecord(
          taskToApprove.id,
          'admin_approved',
          `Task APPROVED by Admin on ${new Date().toLocaleString()}`
        );

        toast.success('✅ Task approved by Admin!');
      } else {
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
  }, [taskToApprove, onApproveTask, addHistoryRecord, handleCloseApprovalModal]);

  const handleOpenReassignModal = useCallback((task: Task) => {
    setReassignTask(task);
    setShowReassignModal(true);
  }, []);

  const handleCloseReassignModal = useCallback(() => {
    setShowReassignModal(false);
    setReassignTask(null);
    setNewAssigneeId('');
    setReassignLoading(false);
  }, []);

  const handleReassignTask = useCallback(async () => {
    if (!reassignTask || !newAssigneeId || !onReassignTask) return;

    setReassignLoading(true);
    try {
      await onReassignTask(reassignTask.id, newAssigneeId);

      const newAssignee = users.find(u => u.id === newAssigneeId);

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
  }, [reassignTask, newAssigneeId, onReassignTask, users, addHistoryRecord, getEmailByIdInternal, currentUser, handleCloseReassignModal]);

  // ==================== FILTERED TASKS ====================
  const filteredTasks = useMemo(() => {
    const tasksWithDemoData = tasks.map(task => getTaskWithDemoData(task));

    let filtered = tasksWithDemoData.filter(task => {
      const isCompleted = isTaskCompleted(task.id);

      // 🔥 CRITICAL FIX: BY DEFAULT, SHOW BOTH TASKS ASSIGNED TO YOU AND BY YOU
      // If no specific assigned filter is set, default to showing both
      const shouldShowMyTasks = assignedFilter === 'all' || assignedFilter === '';

      if (shouldShowMyTasks) {
        // Show tasks assigned to me OR assigned by me
        if (!isTaskAssignee(task) && !isTaskAssigner(task)) {
          return false;
        }
      }

      // Apply specific assigned filters
      if (assignedFilter === 'assigned-to-me' && !isTaskAssignee(task)) {
        return false;
      }
      if (assignedFilter === 'assigned-by-me' && !isTaskAssigner(task)) {
        return false;
      }

      // Apply advanced filters for assigned
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
      if (dateFilterToUse === 'overdue' && !isOverdue(task.dueDate, task.status)) return false;

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
          aValue = PRIORITY_ORDER[a.priority?.toLowerCase() || ''] || 0;
          bValue = PRIORITY_ORDER[b.priority?.toLowerCase() || ''] || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || a.createdAt).getTime();
          bValue = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'assignee':
          aValue = getEmailByIdInternal(a.assignedTo)?.toLowerCase() || '';
          bValue = getEmailByIdInternal(b.assignedTo)?.toLowerCase() || '';
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
  }, [
    tasks,
    filter,
    dateFilter,
    assignedFilter,
    searchTerm,
    sortBy,
    sortOrder,
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
                onClick={onCreateTask}
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
                onClick={onCreateTask}
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
              <div className="col-span-1">Actions</div>
            </div>

            {/* Task List */}
            {filteredTasks.map((task) => {
              const isToggling = togglingStatusTasks.includes(task.id);
              const isDeleting = deletingTasks.includes(task.id);
              const isApproving = approvingTasks.includes(task.id);
              const isUpdatingApproval = updatingApproval.includes(task.id);
              const isSelected = selectedTasks.includes(task.id);

              return (
                <div key={task.id}>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    <MobileTaskItem
                      task={task}
                      isSelected={isSelected}
                      isToggling={isToggling}
                      isDeleting={isDeleting}
                      isApproving={isApproving}
                      isUpdatingApproval={isUpdatingApproval}
                      openMenuId={openMenuId}
                      currentUser={currentUser}
                      users={users}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={getTaskStatusIcon}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusText={getStatusText}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      getCommentCount={getCommentCount}
                      onSelectTask={handleSelectTask}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTask={handleEditTask}
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
                    />
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <DesktopTaskItem
                      task={task}
                      isSelected={isSelected}
                      isToggling={isToggling}
                      isDeleting={isDeleting}
                      isApproving={isApproving}
                      isUpdatingApproval={isUpdatingApproval}
                      openMenuId={openMenuId}
                      currentUser={currentUser}
                      users={users}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                      getTaskBorderColor={getTaskBorderColor}
                      getTaskStatusIcon={getTaskStatusIcon}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusText={getStatusText}
                      getUserInfoForDisplay={getUserInfoForDisplay}
                      getCommentCount={getCommentCount}
                      onSelectTask={handleSelectTask}
                      onToggleStatus={handleToggleTaskStatus}
                      onEditTask={handleEditTask}
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
          onDefaultsChange={handleBulkDefaultsChange}
          onDraftsChange={handleBulkDraftsChange}
          onClose={() => setShowBulkImporter(false)}
          onSubmit={handleBulkImportSubmit}
          submitting={bulkSubmitting}
          summary={bulkCreateSummary}
        />
      )}

      {/* Modals and Sidebars */}
      <CommentSidebar
        showCommentSidebar={showCommentSidebar}
        selectedTask={selectedTask}
        newComment={newComment}
        commentLoading={commentLoading}
        deletingCommentId={deletingCommentId}
        loadingComments={loadingComments}
        taskComments={taskComments}
        taskHistory={taskHistory}
        loadingHistory={loadingHistory}
        commentViewMode={commentViewMode}
        currentUser={currentUser}
        users={users}
        formatDate={formatDate}
        isOverdue={isOverdue}
        formatCommentTime={formatCommentTime}
        onCloseSidebar={handleCloseCommentSidebar}
        onSetCommentViewMode={setCommentViewMode}
        onSetNewComment={setNewComment}
        onSaveComment={handleSaveComment}
        onDeleteComment={handleDeleteComment}
        getTimelineItems={getTimelineItems}
        getUserInfoForDisplay={getUserInfoForDisplay}
        isTaskCompleted={isTaskCompleted}
        getStatusBadgeColor={getStatusBadgeColor}
        getStatusText={getStatusText}
      />

      <ApprovalModal
        showApprovalModal={showApprovalModal}
        taskToApprove={taskToApprove}
        approvalAction={approvalAction}
        approvingTasks={approvingTasks}
        onClose={handleCloseApprovalModal}
        onApprove={handleApproveTask}
      />

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
    </div>
  );
};

export default AllTasksPage;