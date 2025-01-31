// Required dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const multer = require('multer');
const path = require('path');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Schema Definitions
const ProjectSchema = new mongoose.Schema({
  id: Number,
  title: {
    type: String,
    required: true,
    trim: true,
  },
  client: {
    type: Object,
  },
  category: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  description: String,
  technologies: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

  // Update the Feedback schema to include approved status
  const FeedbackSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },  
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    approved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

const HireMeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  company: String,
  projectType: {
    type: String,
    required: true,
  },
  projectDescription: {
    type: String,
    required: true,
  },
  budget: Number,
  timeframe: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Models
const Project = mongoose.model("Project", ProjectSchema);
const Feedback = mongoose.model("Feedback", FeedbackSchema);
const HireMe = mongoose.model("HireMe", HireMeSchema);

// Validation Middleware
const validateProject = [
  body("title").notEmpty().trim().escape(),
  body("category").notEmpty().trim().escape(),
  body("client").optional().isObject(),
  body("img").notEmpty(),
  body("description").optional().trim().escape(),
  body("technologies").optional().isArray(),
];

const validateFeedback = [
  body("name").notEmpty().trim().escape(),
  body("role").notEmpty().trim().escape(),
  body("company").notEmpty().trim().escape(),
  body("email").isEmail().normalizeEmail(),
  body("subject").notEmpty().trim().escape(),
  body("message").notEmpty().trim().escape(),
];

const validateHireMe = [
  body("name").notEmpty().trim().escape(),
  body("email").isEmail().normalizeEmail(),
  body("company").optional().trim().escape(),
  body("projectType").notEmpty().trim().escape(),
  body("projectDescription").notEmpty().trim().escape(),
  body("budget").optional().isNumeric(),
  body("timeframe").optional().trim().escape(),
];

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
};

// Project Routes
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Add these imports at the top with other dependencies
// const multer = require('multer');
// const path = require('path');

// Add this storage configuration after the middleware section
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/projects')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Modify the POST /api/projects route to use multer
app.post("/api/projects", upload.single('img'), validateProject, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const lastProject = await Project.findOne().sort({ id: -1 });
    const newId = lastProject ? lastProject.id + 1 : 1;

    const project = new Project({
      ...req.body,
      id: newId,
      img: `/uploads/projects/${req.file.filename}`, // Save the file path
      updatedAt: new Date(),
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// Add this after your middleware section to serve uploaded files
app.use('/uploads', express.static('uploads'));


app.put("/api/projects/:id", validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// Feedback Routes
app.post("/api/feedback", validateFeedback, async (req, res) => {
  try {
    const errors = validationResult(req);
    // console.log(errors.array());
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    next(err);
  }
});

// Hire Me Routes
app.post("/api/hire-me", validateHireMe, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hireRequest = new HireMe(req.body);
    await hireRequest.save();
    res.status(201).json(hireRequest);
  } catch (err) {
    next(err);
  }
});

app.get("/api/hire-me", async (req, res) => {
  try {
    const hireRequests = await HireMe.find().sort({ createdAt: -1 });
    res.json(hireRequests);
  } catch (err) {
    next(err);
  }
});

app.put("/api/feedback/:id/approve", async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/feedback/:id/delete", async (req, res) => {
    try {
      const feedback = await Feedback.deleteOne({ _id: req.params.id });
  
      if (!feedback.acknowledged) {
        return res.status(404).json({ message: "Feedback not found" });
      }
  
      res.json(feedback);
    } catch (err) {
      next(err);
    }
  });

// Apply error handler middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://larry:34oXtIh9IvaOFFEo@cluster0.qf2cx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("Connected to MongoDB");

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
};

startServer();
