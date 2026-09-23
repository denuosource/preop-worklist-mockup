"""Generates worklist.json — synthetic patients for the Pre-Procedure Worklist mockup.

All data here is generated, including the practice identifiers. Nothing in
this repository comes from a real patient, practice or database.

Risk is scored from tasks only (no engagement signal):
    overdue load 65% + critical exposure 35%

Every task in TASK_CATALOG carries its criticality tier and barrier category
explicitly, rather than being keyword-matched off a free-text title.
"""
import json
import random
import datetime as dt
from pathlib import Path

HERE = Path(__file__).parent
TODAY = dt.datetime(2026, 9, 23, 8, 0, tzinfo=dt.timezone.utc)
rng = random.Random(7)

# Placeholder identifiers — this public copy carries no real practice keys.
PRACTICES = [
    {"id": "11111111-1111-4111-8111-111111111111", "name": "Dr Alvarez"},
    {"id": "22222222-2222-4222-8222-222222222222", "name": "Dr Beckett"},
    {"id": "33333333-3333-4333-8333-333333333333", "name": "Dr Okonkwo"},
    {"id": "44444444-4444-4444-8444-444444444444", "name": "Dr Lindstrom"},
]

TIER_WEIGHT = {"Critical": 3.0, "Important": 1.5, "Routine": 0.5}
BARRIER_SEVERITY = {
    "Medication": 5, "Financial": 4, "Clinical prep": 3,
    "Transport": 2, "Administrative": 1, "Education": 0,
}

# (title, tier, barrier category, days due before procedure, chance assigned, scope)
# Scope limits a task to major open cases or minor scopes; the chance is what
# stops every patient carrying an identical plan, which made the same
# long-lead clearance top every single row.
TASK_CATALOG = [
    # ── Critical: procedure is cancelled or unsafe without it ──────────────
    ("Stop smoking \u2014 4 weeks before surgery",       "Critical",  "Clinical prep", 21, 0.20, "all"),
    ("Stop hormone therapy / oral contraceptive",     "Critical",  "Medication",    21, 0.15, "all"),
    ("Cardiac clearance",                             "Critical",  "Clinical prep", 21, 0.35, "major"),
    ("Dental clearance",                              "Critical",  "Clinical prep", 20, 0.28, "major"),
    ("Anaesthesia consult and airway assessment",     "Critical",  "Clinical prep", 18, 0.35, "all"),
    ("Medical clearance from primary care",           "Critical",  "Clinical prep", 16, 0.45, "all"),
    ("A1c check \u2014 surgery cancels above 8.0",       "Critical",  "Clinical prep", 15, 0.25, "all"),
    ("Blood type and crossmatch",                     "Critical",  "Clinical prep", 14, 0.30, "major"),
    ("Complete pre-admission testing (PAT)",          "Critical",  "Clinical prep", 13, 0.60, "all"),
    ("MRSA nasal swab screening",                     "Critical",  "Clinical prep", 12, 0.35, "all"),
    ("Complete EKG and blood work",                   "Critical",  "Clinical prep", 11, 0.50, "all"),
    ("Stop rheumatoid medication / oral steroids",    "Critical",  "Medication",    10, 0.18, "all"),
    ("Stop SGLT2 inhibitor (Jardiance / Farxiga)",    "Critical",  "Medication",     9, 0.20, "all"),
    ("Stop GLP-1 medication (Ozempic / Wegovy)",      "Critical",  "Medication",     8, 0.28, "all"),
    ("Stop clopidogrel (Plavix)",                     "Critical",  "Medication",     8, 0.15, "all"),
    ("Stop anti-inflammatory medications (NSAIDs)",   "Critical",  "Medication",     7, 0.40, "all"),
    ("Stop fish oil and vitamin E supplements",       "Critical",  "Medication",     7, 0.28, "all"),
    ("Stop blood thinners (Eliquis / Xarelto)",       "Critical",  "Medication",     5, 0.28, "all"),
    ("Adjust insulin dose for surgery day",           "Critical",  "Medication",     3, 0.18, "all"),
    ("Hold ACE inhibitor on the morning of surgery",  "Critical",  "Medication",     2, 0.25, "all"),
    ("Nothing to eat after midnight",                 "Critical",  "Clinical prep",  1, 1.00, "all"),
    ("Clear fluids only, until 2 hours before",       "Critical",  "Clinical prep",  1, 0.50, "all"),

    # ── Important: goes ahead, but with friction or delay ──────────────────
    ("Insurance verification",                        "Important", "Financial",     20, 0.50, "all"),
    ("Financial clearance",                           "Important", "Financial",     15, 0.55, "all"),
    ("Complete the pre-admission questionnaire",      "Important", "Administrative",14, 0.65, "all"),
    ("Update your emergency contact",                 "Important", "Administrative",13, 0.45, "all"),
    ("Upload recent weight-bearing X-ray",            "Important", "Clinical prep", 12, 0.30, "all"),
    ("Pay the surgical deposit",                      "Important", "Financial",     11, 0.35, "all"),
    ("Arrange a caregiver for after surgery",         "Important", "Transport",     10, 0.50, "major"),
    ("Sign the surgical consent form",                "Important", "Administrative", 9, 0.75, "all"),
    ("Arrange your ride home",                        "Important", "Transport",      7, 0.90, "all"),
    ("Pick up Hibiclens from the pharmacy",           "Important", "Clinical prep",  7, 0.60, "all"),
    ("Bring your CPAP machine",                       "Important", "Administrative",  5, 0.20, "all"),
    ("Pick up post-operative medications",            "Important", "Clinical prep",  4, 0.55, "all"),
    ("Begin Hibiclens wash the night before",         "Important", "Clinical prep",  3, 0.60, "all"),
    ("Do not shave the surgical site",                "Important", "Clinical prep",  3, 0.55, "all"),
    ("Confirm your arrival time",                     "Important", "Administrative", 2, 0.85, "all"),
    ("Remove all jewellery and nail polish",          "Important", "Administrative", 1, 0.45, "all"),
    ("Bring your brace or sling to the hospital",     "Important", "Administrative", 1, 0.50, "minor"),

    # ── Routine: no procedural consequence ─────────────────────────────────
    ("Read the welcome article",                      "Routine",   "Education",     21, 0.75, "all"),
    ("Watch the surgery preparation video",           "Routine",   "Education",     14, 0.75, "all"),
    ("Read: what to expect on surgery day",           "Routine",   "Education",      7, 0.65, "all"),
    ("Prepare your home for recovery",                "Routine",   "Education",      7, 0.55, "major"),
    ("Read: managing pain after surgery",             "Routine",   "Education",      5, 0.50, "all"),
]

# (procedure name, CPT code, scope)
PROCEDURES = [
    ("Total Knee Arthroplasty",                     "27447", "major"),
    ("Total Hip Arthroplasty",                      "27130", "major"),
    ("Total Shoulder Arthroplasty",                 "23472", "major"),
    ("Lumbar Laminectomy",                          "63047", "major"),
    ("Shoulder Arthroscopy \u2013 Cuff Repair",       "29827", "minor"),
    ("Wrist Endoscopy \u2013 Carpal Tunnel Release",  "29848", "minor"),
    ("ACL Reconstruction",                          "29888", "minor"),
    ("Ankle Arthroscopy",                           "29898", "minor"),
]

FIRST = ["James", "Margaret", "Robert", "Elena", "David", "Priya", "Michael", "Susan",
         "Carlos", "Linda", "Thomas", "Aisha", "Grace", "Marcus", "Nora", "Daniel",
         "Patricia", "Andre", "Helen", "Victor", "Ruth", "Samuel", "Joan", "Eric",
         "Miriam", "Frank", "Diane", "Omar", "Beatrice", "Leonard", "Carmen", "Hugh",
         "Sylvia", "Nathan", "Rosa", "Alan"]
LAST = ["Nolan", "Whitfield", "Kowalski", "Reyes", "Bennett", "Patel", "O'Connell",
        "Mendez", "Zhao", "Grant", "Farah", "Okafor", "Delgado", "Shaw", "Lindqvist",
        "Brennan", "Castellano", "Adeyemi", "Voss", "Marchetti", "Doyle", "Ferreira",
        "Hollis", "Nakamura", "Sandoval", "Whitaker", "Kaur", "Rosetti", "Blackwood",
        "Ibrahim", "Sterling", "Vance", "Mercer", "Larkin", "Osei", "Pryor"]

# How diligent a patient is — drives how many tasks slip.
ARCHETYPES = [
    ("on_track", 0.25),
    ("slipping", 0.42),
    ("at_risk", 0.33),
]


def pick_archetype():
    r = rng.random()
    cum = 0.0
    for name, p in ARCHETYPES:
        cum += p
        if r <= cum:
            return name
    return "on_track"


def build_tasks(archetype, procedure_date, scope):
    """Assign this patient's plan, then decide which tasks are done vs open."""
    chosen = [
        t for t in TASK_CATALOG
        if t[5] in ("all", scope) and rng.random() < t[4]
    ]

    # Probability a given task is still incomplete, by archetype and tier.
    open_prob = {
        "on_track": {"Critical": 0.05, "Important": 0.12, "Routine": 0.35},
        "slipping": {"Critical": 0.18, "Important": 0.45, "Routine": 0.60},
        "at_risk":  {"Critical": 0.65, "Important": 0.70, "Routine": 0.75},
    }[archetype]

    tasks = []
    for title, tier, category, due_days, _chance, _scope in chosen:
        due_days = max(1, due_days + rng.randint(-3, 3))
        due_at = procedure_date - dt.timedelta(days=due_days)
        is_open = rng.random() < open_prob[tier]
        completed_at = None
        if not is_open:
            completed_at = due_at - dt.timedelta(hours=rng.randint(12, 240))
        tasks.append({
            "title": title, "tier": tier, "category": category,
            "due_at": due_at, "completed_at": completed_at,
        })
    return tasks


def make_patient(i, practice, tab):
    archetype = pick_archetype()
    days_out = rng.choice([2, 3, 3, 4]) if tab == "D3" else 1
    procedure_date = (TODAY + dt.timedelta(days=days_out)).replace(
        hour=rng.choice([7, 9, 11, 13]), minute=rng.choice([0, 30]))

    procedure = rng.choice(PROCEDURES)
    tasks = build_tasks(archetype, procedure_date, procedure[2])

    open_tasks = []
    completed = 0
    for t in tasks:
        if t["completed_at"]:
            completed += 1
            continue
        hours_overdue = (TODAY - t["due_at"]).total_seconds() / 3600
        if hours_overdue > 0:
            open_tasks.append({
                "title": t["title"], "tier": t["tier"], "category": t["category"],
                "hours_overdue": round(hours_overdue, 1),
            })

    # Most critical first, then most overdue — so the primary risk factor a
    # coordinator sees is the clinically important one, not merely the oldest.
    open_tasks.sort(key=lambda t: (-TIER_WEIGHT[t["tier"]], -t["hours_overdue"]))

    overdue_load = sum(t["hours_overdue"] * TIER_WEIGHT[t["tier"]] for t in open_tasks)
    worst_severity = max((BARRIER_SEVERITY[t["category"]] for t in open_tasks), default=0)
    critical_total = sum(1 for t in tasks if t["tier"] == "Critical")
    critical_open = sum(1 for t in open_tasks if t["tier"] == "Critical")

    return {
        "patient_id": f"pt-{i:03d}",
        "mrn": f"MRN{100000 + i * 137}",
        "name": None,
        "practice": practice["name"],
        "practice_id": practice["id"],
        "gender": rng.choice(["male", "female"]),
        "birth_year": rng.randint(1945, 1985),
        "procedure_type": procedure[0],
        "cpt_code": procedure[1],
        "procedure_date": procedure_date.isoformat(),
        "days_to_procedure": days_out,
        "tab": tab,
        "flagged": rng.random() < 0.12,
        "confirmed": rng.random() < 0.72,
        "text_opt_in": rng.random() < 0.8,
        "email_opt_in": rng.random() < 0.9,
        "tasks_total": len(tasks),
        "tasks_completed": completed,
        "tasks_open_overdue": len(open_tasks),
        "critical_total": critical_total,
        "critical_open": critical_open,
        "open_tasks": open_tasks,
        "_overdue_load": overdue_load,
        "_worst_severity": worst_severity,
    }


# ── Build the cohort ───────────────────────────────────────────────────────
patients = []
i = 0
for tab, count in (("D3", 22), ("D1", 14)):
    for _ in range(count):
        i += 1
        patients.append(make_patient(i, rng.choice(PRACTICES), tab))

names = [f"{f} {l}" for f in FIRST for l in LAST]
rng.shuffle(names)
for p, name in zip(patients, names):
    p["name"] = name

# ── Score ──────────────────────────────────────────────────────────────────
# Overdue load has no natural ceiling (it depends on how many tasks a template
# assigns), so it is min-max scaled across the cohort in view.
# Percentile rank rather than min-max: a handful of very overdue patients
# would otherwise squash everyone else into the bottom of the scale.
order = sorted(patients, key=lambda p: p["_overdue_load"])
rank = {id(p): i for i, p in enumerate(order)}
last = max(1, len(patients) - 1)

for p in patients:
    overdue = 100 * rank[id(p)] / last
    exposure = (100 * p["critical_open"] / p["critical_total"]) if p["critical_total"] else 0

    score = round(0.65 * overdue + 0.35 * exposure)
    score = max(0, min(100, score))

    p["risk_score"] = score
    p["risk_band"] = "red" if score >= 70 else "amber" if score >= 40 else "green"
    p["factors"] = {
        "overdue_load": round(overdue, 1),
        "critical_exposure": round(exposure, 1),
    }
    p["factor_basis"] = {
        "overdue_load": (
            f"{p['tasks_open_overdue']} tasks past due \u2014 a heavier load than "
            f"{round(overdue)}% of patients in this window"
        ),
        "critical_exposure": (
            f"{p['critical_open']} of {p['critical_total']} critical tasks still open"
            if p["critical_total"] else "No critical tasks on this plan"
        ),
    }
    p["recommend"] = (
        "Escalate — coordinator call" if score >= 70
        else "Outreach recommended" if score >= 40
        else "Monitor"
    )

    top = p["open_tasks"][0] if p["open_tasks"] else None
    p["risk_factor"] = (
        f"{top['title']} is overdue" if top else "No overdue tasks"
    )

    del p["_overdue_load"], p["_worst_severity"]

patients.sort(key=lambda p: -p["risk_score"])

# ── Cohort metrics for the Measured Impact page ───────────────────────────
all_critical = sum(p["critical_total"] for p in patients)
cleared_critical = sum(p["critical_total"] - p["critical_open"] for p in patients)

IMPACT = {
    "headline": [
        {
            "label": "Cancellation and no-show rate",
            "value": "9.6%",
            "compare": "13.8% for untouched patients at matched risk",
            "delta": "\u22124.2 pts",
            "dir": "good",
        },
        {
            "label": "Critical tasks cleared before surgery",
            "value": "71%",
            "compare": "target is 90%",
            "delta": "19 pts short",
            "dir": "bad",
        },
        {
            "label": "Median time to resolution",
            "value": "6.4h",
            "compare": "p90 is 22h, from outreach to task completion",
            "delta": "within target",
            "dir": "good",
        },
    ],
    # Resolution rate by channel, with the coordinator time each one costs.
    "channels": [
        {"name": "SMS / email reminder", "rate": 41, "effort": "Seconds", "cost": "one click"},
        {"name": "AI phone call",        "rate": 63, "effort": "Seconds", "cost": "no time on the call"},
        {"name": "Coordinator call",     "rate": 82, "effort": "5\u201315 min", "cost": "a real slot in the day"},
    ],
    "escalation_conversion": 46,
    # Resolution rate (%) per barrier category per channel.
    "matrix": {
        "channels": ["SMS / email", "AI call", "Coordinator call"],
        "rows": [
            {"category": "Medication",     "values": [38, 61, 84]},
            {"category": "Financial",      "values": [29, 48, 79]},
            {"category": "Clinical prep",  "values": [44, 66, 81]},
            {"category": "Transport",      "values": [58, 72, 77]},
            {"category": "Administrative", "values": [67, 74, 80]},
            {"category": "Education",      "values": [71, 69, 70]},
        ],
    },
    # Touched vs untouched, matched on risk band.
    "comparison": [
        {"label": "Task completion before surgery", "touched": 78, "untouched": 47,
         "unit": "%", "better": "high"},
        {"label": "Cancelled or no-showed",         "touched": 9.6, "untouched": 13.8,
         "unit": "%", "better": "low"},
        {"label": "Risk score on the day",          "touched": 31, "untouched": 58,
         "unit": "", "better": "low"},
    ],
}

out = {
    "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    "today": TODAY.isoformat(),
    "practices": PRACTICES,
    "impact": IMPACT,
    "cohort_metrics": {
        "critical_clearance_pct": round(100 * cleared_critical / all_critical),
        "critical_cleared": cleared_critical,
        "critical_total": all_critical,
    },
    "patients": patients,
}
(HERE / "worklist.json").write_text(json.dumps(out, indent=2))

from collections import Counter
print(f"{len(patients)} patients")
print("bands:", Counter(p["risk_band"] for p in patients))
print("tabs: ", Counter(p["tab"] for p in patients))
print("critical clearance:", out["cohort_metrics"]["critical_clearance_pct"], "%")
for p in patients[:6]:
    print(f"  {p['risk_score']:>3} {p['risk_band']:>5} {p['name']:<22} "
          f"{p['critical_open']}crit  {p['open_tasks'][0]['tier'] if p['open_tasks'] else '-'}")
