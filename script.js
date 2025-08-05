document.addEventListener("DOMContentLoaded", () => {
  const majorSelect = document.getElementById("majorSelect");
  const plannerGrid = document.getElementById("plannerGrid");
  let courses = [];
  let presetPlans = [];

  // Helper: Check if prerequisites are met
  function hasMetPrerequisites(course, completedCourses) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;

    return course.prerequisites.some(prereqOption => {
      if (Array.isArray(prereqOption)) {
        return prereqOption.every(prereq => completedCourses.includes(prereq));
      } else {
        return completedCourses.includes(prereqOption);
      }
    });
  }

  // Fetch courses.json
  fetch("courses.json")
    .then(res => res.json())
    .then(data => {
      courses = data;

      // Fix specific OR prerequisites
      const orMathCourses = ["COMP616", "STAT603", "COMP613"];
      courses.forEach(course => {
        if (orMathCourses.includes(course.code)) {
          course.prerequisites = [["MATH502", "MATH503"]];
        }
      });

      const majorMap = {
        "DiS": "Digital Services",
        "NC": "Networks and Cybersecurity",
        "SD": "Software Development",
        "DaS": "Data Science",
        "CS": "Computer Science"
      };

      const majors = new Set();
      courses.forEach(course => {
        if (Array.isArray(course.major)) {
          course.major.forEach(m => majors.add(m.trim()));
        }
      });

      majorSelect.innerHTML = `<option value="">-- Select Major --</option>`;
      majors.forEach(major => {
        const option = document.createElement("option");
        option.value = major;
        option.textContent = majorMap[major] || major;
        majorSelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Error loading courses.json:", err);
    });

  // Fetch presetPlans.json
  fetch("presetPlans.json")
    .then(res => res.json())
    .then(data => {
      presetPlans = data;
    })
    .catch(err => {
      console.error("Error loading presetPlans.json:", err);
    });

  // Form submission
  document.getElementById("majorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const selectedMajor = majorSelect.value.trim();
    plannerGrid.innerHTML = '';

    if (!selectedMajor) {
      plannerGrid.innerHTML = "<p>Please select a major.</p>";
      return;
    }

    const matchingPlan = presetPlans.find(plan => plan.major === selectedMajor);

    if (matchingPlan) {
      // Use preset plan
      matchingPlan.plan.forEach((semester, index) => {
        const semesterDiv = document.createElement("div");
        semesterDiv.className = "semester";
        semesterDiv.innerHTML = `<h3>Semester ${index + 1}</h3>`;

        semester.forEach(entry => {
          let courseCode;
          if (Array.isArray(entry)) {
            courseCode = entry.find(code => courses.some(c => c.code === code));
          } else {
            courseCode = entry;
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

      return; // Stop here if using preset
    }

    // Fallback: Auto-generate plan
    const coreCourses = courses.filter(c => c.core && c.code !== "COMP702" && c.code !== "COMP703");

    const majorCourses = courses.filter(c =>
      Array.isArray(c.major) &&
      c.major.some(m => m.trim() === selectedMajor)
    );

    const rndCourses = courses.filter(c => c.code === "COMP702" || c.code === "COMP703");

    const combinedCourses = [...coreCourses, ...majorCourses];

    let completedCourses = [];
    let planCourses = [];

    // Semesters 1–5
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

    // Semester 6: R&D + leftovers
    const finalSemesterCourses = [...rndCourses];
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
});
