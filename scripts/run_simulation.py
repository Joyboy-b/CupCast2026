from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from worldcup2026.data_loader import load_teams
from worldcup2026.simulate import summarize_simulations


def main() -> None:
    parser = argparse.ArgumentParser(description="Run World Cup 2026 Monte Carlo simulations.")
    parser.add_argument("--iterations", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--teams", type=Path, default=ROOT / "data" / "teams_seed.csv")
    parser.add_argument("--output", type=Path, default=ROOT / "outputs" / "simulation_results.json")
    parser.add_argument("--dashboard-data", type=Path, default=ROOT / "dashboard" / "data.js")
    args = parser.parse_args()

    teams = load_teams(args.teams)
    results = summarize_simulations(teams, iterations=args.iterations, seed=args.seed)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(results, indent=2)
    args.output.write_text(payload, encoding="utf-8")

    args.dashboard_data.parent.mkdir(parents=True, exist_ok=True)
    args.dashboard_data.write_text(f"window.SIMULATION_RESULTS = {payload};\n", encoding="utf-8")

    champion = results["teams"][0]
    print(f"Simulated {args.iterations:,} tournaments.")
    print(f"Top champion pick: {champion['team']} ({champion['championOdds']}%).")
    print(f"Wrote {args.output}.")
    print(f"Wrote {args.dashboard_data}.")


if __name__ == "__main__":
    main()
