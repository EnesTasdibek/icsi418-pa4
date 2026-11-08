require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const express = require("express");
//CORS configuration if the client and server run on different ports
const cors = require("cors");
//Express server includes JSON body parsing before the routes that need it
const app = express();
const User = require('./userSchema')
// ----- PA3 imports ----
const Project = require('./projectSchema')
const ProjectMembership = require('./projectMembershipSchema')
const validId = mongoose.isValidObjectId;
// ----- PA4 imports ----
const UserStory = require('./userStorySchema')
// --------------------------

app.use(express.json());
app.use(cors());

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Could not connect to MongoDB");
        console.error(error);
    }
}
connectDatabase();

app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

//The backend must check whether the username already exists.
//If the username already exists, the user must not be created.
//Otherwise, a new user must be stored in MongoDB.
//The frontend must display an appropriate success or failure message.
app.post('/createUser', async (req, res) => {
    console.log(`SERVER: CREATE USER REQ BODY: ${req.body.username} ${req.body.firstName} ${req.body.lastName}`)
    
    //The backend must verifies that all required information was provided
    if (!req.body.firstName || !req.body.lastName || !req.body.username || !req.body.password) {
        return res.status(400).json({ message: "One or more fields missing" });
    }

    const un = req.body.username
    try {
        //The backend checks if username already exists in database
        User.exists({username: un}).then(result => {
            if(Object.is(result, null)) {
                //create new user in mongo DB if the user does not exist yet
                const user = new User({
                    f_name: req.body.firstName,
                    l_name: req.body.lastName,
                    username: req.body.username,
                    password: req.body.password
                });
                user.save()
                console.log(`User created! ${user}`)
                
                res.status(201).json({ message: "User created successfully" })
            }
            else {
                //If the username already exists, the user must not be created
                console.log("Username already exists")
                
                res.status(409).json({ message: "Username already exists" })
            }
        })
    }
    catch (error){
        res.status(500).send(error)
    }
})

app.get('/getUser', async (req, res) => {
    const username = req.query.username
    const password = req.query.password
    
    console.log(username)
    console.log(password)
    try {//The supplied password is compared with the stored password
        //Check required fields
        if (!username || !password) {
            return res.status(400).send("Username and password are required")
        }
        const user = await User.findOne({ username, password })
        res.send(user)
    }
    catch (error) {
        res.status(500).send("Username and password are required")
    }
})

/* ------- PA3 -------- */

// Backend route that returns registered users
// (for Project Lead and member dropdowns)
app.get("/api/users", async (req, res) => {
  try {
    res.json(await User.find({}).select("-password"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Project creation (backend)
app.post("/api/projects", async (req, res) => {
  // Read the request body
    const name = req.body.name
    const description = req.body.description
    const status = req.body.status
    const project_lead_id = req.body.project_lead_id

  // Added remaining validation and user feedback.
  // Check required fields
  if (!name || !description || !status || !project_lead_id){
    return res.status(400).json({ message: "All project fields are required" });
  }
  if (status !== "Planning" && status !== "Active" && status !== "Completed"){
    return res.status(400).json({ message: "Status must be Planning, Active, or Completed" });
  }
  // Validate the Project Lead id
  if (!mongoose.isValidObjectId(project_lead_id)){
    return res.status(400).json({ message: "Invalid project lead id" });
  }
  try {
    // Verify that the selected user exists
    if (!(await User.exists({ _id: project_lead_id }))){
      return res.status(404).json({ message: "Selected project lead does not exist" });
  }
    // Insert the Project document
    const project = await Project.create({ name, description, status, project_lead_id });

    // Use the new project _id AND insert membership for the lead
    await ProjectMembership.create({ project_id: project._id, user_id: project_lead_id });

    // Return a success response
    res.status(201).json({ message: "Project created", project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all projects
app.get("/api/projects", async (req, res) => {
  try {
    res.json(await Project.find({}));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Retrieve project memberships
app.get("/api/projects/:projectId/members", async (req, res) => {
  const { projectId } = req.params;
  if (!validId(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }
  try {
    if (!(await Project.exists({ _id: projectId }))) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(await ProjectMembership.find({ project_id: projectId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add  member
app.post("/api/projects/:projectId/members", async (req, res) => {
  const { projectId } = req.params;
  const { user_id } = req.body;
  if (!validId(projectId) || !validId(user_id)) {
    return res.status(400).json({ message: "Invalid project or user id" });
  }
  try {
    if (!(await Project.exists({ _id: projectId }))) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (!(await User.exists({ _id: user_id }))) {
      return res.status(404).json({ message: "User not found" });
    }
    //Duplicate-membership validation
    if (await ProjectMembership.exists({ project_id: projectId, user_id })) {
      return res.status(409).json({ message: "User is already a member of this project" });
    }
    await ProjectMembership.create({ project_id: projectId, user_id });
    res.status(201).json({ message: "Member added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server problem" });
  }
});

// Remove a non-lead member
app.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
  const { projectId, userId } = req.params;
  if (!validId(projectId) || !validId(userId)) {
    return res.status(400).json({ message: "Invalid project or user id" });
  }
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (String(project.project_lead_id) === userId) {
      return res.status(400).json({ message: "The project lead cannot be removed" });
    }
    if (await UserStory.exists({ project_id: projectId, assigned_user_id: userId })) {
      return res.status(409).json({ message: "This member still has stories assigned in this project. Reassign, unassign, or delete those stories before removing them." });
    }
    const { deletedCount } = await ProjectMembership.deleteOne({ project_id: projectId, user_id: userId });
    if (!deletedCount) {
      return res.status(404).json({ message: "User is not a member of this project" });
    }
    res.json({ message: "Member removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server problem" });
  }
});

/* ------- PA4 -------- */

const priorities = ["High", "Medium", "Low"];
const storyStatuses = ["To Do", "In Progress", "Done"];

function checkStoryFields(title, description, priority) {
  if (typeof title !== "string" || title.trim() === "") {
    return "Title is required";
  }
  if (typeof description !== "string" || description.trim() === "") {
    return "Description is required";
  }
  if (!priorities.includes(priority)) {
    return "Priority must be High, Medium, or Low";
  }
  return "";
}

async function checkAssignedUser(projectId, assignedUserId) {
  if (assignedUserId === null) {
    return "";
  }
  if (!(await User.exists({ _id: assignedUserId }))) {
    return "Assigned user does not exist";
  }
  if (!(await ProjectMembership.exists({ project_id: projectId, user_id: assignedUserId }))) {
    return "Assigned user is not a member of this project";
  }
  return "";
}

app.get("/api/projects/:projectId/stories", async (req, res) => {
  const rawId = req.params.projectId;

  if (typeof rawId !== "string" || !ObjectId.isValid(rawId)) {
    return res.status(400).json({ message: "Invalid project identifier." });
  }

  const projectId = new ObjectId(rawId);

  try {
    if (!(await Project.exists({ _id: projectId }))) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(await UserStory.find({ project_id: projectId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/projects/:projectId/stories", async (req, res) => {
  const rawId = req.params.projectId;
  const body = req.body || {};
  const { title, description, priority, assigned_user_id } = body;

  if (typeof rawId !== "string" || !ObjectId.isValid(rawId)) {
    return res.status(400).json({ message: "Invalid project identifier." });
  }

  const projectId = new ObjectId(rawId);

  const fieldError = checkStoryFields(title, description, priority);
  if (fieldError) {
    return res.status(400).json({ message: fieldError });
  }

  let assignedUserId = null;
  if (assigned_user_id !== null) {
    if (typeof assigned_user_id !== "string" || !ObjectId.isValid(assigned_user_id)) {
      return res.status(400).json({ message: "Invalid assigned user identifier." });
    }
    assignedUserId = new ObjectId(assigned_user_id);
  }

  try {
    if (!(await Project.exists({ _id: projectId }))) {
      return res.status(404).json({ message: "Project not found" });
    }
    const assignError = await checkAssignedUser(projectId, assignedUserId);
    if (assignError) {
      return res.status(400).json({ message: assignError });
    }
    const story = await UserStory.create({
      project_id: projectId,
      title: title.trim(),
      description: description.trim(),
      priority: priority,
      status: "To Do",
      assigned_user_id: assignedUserId
    });
    res.status(201).json({ message: "Story created", story });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  const rawProjectId = req.params.projectId;
  const rawStoryId = req.params.storyId;
  const body = req.body || {};
  const { title, description, priority, status, assigned_user_id } = body;

  if (typeof rawProjectId !== "string" || !ObjectId.isValid(rawProjectId)) {
    return res.status(400).json({ message: "Invalid project identifier." });
  }
  if (typeof rawStoryId !== "string" || !ObjectId.isValid(rawStoryId)) {
    return res.status(400).json({ message: "Invalid story identifier." });
  }

  const projectId = new ObjectId(rawProjectId);
  const storyId = new ObjectId(rawStoryId);

  const fieldError = checkStoryFields(title, description, priority);
  if (fieldError) {
    return res.status(400).json({ message: fieldError });
  }
  if (!storyStatuses.includes(status)) {
    return res.status(400).json({ message: "Status must be To Do, In Progress, or Done" });
  }

  let assignedUserId = null;
  if (assigned_user_id !== null) {
    if (typeof assigned_user_id !== "string" || !ObjectId.isValid(assigned_user_id)) {
      return res.status(400).json({ message: "Invalid assigned user identifier." });
    }
    assignedUserId = new ObjectId(assigned_user_id);
  }

  try {
    if (!(await Project.exists({ _id: projectId }))) {
      return res.status(404).json({ message: "Project not found" });
    }
    const assignError = await checkAssignedUser(projectId, assignedUserId);
    if (assignError) {
      return res.status(400).json({ message: assignError });
    }

    const storyQuery = {
      _id: storyId,
      project_id: projectId
    };
    const updates = {
      title: title.trim(),
      description: description.trim(),
      priority: priority,
      status: status,
      assigned_user_id: assignedUserId
    };
    const result = await UserStory.updateOne(storyQuery, { $set: updates });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Story not found in this project" });
    }
    res.json({ message: "Story updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/projects/:projectId/stories/:storyId", async (req, res) => {
  const rawProjectId = req.params.projectId;
  const rawStoryId = req.params.storyId;

  if (typeof rawProjectId !== "string" || !ObjectId.isValid(rawProjectId)) {
    return res.status(400).json({ message: "Invalid project identifier." });
  }
  if (typeof rawStoryId !== "string" || !ObjectId.isValid(rawStoryId)) {
    return res.status(400).json({ message: "Invalid story identifier." });
  }

  const projectId = new ObjectId(rawProjectId);
  const storyId = new ObjectId(rawStoryId);

  try {
    const result = await UserStory.deleteOne({ _id: storyId, project_id: projectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Story not found in this project" });
    }
    res.json({ message: "Story deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(9000, () => {
    console.log(`Server Started at 9000`);
})

/*
Successful GET	200
Project or membership created	201
Missing or invalid input	400
Project or user not found	404
Duplicate membership	409
Database/server problem	500
*/