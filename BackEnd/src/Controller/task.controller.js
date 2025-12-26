// controllers/task.controller.js
const mongoose = require('mongoose');
const Task = require('../model/Task.model');
const User = require('../model/user.model');
const Comment = require('../model/Comment.model');
const TaskHistory = require('../model/TaskHistory.model');

const getActorFromRequest = (req) => {
    const user = req.user || {};
    const actorId = user.id || user._id || user.userId;
    return {
        id: actorId ? actorId.toString() : 'system',
        name: user.name || 'System',
        email: user.email || 'system@task-app.local',
        role: user.role || 'system'
    };
};

const isSameDay = (a, b) => {
    try {
        const d1 = new Date(a);
        const d2 = new Date(b);
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    } catch {
        return false;
    }
};

const formatOverdueDuration = (ms) => {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalMinutes = Math.floor(safeMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes };
};

const userCanAccessTask = (task, user) => {
    if (!user || !task) return false;
    if (user.role === 'admin') return true;
    const email = (user.email || '').toLowerCase();
    const assignedTo = typeof task.assignedTo === 'string' ? task.assignedTo.toLowerCase() : '';
    const assignedBy = typeof task.assignedBy === 'string' ? task.assignedBy.toLowerCase() : '';
    return email && (assignedTo === email || assignedBy === email);
};

exports.addTaskHistory = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ success: false, message: 'Invalid task id' });
        }

        const taskExists = await Task.exists({ _id: taskId });
        if (!taskExists) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const { action, description, oldStatus, newStatus, note, additionalData } = req.body || {};
        if (!action || !description) {
            return res.status(400).json({ success: false, message: 'Action and description are required' });
        }

        const actor = getActorFromRequest(req);

        const historyEntry = await TaskHistory.create({
            taskId,
            action,
            description,
            oldStatus: oldStatus || null,
            newStatus: newStatus || null,
            note: note || '',
            additionalData: additionalData || null,
            userId: actor.id,
            user: {
                userId: actor.id,
                userName: actor.name,
                userEmail: actor.email,
                userRole: actor.role
            }
        });

        await Task.findByIdAndUpdate(taskId, {
            $addToSet: { history: historyEntry._id },
            updatedAt: Date.now()
        });

        res.status(201).json({
            success: true,
            message: 'History added successfully',
            data: {
                ...historyEntry.toObject(),
                id: historyEntry._id
            }
        });
    } catch (error) {
        console.error('Error adding task history:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding history',
            error: error.message
        });
    }
};

exports.addTask = async (req, res) => {
    try {
        console.log(" Task creation request body:", req.body);
        const {
            title,
            description,
            assignedTo,
            dueDate,
            priority = 'medium',
            taskType = 'regular',
            companyName = 'company name',
            brand = '',
            brandId = null,
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
                console.log(` Warning: User with email ${assignedTo} not found in database`);
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
            brandId: brandId || null,
            status
        });

        console.log(" New task object:", newTask);

        // Save to database
        const savedTask = await newTask.save();
        console.log(" Task saved successfully:", savedTask._id);

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
            } : { email: assignedTo },
            assignedByUser: assignedByUser ? {
                id: assignedByUser._id,
                name: assignedByUser.name,
                email: assignedByUser.email,
            } : { email: assignedBy }
        };

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: responseData
        });

    } catch (error) {
        console.error(' Error creating task:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task',
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

        if (!userCanAccessTask(task, req.user)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this task'
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
        const updates = { ...req.body };
        const note = updates.note || '';
        const requestRecheck = Boolean(updates.requestRecheck);

        delete updates.note;
        delete updates.requestRecheck;

        console.log(" Updating task:", id, updates);

        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.createdAt;

        // Convert dueDate to Date if provided
        if (updates.dueDate) {
            updates.dueDate = new Date(updates.dueDate);
        }

        const previousTask = await Task.findById(id);

        if (!previousTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (!userCanAccessTask(previousTask, req.user)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this task'
            });
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

        try {
            const actor = getActorFromRequest(req);
            const changedFields = [];

            Object.keys(updates || {}).forEach((field) => {
                if (field === 'updatedAt') return;

                const prevValue = previousTask[field];
                const nextValue = updatedTask[field];

                const isDateField = prevValue instanceof Date || nextValue instanceof Date;
                const prevComparable = isDateField && prevValue ? new Date(prevValue).getTime() : prevValue;
                const nextComparable = isDateField && nextValue ? new Date(nextValue).getTime() : nextValue;

                if (prevComparable !== nextComparable) {
                    changedFields.push({
                        field,
                        from: isDateField && prevValue ? new Date(prevValue).toISOString() : prevValue,
                        to: isDateField && nextValue ? new Date(nextValue).toISOString() : nextValue
                    });
                }
            });

            const nonAuditFieldsChanged = changedFields.filter(c => c.field !== 'status' && c.field !== 'completedApproval');

            if (nonAuditFieldsChanged.length > 0 || (note && note.trim())) {
                const historyEntry = await TaskHistory.create({
                    taskId: id,
                    action: 'task_edited',
                    description: `Task updated by ${actor.name}`,
                    oldStatus: previousTask.status || null,
                    newStatus: updatedTask.status || null,
                    note: note || '',
                    additionalData: {
                        changedFields: nonAuditFieldsChanged,
                        rawUpdates: Object.keys(updates || {})
                    },
                    userId: actor.id,
                    user: {
                        userId: actor.id,
                        userName: actor.name,
                        userEmail: actor.email,
                        userRole: actor.role
                    }
                });

                await Task.findByIdAndUpdate(id, {
                    $addToSet: { history: historyEntry._id }
                });
            }

            if (updatedTask.status !== 'completed' && updatedTask.dueDate) {
                const due = new Date(updatedTask.dueDate);
                const now = new Date();
                if (!isNaN(due.getTime()) && due.getTime() < now.getTime()) {
                    const lastOverdue = await TaskHistory.findOne({ taskId: id, action: 'task_overdue' })
                        .sort({ timestamp: -1 })
                        .lean();

                    const shouldCreate = !lastOverdue
                        || !lastOverdue.additionalData
                        || new Date(lastOverdue.additionalData.dueDate || 0).getTime() !== due.getTime()
                        || !isSameDay(lastOverdue.timestamp, now);

                    if (shouldCreate) {
                        const overdueMs = now.getTime() - due.getTime();
                        const formatted = formatOverdueDuration(overdueMs);

                        const overdueHistory = await TaskHistory.create({
                            taskId: id,
                            action: 'task_overdue',
                            description: `Task is overdue by ${formatted.days}d ${formatted.hours}h ${formatted.minutes}m`,
                            oldStatus: previousTask.status || null,
                            newStatus: updatedTask.status || null,
                            note: '',
                            additionalData: {
                                dueDate: due.toISOString(),
                                overdueSince: due.toISOString(),
                                overdueDurationMs: overdueMs,
                                overdue: formatted
                            },
                            userId: actor.id,
                            user: {
                                userId: actor.id,
                                userName: actor.name,
                                userEmail: actor.email,
                                userRole: actor.role
                            }
                        });

                        await Task.findByIdAndUpdate(id, {
                            $addToSet: { history: overdueHistory._id }
                        });
                    }
                }
            }
        } catch (historyError) {
            console.error('Error recording task update history:', historyError);
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

exports.addTaskComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const user = req.user || {};

        const commentPayload = {
            taskId: task._id,
            content: content.trim(),
            userId: user.id || user._id || req.body.userId,
            userName: user.name || req.body.userName || 'Unknown User',
            userEmail: user.email || req.body.userEmail || 'unknown@example.com',
            userRole: user.role || req.body.userRole || 'user'
        };

        if (!commentPayload.userId) {
            return res.status(401).json({
                success: false,
                message: 'User context is missing'
            });
        }

        commentPayload.userId = commentPayload.userId.toString();

        const comment = await Comment.create(commentPayload);

        await Task.findByIdAndUpdate(taskId, {
            $addToSet: { comments: comment._id },
            updatedAt: Date.now()
        });

        try {
            const actor = getActorFromRequest(req);
            const historyEntry = await TaskHistory.create({
                taskId,
                action: 'comment_added',
                description: `Comment added by ${actor.name}`,
                oldStatus: task.status || null,
                newStatus: task.status || null,
                note: content.trim(),
                additionalData: {
                    commentId: comment._id.toString(),
                    content: content.trim()
                },
                userId: actor.id,
                user: {
                    userId: actor.id,
                    userName: actor.name,
                    userEmail: actor.email,
                    userRole: actor.role
                }
            });

            await Task.findByIdAndUpdate(taskId, {
                $addToSet: { history: historyEntry._id },
                updatedAt: Date.now()
            });
        } catch (commentHistoryError) {
            console.error('Error recording comment history:', commentHistoryError);
        }

        const responseData = {
            ...comment.toObject(),
            id: comment._id
        };

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment',
            error: error.message
        });
    }
};

exports.getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;

        const taskExists = await Task.exists({ _id: taskId });
        if (!taskExists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const comments = await Comment.find({ taskId })
            .sort({ createdAt: -1 })
            .lean();

        const formatted = comments.map(comment => ({
            ...comment,
            id: comment._id
        }));

        res.json({
            success: true,
            data: formatted,
            message: 'Comments fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments',
            error: error.message
        });
    }
};

exports.getTaskHistory = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task id'
            });
        }

        const taskExists = await Task.exists({ _id: taskId });

        if (!taskExists) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const historyEntries = await TaskHistory.find({ taskId })
            .sort({ timestamp: -1 })
            .lean();

        const formatted = historyEntries.map(entry => ({
            ...entry,
            id: entry._id,
            userName: entry.user?.userName || entry.userName || 'System',
            userEmail: entry.user?.userEmail || entry.userEmail || 'system@task-app.local',
            userRole: entry.user?.userRole || entry.userRole || 'system',
            timestamp: entry.timestamp || entry.createdAt || entry.updatedAt,
        }));

        res.json({
            success: true,
            data: formatted,
            message: 'Task history fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching task history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task history',
            error: error.message
        });
    }
};

exports.deleteTaskComment = async (req, res) => {
    try {
        const { taskId, commentId } = req.params;

        const comment = await Comment.findById(commentId);

        if (!comment || comment.taskId.toString() !== taskId) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const user = req.user || {};
        const isOwner = user.id && comment.userId?.toString() === user.id?.toString();
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        await Comment.deleteOne({ _id: commentId });

        await Task.findByIdAndUpdate(taskId, {
            $pull: { comments: commentId },
            updatedAt: Date.now()
        });

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
};

exports.inviteToTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { email, role, message } = req.body;
        const invitedBy = req.user.email;

        // Validation
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const task = await Task.findById(taskId);  
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        // Add to invitations
        task.invitations.push({
            email,
            role: role || 'viewer',
            status: 'pending',
            invitedBy,
            invitedAt: new Date()
        });

        // Create history entry
        const historyEntry = await TaskHistory.create({
            taskId,
            action: 'collaborator_invited',
            description: `Invited ${email} as ${role || 'viewer'}`,
            userId: req.user.id || req.user._id,
            user: {
                userId: req.user.id || req.user._id,
                userName: req.user.name,
                userEmail: req.user.email,
                userRole: req.user.role
            },
            note: message || ''
        });

        task.history.push(historyEntry._id);

        await task.save();

        res.json({ success: true, message: 'User invited successfully', data: task });
    } catch (error) {
        console.error('Error inviting to task:', error);
        res.status(500).json({ success: false, message: 'Error inviting user', error: error.message });
    }
};

// controllers/task.controller.js में ये फंक्शन जोड़ें:

exports.getAllTasks = async (req, res) => {
    try {
        const user = req.user || {};
        
        let tasks;
        
        // Admin को सभी tasks दिखाएँ
        if (user.role === 'admin') {
            tasks = await Task.find({})
                .sort({ createdAt: -1 })
                .lean();
        } else {
            // Regular users को केवल अपने tasks
            tasks = await Task.find({
                $or: [
                    { assignedTo: user.email },
                    { assignedBy: user.email }
                ]
            })
                .sort({ createdAt: -1 })
                .lean();
        }
        
        // User details populate करें
        const tasksWithUserDetails = await Promise.all(
            tasks.map(async (task) => {
                let assignedToUser = null;
                let assignedByUser = null;
                
                if (typeof task.assignedTo === 'string') {
                    assignedToUser = await User.findOne({ email: task.assignedTo });
                }
                
                if (typeof task.assignedBy === 'string') {
                    assignedByUser = await User.findOne({ email: task.assignedBy });
                }
                
                return {
                    ...task,
                    id: task._id,
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
            })
        );
        
        res.json({
            success: true,
            data: tasksWithUserDetails,
            message: 'Tasks fetched successfully'
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

// controllers/task.controller.js में ये function add करें:

exports.approveTask = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || {};
        
        const task = await Task.findById(id);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        // Check if user is admin or assigner
        const isAdmin = user.role === 'admin';
        const isAssigner = task.assignedBy === user.email;
        
        if (!isAdmin && !isAssigner) {
            return res.status(403).json({
                success: false,
                message: 'Only admin or task assigner can approve tasks'
            });
        }
        
        // Update task approval status
        const updatedTask = await Task.findByIdAndUpdate(
            id,
            {
                completedApproval: true,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        // Create approval history
        const actor = {
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        const historyEntry = await TaskHistory.create({
            taskId: id,
            action: 'task_approved',
            description: `Task approved by ${actor.name} (${actor.role})`,
            userId: actor.id,
            user: {
                userId: actor.id,
                userName: actor.name,
                userEmail: actor.email,
                userRole: actor.role
            },
            additionalData: {
                approvedBy: actor.email,
                approvedAt: new Date().toISOString(),
                approverRole: actor.role
            }
        });
        
        await Task.findByIdAndUpdate(id, {
            $addToSet: { history: historyEntry._id }
        });
        
        res.json({
            success: true,
            message: 'Task approved successfully',
            data: updatedTask
        });
        
    } catch (error) {
        console.error('Error approving task:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving task',
            error: error.message
        });
    }
};

// controllers/task.controller.js में ये function add करें (अगर नहीं है):

exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || {};
        
        console.log(`Attempting to delete task ${id} by user ${user.email}`);
        
        // Find the task first
        const task = await Task.findById(id);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        // Check permissions
        const isAdmin = user.role === 'admin';
        const isAssigner = task.assignedBy === user.email;
        
        if (!isAdmin && !isAssigner) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this task'
            });
        }
        
        // Delete related comments first
        await Comment.deleteMany({ taskId: id });
        
        // Delete related history
        await TaskHistory.deleteMany({ taskId: id });
        
        // Delete the task
        await Task.findByIdAndDelete(id);
        
        console.log(`Task ${id} deleted successfully`);
        
        res.json({
            success: true,
            message: 'Task deleted successfully'
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