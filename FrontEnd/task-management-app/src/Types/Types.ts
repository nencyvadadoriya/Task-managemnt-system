// src/Types.ts
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'pending';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: string;
  companyName: string;
  brand?: string; // ✅ BRAND FIELD ADD HERE
  assignedToUser?: {
    id: string;
    name: string;
    email: string;
  };
  history?: TaskHistory[];
  createdAt: string;
  updatedAt: string;
  completionType?: 'user' | 'admin'; 
  completedBy?: string; 
  reassignedBy?: string;
  completedApproval?: boolean;
  comments?: CommentType[]; // ✅ Comments array bhi add karo agar use ho raha hai
}

export interface TaskHistory {
  id: string;
  taskId: string;
  action: 'created' | 'reassigned' | 'completed' | 'pending' | 
          'status_changed' | 'priority_changed' | 'due_date_changed' | 
          'edited' | 'user_completed' | 'admin_completed' | 'user_reassigned' | 'admin_reassigned';
  userId: string;
  userName: string;
  userEmail: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
  timestamp: string;
}

export interface CommentType {
    id: string;
    taskId: string;
    userId: string;
    userName: string;
    userEmail: string;
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
    avatar?: string;
    phone?: string;
    department?: string;
    location?: string;
    joinDate?: string;
    bio?: string;
    skills?: string[];
    isActive?: boolean;

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
    about: string;
    password: string;
    gender: string;
    profile_image: File | null;
}

export interface OtpverifyPayload {
    email: string;
    OTP: string;
}

// ✅ NewTaskForm interface add karo agar zaroorat ho
export interface NewTaskForm {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
    taskType: string;
    companyName: string;
    brand: string; // ✅ Yahan bhi add karo
}

// ✅ FilterState interface add karo
export interface FilterState {
    status: string;
    priority: string;
    assigned: string;
    date: string;
    taskType: string;
    company: string;
    brand: string;
}