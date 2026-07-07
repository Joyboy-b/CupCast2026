from __future__ import annotations

import math
import random

from worldcup2026.data_loader import Team


def poisson_sample(mean: float, rng: random.Random) -> int:
    """Sample a Poisson value without requiring numpy."""
    threshold = math.exp(-mean)
    product = 1.0
    goals = 0

    while product > threshold:
        goals += 1
        product *= rng.random()

    return goals - 1


def expected_goals(team: Team, opponent: Team, neutral: bool = True) -> float:
    rating_edge = (team.rating - opponent.rating) / 420.0
    home_edge = 0.0 if neutral else 0.08
    strength = math.exp(rating_edge + home_edge)
    return max(0.18, 1.18 * team.attack * opponent.defense * strength)


def simulate_score(team_a: Team, team_b: Team, rng: random.Random) -> tuple[int, int]:
    goals_a = poisson_sample(expected_goals(team_a, team_b), rng)
    goals_b = poisson_sample(expected_goals(team_b, team_a), rng)
    return goals_a, goals_b


def penalty_winner(team_a: Team, team_b: Team, rng: random.Random) -> Team:
    probability_a = 1.0 / (1.0 + 10 ** ((team_b.rating - team_a.rating) / 800.0))
    return team_a if rng.random() < probability_a else team_b
