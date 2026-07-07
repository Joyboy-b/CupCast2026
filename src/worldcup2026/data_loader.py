from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Team:
    group: str
    name: str
    region: str
    rating: float
    attack: float
    defense: float


def load_teams(path: Path) -> list[Team]:
    teams: list[Team] = []
    with path.open(newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            teams.append(
                Team(
                    group=row["group"].strip(),
                    name=row["team"].strip(),
                    region=row["region"].strip(),
                    rating=float(row["rating"]),
                    attack=float(row["attack"]),
                    defense=float(row["defense"]),
                )
            )

    if len(teams) != 48:
        raise ValueError(f"Expected 48 teams for the 2026 format, found {len(teams)}.")

    groups = {team.group for team in teams}
    if len(groups) != 12:
        raise ValueError(f"Expected 12 groups, found {len(groups)}.")

    return teams
