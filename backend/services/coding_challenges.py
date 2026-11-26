"""Curated coding challenges and interview warm-up questions."""

from __future__ import annotations

from copy import deepcopy

STARTERS = {
    "python": """import sys

def solve() -> None:
    data = sys.stdin.read().strip().split()
    if not data:
        return

    # TODO: parse the input and print the answer to stdout.
    # Example: print("0 1")

if __name__ == "__main__":
    solve()
""",
    "javascript": """const fs = require('node:fs');

const input = fs.readFileSync(0, 'utf8').trim();

// TODO: parse `input` and print the answer to stdout.
// console.log(result);
""",
    "typescript": """const fs = require('node:fs');

const input: string = fs.readFileSync(0, 'utf8').trim();

// TODO: parse `input` and print the answer to stdout.
// console.log(result);
""",
    "java": """import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder input = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            input.append(line).append('\\n');
        }

        // TODO: parse input and print the answer to stdout.
    }
}
""",
}

WARMUPS = [
    {
        "id": "requirements",
        "category": "Requirements",
        "question": "Before writing code, how do you restate the problem and its constraints to make sure you are solving the right thing?",
    },
    {
        "id": "testing",
        "category": "Testing",
        "question": "What edge cases would you test by hand before running the judge?",
    },
    {
        "id": "debugging",
        "category": "Debugging",
        "question": "A hidden test fails while all visible examples pass. What do you check first, and why?",
    },
    {
        "id": "judgment",
        "category": "Engineering judgment",
        "question": "How do you choose between a simple solution and a more optimized one when time is limited?",
    },
    {
        "id": "collaboration",
        "category": "HR · collaboration",
        "question": "Tell me about a time you disagreed with a product requirement or deadline. How did you handle it?",
    },
    {
        "id": "communication",
        "category": "HR · communication",
        "question": "How would you explain a technical tradeoff in this solution to a non-technical stakeholder?",
    },
    {
        "id": "language",
        "category": "Language depth",
        "question": "Which features of {language} do you rely on to keep this kind of solution readable and testable?",
    },
]


CHALLENGES = [
    {
        "id": "pair-sum",
        "title": "Pair Sum",
        "difficulty": "easy",
        "summary": "Find the two indices whose values add up to a target.",
        "prompt": (
            "Read n and target from the first line, then n integers from the second line. "
            "Print two space-separated 0-based indices i and j (i < j) such that "
            "nums[i] + nums[j] == target. Exactly one valid pair exists."
        ),
        "constraints": [
            "2 <= n <= 100,000",
            "-1,000,000,000 <= nums[i], target <= 1,000,000,000",
            "Exactly one valid pair exists",
            "Aim for O(n) time",
        ],
        "examples": [
            {"input": "4 9\n2 7 11 15", "output": "0 1"},
            {"input": "3 6\n3 2 4", "output": "1 2"},
        ],
        "hints": [
            "Store values you have already seen in a hash map.",
            "Map each value to its index, then look for target - value.",
            "Return the pair whose indices are in ascending order.",
        ],
        "expected_complexity": "O(n) time, O(n) space",
        "estimated_minutes": 15,
        "tests": [
            {"name": "sample 1", "input": "4 9\n2 7 11 15\n", "expected": "0 1", "sample": True},
            {"name": "sample 2", "input": "3 6\n3 2 4\n", "expected": "1 2", "sample": True},
            {"name": "duplicates", "input": "2 6\n3 3\n", "expected": "0 1", "sample": False},
            {"name": "negative values", "input": "6 8\n-3 4 3 90 1 5\n", "expected": "2 5", "sample": False},
            {"name": "large values", "input": "5 2000000000\n1000000000 1 2 3 1000000000\n", "expected": "0 4", "sample": False},
        ],
    },
    {
        "id": "balanced-brackets",
        "title": "Balanced Brackets",
        "difficulty": "medium",
        "summary": "Decide whether a string of brackets is correctly nested.",
        "prompt": (
            "Read one line containing only the characters ()[]{}. Print YES if every opening "
            "bracket is closed by the matching type in the correct order, otherwise print NO."
        ),
        "constraints": [
            "0 <= length <= 200,000",
            "Only the characters ()[]{} appear",
            "Aim for O(n) time and O(n) space",
        ],
        "examples": [
            {"input": "()[]{}", "output": "YES"},
            {"input": "([)]", "output": "NO"},
        ],
        "hints": [
            "Use a stack of opening brackets.",
            "When you see a closing bracket, compare it with the top of the stack.",
            "The stack must be empty at the end.",
        ],
        "expected_complexity": "O(n) time, O(n) space",
        "estimated_minutes": 20,
        "tests": [
            {"name": "sample 1", "input": "()[]{}\n", "expected": "YES", "sample": True},
            {"name": "sample 2", "input": "([)]\n", "expected": "NO", "sample": True},
            {"name": "nested", "input": "{[]}\n", "expected": "YES", "sample": False},
            {"name": "unclosed", "input": "(((\n", "expected": "NO", "sample": False},
            {"name": "closing first", "input": "]\n", "expected": "NO", "sample": False},
            {"name": "empty", "input": "\n", "expected": "YES", "sample": False},
        ],
    },
    {
        "id": "merge-intervals",
        "title": "Merge Intervals",
        "difficulty": "hard",
        "summary": "Merge all overlapping intervals and print the result in order.",
        "prompt": (
            "Read n from the first line, then n lines each containing start end. Merge every "
            "overlapping or touching interval and print each merged interval on its own line "
            "as start end. The output must be sorted by start."
        ),
        "constraints": [
            "1 <= n <= 100,000",
            "0 <= start <= end <= 1,000,000,000",
            "Intervals that touch, such as [1,4] and [4,5], must be merged",
            "Aim for O(n log n) time",
        ],
        "examples": [
            {"input": "4\n1 3\n2 6\n8 10\n15 18", "output": "1 6\n8 10\n15 18"},
            {"input": "3\n5 7\n1 2\n3 4", "output": "1 2\n3 4\n5 7"},
        ],
        "hints": [
            "Sort the intervals by their start value first.",
            "Keep the current merged interval and compare it with the next one.",
            "Merge when next.start <= current.end.",
        ],
        "expected_complexity": "O(n log n) time, O(n) space",
        "estimated_minutes": 30,
        "tests": [
            {
                "name": "sample 1",
                "input": "4\n1 3\n2 6\n8 10\n15 18\n",
                "expected": "1 6\n8 10\n15 18",
                "sample": True,
            },
            {
                "name": "sample 2",
                "input": "3\n5 7\n1 2\n3 4\n",
                "expected": "1 2\n3 4\n5 7",
                "sample": True,
            },
            {"name": "touching edges", "input": "2\n1 4\n4 5\n", "expected": "1 5", "sample": False},
            {"name": "inside one interval", "input": "3\n1 10\n2 3\n4 5\n", "expected": "1 10", "sample": False},
            {"name": "single interval", "input": "1\n7 9\n", "expected": "7 9", "sample": False},
            {
                "name": "unsorted and overlapping",
                "input": "5\n10 12\n1 3\n2 6\n11 15\n20 21\n",
                "expected": "1 6\n10 15\n20 21",
                "sample": False,
            },
        ],
    },
]


def get_challenge(challenge_id: str) -> dict | None:
    return next((challenge for challenge in CHALLENGES if challenge["id"] == challenge_id), None)


def list_challenges() -> list[dict]:
    """Return challenge metadata safe for the client (sample tests only)."""
    result = []
    for challenge in CHALLENGES:
        public = {key: deepcopy(value) for key, value in challenge.items() if key != "tests"}
        public["starters"] = deepcopy(STARTERS)
        public["sample_tests"] = [
            deepcopy(test) for test in challenge["tests"] if test.get("sample")
        ]
        result.append(public)
    return result


def get_warmups(language_label: str | None = None) -> list[dict]:
    result = []
    for warmup in WARMUPS:
        item = {**warmup}
        if language_label:
            item["question"] = item["question"].replace("{language}", language_label)
        result.append(item)
    return result
