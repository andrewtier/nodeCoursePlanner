document.addEventListener("DOMContentLoaded", () => {
  const majorSelect = document.getElementById("majorSelect");
  const minorSelect1 = document.getElementById("minorSelect1");
  const minorSelect2 = document.getElementById("minorSelect2");
  const plannerGrid = document.getElementById("plannerGrid");

  let courses = [];
  let presetPlans = [];
  let currentPlan = [];

  // ======= CONFIG: Minor course lists =======
  const minors = {
    "AI": ["COMP517", "COMP613", "COMP615", "COMP717"],
    "Cybersecurity": ["COMP504", "COMP607", "COMP609", "COMP714"],
    "Software Development": ["COMP503", "COMP601", "COMP611", "COMP713"]
  };

  // ======= Populate minor dropdowns =======
  Object.keys(minors).forEach(minorName => {
    [minorSelect1, minorSelect2].forEach(select => {
      const opt = document.createElement("option");
      opt.value = minorName;
      opt.textContent = minorName;
      select.appendChild(opt);
    });
  });

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

  // ======= Helpers =======
  function hasMetPrerequisites(course, completedCourses) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;
    return course.prerequisites.some(group => Array.isArray(group)
      ? group.every(prereq => completedCourses.includes(prereq))
      : completedCourses.includes(group)
    );
  }

  function addMinorCoursesToPlan(plan, minorCourses) {
    const completedCourses = plan.flat().filter(c => c && c !== "FLEX" && c !== "");

    minorCourses.forEach(minorCode => {
      const course = courses.find(c => c.code === minorCode);
      if (!course) return;

      let placed = false;
      for (let i = 1; i < plan.length; i++) { // start from semester 2
        const semester = plan[i];
        const emptyIndex = semester.findIndex(c => !c || c === "FLEX" || c === "");
        if (emptyIndex !== -1 && hasMetPrerequisites(course, completedCourses)) {
          semester[emptyIndex] = minorCode;
          completedCourses.push(minorCode);
          placed = true;
          break;
        }
      }
      if (!placed) console.warn(`No valid slot found for ${minorCode}`);
    });

    return plan;
  }

  function isMinorAlreadyAdded(plan, minorCourses) {
    const allCourses = plan.flat();
    return minorCourses.every(code => allCourses.includes(code));
  }

  function autoGeneratePlan(selectedMajor) {
    const coreCourses = courses.filter(c => c.core && !["COMP702", "COMP703"].includes(c.code));
    const majorCourses = courses.filter(c => Array.isArray(c.major) && c.major.includes(selectedMajor));
    const rndCourses = courses.filter(c => ["COMP702", "COMP703"].includes(c.code));
    const combinedCourses = [...coreCourses, ...majorCourses];

    let completed = [], planned = [], generatedPlan = [];

    for (let sem = 0; sem < 5; sem++) {
      const semester = [];
      for (const c of combinedCourses) {
        if (semester.length >= 4) break;
        if (planned.some(pc => pc.code === c.code)) continue;
        if (hasMetPrerequisites(c, completed)) {
          semester.push(c);
          planned.push(c);
        }
      }
      completed.push(...semester.map(c => c.code));
      generatedPlan.push(semester.map(c => c.code));
    }

    const finalSemester = [...rndCourses];
    const leftover = combinedCourses.filter(c =>
      !planned.some(pc => pc.code === c.code) && hasMetPrerequisites(c, completed)
    );
    for (const c of leftover) {
      if (finalSemester.length >= 4) break;
      finalSemester.push(c);
    }
    generatedPlan.push(finalSemester.map(c => c.code));
    return generatedPlan;
  }

  function updateCounters(plan) {
    const allCourses = plan.flat().filter(c => c && c !== "FLEX" && c !== "");
    const selectedMajor = majorSelect.value.trim();
    const selectedMinor1 = minorSelect1.value.trim();
    const selectedMinor2 = minorSelect2.value.trim();

    const majorCourses = allCourses.filter(code => {
      const c = courses.find(x => x.code === code);
      return c && c.major && c.major.includes(selectedMajor);
    });

    const minor1Courses = selectedMinor1 ? allCourses.filter(code => minors[selectedMinor1].includes(code)) : [];
    const minor2Courses = selectedMinor2 ? allCourses.filter(code => minors[selectedMinor2].includes(code)) : [];

    document.getElementById("majorCounter").textContent =
      `Major: ${majorCourses.length} courses (${majorCourses.length * 15} points)`;
    document.getElementById("minorCounter1").textContent =
      `Minor 1: ${minor1Courses.length} courses (${minor1Courses.length * 15} points)`;
    document.getElementById("minorCounter2").textContent =
      `Minor 2: ${minor2Courses.length} courses (${minor2Courses.length * 15} points)`;
  }

  function renderPlan(plan) {
    plannerGrid.innerHTML = "";
    plan.forEach((semester, idx) => {
      const semDiv = document.createElement("div");
      semDiv.className = "semester";
      semDiv.innerHTML = `<h3>Semester ${idx + 1}</h3>`;
      semester.forEach(code => {
        const c = courses.find(x => x.code === code);
        const courseDiv = document.createElement("div");
        courseDiv.className = "course";
        courseDiv.innerHTML = c
          ? `<strong>${c.code}</strong><br>${c.name}`
          : `<strong>${code}</strong><br><em>Custom/Flex</em>`;
        semDiv.appendChild(courseDiv);
      });
      plannerGrid.appendChild(semDiv);
    });
    updateCounters(plan);
  }

  // ======= Generate major plan =======
  document.getElementById("majorForm").addEventListener("submit", e => {
    e.preventDefault();
    const selectedMajor = majorSelect.value.trim();
    if (!selectedMajor) return;

    const matching = presetPlans.find(plan => plan.major === selectedMajor);
    currentPlan = matching ? JSON.parse(JSON.stringify(matching.plan)) : autoGeneratePlan(selectedMajor);
    renderPlan(currentPlan);
  });

  // ======= Minor 1 =======
  document.getElementById("minorForm1").addEventListener("submit", e => {
    e.preventDefault();
    const selectedMinor = minorSelect1.value.trim();
    const selectedMajor = majorSelect.value.trim();
    if (!selectedMinor) return;
    if (selectedMajor === "SD" && selectedMinor === "Software Development") {
      document.getElementById("status").textContent =
        `Cannot add ${selectedMinor} as a minor because it is your major.`;
      return;
    }

    const minorCourses = minors[selectedMinor];
    if (isMinorAlreadyAdded(currentPlan, minorCourses)) {
      document.getElementById("status").textContent = `${selectedMinor} minor is already added.`;
      return;
    }

    currentPlan = addMinorCoursesToPlan(currentPlan, minorCourses);
    renderPlan(currentPlan);
    document.getElementById("status").textContent = `${selectedMinor} minor added successfully.`;
  });

  // ======= Minor 2 =======
  document.getElementById("minorForm2").addEventListener("submit", e => {
    e.preventDefault();
    const selectedMinor = minorSelect2.value.trim();
    const selectedMajor = majorSelect.value.trim();
    if (!selectedMinor) return;
    if (selectedMajor === "SD" && selectedMinor === "Software Development") {
      document.getElementById("status").textContent =
        `Cannot add ${selectedMinor} as a minor because it is your major.`;
      return;
    }

    const minorCourses = minors[selectedMinor];
    if (isMinorAlreadyAdded(currentPlan, minorCourses)) {
      document.getElementById("status").textContent = `${selectedMinor} minor is already added.`;
      return;
    }

    currentPlan = addMinorCoursesToPlan(currentPlan, minorCourses);
    renderPlan(currentPlan);
    document.getElementById("status").textContent = `${selectedMinor} minor added successfully.`;
  });
});
