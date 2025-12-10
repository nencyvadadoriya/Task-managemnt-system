import React from 'react';

interface TaskFiltersProps {
  filter: string;
  dateFilter: string;
  assignedFilter: string;
  onFilterChange: (filter: string) => void;
  onDateFilterChange: (filter: string) => void;
  onAssignedFilterChange: (filter: string) => void;
  filteredTasksCount: number;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filter,
  dateFilter,
  assignedFilter,
  onFilterChange,
  onDateFilterChange,
  onAssignedFilterChange,
  filteredTasksCount
}) => (
  <div className="bg-white shadow rounded-lg p-4 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Showing: {filteredTasksCount} tasks</span>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {['all','in-progress', 'completed'].map(status => (
          <button
            key={status}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${filter === status
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            onClick={() => onFilterChange(status)}
          >
            {status === 'all' ? 'All' : 
             status === 'in-progress' ? 'In Progress' : 
             status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
        >
          <option value="all">All Dates</option>
          <option value="today">Due Today</option>
          <option value="week">Due This Week</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          value={assignedFilter}
          onChange={(e) => onAssignedFilterChange(e.target.value)}
        >
          <option value="all">All Tasks</option>
          <option value="assigned-to-me">Assigned to Me</option>
          <option value="assigned-by-me">Created by Me</option>
        </select>
      </div>
    </div>
  </div>
);

export default TaskFilters;