document.addEventListener("DOMContentLoaded", () => {
  const majorSelect = document.getElementById("majorSelect");
  const minorSelect = document.getElementById("minorSelect");
  const plannerGrid = document.getElementById("plannerGrid");

  let courses = [];
  let presetPlans = [];
  let currentPlan = [];

  // ==== CONFIG: Minor course lists ====
  const minors = {
    "AI": ["COMP517", "COMP613", "COMP615", "COMP717"],
    "Cybersecurity": ["COMP730", "COMP731", "COMP732", "COMP733"]
  };

  // ======= Populate minor dropdown =======
  Object.keys(minors).forEach(minorName => {
    const opt = document.createElement("option");
    opt.value = minorName;
    opt.textContent = minorName;
    minorSelect.appendChild(opt);
  });

  // ======= Helper: Check prerequisites =======
  function hasMetPrerequisites(course, completedCourses) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;
    return course.prerequisites.some(prereqGroup => {
      if (Array.isArray(prereqGroup)) {
        return prereqGroup.every(prereq => completedCourses.includes(prereq));
      }
      return completedCourses.includes(prereqGroup);
    });
  }

  // ======= Helper: Add minor courses after major plan =======
  function addMinorCoursesToPlan(plan, minorCourses, allCourses) {
    let completedCourses = plan.flat().filter(c => c && c !== "FLEX" && c !== "");
    for (const minorCode of minorCourses) {
      const minorCourse = allCourses.find(c => c.code === minorCode);
      if (!minorCourse) continue;
      let placed = false;
      for (let semIndex = 2; semIndex < plan.length; semIndex++) { // Start from year 2
        const semester = plan[semIndex];
        const emptyIndex = semester.findIndex(c => !c || c === "FLEX" || c === "");
        if (emptyIndex !== -1 && hasMetPrerequisites(minorCourse, completedCourses)) {
          semester[emptyIndex] = minorCode;
          completedCourses.push(minorCode);
          placed = true;
          break;
        }
      }
      if (!placed) console.warn(`No valid slot found for ${minorCode}`);
    }
    return plan;
  }

  // ======= Load courses =======
  fetch("/api/courses")
    .then(res => res.json())
    .then(data => {
      courses = data;
      const orMathCourses = ["COMP616", "STAT603", "COMP613"];
      courses.forEach(course => {
        if (orMathCourses.includes(course.code)) {
          course.prerequisites = [["MATH502"], ["MATH503"]];
        }
      });
      const majorMap = {
        "DiS": "Digital Services",
        "NC": "Networks and Cybersecurity",
        "SD": "Software Development",
        "DaS": "Data Science",
        "CS": "Computer Science"
      };
      const majorsSet = new Set();
      courses.forEach(course => {
        if (Array.isArray(course.major)) {
          course.major.forEach(m => majorsSet.add(m.trim()));
        }
      });
      majorSelect.innerHTML = `<option value="">-- Select Major --</option>`;
      majorsSet.forEach(major => {
        const option = document.createElement("option");
        option.value = major;
        option.textContent = majorMap[major] || major;
        majorSelect.appendChild(option);
      });
    });

  // ======= Load preset plans =======
  fetch("/api/preset-plans")
    .then(res => res.json())
    .then(data => presetPlans = data);

  // ======= Generate plan =======
  document.getElementById("majorForm").addEventListener("submit", e => {
    e.preventDefault();
    const selectedMajor = majorSelect.value.trim();
    plannerGrid.innerHTML = '';
    if (!selectedMajor) {
      plannerGrid.innerHTML = "<p>Please select a major.</p>";
      return;
    }
    const matchingPlan = presetPlans.find(plan => plan.major === selectedMajor);
    if (matchingPlan) {
      currentPlan = JSON.parse(JSON.stringify(matchingPlan.plan));
    } else {
      currentPlan = autoGeneratePlan(selectedMajor);
    }
    renderPlan(currentPlan);
  });

  // ======= Helper: Check if minor already added =======
  function isMinorAlreadyAdded(plan, minorCourses) {
    const allCourses = plan.flat();
    return minorCourses.every(code => allCourses.includes(code));
  }

  // ======= Update minorForm submit =======
  document.getElementById("minorForm").addEventListener("submit", e => {
    e.preventDefault();
    const selectedMinor = minorSelect.value.trim();
    if (!selectedMinor) return;

    const minorCourses = minors[selectedMinor];
    if (isMinorAlreadyAdded(currentPlan, minorCourses)) {
      document.getElementById("status").textContent = `${selectedMinor} minor is already added.`;
      return;
    }

    currentPlan = addMinorCoursesToPlan(currentPlan, minorCourses, courses);
    renderPlan(currentPlan);
    document.getElementById("status").textContent = `${selectedMinor} minor added successfully.`;
  });

  // ======= Auto-generate major plan =======
  function autoGeneratePlan(selectedMajor) {
    const coreCourses = courses.filter(c => c.core && !["COMP702", "COMP703"].includes(c.code));
    const majorCourses = courses.filter(c => Array.isArray(c.major) && c.major.includes(selectedMajor));
    const rndCourses = courses.filter(c => ["COMP702", "COMP703"].includes(c.code));
    const combinedCourses = [...coreCourses, ...majorCourses];
    let completedCourses = [], plannedCourses = [], generatedPlan = [];
    for (let sem = 0; sem < 5; sem++) {
      const semesterCourses = [];
      for (const course of combinedCourses) {
        if (semesterCourses.length >= 4) break;
        if (plannedCourses.some(c => c.code === course.code)) continue;
        if (hasMetPrerequisites(course, completedCourses)) {
          semesterCourses.push(course);
          plannedCourses.push(course);
        }
      }
      completedCourses.push(...semesterCourses.map(c => c.code));
      generatedPlan.push(semesterCourses.map(c => c.code));
    }
    const finalSemesterCourses = [...rndCourses];
    const leftoverCourses = combinedCourses.filter(c =>
      !plannedCourses.some(pc => pc.code === c.code) &&
      hasMetPrerequisites(c, completedCourses)
    );
    for (const course of leftoverCourses) {
      if (finalSemesterCourses.length >= 4) break;
      finalSemesterCourses.push(course);
    }
    generatedPlan.push(finalSemesterCourses.map(c => c.code));
    return generatedPlan;
  }

  // ======= Render plan =======
  function renderPlan(plan) {
    plannerGrid.innerHTML = "";
    plan.forEach((semester, idx) => {
      const semesterDiv = document.createElement("div");
      semesterDiv.className = "semester";
      semesterDiv.innerHTML = `<h3>Semester ${idx + 1}</h3>`;
      semester.forEach(code => {
        const course = courses.find(c => c.code === code);
        const courseDiv = document.createElement("div");
        courseDiv.className = "course";
        if (course) {
          courseDiv.innerHTML = `<strong>${course.code}</strong><br>${course.name}`;
        } else if (code) {
          courseDiv.innerHTML = `<strong>${code}</strong><br><em>Custom or Flex Course</em>`;
        }
        semesterDiv.appendChild(courseDiv);
      });
      plannerGrid.appendChild(semesterDiv);
    });
  }
});
