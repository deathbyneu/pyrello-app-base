from __future__ import annotations

import random


DEFAULT_BOARD_BACKGROUNDS = (
    {
        "storage_name": "defaults/alpine-lake.jpg",
        "original_name": "Alpine Lake",
    },
    {
        "storage_name": "defaults/mountain-lake.jpg",
        "original_name": "Mountain Lake",
    },
    {
        "storage_name": "defaults/ocean-waves.jpg",
        "original_name": "Ocean Waves",
    },
    {
        "storage_name": "defaults/courtyard-palm-trees.jpg",
        "original_name": "Courtyard Palm Trees",
    },
)

DEFAULT_BOARD_BACKGROUND_NAMES = {
    background["storage_name"] for background in DEFAULT_BOARD_BACKGROUNDS
}


def is_default_board_background(storage_name: str | None) -> bool:
    return bool(storage_name) and storage_name in DEFAULT_BOARD_BACKGROUND_NAMES


def pick_random_default_board_background(
    exclude_storage_names: set[str] | None = None,
) -> dict[str, str]:
    excluded = exclude_storage_names or set()
    candidates = [
        background
        for background in DEFAULT_BOARD_BACKGROUNDS
        if background["storage_name"] not in excluded
    ]
    if not candidates:
        candidates = list(DEFAULT_BOARD_BACKGROUNDS)

    background = random.choice(candidates)
    return {
        "storage_name": background["storage_name"],
        "original_name": background["original_name"],
    }
