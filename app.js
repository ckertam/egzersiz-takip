// Egzersiz Takip — bağımsız, sunucusuz (localStorage) GitHub Pages uygulaması

const STORAGE_KEY = "egzersizTakip.v1";
const GOAL_WEIGHT = 70;
const START_WEIGHT = 85;

const PLAN = [
  {
    day: "Pazartesi",
    focus: "Üst Vücut — İtiş",
    detail: "Chest press, shoulder press, triceps pushdown, plank 3x30sn · 15-20dk yüzme · sauna",
  },
  {
    day: "Salı",
    focus: "Alt Vücut",
    detail: "Goblet squat, leg press, leg curl, calf raise, plank 3x30sn · 15-20dk yüzme · sauna",
  },
  {
    day: "Çarşamba",
    focus: "Üst Vücut — Çekiş",
    detail: "Lat pulldown, seated row, biceps curl, face pull, plank 3x30sn · 15-20dk yüzme · sauna",
  },
  {
    day: "Perşembe",
    focus: "Aktif Toparlanma",
    detail: "Ağırlık yok — sadece 20-30dk hafif yüzme + sauna",
  },
  {
    day: "Cuma",
    focus: "Full Body",
    detail: "Goblet squat, chest press, lat pulldown, seated row, plank 3x30sn · 15-20dk yüzme · sauna",
  },
  {
    day: "Cumartesi / Pazar",
    focus: "Dinlenme",
    detail: "İstersen serbest hafif yüzme, ağır antrenman yok",
  },
];

function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // düşük ihtimal: bozuk veri, sıfırdan başla
    }
  }
  return {
    weightLogs: [{ date: todayISO(), loggedAt: new Date().toISOString(), weight: START_WEIGHT }],
    workoutLogs: [
      {
        date: todayISO(),
        exercises: [
          { name: "Goblet squat", weight: "7.5", sets: 3, reps: 12 },
          { name: "Lat pulldown", weight: "25", sets: 3, reps: 12 },
          { name: "Chest press", weight: "5", sets: 3, reps: 12 },
          { name: "Seated row", weight: "20", sets: 3, reps: 12 },
          { name: "Plank", weight: "-", sets: 3, reps: "30sn" },
        ],
        swimMin: 15,
        saunaMin: 10,
        note: "",
      },
    ],
  };
}

const state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- DOM refs ---
const tabs = document.getElementById("tabs");
const panels = {
  plan: document.getElementById("panel-plan"),
  log: document.getElementById("panel-log"),
  weight: document.getElementById("panel-weight"),
};
const planList = document.getElementById("planList");
const exerciseRows = document.getElementById("exerciseRows");
const addExerciseBtn = document.getElementById("addExerciseBtn");
const workoutForm = document.getElementById("workoutForm");
const workoutHistory = document.getElementById("workoutHistory");
const weightForm = document.getElementById("weightForm");
const weightHistory = document.getElementById("weightHistory");
const weightChart = document.getElementById("weightChart");
const progressFill = document.getElementById("progressFill");
const progressCurrentLabel = document.getElementById("progressCurrentLabel");
const progressRemainingLabel = document.getElementById("progressRemainingLabel");

// --- tabs ---
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  [...tabs.children].forEach((b) => b.classList.toggle("active", b === btn));
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== btn.dataset.tab);
  });
});

// --- plan render ---
function renderPlan() {
  planList.innerHTML = "";
  PLAN.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="plan-day">${sanitize(item.day)}</span>
      <span class="plan-focus">${sanitize(item.focus)}</span>
      <p class="plan-detail">${sanitize(item.detail)}</p>
    `;
    planList.appendChild(li);
  });
}

// --- exercise row builder ---
function addExerciseRow(prefill) {
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <input type="text" placeholder="Egzersiz" class="ex-name" value="${sanitize(prefill?.name ?? "")}" />
    <input type="text" placeholder="kg" class="ex-weight" value="${sanitize(prefill?.weight ?? "")}" />
    <input type="number" placeholder="set" class="ex-sets" value="${sanitize(prefill?.sets ?? "")}" />
    <input type="text" placeholder="tekrar" class="ex-reps" value="${sanitize(prefill?.reps ?? "")}" />
    <button type="button" aria-label="Sil">✕</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  exerciseRows.appendChild(row);
}

addExerciseBtn.addEventListener("click", () => addExerciseRow());

// --- workout form ---
workoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rows = [...exerciseRows.querySelectorAll(".exercise-row")];
  const exercises = rows
    .map((row) => ({
      name: row.querySelector(".ex-name").value.trim(),
      weight: row.querySelector(".ex-weight").value.trim(),
      sets: row.querySelector(".ex-sets").value.trim(),
      reps: row.querySelector(".ex-reps").value.trim(),
    }))
    .filter((ex) => ex.name);

  if (exercises.length === 0) return;

  state.workoutLogs.unshift({
    date: todayISO(),
    exercises,
    swimMin: Number(document.getElementById("swimMin").value) || 0,
    saunaMin: Number(document.getElementById("saunaMin").value) || 0,
    note: document.getElementById("workoutNote").value.trim(),
  });
  saveState();
  workoutForm.reset();
  exerciseRows.innerHTML = "";
  addExerciseRow();
  renderWorkoutHistory();
});

// --- weight form ---
weightForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = parseFloat(document.getElementById("weightInput").value);
  if (Number.isNaN(value)) return;
  state.weightLogs.unshift({ date: todayISO(), loggedAt: new Date().toISOString(), weight: value });
  saveState();
  weightForm.reset();
  renderWeight();
});

// --- render: workout history ---
function renderWorkoutHistory() {
  workoutHistory.innerHTML = "";
  if (state.workoutLogs.length === 0) {
    workoutHistory.innerHTML = `<p class="empty-state">Henüz antrenman kaydı yok.</p>`;
    return;
  }
  state.workoutLogs.forEach((log) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const exList = log.exercises
      .map((ex) => `<li>${sanitize(ex.name)} — ${sanitize(ex.weight)}kg × ${sanitize(ex.sets)}×${sanitize(ex.reps)}</li>`)
      .join("");
    const extras = [];
    if (log.swimMin) extras.push(`🏊 ${sanitize(log.swimMin)}dk yüzme`);
    if (log.saunaMin) extras.push(`🧖 ${sanitize(log.saunaMin)}dk sauna`);
    item.innerHTML = `
      <span class="history-date">${sanitize(log.date)}</span>
      <ul>${exList}</ul>
      ${extras.length ? `<span class="history-extra">${extras.join(" · ")}</span>` : ""}
      ${log.note ? `<p class="hint">${sanitize(log.note)}</p>` : ""}
    `;
    workoutHistory.appendChild(item);
  });
}

// --- render: weight ---
function renderWeight() {
  const logs = [...state.weightLogs].sort((a, b) =>
    (a.loggedAt ?? a.date).localeCompare(b.loggedAt ?? b.date)
  );
  const current = logs.length ? logs[logs.length - 1].weight : START_WEIGHT;

  const totalToLose = START_WEIGHT - GOAL_WEIGHT;
  const lostSoFar = Math.max(0, START_WEIGHT - current);
  const pct = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));
  progressFill.style.width = `${pct}%`;
  progressCurrentLabel.textContent = `Güncel: ${current} kg`;
  const remaining = Math.max(0, +(current - GOAL_WEIGHT).toFixed(1));
  progressRemainingLabel.textContent = `Kalan: ${remaining} kg`;

  weightHistory.innerHTML = "";
  if (logs.length === 0) {
    weightHistory.innerHTML = `<p class="empty-state">Henüz kilo kaydı yok.</p>`;
  } else {
    [...logs].reverse().forEach((log) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `<span class="history-date">${sanitize(log.date)}</span> ${sanitize(log.weight)} kg`;
      weightHistory.appendChild(item);
    });
  }

  const recent = logs.slice(-8);
  weightChart.innerHTML = "";
  if (recent.length > 0) {
    const max = Math.max(...recent.map((l) => l.weight), START_WEIGHT);
    const min = Math.min(...recent.map((l) => l.weight), GOAL_WEIGHT);
    const range = max - min || 1;
    recent.forEach((log) => {
      const heightPct = 10 + ((log.weight - min) / range) * 90;
      const wrap = document.createElement("div");
      wrap.className = "weight-bar-wrap";
      wrap.innerHTML = `
        <div class="weight-bar" style="height:${heightPct}%"></div>
        <span class="weight-bar-label">${sanitize(log.weight)}</span>
      `;
      weightChart.appendChild(wrap);
    });
  }
}

// --- init ---
renderPlan();
addExerciseRow();
renderWorkoutHistory();
renderWeight();
