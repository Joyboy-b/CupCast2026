const state = {
  data: null,
  activeRegion: "All",
  sortKey: "championOdds",
  search: "",
  selectedTeam: null,
};

const fallbackData = {
  meta: {
    title: "World Cup 2026 Predictor",
    iterations: 0,
    note: "Run python scripts/run_simulation.py, then serve the project with python -m http.server 8000 for live results.",
  },
  teams: [],
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
  render();
}

function render() {
  renderSummary();
  renderFilters();
  renderTable();
  renderSelectedTeam();
  renderGroups();
  renderBracket();
}

function renderSummary() {
  const { meta, teams } = state.data;
  const favorite = teams[0];
  const longshot = teams
    .filter((team) => team.championOdds > 0)
    .sort((a, b) => a.rating - b.rating || b.championOdds - a.championOdds)[0];

  document.getElementById("summaryText").textContent = meta.note;
  document.getElementById("metricIterations").textContent = formatNumber(meta.iterations);
  document.getElementById("metricFavorite").textContent = favorite
    ? `${favorite.team} ${favorite.championOdds}%`
    : "-";
  document.getElementById("metricLongshot").textContent = longshot
    ? `${longshot.team} ${longshot.championOdds}%`
    : "-";
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
      <td><span class="team-name">${team.team}</span><br><small>${team.region}</small></td>
      <td>${team.group}</td>
      <td>${Math.round(team.rating)}</td>
      <td>
        <div class="odds-cell">
          <div class="bar"><span style="width:${clamp(team.championOdds, 0, 100)}%"></span></div>
          <strong>${team.championOdds}%</strong>
        </div>
      </td>
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
      const list = sorted.map((team) => `<li>${team.team} <small>${Math.round(team.rating)}</small></li>`).join("");
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
