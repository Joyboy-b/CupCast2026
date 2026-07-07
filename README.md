# World Cup 2026 Predictor

A Python-first project for World Cup data analysis, match prediction, and Monte Carlo tournament simulations, with a custom browser dashboard for exploring the results.

The included `data/teams_seed.csv` is a starter field for experimentation. Replace it with the official final teams, groups, and ratings when you want production-grade predictions.

## What It Does

- Builds match probabilities from team attack, defense, and rating values.
- Simulates the 48-team, 12-group World Cup format.
- Advances top two teams from each group plus the eight best third-place teams.
- Runs a round-of-32 knockout bracket through the final.
- Exports champion, final, semifinal, quarterfinal, knockout, and group-advance odds.
- Powers a custom dashboard from `outputs/simulation_results.json`.

## Quick Start

```powershell
python scripts/run_simulation.py --iterations 5000
```

Or use the helper script:

```powershell
.\scripts\run_simulation.ps1 10000
```

Then open:

```text
dashboard/index.html
```

For the freshest dashboard results, serve the folder locally so the browser can read the JSON file:

```powershell
python -m http.server 8000
```

Or use the helper script:

```powershell
.\scripts\start_dashboard.ps1 8000
```

Then visit:

```text
http://localhost:8000/dashboard/
```

## Project Layout

```text
data/
  teams_seed.csv
dashboard/
  index.html
  styles.css
  app.js
outputs/
  simulation_results.json
scripts/
  run_simulation.py
src/
  worldcup2026/
    data_loader.py
    ratings.py
    simulate.py
```

## Improve The Model Next

- Swap seed ratings for Elo, FIFA ranking, betting-market, or SPI-style ratings.
- Add recent match data and train calibration curves.
- Add injury, travel, rest, host, and altitude adjustments.
- Backtest against prior tournaments before trusting future probabilities.
