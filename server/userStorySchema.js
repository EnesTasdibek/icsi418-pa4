//Stores each story, its priority, status, and assignment
const mongoose = require("mongoose");

const UserStorySchema = new mongoose.Schema({
    project_id: mongoose.Schema.Types.ObjectId,
    title: String,
    description: String,
    priority: String,
    status: String,
    assigned_user_id: mongoose.Schema.Types.ObjectId
});

const UserStory = mongoose.model("UserStory", UserStorySchema, "UserStories");

module.exports = UserStory;