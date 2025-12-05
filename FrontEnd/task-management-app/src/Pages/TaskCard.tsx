import React, { useState } from 'react';
import {
    Edit,
    Trash2,
    MoreVertical,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    Building,
    Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Task, UserType } from '../Types/Types';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    getUserById: (userId: string | number | Partial<UserType> | { id: string }) => UserType | undefined;
    formatDate: (dateString: string) => string;
    getTaskBorderColor: (task: Task) => string;
    isOverdue: (dueDate: string, status: string) => boolean;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    currentUser: UserType;
}

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onEdit,
    onDelete,
    getUserById,
    formatDate,
    getTaskBorderColor,
    isOverdue,
    openMenuId,
    setOpenMenuId,
    currentUser
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    
    // ✅ FIXED: Add null checks for currentUser
    const safeCurrentUser = currentUser || {
        id: 'unknown',
        name: 'User',
        email: 'unknown@example.com',
        role: 'user',
        avatar: 'U'
    };

    const assignedUser = task.assignedToUser || getUserById(task.assignedTo);

    const assignedToEmail = assignedUser?.email ||
        (typeof task.assignedTo === 'string' ? task.assignedTo : 'Unknown');

    const assignedToName = assignedUser?.name ||
        (typeof task.assignedTo === 'string' ? task.assignedTo.split('@')[0] || 'User' : 'Unknown User');

    // Get Assigned By Name
    const assignedByUser = task.assignedByUser || getUserById(task.assignedBy);
    const assignedByName = assignedByUser?.name ||
        (typeof task.assignedBy === 'string' ? task.assignedBy.split('@')[0] || 'User' : 'Unknown');
    const assignedByEmail = assignedByUser?.email ||
        (typeof task.assignedBy === 'string' ? task.assignedBy : 'Unknown');

    // ✅ FIXED: Check permissions with null checks
    const isCreator = task.assignedBy === safeCurrentUser.email;
    const isAssignee = task.assignedTo === safeCurrentUser.email;

    // Delete Task
    const handleDeleteTask = async () => {
        if (!task.id) {
            toast.error('Cannot delete: Task ID is missing');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        setIsDeleting(true);

        try {
            await onDelete(task.id);
        } catch (error) {
            console.error('Error in handleDeleteTask:', error);
            toast.error('Failed to delete task. Please try again.');
        } finally {
            setIsDeleting(false);
            setOpenMenuId(null);
        }
    };

    return (
        <div
            className={`bg-white p-4 shadow rounded-lg border-l-4 ${getTaskBorderColor(
                task
            )} hover:shadow-md transition-shadow duration-200 relative ${isDeleting ? 'opacity-50' : ''
                }`}
        >
            {isDeleting && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            <div className="flex justify-between items-start relative">
                <div className="flex-1">
                    {/* Title + Status + Priority */}
                    <div className="flex items-center gap-2 mb-2">
                        {task.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : task.status === 'in-progress' ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}

                        <h3 className="text-lg font-semibold text-gray-900">
                            {task.title || 'Untitled Task'}
                        </h3>

                        <span
                            className={`text-xs px-2 py-1 rounded-full ${task.priority === 'high'
                                ? 'text-red-600 bg-red-100'
                                : task.priority === 'medium'
                                    ? 'text-yellow-600 bg-yellow-100'
                                    : 'text-green-600 bg-green-100'
                                }`}
                        >
                            {task.priority}
                        </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    {/* Task Type and Company */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {task.taskType && (
                            <span className="inline-flex items-center text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                <Tag className="h-3 w-3 mr-1" />
                                {task.taskType}
                            </span>
                        )}

                        {task.companyName && task.companyName !== 'company name' && (
                            <span className="inline-flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                <Building className="h-3 w-3 mr-1" />
                                {task.companyName}
                            </span>
                        )}
                    </div>

                    {/* Assigned To & Assigned By */}
                    <div className="flex flex-col gap-1 mb-3">
                        {/* Assigned To */}
                        <div className="text-xs text-blue-600 flex items-center">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                                Assigned To: {assignedToName}
                            </span>
                        </div>

                        {/* Assigned By */}
                        <div className="text-xs text-gray-500 flex items-center">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                                Assigned By: {assignedByName} ({assignedByEmail})
                            </span>
                        </div>
                    </div>

                    {/* Due Date + Status */}
                    <div className="flex items-center justify-between">
                        <p
                            className={`text-xs ${isOverdue(task.dueDate, task.status)
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                                }`}
                        >
                            Due: {formatDate(task.dueDate)}
                            {isOverdue(task.dueDate, task.status) && ' (Overdue)'}
                        </p>

                        <span
                            className={`text-xs px-2 py-1 rounded-full ${task.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                        >
                            {task.status.replace('-', ' ')}
                        </span>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative">
                    <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === task.id ? null : task.id);
                        }}
                        disabled={isDeleting}
                    >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>

                    {openMenuId === task.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                            {/* Edit - Only if creator */}
                            {isCreator && (
                                <button
                                    onClick={() => {
                                        onEdit(task);
                                        setOpenMenuId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Task
                                </button>
                            )}

                            {/* Delete - Only if creator */}
                            {isCreator && (
                                <button
                                    onClick={handleDeleteTask}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {isDeleting ? 'Deleting...' : 'Delete Task'}
                                </button>
                            )}

                            {/* Mark as Done - If Assignee and not completed */}
                            {isAssignee && task.status !== 'completed' && (
                                <button
                                    onClick={() => {
                                        onEdit({ ...task, status: 'completed' });
                                        setOpenMenuId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Done
                                </button>
                            )}

                            {/* If not creator and already completed */}
                            {!isCreator && task.status === 'completed' && (
                                <div className="px-4 py-2 text-sm text-gray-500 italic">
                                    Task Completed
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;