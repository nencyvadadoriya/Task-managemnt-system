// TaskService.ts

import axios from "axios";

// 💡 FIX 1: Create a function to get the authentication headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        // Handle case where token is missing (e.g., redirect to login)
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
            return {
                success: false,
                data: null,
                message: err.response?.data?.msg || err.message || "Failed to add task"
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
            return {
                success: false,
                data: [],
                message: err.response?.data?.msg || "Failed to fetch tasks"
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
            // Handle error response more robustly if needed
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
            return {
                success: false,
                data: null,
                message: err.response?.data?.msg || "Failed to update task"
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
            return {
                success: false,
                message: err.response?.data?.msg || "Failed to delete task"
            };
        }
    }

    async createTask(payload: any) {
        return this.addTask(payload);
    }
}

export const taskService = new TaskService();