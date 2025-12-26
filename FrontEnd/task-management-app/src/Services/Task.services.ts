// TaskService.ts

import axios from "axios";

// 💡 FIX 1: Create a function to get the authentication headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error("JWT Token is missing from localStorage.");
        return {};
    }
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

class TaskService {
    baseUrl = "http://localhost:9000/api/task/";
    authAddTask = "addTask";
    authGetAllTask = "getAllTasks";
    authSingleTask = "singleTask";
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

    // 🎯 FIX 2: Add Task method now includes the Authorization Header
    async addTask(payload: any) {
        try {
            console.log('📤 Sending task to API:', payload);

            const res = await axios.post(
                this.baseUrl + this.authAddTask,
                payload,
                getAuthHeaders() // 🔑 AUTH HEADER ADDED
            );

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

    // 🎯 FIX 3: Get All Tasks method now includes the Authorization Header
    async getAllTasks() {
        try {
            const res = await axios.get(
                this.baseUrl + this.authGetAllTask,
                getAuthHeaders() // 🔑 AUTH HEADER ADDED
            );

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

    // 🎯 FIX 4: Get Single Task method now includes the Authorization Header
    async getSingleTask(id: string) {
        try {
            const res = await axios.get(
                this.baseUrl + this.authSingleTask + `/${id}`,
                getAuthHeaders() // 🔑 AUTH HEADER ADDED
            );

            return res.data;
        } catch (err) {
            console.log("Single Task Error:", err);
            throw err;
        }
    }

    // 🎯 FIX 5: Update Task method now includes the Authorization Header
    async updateTask(id: string, payload: any) {
        try {
            console.log('📝 Updating task:', id, payload);

            const res = await axios.put(
                this.baseUrl + this.authUpdateTask + `/${id}`,
                payload,
                getAuthHeaders() // 🔑 AUTH HEADER ADDED
            );

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

    // 🎯 FIX 6: Delete Task logic is already correct, but using the common function for consistency
    async deleteTask(id: string) {
        try {
            console.log('Sending DELETE request for task ID:', id);

            const res = await axios.delete(
                this.baseUrl + this.authDeletedTask + `/${id}`,
                getAuthHeaders() // 🔑 Using common function now
            );

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

    // ✅ CORRECTED: Add Comment method - सिर्फ content लेगा, user info backend से token से मिलेगी
    async addComment(taskId: string, content: string) {
        try {
            console.log('💾 Adding comment for task:', taskId, content);

            const payload = {
                content: content
                // User info backend में token से automatic add होगी
            };

            const res = await axios.post(
                this.buildCommentsUrl(taskId),
                payload,
                getAuthHeaders()
            );

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

    // ✅ CORRECTED: Fetch Comments method
    async fetchComments(taskId: string) {
        try {
            const res = await axios.get(
                this.buildCommentsUrl(taskId),
                getAuthHeaders()
            );

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

    // ✅ CORRECTED: Delete Comment method
    async deleteComment(taskId: string, commentId: string) {
        try {
            console.log('🗑️ Deleting comment:', commentId, 'for task:', taskId);

            const res = await axios.delete(
                this.buildCommentsUrl(taskId, commentId),
                getAuthHeaders()
            );

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

    // ✅ NEW: Update Task Approval Status
    async updateTaskApproval(taskId: string, completedApproval: boolean) {
        try {
            console.log('✅ Updating task approval:', taskId, completedApproval);

            const payload = {
                completedApproval: completedApproval
            };

            const res = await axios.put(
                this.baseUrl + this.authUpdateTask + `/${taskId}`,
                payload,
                getAuthHeaders()
            );

            console.log('✅ Approval update response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Approval status updated'
            };
        } catch (error: any) {
            console.error('❌ Error updating approval:', error);
            return {
                success: false,
                message: error.response?.data?.msg || 'Failed to update approval'
            };
        }
    }

    // ✅ NEW: Get Task History
    async getTaskHistory(taskId: string) {
        try {
            console.log('📜 Fetching history for task:', taskId);
            const res = await axios.get(
                this.buildHistoryUrl(taskId),
                getAuthHeaders()
            );

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

    // NEW: Add Task History
    async addTaskHistory(taskId: string, payload: any) {
        try {
            console.log(' Adding history for task:', taskId);
            const res = await axios.post(
                this.buildHistoryUrl(taskId),
                payload,
                getAuthHeaders()
            );

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

    async inviteToTask(taskId: string, email: string, role: string) {
        try {
            const res = await axios.post(
                `${this.baseUrl}${taskId}/invite`,
                { email, role },
                getAuthHeaders()
            );

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || 'User invited successfully'
            };
        } catch (error: any) {
            console.error('Error inviting to task:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to invite user'
            };
        }
    }
}

export const taskService = new TaskService();