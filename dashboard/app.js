const state = {
  data: null,
  activeRegion: "All",
  sortKey: "championOdds",
  search: "",
  selectedTeam: null,
  live: null,
};


const fallbackLiveState = {
  asOf: "2026-07-08",
  stage: "Quarterfinals next",
  headline: "Round of 16 complete. Quarterfinals are set.",
  note: "Argentina, Switzerland, Morocco, France, Norway, England, Spain, and Belgium are through to the quarterfinals.",
  quarterfinals: [
    { match: "QF1", teamA: "Morocco", teamB: "France", status: "Next", path: "Morocco 3-0 Canada / France 1-0 Paraguay" },
    { match: "QF2", teamA: "Norway", teamB: "England", status: "Next", path: "Norway 2-1 Brazil / England 3-2 Mexico" },
    { match: "QF3", teamA: "Spain", teamB: "Belgium", status: "Next", path: "Spain 1-0 Portugal / Belgium 4-1 United States" },
    { match: "QF4", teamA: "Argentina", teamB: "Switzerland", status: "Next", path: "Argentina 3-2 Egypt / Switzerland 0-0 Colombia, 4-3 pens" },
  ],
  roundOf16: [],
  eliminatedHeavyweights: ["Brazil", "Portugal", "Colombia", "United States"],
};
const fallbackData = {
  meta: {
    title: "CupCast 2026",
    iterations: 0,
    note: "Run python scripts/run_simulation.py, then serve the project with python -m http.server 8000 for live results.",
  },
  teams: [],
  regionOdds: [],
  insights: {},
  sampleBracket: [],
};

async function loadData() {
  try {
    const response = await fetch("../outputs/simulation_results.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No simulation output yet.");
    state.data = await response.json();
  } catch (error) {
    state.data = window.SIMULATION_RESULTS || fallbackData;
  }

  state.selectedTeam = state.data.teams[0] || null;
  await loadLiveState();
  render();
}

async function loadLiveState() {
  try {
    const response = await fetch("../data/current_tournament.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No live tournament data yet.");
    state.live = await response.json();
  } catch (error) {
    state.live = fallbackLiveState;
  }
}
function render() {
  renderSummary();
  renderLiveState();
  renderFilters();
  renderTable();
  renderSelectedTeam();
  renderRegionRace();
  renderInsights();
  renderGroups();
  renderBracket();
}

function renderLiveState() {
  const live = state.live || fallbackLiveState;
  document.getElementById("liveHeadline").textContent = live.headline;
  document.getElementById("liveStage").textContent = `${live.stage} / ${live.asOf}`;
  document.getElementById("liveNote").textContent = live.note;

  document.getElementById("quarterfinalGrid").innerHTML = live.quarterfinals
    .map(
      (match) => `
      <article class="qf-card">
        <div class="qf-kicker">${match.match} / ${match.status}</div>
        <strong>${match.teamA} vs ${match.teamB}</strong>
        <small>${match.path}</small>
      </article>
    `
    )
    .join("");

  document.getElementById("roundResults").innerHTML = live.roundOf16.length
    ? live.roundOf16
        .map(
          (result) => `
          <div class="result-pill">
            <strong>${result.winner}</strong>
            <span>${result.score}</span>
            <small>${result.loser}${result.method === "FT" ? "" : ` / ${result.method}`}</small>
          </div>
        `
        )
        .join("")
    : "";
}
function renderSummary() {
  const { meta, teams, insights = {} } = state.data;
  const favorite = teams[0];
  const longshot = teams
    .filter((team) => team.championOdds > 0 && team.championOdds < 2)
    .sort((a, b) => b.championOdds - a.championOdds || a.rating - b.rating)[0];

  document.getElementById("summaryText").textContent = meta.note;
  document.getElementById("metricIterations").textContent = formatNumber(meta.iterations);
  document.getElementById("metricFavorite").textContent = favorite
    ? `${favorite.team} ${favorite.championOdds}%`
    : "-";
  document.getElementById("metricLongshot").textContent = longshot
    ? `${longshot.team} ${longshot.championOdds}%`
    : "-";
  document.getElementById("metricContenders").textContent = insights.titleContenders || 0;
}

function renderFilters() {
  const regions = ["All", ...new Set(state.data.teams.map((team) => team.region))];
  const container = document.getElementById("regionFilters");
  container.innerHTML = "";

  for (const region of regions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = region;
    button.className = region === state.activeRegion ? "active" : "";
    button.addEventListener("click", () => {
      state.activeRegion = region;
      renderTable();
    });
    container.appendChild(button);
  }
}

function renderTable() {
  const teams = filteredTeams();
  const tbody = document.getElementById("teamsTable");
  tbody.innerHTML = "";
  document.getElementById("teamCount").textContent = `${teams.length} teams`;

  for (const team of teams) {
    const row = document.createElement("tr");
    row.className = state.selectedTeam?.team === team.team ? "active" : "";
    row.innerHTML = `
      <td><span class="team-name">${team.team}</span><br><small>${team.region} / ${team.groupAdvanceOdds}% advance</small></td>
      <td>${team.group}</td>
      <td>${Math.round(team.rating)}</td>
      <td>
        <div class="odds-cell">
          <div class="bar"><span style="width:${clamp(team.championOdds, 0, 100)}%"></span></div>
          <strong>${team.championOdds}%</strong>
        </div>
      </td>
      <td>${team.groupWinnerOdds ?? 0}%</td>
      <td>${team.finalOdds}%</td>
    `;
    row.addEventListener("click", () => {
      state.selectedTeam = team;
      renderTable();
      renderSelectedTeam();
    });
    tbody.appendChild(row);
  }
}

function renderSelectedTeam() {
  const team = state.selectedTeam;
  document.getElementById("selectedTeamName").textContent = team ? team.team : "No team selected";

  const radar = document.getElementById("oddsRadar");
  const stats = document.getElementById("selectedStats");

  if (!team) {
    radar.innerHTML = "<p>No simulation data yet.</p>";
    stats.innerHTML = "";
    return;
  }

  radar.innerHTML = `
    <div class="radar-chart" style="--champion:${team.championOdds * 3.6}deg; --final:${team.finalOdds * 3.6}deg; --semi:${team.semifinalOdds * 3.6}deg;">
      <strong>${team.championOdds}%<br>title</strong>
    </div>
  `;

  const rows = [
    ["Group", team.group],
    ["Region", team.region],
    ["Rating", Math.round(team.rating)],
    ["Group winner", `${team.groupWinnerOdds ?? 0}%`],
    ["Group advance", `${team.groupAdvanceOdds}%`],
    ["Knockout", `${team.knockoutOdds}%`],
    ["Quarterfinal", `${team.quarterfinalOdds}%`],
    ["Semifinal", `${team.semifinalOdds}%`],
    ["Final", `${team.finalOdds}%`],
  ];

  stats.innerHTML = rows
    .map(([label, value]) => `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderRegionRace() {
  const regions = state.data.regionOdds || [];
  const container = document.getElementById("regionRace");

  container.innerHTML = regions.length
    ? regions
        .map(
          (region) => `
          <div class="race-row">
            <div>
              <strong>${region.region}</strong>
              <small>${region.championOdds}% title share</small>
            </div>
            <div class="bar"><span style="width:${clamp(region.championOdds, 0, 100)}%"></span></div>
          </div>
        `
        )
        .join("")
    : "<p>No region summary yet.</p>";
}

function renderInsights() {
  const insights = state.data.insights || {};
  const container = document.getElementById("modelInsights");
  const cards = [
    ["Top favorite", formatTeamLine((insights.topFavorites || [])[0], "championOdds", "title")],
    ["Best group pick", formatTeamLine((insights.safestGroupPicks || [])[0], "groupWinnerOdds", "group")],
    ["Upset watch", formatTeamLine((insights.upsetWatch || [])[0], "groupAdvanceOdds", "advance")],
    ["Live longshot", formatTeamLine((insights.liveLongshots || [])[0], "championOdds", "title")],
  ];

  container.innerHTML = cards
    .map(
      ([label, value]) => `
      <div class="insight-chip">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `
    )
    .join("");
}

function renderGroups() {
  const groups = new Map();
  for (const team of state.data.teams) {
    if (!groups.has(team.group)) groups.set(team.group, []);
    groups.get(team.group).push(team);
  }

  document.getElementById("groupMap").innerHTML = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, teams]) => {
      const sorted = teams.sort((a, b) => b.rating - a.rating);
      const list = sorted
        .map((team) => `<li>${team.team} <small>${Math.round(team.rating)} / ${team.groupWinnerOdds ?? 0}%</small></li>`)
        .join("");
      return `<section class="group-tile"><h3>Group ${group}</h3><ol>${list}</ol></section>`;
    })
    .join("");
}

function renderBracket() {
  const bracket = state.data.sampleBracket || [];
  const visible = bracket.filter((match) => ["Quarterfinals", "Semifinals", "Final"].includes(match.round));
  document.getElementById("bracketList").innerHTML = visible.length
    ? visible
        .map(
          (match) => `
          <div class="match">
            <small>${match.round}</small>
            <strong>${match.teamA} vs ${match.teamB}</strong>
            <span>${match.score} ${match.winner}</span>
          </div>
        `
        )
        .join("")
    : "<p>No bracket generated yet.</p>";
}

function filteredTeams() {
  const search = state.search.trim().toLowerCase();
  return state.data.teams
    .filter((team) => state.activeRegion === "All" || team.region === state.activeRegion)
    .filter((team) => !search || team.team.toLowerCase().includes(search))
    .sort((a, b) => b[state.sortKey] - a[state.sortKey] || b.rating - a.rating);
}

function formatTeamLine(team, key, suffix) {
  return team ? `${team.team}<br><small>${team[key] ?? 0}% ${suffix}</small>` : "-";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTable();
});

document.getElementById("sortSelect").addEventListener("change", (event) => {
  state.sortKey = event.target.value;
  renderTable();
});

loadData();



