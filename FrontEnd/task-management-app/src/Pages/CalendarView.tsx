import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import type { Task } from '../Types/Types';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask, onDeleteTask }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Days of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { firstDay, lastDay, daysInMonth, startingDay };
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate === dateStr);
  };

  // Format month and year
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  // Generate calendar days
  const calendarDays = [];

  // Previous month days
  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  for (let i = 0; i < startingDay; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthLastDay - i);
    calendarDays.unshift(date);
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    calendarDays.push(date);
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
    calendarDays.push(date);
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  // Selected date tasks
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500">Manage your tasks schedule</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            {/* Calendar Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{monthYear}</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 mt-6">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {calendarDays.slice(0, 42).map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  const dateTasks = getTasksForDate(date);

                  return (
                    <div
                      key={index}
                      className={`min-h-32 bg-white p-2 cursor-pointer transition-all duration-200 ${!isCurrentMonth ? 'bg-gray-50' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isToday ? 'bg-blue-50' : ''
                        } hover:bg-gray-50`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          } ${isToday ? 'text-blue-600' : ''}`}>
                          {date.getDate()}
                        </span>
                        {dateTasks.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {dateTasks.length} task{dateTasks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Task Indicators */}
                      <div className="mt-2 space-y-1">
                        {dateTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate ${getPriorityColor(task.priority)} bg-opacity-20`}
                            title={`${task.title} - ${task.priority} priority`}
                          >
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mr-1`}></div>
                              <span className="truncate">{task.title}</span>
                            </div>
                          </div>
                        ))}
                        {dateTasks.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dateTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 bg-gray-50 rounded-b-lg">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Legend:</span>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    <span className="text-xs text-gray-600">High Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                    <span className="text-xs text-gray-600">Medium Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span className="text-xs text-gray-600">Low Priority</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Selected Date Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg sticky top-6">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Select a Date'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No tasks scheduled</div>
                  <p className="text-sm text-gray-500">Select another date or create a new task</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 border rounded-lg hover:border-blue-300 transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                            {task.status.replace('-', ' ')}
                          </span>
                          <span className="text-gray-500">
                            Due: {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="relative group">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg hidden group-hover:block z-10 border border-gray-200">
                            <button
                              onClick={() => onEditTask(task)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this task?')) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Month Overview</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {tasks.filter(t => t.status === 'completed').length}
                    </div>
                    <div className="text-xs text-blue-800">Completed</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {tasks.filter(t => t.status === 'in-progress').length}
                    </div>
                    <div className="text-xs text-yellow-800">In Progress</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">
                      {tasks.filter(t => {
                        const dueDate = new Date(t.dueDate);
                        const today = new Date();
                        return dueDate < today && t.status !== 'completed';
                      }).length}
                    </div>
                    <div className="text-xs text-red-800">Overdue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;