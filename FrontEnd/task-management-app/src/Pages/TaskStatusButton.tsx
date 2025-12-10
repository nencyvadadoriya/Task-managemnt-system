// components/TaskStatusButton.tsx
import React from 'react';
import { CheckCircle, Circle, Loader2, CheckCheck } from 'lucide-react';
import type { Task } from '../Types/Types';

interface TaskStatusButtonProps {
  task: Task;
  currentUser: any;
  isToggling: boolean;
  isDeleting: boolean;
  bulkDeleting: boolean;
  onToggle: (taskId: string, originalTask: Task) => Promise<void>;
}

const TaskStatusButton: React.FC<TaskStatusButtonProps> = ({
  task,
  isToggling,
  isDeleting,
  bulkDeleting,
  onToggle
}) => {
  const isCompleted = task.status === 'completed';
  
  // Get appropriate icon based on who completed the task
  const getStatusIcon = () => {
    if (isToggling) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (isCompleted) {
      if (task.completionType === 'admin') {
        // Admin ने complete किया - blue check
        return <CheckCheck className="h-4 w-4 text-blue-500 fill-current" />;
      } else {
        // User ने complete किया - green check
        return <CheckCircle className="h-4 w-4 text-green-500 fill-current" />;
      }
    } else {
      // Pending - gray circle
      return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Get tooltip text
  const getTooltip = () => {
    if (isCompleted) {
      if (task.completionType === 'admin') {
        return `Verified by Admin (${task.completedBy || 'Admin'})`;
      } else {
        return `Completed by User (${task.completedBy || 'User'})`;
      }
    } else {
      return 'Mark as Completed';
    }
  };
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(task.id, task);
      }}
      className={`p-1 rounded-full ${
        isToggling ? 'text-gray-400' :
        isCompleted 
          ? (task.completionType === 'admin' ? 'hover:text-blue-700' : 'hover:text-green-700')
          : 'text-gray-400 hover:text-blue-500'
      } disabled:cursor-not-allowed`}
      disabled={isToggling || isDeleting || bulkDeleting}
      title={getTooltip()}
    >
      {getStatusIcon()}
    </button>
  );
};

export default TaskStatusButton;