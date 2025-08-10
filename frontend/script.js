document.addEventListener("DOMContentLoaded", () => {
  const majorSelect = document.getElementById("majorSelect");
  const plannerGrid = document.getElementById("plannerGrid");
  let courses = [];
  let presetPlans = [];

  // Check if prerequisites are met for a course given completed courses
  function hasMetPrerequisites(course, completedCourses) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;

    // course.prerequisites can be a list of OR groups or single prereqs
    // If any one group of prereqs is satisfied, return true
    return course.prerequisites.some(prereqGroup => {
      if (Array.isArray(prereqGroup)) {
        // AND inside OR group: all must be completed
        return prereqGroup.every(prereq => completedCourses.includes(prereq));
      } else {
        // Single prereq (string)
        return completedCourses.includes(prereqGroup);
      }
    });
  }

  // Load courses JSON
  fetch("/api/courses")
    .then(res => res.json())
    .then(data => {
      courses = data;

      // Fix OR prerequisites for math-related courses
      const orMathCourses = ["COMP616", "STAT603", "COMP613"];
      courses.forEach(course => {
        if (orMathCourses.includes(course.code)) {
          course.prerequisites = [["MATH502", "MATH503"]];
        }
      });

      // Map major codes to full names
      const majorMap = {
        "DiS": "Digital Services",
        "NC": "Networks and Cybersecurity",
        "SD": "Software Development",
        "DaS": "Data Science",
        "CS": "Computer Science"
      };

      // Collect unique majors from courses
      const majorsSet = new Set();
      courses.forEach(course => {
        if (Array.isArray(course.major)) {
          course.major.forEach(m => majorsSet.add(m.trim()));
        }
      });

      // Populate major select dropdown
      majorSelect.innerHTML = `<option value="">-- Select Major --</option>`;
      majorsSet.forEach(major => {
        const option = document.createElement("option");
        option.value = major;
        option.textContent = majorMap[major] || major;
        majorSelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Error loading courses.json:", err);
      plannerGrid.innerHTML = `<p style="color:red;">Failed to load courses data.</p>`;
    });

  // Load preset plans JSON
  fetch("/api/preset-plans")
    .then(res => res.json())
    .then(data => {
      presetPlans = data;
    })
    .catch(err => {
      console.error("Error loading presetPlans.json:", err);
      plannerGrid.innerHTML = `<p style="color:red;">Failed to load preset plans data.</p>`;
    });

  // Handle form submission to generate plan
  document.getElementById("majorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const selectedMajor = majorSelect.value.trim();
    plannerGrid.innerHTML = '';

    if (!selectedMajor) {
      plannerGrid.innerHTML = "<p>Please select a major.</p>";
      return;
    }

    // Find preset plan for the selected major
    const matchingPlan = presetPlans.find(plan => plan.major === selectedMajor);

    if (matchingPlan) {
      // Render preset plan semesters and courses
      matchingPlan.plan.forEach((semester, idx) => {
        const semesterDiv = document.createElement("div");
        semesterDiv.className = "semester";
        semesterDiv.innerHTML = `<h3>Semester ${idx + 1}</h3>`;

        semester.forEach(courseEntry => {
          let courseCode;

          // courseEntry might be an array (OR courses), pick first valid one
          if (Array.isArray(courseEntry)) {
            courseCode = courseEntry.find(code => courses.some(c => c.code === code));
          } else {
            courseCode = courseEntry;
          }

          const course = courses.find(c => c.code === courseCode);

          const courseDiv = document.createElement("div");
          courseDiv.className = "course";

          if (course) {
            courseDiv.innerHTML = `<strong>${course.code}</strong><br>${course.name}`;
          } else {
            courseDiv.innerHTML = `<strong>${courseCode}</strong><br><em>Custom or Flex Course</em>`;
          }

          semesterDiv.appendChild(courseDiv);
        });

        plannerGrid.appendChild(semesterDiv);
      });

      return; // done
    }

    // If no preset plan, auto-generate plan based on prerequisites

    // Filter core courses (exclude R&D comps)
    const coreCourses = courses.filter(c => c.core && c.code !== "COMP702" && c.code !== "COMP703");

    // Filter major courses
    const majorCourses = courses.filter(c =>
      Array.isArray(c.major) && c.major.some(m => m.trim() === selectedMajor)
    );

    // R&D courses for final semester
    const rndCourses = courses.filter(c => c.code === "COMP702" || c.code === "COMP703");

    const combinedCourses = [...coreCourses, ...majorCourses];

    let completedCourses = [];
    let plannedCourses = [];

    // Semesters 1 to 5: pick courses with met prereqs, max 4 per semester
    for (let sem = 0; sem < 5; sem++) {
      const semesterCourses = [];

      for (const course of combinedCourses) {
        if (
          semesterCourses.length >= 4 ||
          plannedCourses.includes(course)
        ) continue;

        if (hasMetPrerequisites(course, completedCourses)) {
          semesterCourses.push(course);
          plannedCourses.push(course);
        }
      }

      completedCourses.push(...semesterCourses.map(c => c.code));

      const semesterDiv = document.createElement("div");
      semesterDiv.className = "semester";
      semesterDiv.innerHTML = `<h3>Semester ${sem + 1}</h3>`;

      semesterCourses.forEach(course => {
        const courseDiv = document.createElement("div");
        courseDiv.className = "course";
        courseDiv.innerHTML = `<strong>${course.code}</strong><br>${course.name}`;
        semesterDiv.appendChild(courseDiv);
      });

      plannerGrid.appendChild(semesterDiv);
    }

    // Semester 6: Add R&D courses + leftovers with met prereqs, max 4 courses
    const finalSemesterCourses = [...rndCourses];
    const leftoverCourses = combinedCourses.filter(c =>
      !plannedCourses.includes(c) && hasMetPrerequisites(c, completedCourses)
    );

    for (const course of leftoverCourses) {
      if (finalSemesterCourses.length >= 4) break;
      finalSemesterCourses.push(course);
      plannedCourses.push(course);
    }

    const semesterDiv = document.createElement("div");
    semesterDiv.className = "semester";
    semesterDiv.innerHTML = `<h3>Semester 6</h3>`;

    finalSemesterCourses.forEach(course => {
      const courseDiv = document.createElement("div");
      courseDiv.className = "course";
      courseDiv.innerHTML = `<strong>${course.code}</strong><br>${course.name}`;
      semesterDiv.appendChild(courseDiv);
    });

    plannerGrid.appendChild(semesterDiv);
  });
});
