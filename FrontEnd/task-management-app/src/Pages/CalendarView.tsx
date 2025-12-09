import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gapi } from 'gapi-script';
import { ChevronLeft, ChevronRight, MoreVertical, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

import type { Task, TaskStatus, UserType } from '../Types/Types';

interface CalendarViewProps {
  tasks: Task[];
  currentUser: UserType;
  handleToggleTaskStatus: (taskId: string, currentStatus: TaskStatus) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTask: (taskId: string, updatedData: Partial<Task>) => Promise<void>;
  canEditDeleteTask: (task: Task) => boolean;
  canMarkTaskDone: (task: Task) => boolean;
  getAssignedUserInfo: (task: Task) => { name: string; email: string };
  formatDate: (dateString: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  currentUser,
  handleToggleTaskStatus,
  handleDeleteTask,
  handleUpdateTask,
  canEditDeleteTask,
  canMarkTaskDone,
  getAssignedUserInfo,
  formatDate,
  isOverdue
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<Task[]>([]);
  const [googleEventLinks, setGoogleEventLinks] = useState<Record<string, string>>({});
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [loadingGoogleEvents, setLoadingGoogleEvents] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  const convertEventToTask = useCallback(
    (event: any): Task => {
      const startIso = event?.start?.dateTime
        ? new Date(event.start.dateTime).toISOString()
        : event?.start?.date
          ? `${event.start.date}T00:00:00.000Z`
          : new Date().toISOString();

      const endIso = event?.end?.dateTime
        ? new Date(event.end.dateTime).toISOString()
        : event?.end?.date
          ? `${event.end.date}T23:59:59.000Z`
          : startIso;

      const now = new Date();
      const eventEndDate = new Date(endIso);
      let derivedStatus: TaskStatus = 'pending';

      if (event?.status === 'confirmed') {
        derivedStatus = eventEndDate < now ? 'completed' : 'in-progress';
      } else if (event?.status === 'tentative') {
        derivedStatus = 'pending';
      }

      const priorityFromColor: Record<string, Task['priority']> = {
        '11': 'high',
        '5': 'medium',
        '10': 'low'
      };

      const mappedPriority = priorityFromColor[event?.colorId as string] ?? 'medium';

      return {
        id: `google-${event?.id ?? crypto.randomUUID()}`,
        title: event?.summary || 'Google Calendar event',
        description: event?.description ?? undefined,
        dueDate: startIso,
        status: derivedStatus,
        priority: mappedPriority,
        assignedTo: currentUser.id || currentUser.email || currentUser.name,
        assignedBy: event?.organizer?.email ?? 'google-calendar',
        createdAt: event?.created ?? new Date().toISOString(),
        updatedAt: event?.updated,
        company: 'Google Calendar',
        type: 'google-event',
        tags: ['google-event']
      };
    },
    [currentUser.email, currentUser.id, currentUser.name]
  );

  useEffect(() => {
    if (!googleClientId || !googleApiKey) {
      setGoogleAuthReady(false);
      setIsGoogleSignedIn(false);
      setGoogleEvents([]);
      setGoogleEventLinks({});
      setGoogleError('Google Calendar integration is not configured. Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY.');
      return;
    }

    let isMounted = true;

    const initClient = () => {
      gapi.client
        .init({
          apiKey: googleApiKey,
          clientId: googleClientId,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          scope: 'https://www.googleapis.com/auth/calendar.readonly'
        })
        .then(() => {
          if (!isMounted) return;
          setGoogleAuthReady(true);
          setGoogleError(null);
          const auth = gapi.auth2.getAuthInstance();
          const handleSignInChange = (signedIn: boolean) => {
            if (!isMounted) return;
            setIsGoogleSignedIn(signedIn);
          };

          handleSignInChange(auth.isSignedIn.get());
          auth.isSignedIn.listen(handleSignInChange);
        })
        .catch(error => {
          console.error('Error initializing Google API client', error);
          if (isMounted) {
            setGoogleAuthReady(false);
            setGoogleError('Unable to initialize Google Calendar sync. Check console for details.');
          }
        });
    };

    setGoogleError(null);
    gapi.load('client:auth2', initClient);

    return () => {
      isMounted = false;
    };
  }, [googleApiKey, googleClientId]);

  const handleGoogleSignIn = useCallback(() => {
    if (!googleAuthReady) return;
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signIn();
  }, [googleAuthReady]);

  const handleGoogleSignOut = useCallback(() => {
    if (!googleAuthReady) return;
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signOut();
  }, [googleAuthReady]);

  const fetchGoogleEvents = useCallback(async () => {
    if (!googleAuthReady || !isGoogleSignedIn) {
      return;
    }

    setLoadingGoogleEvents(true);
    setGoogleError(null);

    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfMonth.toISOString(),
        timeMax: endOfMonth.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      } as any);

      const items = (response.result.items ?? []).filter((event: any) => Boolean(event?.start));
      const linkMap: Record<string, string> = {};
      const mappedTasks = items.map((event: any) => {
        const task = convertEventToTask(event);
        if (event?.htmlLink) {
          linkMap[task.id] = event.htmlLink;
        }
        return task;
      });

      setGoogleEvents(mappedTasks);
      setGoogleEventLinks(linkMap);
    } catch (error) {
      console.error('Error loading Google Calendar events', error);
      setGoogleError('Unable to load Google Calendar events right now.');
    } finally {
      setLoadingGoogleEvents(false);
    }
  }, [convertEventToTask, currentMonth, googleAuthReady, isGoogleSignedIn]);

  useEffect(() => {
    if (googleAuthReady && isGoogleSignedIn) {
      fetchGoogleEvents();
    } else {
      setGoogleEvents([]);
      setGoogleEventLinks({});
    }
  }, [fetchGoogleEvents, googleAuthReady, isGoogleSignedIn]);

  const mergedTasks = useMemo(() => [...tasks, ...googleEvents], [tasks, googleEvents]);

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
    return mergedTasks.filter(task => {
      const taskDueDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDueDate === dateStr;
    });
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

  // Get priority text color
  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700';
      case 'medium': return 'text-yellow-700';
      case 'low': return 'text-green-700';
      default: return 'text-blue-700';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Selected date tasks
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  // Handle edit task
  const handleEditTask = (task: Task) => {
    if (task.type === 'google-event') return;
    handleUpdateTask(task.id, task);
  };

  // Handle delete task with confirmation
  const handleDeleteWithConfirmation = async (taskId: string) => {
    if (taskId.startsWith('google-')) {
      return;
    }
    if (window.confirm('Are you sure you want to delete this task?')) {
      await handleDeleteTask(taskId);
    }
  };

  // Handle toggle task status
  const handleToggleStatus = async (task: Task) => {
    if (task.type === 'google-event') {
      return;
    }

    await handleToggleTaskStatus(task.id, task.status as TaskStatus);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
          <p className="text-gray-500">Manage your tasks schedule visually</p>
        </div>
        <div className="text-sm text-gray-600">
          Logged in as: <span className="font-semibold">{currentUser.name}</span>
        </div>
      </div>

      {/* Google Calendar Sync Status */}
      <div className="bg-white shadow rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${googleAuthReady ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm font-medium text-gray-700">Google Calendar Sync</span>
            </div>

            <div className="flex items-center space-x-4">
              {!googleClientId || !googleApiKey ? (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  Missing Google API keys
                </span>
              ) : !googleAuthReady ? (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  Initializing...
                </span>
              ) : isGoogleSignedIn ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Connected
                  </span>
                  {loadingGoogleEvents && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Syncing...
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    {googleEvents.length} Google events loaded
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  Disconnected
                </span>
              )}
            </div>
          </div>

          {googleClientId && googleApiKey && googleAuthReady && (
            <div className="flex items-center space-x-2">
              {isGoogleSignedIn && (
                <button
                  onClick={fetchGoogleEvents}
                  disabled={loadingGoogleEvents}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center space-x-1 ${loadingGoogleEvents
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingGoogleEvents ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
              {isGoogleSignedIn ? (
                <button
                  onClick={handleGoogleSignOut}
                  className="px-4 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors font-medium"
                >
                  Disconnect Google
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={!googleAuthReady}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${googleAuthReady
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Connect Google Calendar
                </button>
              )}
            </div>
          )}
        </div>

        {googleError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{googleError}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg border border-gray-200">
            {/* Calendar Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{monthYear}</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''
                        } ${isToday ? 'bg-blue-50' : ''
                        } hover:bg-gray-50`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                            } ${isToday ? 'text-blue-600 font-bold' : ''}`}
                        >
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
                            className={`text-xs p-1 rounded truncate ${task.type === 'google-event'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : `${getPriorityColor(task.priority)} bg-opacity-20 ${getPriorityTextColor(task.priority)}`
                              }`}
                            title={`${task.title}${task.type === 'google-event' ? ' (Google Calendar)' : ''} - ${task.priority} priority`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-1 ${task.type === 'google-event'
                                  ? 'bg-purple-500'
                                  : getPriorityColor(task.priority)
                                  }`}
                              ></div>
                              <span className="truncate font-medium">
                                {task.title}
                                {task.type === 'google-event' && ' 📅'}
                              </span>
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
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Legend:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-xs text-gray-600">High Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-xs text-gray-600">Medium Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-600">Low Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-xs text-gray-600">Google Calendar Event</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Selected Date Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg border border-gray-200 sticky top-6">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Select a Date'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No tasks scheduled</div>
                  <p className="text-sm text-gray-500">
                    Select another date or create a new task
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg hover:border-blue-300 transition-colors duration-200 ${task.type === 'google-event'
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-gray-200 bg-white'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            {task.type === 'google-event' && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                Google Calendar
                              </span>
                            )}
                            {task.completedApproval && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                ✅ Approved
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                task.status
                              )}`}
                            >
                              {task.status.replace('-', ' ')}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)
                                } bg-opacity-20 ${getPriorityTextColor(task.priority)}`}
                            >
                              {task.priority} priority
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${task.type === 'google-event'
                            ? 'bg-purple-500'
                            : getPriorityColor(task.priority)
                            }`}
                        ></div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="text-sm text-gray-600 mb-4 space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Assigned to:</span>
                          <span>{getAssignedUserInfo(task).name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Due date:</span>
                          <span className={`${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''}`}>
                            {formatDate(task.dueDate)}
                            {isOverdue(task.dueDate, task.status) && ' (Overdue)'}
                          </span>
                        </div>
                        {task.companyName && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Company:</span>
                            <span>{task.companyName}</span>
                          </div>
                        )}
                        {task.brand && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Brand:</span>
                            <span>{task.brand}</span>
                          </div>
                        )}
                      </div>

                      {/* Google Calendar Link */}
                      {task.type === 'google-event' && googleEventLinks[task.id] && (
                        <div className="mb-3">
                          <a
                            href={googleEventLinks[task.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:text-purple-800 hover:underline flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View in Google Calendar
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        {task.type !== 'google-event' ? (
                          <button
                            onClick={() => handleToggleStatus(task)}
                            disabled={!canMarkTaskDone(task)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1 transition-colors ${canMarkTaskDone(task)
                              ? task.status === 'completed'
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            {task.status === 'completed' ? (
                              <>
                                <XCircle className="h-4 w-4" />
                                Mark Pending
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Mark Complete
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            Google Calendar events are read-only
                          </div>
                        )}

                        {task.type !== 'google-event' && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === task.id ? null : task.id)
                              }
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>

                            {openMenuId === task.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                {canEditDeleteTask(task) && (
                                  <button
                                    onClick={() => {
                                      handleEditTask(task);
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Edit Task
                                  </button>
                                )}
                                {canEditDeleteTask(task) && (
                                  <button
                                    onClick={() => {
                                      handleDeleteWithConfirmation(task.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Delete Task
                                  </button>
                                )}
                                <div className="border-t border-gray-100"></div>
                                <button
                                  onClick={() => setOpenMenuId(null)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                                >
                                  Close
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Month Overview</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                    <div className="text-lg font-bold text-blue-600">
                      {mergedTasks.filter(t => t.status === 'completed').length}
                    </div>
                    <div className="text-xs text-blue-800 font-medium">Completed</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center border border-yellow-100">
                    <div className="text-lg font-bold text-yellow-600">
                      {mergedTasks.filter(t => t.status === 'in-progress').length}
                    </div>
                    <div className="text-xs text-yellow-800 font-medium">In Progress</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                    <div className="text-lg font-bold text-red-600">
                      {mergedTasks.filter(t => {
                        const dueDate = new Date(t.dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return dueDate < today && t.status !== 'completed';
                      }).length}
                    </div>
                    <div className="text-xs text-red-800 font-medium">Overdue</div>
                  </div>
                </div>
                {googleEvents.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="text-sm text-purple-800">
                      <span className="font-medium">{googleEvents.length} Google Calendar events</span>
                      <span className="text-xs ml-2">(read-only)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;