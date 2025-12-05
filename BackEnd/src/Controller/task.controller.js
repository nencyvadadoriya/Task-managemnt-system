// controllers/task.controller.js
const Task = require('../model/Task.model');
const User = require('../model/user.model');

exports.addTask = async (req, res) => {
    try {
        console.log("📝 Task creation request body:", req.body);
        const {
            title,
            description,
            assignedTo, 
            dueDate,
            priority = 'medium',
            taskType = 'regular',
            companyName = 'company name',
            brand = '',
            status = 'pending'
        } = req.body;
        let assignedBy = req.body.assignedBy;
        if (!assignedBy) {
            if (req.user && req.user.email) {
                assignedBy = req.user.email;
            } else {
                assignedBy = 'admin@example.com';
            }
        }

        // Validation
        if (!title || !assignedTo || !dueDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, assignee email, and due date are required'
            });
        }

        // Optional: Check if assignedTo email exists in users
        try {
            const assignedUser = await User.findOne({ email: assignedTo });
            if (!assignedUser) {
                console.log(`⚠️ Warning: User with email ${assignedTo} not found in database`);
            }
        } catch (userError) {
            console.log("User check skipped or failed:", userError.message);
        }

        // Create new task object
        const newTask = new Task({
            title,
            description,
            assignedTo, // Email store ho jayegi
            assignedBy, // Email store ho jayegi
            dueDate: new Date(dueDate),
            priority,
            taskType,
            companyName,
            brand,
            status
        });

        console.log("📋 New task object:", newTask);

        // Save to database
        const savedTask = await newTask.save();
        console.log("✅ Task saved successfully:", savedTask._id);

        // Since assignedTo is now String/email, we can't use populate directly
        // Manually fetch user details if needed
        let assignedToUser = null;
        let assignedByUser = null;

        try {
            assignedToUser = await User.findOne({ email: assignedTo });
            assignedByUser = await User.findOne({ email: assignedBy });
        } catch (userError) {
            console.log("User lookup failed:", userError.message);
        }

        // Prepare response with user details
        const responseData = {
            ...savedTask.toObject(),
            assignedToUser: assignedToUser ? {
                id: assignedToUser._id,
                name: assignedToUser.name,
                email: assignedToUser.email,
                avatar: assignedToUser.avatar
            } : { email: assignedTo },
            assignedByUser: assignedByUser ? {
                id: assignedByUser._id,
                name: assignedByUser.name,
                email: assignedByUser.email,
                avatar: assignedByUser.avatar
            } : { email: assignedBy }
        };

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: responseData
        });

    } catch (error) {
        console.error('❌ Error creating task:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task',
            error: error.message
        });
    }
};

// Update getAllTasks function bhi
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });

        // Since assignedTo is email, manually populate user details
        const tasksWithUserDetails = await Promise.all(
            tasks.map(async (task) => {
                let assignedToUser = null;
                let assignedByUser = null;

                try {
                    // Try to find user by email
                    if (typeof task.assignedTo === 'string') {
                        assignedToUser = await User.findOne({ email: task.assignedTo });
                    }

                    if (typeof task.assignedBy === 'string') {
                        assignedByUser = await User.findOne({ email: task.assignedBy });
                    }
                } catch (userError) {
                    console.log("User lookup error:", userError.message);
                }

                return {
                    ...task.toObject(),
                    assignedToUser: assignedToUser ? {
                        id: assignedToUser._id,
                        name: assignedToUser.name,
                        email: assignedToUser.email,
                        avatar: assignedToUser.avatar
                    } : {
                        email: typeof task.assignedTo === 'string' ? task.assignedTo : 'Unknown'
                    },
                    assignedByUser: assignedByUser ? {
                        id: assignedByUser._id,
                        name: assignedByUser.name,
                        email: assignedByUser.email,
                        avatar: assignedByUser.avatar
                    } : {
                        email: typeof task.assignedBy === 'string' ? task.assignedBy : 'Unknown'
                    }
                };
            })
        );

        res.json({
            success: true,
            message: 'Tasks retrieved successfully',
            count: tasks.length,
            data: tasksWithUserDetails
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasks',
            error: error.message
        });
    }
};

// Update other functions accordingly
exports.getSingleTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Manually populate user details
        let assignedToUser = null;
        let assignedByUser = null;

        if (typeof task.assignedTo === 'string') {
            assignedToUser = await User.findOne({ email: task.assignedTo });
        }

        if (typeof task.assignedBy === 'string') {
            assignedByUser = await User.findOne({ email: task.assignedBy });
        }

        const taskWithDetails = {
            ...task.toObject(),
            assignedToUser: assignedToUser ? {
                id: assignedToUser._id,
                name: assignedToUser.name,
                email: assignedToUser.email,
                avatar: assignedToUser.avatar
            } : { email: task.assignedTo },
            assignedByUser: assignedByUser ? {
                id: assignedByUser._id,
                name: assignedByUser.name,
                email: assignedByUser.email,
                avatar: assignedByUser.avatar
            } : { email: task.assignedBy }
        };

        res.json({
            success: true,
            message: 'Task retrieved successfully',
            data: taskWithDetails
        });

    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task',
            error: error.message
        });
    }
};

// 4. UPDATE TASK
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log("🔄 Updating task:", id, updates);

        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.createdAt;

        // Convert dueDate to Date if provided
        if (updates.dueDate) {
            updates.dueDate = new Date(updates.dueDate);
        }

        // Update the task
        const updatedTask = await Task.findByIdAndUpdate(
            id,
            {
                ...updates,
                updatedAt: Date.now()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Get user details for response
        let assignedToUser = null;
        let assignedByUser = null;

        if (typeof updatedTask.assignedTo === 'string') {
            assignedToUser = await User.findOne({ email: updatedTask.assignedTo });
        }

        if (typeof updatedTask.assignedBy === 'string') {
            assignedByUser = await User.findOne({ email: updatedTask.assignedBy });
        }

        const responseData = {
            ...updatedTask.toObject(),
            assignedToUser: assignedToUser ? {
                id: assignedToUser._id,
                name: assignedToUser.name,
                email: assignedToUser.email,
                avatar: assignedToUser.avatar
            } : { email: updatedTask.assignedTo },
            assignedByUser: assignedByUser ? {
                id: assignedByUser._id,
                name: assignedByUser.name,
                email: assignedByUser.email,
                avatar: assignedByUser.avatar
            } : { email: updatedTask.assignedBy }
        };

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: responseData
        });

    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating task',
            error: error.message
        });
    }
};

// 5. DELETE TASK
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedTask = await Task.findByIdAndDelete(id);

        if (!deletedTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.json({
            success: true,
            message: 'Task deleted successfully',
            data: deletedTask
        });

    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting task',
            error: error.message
        });
    }
};