export type TaskStatus = 'in-progress' | 'completed' | 'pending' | 'cancelled' | 'on-hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Brand-related types
export type BrandStatus = 'active' | 'inactive' | 'archived';
export type BrandRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Brand {
    id: string | number;
    _id?: string;
    name: string;
    collaborators: any[];
    description?: string;
    logo?: string;
    company: string;
    category?: string;
    website?: string;
    status: BrandStatus;
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
    history?: BrandHistory[];
    tasks?: Task[];
}

export interface CreateBrandDto {
    name: string;
    description: string;
    company: string;
    category?: string;
    website?: string;
    status: BrandStatus;
    logo?: string;
}

export interface UpdateBrandDto extends Partial<CreateBrandDto> { }

export interface BrandCollaborator {
    id: string;
    brandId: string;
    userId: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    invitedAt: string;
    joinedAt?: string;
    invitedBy: string;
    status: 'pending' | 'accepted' | 'declined';
    stats?: {
        assignedTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
    };
}

export interface BrandHistory {
    id: string;
    brandId: string | number;
    action: 'brand_created' | 'brand_updated' | 'collaborator_added' | 'collaborator_removed' | 'collaborator_role_changed' | 'collaborator_invited';
    description: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    timestamp: string;
    metadata?: Record<string, any>;
    taskTitle?: string;
    isTaskHistory?: boolean;
}

export interface BrandInvite {
    email: string;
    role: BrandRole;
    brandId: string | number;
    invitedBy: string;
    message?: string;
}

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
    assignedByName?: string;  // नया फ़ील्ड
    assignedToName?: string;
    category?: string;
    tags?: string[];
    type?: string;          // 'regular', 'troubleshoot', 'maintenance', 'development'
    company?: string;       // 'acs', 'md inpex', 'tech solutions', 'global inc'
    brand?: string;         // 'chips', 'soy', 'saffola', etc.
    brandId?: string | number;
    project?: string;       // Project name
    assignedToUser?: UserType;

    // Extended fields used in multiple UI components
    taskType?: string;      // e.g. 'regular', 'bug', etc.
    companyName?: string;   // Friendly company display name
    completionType?: 'admin' | 'user';
    completedBy?: string;
}


// Types.ts में
export interface FilterState {
    status: string;
    priority: string;
    assigned: string;
    date: string;
    taskType: string;
    company: string;
    brand: string;
}
export type TaskHistory = {
  id: string;
  taskId: string;
  action: 
    | 'task_created'
    | 'task_edited'
    | 'task_deleted'
    | 'marked_completed'
    | 'marked_pending'
    | 'admin_approved'
    | 'rejected_by_admin'
    | 'assigner_permanent_approved'
    | 'permanent_approval_removed'
    | 'task_reassigned'
    | 'priority_changed'
    | 'due_date_changed'
    | 'status_changed'
    | 'comment_added'
    | 'comment_deleted'
    | 'title_changed'
    | 'description_changed'
    | 'type_changed'
    | 'company_changed'
    | 'brand_changed'
    | 'task_edit_failed'
    | 'bulk_completed'
    | 'bulk_pending';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  additionalData?: Record<string, any>;
};


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

export interface Company {
    id: string;
    _id?: string;
    name: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskTypeItem {
    id: string;
    _id?: string;
    name: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserType {
    id: string;
    name: string;
    _id?: string;
    role: 'user' | 'admin' | 'manager' | string;
    email: string;
    phone?: string;
    department?: string;
    location?: string;
    joinDate?: string;
    bio?: string;
    skills?: string[];
    isActive?: boolean;
    position?: string;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
    password?: string;

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
    role: string;
    phone?: string;
    department?: string;
    position?: string;
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
    brandId?: string | number;
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
