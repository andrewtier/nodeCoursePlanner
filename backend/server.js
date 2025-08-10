const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());

app.get("/api/courses", (req, res) => {
  const filePath = path.join(__dirname, "data", "courses.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading courses.json:", err);
      return res.status(500).json({ error: "Could not read courses.json" });
    }
    try {
      const courses = JSON.parse(data);
      res.json(courses);
    } catch (parseErr) {
      console.error("Error parsing courses.json:", parseErr);
      res.status(500).json({ error: "Invalid JSON format in courses.json" });
    }
  });
});

app.get("/api/preset-plans", (req, res) => {
  const filePath = path.join(__dirname, "data", "presetPlans.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading presetPlans.json:", err);
      return res.status(500).json({ error: "Could not read presetPlans.json" });
    }
    try {
      const plans = JSON.parse(data);
      res.json(plans);
    } catch (parseErr) {
      console.error("Error parsing presetPlans.json:", parseErr);
      res.status(500).json({ error: "Invalid JSON format in presetPlans.json" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
