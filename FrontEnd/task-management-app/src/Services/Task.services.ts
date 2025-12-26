// TaskService.ts

import apiClient from "./apiClient";

class TaskService {
    baseUrl = "/task/";
    authAddTask = "addTask";
    authGetAllTask = "getAllTasks";
    authUpdateTask = "updateTask";
    authDeletedTask = "deleteTask";

    private buildCommentsUrl(taskId: string, commentId?: string) {
        let url = `${this.baseUrl}${taskId}/comments`;
        if (commentId) {
            url += `/${commentId}`;
        }
        return url;
    }

    private buildHistoryUrl(taskId: string) {
        return `${this.baseUrl}${taskId}/history`;
    }

    async addTask(payload: any) {
        try {
            console.log('📤 Sending task to API:', payload);

            const res = await apiClient.post(this.baseUrl + this.authAddTask, payload);

            console.log('📥 API Response:', res.data);

            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? { ...task, id: task._id || task.id } : null,
                message: res.data.message || res.data.msg || 'Task created successfully'
            };
        } catch (err: any) {
            console.error("❌ Add Task Error:", err.response?.status, err.response?.data);
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || "Failed to add task"
            };
        }
    }

    async getAllTasks() {
        try {
            const res = await apiClient.get(this.baseUrl + this.authGetAllTask);

            const tasks = (res.data.data || []).map((task: any) => ({
                ...task,
                id: task._id || task.id
            }));

            return {
                success: Boolean(res.data.success),
                data: tasks,
                message: res.data.message || res.data.msg || 'Tasks fetched successfully'
            };
        } catch (err: any) {
            console.error("❌ Get Tasks Error:", err.response?.status, err.response?.data);
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [],
                message: backendMessage || backendError || "Failed to fetch tasks"
            };
        }
    }

    async updateTask(id: string, payload: any) {
        try {
            console.log('📝 Updating task:', id, payload);

            const res = await apiClient.put(this.baseUrl + this.authUpdateTask + `/${id}`, payload);

            console.log('✅ Update response:', res.data);

            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? { ...task, id: task._id || task.id } : null,
                message: res.data.message || res.data.msg || 'Task updated successfully'
            };
        } catch (err: any) {
            console.error("❌ Update Task Error:", err.response?.status, err.response?.data);
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || "Failed to update task"
            };
        }
    }

    async deleteTask(id: string) {
        try {
            console.log('Sending DELETE request for task ID:', id);

            const res = await apiClient.delete(this.baseUrl + this.authDeletedTask + `/${id}`);

            console.log(' DELETE Response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Task deleted successfully'
            };
        } catch (err: any) {
            console.log(" Delete Task Error:", err.response?.status, err.response?.data);
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                message: backendMessage || backendError || "Failed to delete task"
            };
        }
    }

    async createTask(payload: any) {
        return this.addTask(payload);
    }

    async addComment(taskId: string, content: string) {
        try {
            console.log('💾 Adding comment for task:', taskId, content);

            const payload = {
                content: content
                // User info backend में token से automatic add होगी
            };

            const res = await apiClient.post(this.buildCommentsUrl(taskId), payload);

            console.log('✅ Comment add response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Comment added successfully'
            };
        } catch (error: any) {
            console.error('❌ Error adding comment:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to add comment'
            };
        }
    }

    async fetchComments(taskId: string) {
        try {
            const res = await apiClient.get(this.buildCommentsUrl(taskId));

            console.log('✅ Comments fetch response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data || [],
                message: res.data.message || res.data.msg || 'Comments fetched successfully'
            };
        } catch (error: any) {
            console.error('❌ Error fetching comments:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to fetch comments'
            };
        }
    }

    async deleteComment(taskId: string, commentId: string) {
        try {
            console.log('🗑️ Deleting comment:', commentId, 'for task:', taskId);

            const res = await apiClient.delete(this.buildCommentsUrl(taskId, commentId));

            console.log('✅ Comment delete response:', res.data);

            return {
                success: Boolean(res.data.success),
                message: res.data.message || res.data.msg || 'Comment deleted successfully'
            };
        } catch (error: any) {
            console.error('❌ Error deleting comment:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to delete comment'
            };
        }
    }

    async getTaskHistory(taskId: string) {
        try {
            console.log('📜 Fetching history for task:', taskId);
            const res = await apiClient.get(this.buildHistoryUrl(taskId));

            const entries = (res.data.data || []).map((entry: any) => ({
                ...entry,
                id: entry.id || entry._id,
                timestamp: entry.timestamp || entry.createdAt || new Date().toISOString()
            }));

            return {
                success: Boolean(res.data.success),
                data: entries,
                message: res.data.message || res.data.msg || 'History fetched successfully'
            };
        } catch (error: any) {
            console.error('❌ Error fetching history:', error);
            return {
                success: false,
                data: [],
                message: error.response?.data?.msg || 'Failed to fetch history'
            };
        }
    }

    async addTaskHistory(taskId: string, payload: any) {
        try {
            console.log(' Adding history for task:', taskId);
            const res = await apiClient.post(this.buildHistoryUrl(taskId), payload);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'History added successfully'
            };
        } catch (error: any) {
            console.error(' Error adding history:', error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || 'Failed to add history'
            };
        }
    }
}

export const taskService = new TaskService();