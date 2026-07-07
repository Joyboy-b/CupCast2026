from __future__ import annotations

import itertools
import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field

from worldcup2026.data_loader import Team
from worldcup2026.ratings import penalty_winner, simulate_score


@dataclass
class TeamRecord:
    team: Team
    points: int = 0
    goals_for: int = 0
    goals_against: int = 0
    wins: int = 0
    draws: int = 0

    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against


@dataclass
class SimulationSummary:
    iterations: int
    champion: Counter[str] = field(default_factory=Counter)
    runner_up: Counter[str] = field(default_factory=Counter)
    semifinal: Counter[str] = field(default_factory=Counter)
    quarterfinal: Counter[str] = field(default_factory=Counter)
    knockout: Counter[str] = field(default_factory=Counter)
    group_advance: Counter[str] = field(default_factory=Counter)
    sample_bracket: list[dict[str, str]] = field(default_factory=list)


def run_tournament(teams: list[Team], rng: random.Random) -> dict[str, object]:
    groups = group_teams(teams)
    group_tables = {name: simulate_group(members, rng) for name, members in groups.items()}
    qualifiers = qualify_from_groups(group_tables)
    bracket_teams = seed_knockout(qualifiers)
    rounds = play_knockout(bracket_teams, rng)

    return {
        "group_tables": group_tables,
        "qualifiers": qualifiers,
        "rounds": rounds,
        "champion": rounds[-1]["matches"][0]["winner"],
        "runner_up": rounds[-1]["matches"][0]["loser"],
    }


def summarize_simulations(teams: list[Team], iterations: int, seed: int = 2026) -> dict[str, object]:
    rng = random.Random(seed)
    summary = SimulationSummary(iterations=iterations)

    for index in range(iterations):
        result = run_tournament(teams, rng)
        rounds = result["rounds"]
        summary.champion[result["champion"].name] += 1
        summary.runner_up[result["runner_up"].name] += 1

        for team in result["qualifiers"]:
            summary.group_advance[team.name] += 1
            summary.knockout[team.name] += 1

        for team in rounds[1]["teams"]:
            summary.quarterfinal[team.name] += 1
        for team in rounds[2]["teams"]:
            summary.semifinal[team.name] += 1

        if index == 0:
            summary.sample_bracket = serialize_bracket(rounds)

    return serialize_summary(summary, teams)


def group_teams(teams: list[Team]) -> dict[str, list[Team]]:
    groups: dict[str, list[Team]] = defaultdict(list)
    for team in teams:
        groups[team.group].append(team)
    return dict(sorted(groups.items()))


def simulate_group(teams: list[Team], rng: random.Random) -> list[TeamRecord]:
    records = {team.name: TeamRecord(team=team) for team in teams}

    for team_a, team_b in itertools.combinations(teams, 2):
        goals_a, goals_b = simulate_score(team_a, team_b, rng)
        record_a = records[team_a.name]
        record_b = records[team_b.name]

        record_a.goals_for += goals_a
        record_a.goals_against += goals_b
        record_b.goals_for += goals_b
        record_b.goals_against += goals_a

        if goals_a > goals_b:
            record_a.points += 3
            record_a.wins += 1
        elif goals_b > goals_a:
            record_b.points += 3
            record_b.wins += 1
        else:
            record_a.points += 1
            record_b.points += 1
            record_a.draws += 1
            record_b.draws += 1

    return sorted(
        records.values(),
        key=lambda record: (
            record.points,
            record.goal_difference,
            record.goals_for,
            record.wins,
            record.team.rating,
        ),
        reverse=True,
    )


def qualify_from_groups(group_tables: dict[str, list[TeamRecord]]) -> list[Team]:
    automatic: list[Team] = []
    third_place: list[TeamRecord] = []

    for table in group_tables.values():
        automatic.extend(record.team for record in table[:2])
        third_place.append(table[2])

    best_thirds = sorted(
        third_place,
        key=lambda record: (
            record.points,
            record.goal_difference,
            record.goals_for,
            record.wins,
            record.team.rating,
        ),
        reverse=True,
    )[:8]

    return automatic + [record.team for record in best_thirds]


def seed_knockout(qualifiers: list[Team]) -> list[Team]:
    seeded = sorted(qualifiers, key=lambda team: team.rating, reverse=True)
    bracket: list[Team] = []
    for left, right in zip(seeded[:16], reversed(seeded[16:])):
        bracket.extend([left, right])
    return bracket


def play_knockout(teams: list[Team], rng: random.Random) -> list[dict[str, object]]:
    round_names = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"]
    rounds: list[dict[str, object]] = []
    current = teams

    for round_name in round_names:
        matches = []
        winners = []
        for team_a, team_b in zip(current[::2], current[1::2]):
            goals_a, goals_b = simulate_score(team_a, team_b, rng)
            if goals_a == goals_b:
                winner = penalty_winner(team_a, team_b, rng)
            else:
                winner = team_a if goals_a > goals_b else team_b
            loser = team_b if winner == team_a else team_a
            winners.append(winner)
            matches.append(
                {
                    "team_a": team_a,
                    "team_b": team_b,
                    "score": f"{goals_a}-{goals_b}",
                    "winner": winner,
                    "loser": loser,
                }
            )
        rounds.append({"name": round_name, "teams": winners, "matches": matches})
        current = winners

    return rounds


def serialize_summary(summary: SimulationSummary, teams: list[Team]) -> dict[str, object]:
    return {
        "meta": {
            "title": "World Cup 2026 Predictor",
            "iterations": summary.iterations,
            "note": "Seed data is illustrative and should be replaced with official teams/groups before serious use.",
        },
        "teams": [
            {
                "team": team.name,
                "group": team.group,
                "region": team.region,
                "rating": team.rating,
                "attack": team.attack,
                "defense": team.defense,
                "championOdds": pct(summary.champion[team.name], summary.iterations),
                "finalOdds": pct(summary.champion[team.name] + summary.runner_up[team.name], summary.iterations),
                "semifinalOdds": pct(summary.semifinal[team.name], summary.iterations),
                "quarterfinalOdds": pct(summary.quarterfinal[team.name], summary.iterations),
                "knockoutOdds": pct(summary.knockout[team.name], summary.iterations),
                "groupAdvanceOdds": pct(summary.group_advance[team.name], summary.iterations),
            }
            for team in sorted(teams, key=lambda item: summary.champion[item.name], reverse=True)
        ],
        "sampleBracket": summary.sample_bracket,
    }


def serialize_bracket(rounds: list[dict[str, object]]) -> list[dict[str, str]]:
    bracket = []
    for round_info in rounds:
        for match in round_info["matches"]:
            bracket.append(
                {
                    "round": round_info["name"],
                    "teamA": match["team_a"].name,
                    "teamB": match["team_b"].name,
                    "score": match["score"],
                    "winner": match["winner"].name,
                }
            )
    return bracket


def pct(count: int, iterations: int) -> float:
    return round((count / iterations) * 100, 2)
