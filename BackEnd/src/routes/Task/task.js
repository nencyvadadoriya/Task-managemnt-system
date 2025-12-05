const express = require("express");
const {
    addTask,
    getAllTasks,
    getSingleTask,
    updateTask,
    deleteTask,
} = require("../../Controller/task.controller");
const { approve } = require("../../Controller/user.controller");


const router = express.Router();
router.post("/addTask", addTask);
router.get("/getAllTasks", getAllTasks);
router.get("/singleTask/:id", getSingleTask);
router.put("/updateTask/:id", updateTask);
router.delete("/deleteTask/:id", deleteTask);
router.put('/tasks/:id/approve' , approve)

// Backend: Task History API
router.post('/tasks/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, description, userId, userName, userEmail, userRole } = req.body;
    
    const history = await TaskHistory.create({
      taskId: id,
      action,
      description,
      userId,
      userName,
      userEmail,
      userRole,
      timestamp: new Date()
    });
    
    // Task mein bhi history add karo
    await Task.findByIdAndUpdate(id, {
      $push: { history: history._id }
    });
    
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task history
router.get('/tasks/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await TaskHistory.find({ taskId: id })
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
