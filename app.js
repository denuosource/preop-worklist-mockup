/* ── Barrier categories, with an icon each ──────────────────────────── */
const ICON = {
  "Medication": '<g transform="rotate(-45 8 8)"><rect x="1.8" y="5.5" width="12.4" height="5" rx="2.5"/><line x1="8" y1="5.5" x2="8" y2="10.5"/></g>',
  "Financial": '<rect x="1.8" y="4" width="12.4" height="8" rx="1.6"/><line x1="1.8" y1="6.8" x2="14.2" y2="6.8"/>',
  "Clinical prep": '<rect x="3.6" y="2.8" width="8.8" height="11" rx="1.6"/><rect x="6" y="1.4" width="4" height="2.6" rx="0.9"/><line x1="8" y1="7" x2="8" y2="11"/><line x1="6" y1="9" x2="10" y2="9"/>',
  "Transport": '<path d="M2 10.6h12M3.6 10.6V8.2l1.5-3.1h5.8l1.5 3.1v2.4"/><circle cx="5.2" cy="11.8" r="1.1"/><circle cx="10.8" cy="11.8" r="1.1"/>',
  "Administrative": '<path d="M4 1.8h5l3.2 3.2v9.2H4z"/><path d="M8.8 1.8v3.4h3.4"/><line x1="6" y1="9" x2="10.2" y2="9"/><line x1="6" y1="11.2" x2="10.2" y2="11.2"/>',
  "Education": '<path d="M8 4.4C6.9 3.3 5.4 2.8 3 2.8v9c2.4 0 3.9.5 5 1.6"/><path d="M8 4.4c1.1-1.1 2.6-1.6 5-1.6v9c-2.4 0-3.9.5-5 1.6"/><line x1="8" y1="4.4" x2="8" y2="13.4"/>',
};

const BARRIERS = [
  { name: "Medication", severity: 5 },
  { name: "Financial", severity: 4 },
  { name: "Clinical prep", severity: 3 },
  { name: "Transport", severity: 2 },
  { name: "Administrative", severity: 1 },
  { name: "Education", severity: 0 },
];

function icon(category, size = 15) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
    >${ICON[category] || ""}</svg>`;
}

/* Both bars are plain shares of this patient's own task list, so the number
   on the bar always matches the count underneath it. */
const FACTORS = [
  { label: "Overdue tasks", color: "var(--red)", count: p => p.tasks_open_overdue },
  { label: "Critical tasks still open", color: "var(--amber)", count: p => p.critical_open },
];

const TIERS = ["Critical", "Important", "Routine"];

let DATA = null;
const state = { tab: "D3", practices: new Set(), risk: "all" };

/* Worklist status a coordinator sets: undefined | "review" | "done" */
const status = new Map(JSON.parse(localStorage.getItem("nn-status") || "[]"));
const saveStatus = () =>
  localStorage.setItem("nn-status", JSON.stringify([...status]));

const bandVar = b => ({ red: "var(--red)", amber: "var(--amber)", green: "var(--green)" }[b]);
const sevColor = s =>
  s >= 5 ? "var(--red)" : s >= 3 ? "var(--amber)" : s >= 1 ? "var(--blue)" : "var(--muted2)";

const fmtDate = iso =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function overdueText(hours) {
  if (hours < 48) return `${Math.round(hours)}h overdue`;
  return `${Math.round(hours / 24)}d overdue`;
}

/* Progress ring — same visual language as the app's Tasks Progress dial. */
function ring(score, band, size = 38) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const col = bandVar(band);
  return `
    <div class="ring-wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="3"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"
                transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" class="ring-num" fill="${col}"
              style="font-size:${size * 0.32}px">${score}</text>
      </svg>
    </div>`;
}

/* ── Theme ──────────────────────────────────────────────────────────── */
function initTheme() {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("nn-theme") || "light");
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nn-theme", next);
  });
}

/* ── Nav ────────────────────────────────────────────────────────────── */
function initNav() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const p = link.dataset.page;
      document.getElementById("worklistPage").style.display = p === "worklist" ? "" : "none";
      document.getElementById("impactPage").style.display = p === "impact" ? "" : "none";
      window.scrollTo(0, 0);
    });
  });
}

/* ── Surgeon multi-select ───────────────────────────────────────────── */
function initPracticeSelect() {
  const panel = document.getElementById("practicePanel");
  const trigger = document.getElementById("practiceTrigger");

  panel.innerHTML = DATA.practices.map(pr => `
    <div class="ms-row on" data-id="${pr.id}">
      <span class="ms-box">&#10003;</span>
      <span class="ms-name">${pr.name}</span>
    </div>`).join("") + `
    <div class="ms-foot">
      <button class="ms-link" data-all="1">Select all</button>
      <button class="ms-link" data-all="0">Clear all</button>
    </div>`;

  DATA.practices.forEach(pr => state.practices.add(pr.id));

  panel.querySelectorAll(".ms-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      if (state.practices.has(id)) { state.practices.delete(id); row.classList.remove("on"); }
      else { state.practices.add(id); row.classList.add("on"); }
      syncPracticeLabel();
      render();
    });
  });

  panel.querySelectorAll(".ms-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const on = btn.dataset.all === "1";
      state.practices.clear();
      panel.querySelectorAll(".ms-row").forEach(row => {
        row.classList.toggle("on", on);
        if (on) state.practices.add(row.dataset.id);
      });
      syncPracticeLabel();
      render();
    });
  });

  trigger.addEventListener("click", e => { e.stopPropagation(); panel.classList.toggle("open"); });
  panel.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => panel.classList.remove("open"));

  syncPracticeLabel();
}

function syncPracticeLabel() {
  const n = state.practices.size;
  const label = document.getElementById("practiceLabel");
  if (n === DATA.practices.length) label.textContent = "All surgeons";
  else if (n === 0) label.textContent = "No surgeon selected";
  else if (n === 1) label.textContent = DATA.practices.find(p => state.practices.has(p.id)).name;
  else label.textContent = `${n} surgeons`;
}

/* ── Filters ────────────────────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll(".band").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".band").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.risk = btn.dataset.risk;
      render();
    });
  });
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.tab = tab.dataset.tab;
      render();
    });
  });
}

/* Open rows first (worst risk at the top), then flagged for review, then done. */
const RANK = { undefined: 0, watch: 1, done: 2 };

function rows() {
  return DATA.patients
    .filter(p => p.tab === state.tab
      && state.practices.has(p.practice_id)
      && (state.risk === "all" || p.risk_band === state.risk))
    .sort((a, b) => {
      const ra = RANK[status.get(a.patient_id)], rb = RANK[status.get(b.patient_id)];
      return ra !== rb ? ra - rb : b.risk_score - a.risk_score;
    });
}

/* ── Summary + barrier mix ──────────────────────────────────────────── */
/* The first two strips are the state of the task data itself. Marking a
   patient done records that a coordinator spoke to them — it does not close
   anyone's tasks, so it must never move these numbers. Only the queue strip
   below reflects coordinator actions. */
/* These counts are the state of the task data. Marking a patient done records
   that a coordinator spoke to them — it does not close anyone's tasks, so it
   must never move them. Only the activity card reflects coordinator actions. */
function renderRail(list) {
  const red = list.filter(p => p.risk_band === "red").length;
  const amber = list.filter(p => p.risk_band === "amber").length;
  const green = list.filter(p => p.risk_band === "green").length;
  const overdue = list.reduce((n, p) => n + p.tasks_open_overdue, 0);
  const crit = list.reduce((n, p) => n + p.critical_open, 0);

  const done = list.filter(p => status.get(p.patient_id) === "done").length;
  const watch = list.filter(p => status.get(p.patient_id) === "watch").length;

  const row = (label, value, cls = "") =>
    `<div class="rrow"><span class="rrow-label">${label}</span>
       <span class="rrow-value ${cls}">${value}</span></div>`;

  document.getElementById("rail").innerHTML = `
    <div class="rcard">
      <div class="rcard-title">Patients in this window</div>
      ${row("Total scheduled", list.length)}
      ${row("High risk", red, "red")}
      ${row("Medium risk", amber, "amber")}
      ${row("Low risk", green, "green")}
      ${row("Open overdue tasks", overdue)}
      ${row("Critical tasks open", crit, "red")}
    </div>

    <div class="rcard">
      <div class="rcard-title">Actioned today</div>
      ${row("Done", done, "green")}
      ${row("On watchlist", watch, "amber")}
      ${row("Remaining", list.length - done)}
    </div>`;
}

function renderBarrierStrip(list) {
  const counts = {};
  BARRIERS.forEach(b => (counts[b.name] = 0));
  list.forEach(p => p.open_tasks.forEach(t => counts[t.category]++));
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  document.getElementById("barrierStrip").innerHTML = BARRIERS.map(b => `
    <div class="barrier-cell">
      <div class="barrier-head" style="color:${sevColor(b.severity)}">
        ${icon(b.name, 17)}<span class="barrier-name">${b.name}</span>
      </div>
      <div class="barrier-count">${counts[b.name]}</div>
      <div class="barrier-sub">${Math.round(100 * counts[b.name] / total)}% of open tasks</div>
    </div>`).join("");
}

/* ── Table ──────────────────────────────────────────────────────────── */
function renderTable(list) {
  const body = document.getElementById("tbody");
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty">No patients match these filters.</div></td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => {
    const st = status.get(p.patient_id);
    const pct = Math.round(100 * p.tasks_completed / p.tasks_total);
    const top = p.open_tasks[0];
    const soon = state.tab === "D3" && p.days_to_procedure <= 2;
    return `
    <tr data-id="${p.patient_id}" class="${st ? "row-" + st : ""}">
      <td>${ring(p.risk_score, p.risk_band)}</td>
      <td>
        <div class="cell-name">${p.name} ${p.flagged ? '<span class="flag-mark" title="Flagged">&#9873;</span>' : ""}</div>
        <div class="cell-sub">${p.mrn} &middot; ${p.practice}</div>
      </td>
      <td>
        <div class="cell-strong" title="${p.procedure_type}">${p.procedure_type}</div>
        <div class="cell-cpt">CPT ${p.cpt_code}</div>
      </td>
      <td>
        <div class="date-main">${fmtDate(p.procedure_date)}</div>
        ${state.tab === "D3"
          ? `<div class="date-countdown ${soon ? "soon" : ""}">In ${p.days_to_procedure} days</div>`
          : ""}
      </td>
      <td>
        <div class="taskline">
          <b>${p.tasks_completed}</b><span class="tl-of">/ ${p.tasks_total}</span>
          <div class="taskbar"><div class="taskbar-fill" style="width:${pct}%"></div></div>
          <span class="tl-pct">${pct}%</span>
        </div>
        <div class="crit-note">
          ${p.critical_open
            ? `<span class="crit-dot"></span>${p.critical_open} critical open`
            : `<span class="none-text">No critical open</span>`}
        </div>
      </td>
      <td>
        ${top ? `
          <div class="factor-line" title="${top.title}">${top.title}</div>
          <div class="factor-meta">
            <span class="overdue-text">${overdueText(top.hours_overdue)}</span>
          </div>` : `<span class="none-text">Nothing overdue</span>`}
      </td>
      <td>
        ${st === "done"
          ? `<div class="act-state done">Done</div>
             <button class="act undo" data-act="clear" data-id="${p.patient_id}">Undo</button>`
          : st === "watch"
          ? `<div class="act-state watch">On watchlist</div>
             <div class="act-row">
               <button class="act done" data-act="done" data-id="${p.patient_id}">Done</button>
               <button class="act undo" data-act="clear" data-id="${p.patient_id}">Undo</button>
             </div>`
          : `<div class="act-row">
               <button class="act done" data-act="done" data-id="${p.patient_id}">Done</button>
               <button class="act watch" data-act="watch" data-id="${p.patient_id}">Add to watchlist</button>
             </div>`}
      </td>
    </tr>`;
  }).join("");

  body.querySelectorAll("tr[data-id]").forEach(tr =>
    tr.addEventListener("click", () => openPanel(tr.dataset.id)));

  body.querySelectorAll(".act").forEach(btn =>
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const { act, id } = btn.dataset;
      if (act === "clear") status.delete(id); else status.set(id, act);
      saveStatus();
      render();
    }));
}

function render() {
  const inScope = t => DATA.patients.filter(p => p.tab === t && state.practices.has(p.practice_id)).length;
  document.getElementById("countD3").textContent = inScope("D3");
  document.getElementById("countD1").textContent = inScope("D1");

  const list = rows();
  renderRail(list);
  renderBarrierStrip(list);
  renderTable(list);
}

/* ── Patient 360 ────────────────────────────────────────────────────── */
function openPanel(id) {
  const p = DATA.patients.find(x => x.patient_id === id);
  if (!p) return;

  const sex = p.gender === "male" ? "M" : "F";
  document.getElementById("panelName").textContent = p.name;
  document.getElementById("panelMeta").textContent =
    `${p.mrn} · ${sex} · born ${p.birth_year} · ${p.practice}`;

  const badges = [
    `<span class="badge">${p.procedure_type} · CPT ${p.cpt_code}</span>`,
    `<span class="badge">${fmtDate(p.procedure_date)}</span>`,
  ];
  if (p.text_opt_in) badges.push(`<span class="badge blue">SMS opted in</span>`);
  if (p.email_opt_in) badges.push(`<span class="badge blue">Email opted in</span>`);
  if (p.flagged) badges.push(`<span class="badge red">Flagged</span>`);
  document.getElementById("panelBadges").innerHTML = badges.join("");

  const riskBlock = `
    <div class="block">
      <div class="block-title">Risk score</div>
      <div class="risk-row">
        ${ring(p.risk_score, p.risk_band, 92)}
        <div class="factors">
          ${FACTORS.map(f => {
            const n = f.count(p);
            const pctOfPlan = Math.round(100 * n / p.tasks_total);
            return `
            <div>
              <div class="factor-top">
                <span class="factor-label">${f.label}</span>
                <span class="factor-num">${pctOfPlan}<span class="factor-den">%</span></span>
              </div>
              <div class="factor-track"><div class="factor-fill" style="width:${pctOfPlan}%;background:${f.color}"></div></div>
              <div class="factor-detail">${n} of ${p.tasks_total} tasks on this patient's plan</div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;

  const byCat = {};
  p.open_tasks.forEach(t => (byCat[t.category] = (byCat[t.category] || 0) + 1));
  const present = BARRIERS.filter(b => byCat[b.name]);

  const byTier = { Critical: [], Important: [], Routine: [] };
  p.open_tasks.forEach(t => byTier[t.tier].push(t));

  const tierBoxes = TIERS.map(name => {
    const n = byTier[name].length;
    return `
      <button class="tier-box ${name.toLowerCase()} ${n ? "" : "empty"}" data-tier="${name}" ${n ? "" : "disabled"}>
        <div class="tb-count">${n}</div>
        <div class="tb-name">${name}</div>
      </button>`;
  }).join("");

  const catChips = `
    <button class="cat-chip active" data-cat="">All barriers <span class="cc-n">${p.open_tasks.length}</span></button>
    ${present.map(b => `
      <button class="cat-chip" data-cat="${b.name}" style="--cc:${sevColor(b.severity)}">
        ${icon(b.name, 14)}${b.name} <span class="cc-n">${byCat[b.name]}</span>
      </button>`).join("")}`;

  const tasksBlock = `
    <div class="block">
      <div class="block-title">Open &amp; overdue &middot; ${p.open_tasks.length} of ${p.tasks_total} tasks</div>
      <div class="tier-boxes">${tierBoxes}</div>
      <div class="cat-chips">${catChips}</div>
      <div id="tierTasks"></div>
    </div>`;

  const body = document.getElementById("panelBody");
  body.innerHTML = riskBlock + tasksBlock;
  body.scrollTop = 0;

  const target = document.getElementById("tierTasks");
  const filter = { tier: null, cat: "" };

  function paint() {
    body.querySelectorAll(".tier-box").forEach(b =>
      b.classList.toggle("active", b.dataset.tier === filter.tier));
    body.querySelectorAll(".cat-chip").forEach(c =>
      c.classList.toggle("active", c.dataset.cat === filter.cat));

    const items = p.open_tasks.filter(t =>
      (!filter.tier || t.tier === filter.tier) &&
      (!filter.cat || t.category === filter.cat));

    target.innerHTML = items.length
      ? items.map(t => {
          const sev = BARRIERS.find(b => b.name === t.category).severity;
          return `
          <div class="task">
            <span class="task-ic" style="color:${sevColor(sev)}">${icon(t.category, 17)}</span>
            <div class="task-body">
              <div class="task-name">${t.title}</div>
              <div class="task-cat">${t.tier} &middot; ${t.category}</div>
            </div>
            <div class="task-due">${overdueText(t.hours_overdue)}</div>
          </div>`;
        }).join("")
      : `<div class="note">No tasks match this filter.</div>`;
  }

  body.querySelectorAll(".tier-box:not(.empty)").forEach(b =>
    b.addEventListener("click", () => {
      filter.tier = filter.tier === b.dataset.tier ? null : b.dataset.tier;
      paint();
    }));

  body.querySelectorAll(".cat-chip").forEach(c =>
    c.addEventListener("click", () => { filter.cat = c.dataset.cat; paint(); }));

  paint();

  document.getElementById("scrim").classList.add("open");
  document.getElementById("panel").classList.add("open");
}

function closePanel() {
  document.getElementById("scrim").classList.remove("open");
  document.getElementById("panel").classList.remove("open");
}

function initPanel() {
  document.getElementById("scrim").addEventListener("click", closePanel);
  document.getElementById("panelClose").addEventListener("click", closePanel);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });
}

/* ── Measured impact ────────────────────────────────────────────────── */
/* 70%+ clears it (green), 50-69% is unreliable (amber), under 50% fails (red).
   The 70% line is the same one the "cheapest that works" column uses, so the
   colour and the recommendation can never disagree. */
const rateColor = v =>
  v >= 70 ? "var(--green)" : v >= 50 ? "var(--amber)" : "var(--red)";
const rateTint = v =>
  v >= 70 ? "var(--green-soft)" : v >= 50 ? "var(--amber-soft)" : "var(--red-soft)";

function renderImpact() {
  const im = DATA.impact;

  /* Headline outcomes */
  document.getElementById("impactHeadline").innerHTML = im.headline.map(h => `
    <div class="kpi ${h.dir}">
      <div class="kpi-label">${h.label}</div>
      <div class="kpi-value">${h.value}</div>
      <div class="kpi-delta ${h.dir}">${h.delta}</div>
      <div class="kpi-compare">${h.compare}</div>
    </div>`).join("");

  /* Block 1 — which channel works */
  document.getElementById("channelChart").innerHTML = im.channels.map(c => `
    <div class="bar-row">
      <div class="bar-label">
        <span class="bar-name">${c.name}</span>
        <span class="bar-effort">${c.effort} &middot; ${c.cost}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${c.rate}%;background:${rateColor(c.rate)}"></div>
      </div>
      <div class="bar-value" style="color:${rateColor(c.rate)}">${c.rate}%</div>
    </div>`).join("");

  document.getElementById("channelNote").innerHTML =
    `<b>${im.escalation_conversion}% of everything clears on a reminder alone.</b>
     Those patients never need a coordinator's time. The question is not whether to call &mdash;
     it is which patients are worth calling.`;

  /* Block 2 — channel x barrier matrix */
  const m = im.matrix;
  const head = m.channels.map(c => `<th>${c}</th>`).join("");
  const bodyRows = m.rows.map(r => {
    const sev = BARRIERS.find(b => b.name === r.category).severity;
    const best = r.values.findIndex(v => v >= 70);
    return `
      <tr>
        <td class="mx-cat">
          <span style="color:${sevColor(sev)}">${icon(r.category, 16)}</span>${r.category}
        </td>
        ${r.values.map((v, i) => `
          <td class="mx-cell">
            <div class="mx-box" style="background:${rateTint(v)};color:${rateColor(v)}">${v}%</div>
          </td>`).join("")}
        <td class="mx-best">${m.channels[best === -1 ? m.channels.length - 1 : best]}</td>
      </tr>`;
  }).join("");

  document.getElementById("matrixTable").innerHTML = `
    <table class="matrix">
      <thead><tr><th>Barrier</th>${head}<th>Cheapest that works</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;

  /* Block 3 — did it change the outcome */
  document.getElementById("comparison").innerHTML = im.comparison.map(c => {
    const max = Math.max(c.touched, c.untouched);
    const good = c.better === "high"
      ? c.touched > c.untouched
      : c.touched < c.untouched;
    return `
      <div class="cmp">
        <div class="cmp-label">${c.label}</div>
        <div class="cmp-bars">
          <div class="cmp-row">
            <span class="cmp-key">Contacted</span>
            <div class="cmp-track"><div class="cmp-fill" style="width:${100 * c.touched / max}%;background:${good ? "var(--green)" : "var(--red)"}"></div></div>
            <span class="cmp-num">${c.touched}${c.unit}</span>
          </div>
          <div class="cmp-row">
            <span class="cmp-key">Not contacted</span>
            <div class="cmp-track"><div class="cmp-fill muted" style="width:${100 * c.untouched / max}%"></div></div>
            <span class="cmp-num muted">${c.untouched}${c.unit}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

/* ── Boot ───────────────────────────────────────────────────────────── */
async function boot() {
  initTheme();
  initNav();
  initFilters();
  initPanel();

  DATA = await (await fetch("data/worklist.json")).json();

  const today = new Date(DATA.today).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  document.getElementById("todayDate").textContent = today;
  document.getElementById("todayDate2").textContent = today;

  initPracticeSelect();
  render();
  renderImpact();
}

boot();
