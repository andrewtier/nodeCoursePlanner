const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Serve static frontend files from 'frontend' folder
app.use(express.static(path.join(__dirname, "frontend")));

// API endpoint: get courses.json data
app.get("/api/courses", (req, res) => {
  const filePath = path.join(__dirname, "backend", "data", "courses.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Could not read courses.json" });
    }
    res.json(JSON.parse(data));
  });
});

// API endpoint: get presetPlans.json data
app.get("/api/preset-plans", (req, res) => {
  const filePath = path.join(__dirname, "backend", "data", "presetPlans.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Could not read presetPlans.json" });
    }
    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
