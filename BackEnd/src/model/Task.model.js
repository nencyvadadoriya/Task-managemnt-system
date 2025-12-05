const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    assignedTo: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    taskType: {
        type: String,
        enum: ['regular', 'troubleshoot', 'maintenance', 'development'],
        default: 'regular'
    },
    companyName: {
        type: String,
        enum: ['company name', 'acs', 'md inpex', 'tech solutions', 'global inc'],
        default: 'company name'
    },
    brand: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedApproval: { type: Boolean, default: false },

});

module.exports = mongoose.model('Task', taskSchema);