document.addEventListener("DOMContentLoaded", () => {
  const majorSelect = document.getElementById("majorSelect");
  const plannerGrid = document.getElementById("plannerGrid");
  let courses = [];

  // Helper to check if prerequisites are met, supporting OR logic via arrays
  function hasMetPrerequisites(course, completedCourses) {
  if (!course.prerequisites || course.prerequisites.length === 0) return true;

  // course.prerequisites is an array of prerequisite options (OR between them)
  // each prerequisite option can be a string (single) or array (AND group)

  // Return true if any of the prerequisite options is satisfied
  return course.prerequisites.some(prereqOption => {
    if (Array.isArray(prereqOption)) {
      // All prereqs in this option must be satisfied (AND)
      return prereqOption.every(prereq => completedCourses.includes(prereq));
    } else {
      // Single prereq string must be satisfied
      return completedCourses.includes(prereqOption);
    }
  });
}


  fetch("courses.json")
    .then(res => res.json())
    .then(data => {
      courses = data;

      const majorMap = {
        "DiS": "Digital Services",
        "NC": "Networks and Cybersecurity",
        "SD": "Software Development",
        "DaS": "Data Science",
        "CS": "Computer Science"
      };

      // Patch specific courses that require MATH502 or MATH503 as prerequisites
      const orMathCourses = ["COMP616", "STAT603", "COMP613"];
      courses.forEach(course => {
        if (orMathCourses.includes(course.code)) {
          course.prerequisites = [["MATH502", "MATH503"]];
        }
      });

      // Populate major dropdown with unique major codes and their friendly names
      const majors = new Set();
      courses.forEach(course => {
        if (Array.isArray(course.major)) {
          course.major.forEach(m => majors.add(m.trim()));
        }
      });

      // Clear any existing options except the placeholder
      majorSelect.innerHTML = `<option value="">-- Select Major --</option>`;
      majors.forEach(major => {
        const option = document.createElement("option");
        option.value = major;
        option.textContent = majorMap[major] || major;
        majorSelect.appendChild(option);
      });

      // Form submission handler
      document.getElementById("majorForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const selectedMajor = majorSelect.value.trim();
        plannerGrid.innerHTML = '';

        if (!selectedMajor) {
          plannerGrid.innerHTML = "<p>Please select a major.</p>";
          return;
        }

        // Filter core courses (exclude R&D projects)
        const coreCourses = courses.filter(c => c.core && c.code !== "COMP702" && c.code !== "COMP703");

        // Filter major-specific courses based on selected major
        const majorCourses = courses.filter(c =>
          Array.isArray(c.major) &&
          c.major.some(m => m.trim() === selectedMajor)
        );

        // R&D courses to be placed in the final semester
        const rndCourses = courses.filter(c => c.code === "COMP702" || c.code === "COMP703");

        // Combine core and major courses (excluding R&D)
        const combinedCourses = [...coreCourses, ...majorCourses];

        let completedCourses = [];
        let planCourses = [];

        // Schedule 5 semesters, 4 courses each
        for (let sem = 0; sem < 5; sem++) {
          const semesterCourses = [];

          for (const course of combinedCourses) {
            if (
              semesterCourses.length < 4 &&
              !planCourses.includes(course) &&
              hasMetPrerequisites(course, completedCourses)
            ) {
              semesterCourses.push(course);
              planCourses.push(course);
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

        // Final semester: R&D courses + leftover courses that can be taken now (max 4 courses)
        const finalSemesterCourses = [...rndCourses];

        // Add leftover courses that meet prereqs and not already planned
        const leftoverCourses = combinedCourses.filter(c =>
          !planCourses.includes(c) && hasMetPrerequisites(c, completedCourses)
        );

        for (const course of leftoverCourses) {
          if (finalSemesterCourses.length >= 4) break;
          finalSemesterCourses.push(course);
          planCourses.push(course);
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
    })
    .catch(err => {
      console.error("Error loading courses.json:", err);
    });
});
