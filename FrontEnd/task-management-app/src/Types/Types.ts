export type TaskStatus =  'in-progress' | 'completed' | 'pending' | 'cancelled' | 'on-hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Types/Types.ts file mein Task interface mein add karein:
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignedTo: string | UserType;
  assignedBy?: string | UserType;
  createdAt: string;
  updatedAt?: string;
  completedApproval?: boolean;
  history?: TaskHistory[];
  comments?: CommentType[];
  
  category?: string;
  tags?: string[];
  type?: string;          // 'regular', 'troubleshoot', 'maintenance', 'development'
  company?: string;       // 'acs', 'md inpex', 'tech solutions', 'global inc'
  brand?: string;         // 'chips', 'soy', 'saffola', etc.
  project?: string;       // Project name
  assignedToUser?: UserType;

  // Extended fields used in multiple UI components
  taskType?: string;      // e.g. 'regular', 'bug', etc.
  companyName?: string;   // Friendly company display name
  completionType?: 'admin' | 'user';
  completedBy?: string;
}
export interface TaskHistory {
  id: string;
  taskId: string;
  action:
    | 'created'
    | 'reassigned'
    | 'completed'
    | 'pending'
    | 'status_changed'
    | 'priority_changed'
    | 'due_date_changed'
    | 'edited'
    | 'task_edited'
    | 'task_deleted'
    | 'task_reassigned'
    | 'user_completed'
    | 'admin_completed'
    | 'user_reassigned'
    | 'admin_reassigned'
    | 'admin_approved'
    | 'admin_rejected'
    | 'rejected_by_admin'
    | 'assigner_permanent_approved'
    | 'permanent_approval_removed'
    | 'assigner_approval_removed'
    | 'bulk_completed'
    | 'bulk_pending'
    | 'marked_pending'
    | 'marked_completed'
    | 'comment_added'
    | 'comment_deleted'
    | 'status_completed_by_admin'
    | 'status_completed_by_assigner'
    | 'status_completed_by_assignee'
    | 'status_pending_by_admin'
    | 'status_pending_by_assigner'
    | 'status_pending_by_assignee'
    | 'approval_granted'
    | 'approval_revoked'
    | 'assigner_recheck_requested';
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
  timestamp: string;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
  additionalData?: Record<string, any>;
}

export interface CommentType {
    id: string;
    taskId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserType {
    id: string;
    name: string;
    _id?: string;
    role: string;
    email: string;
    phone?: string;
    department?: string;
    location?: string;
    joinDate?: string;
    bio?: string;
    skills?: string[];
    isActive?: boolean;

    // Optional avatar / initial used in some views
    avatar?: string;

    // Task statistics
    assignedTasks?: number;
    completedTasks?: number;
    pendingTasks?: number;
    overdueTasks?: number;
}

export interface StatType {
    name: string;
    value: number;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
}

export interface NavigationItem {
    name: string;
    icon: any;
    current: boolean;
    onClick: () => void;
    badge: number;
}

// Authentication types
export interface LoginBody {
    email: string;
    password: string;
}

export interface RegisterUserBody {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
}

export interface OtpverifyPayload {
    email: string;
    OTP: string;
}

export interface NewTaskForm {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string; 
}

export type CompanyFilterValue = 'all' | 'company-a' | 'company-b' | 'company-c' | 'company-d';
export type StatusFilterValue = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
export type PriorityFilterValue = 'all' | 'high' | 'medium' | 'low';

export type DateRangePresetValue = 'all' | 'today' | 'this-week' | 'this-month' | 'custom';
export interface DateRangeFilterValue {
    preset: DateRangePresetValue;
    from?: string;
    to?: string;
}

export type LastUpdatedPresetValue = 'all' | '24h' | '7d' | '30d' | 'custom';
export interface LastUpdatedFilterValue {
    preset: LastUpdatedPresetValue;
    from?: string;
    to?: string;
}

export interface TaskFilterState {
    company: CompanyFilterValue;
    status: StatusFilterValue;
    priority: PriorityFilterValue;
    assignedTo: string[];
    dateRange: DateRangeFilterValue;
    search: string;
    createdBy: string[];
    lastUpdated: LastUpdatedFilterValue;
}

export interface TaskFilterPreset {
    id: string;
    name: string;
    filters: TaskFilterState;
    updatedAt: string;
}

export interface SignupBody {
  name: string;
  email: string;
  password: string;
}
