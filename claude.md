prime directive: don't do anything you're unclear about ask me about it.
use uv
run python tools with uv run python
do not edit pyproject.toml dependencies directly
use uv add LIB or uv add --dev LIB
use pytest to implement tdd
use pytest fixtures in conftest.py to DRY
use ruff to lint
use ty to typecheck
use prek for precommits
use logging to help ai debug
do not hide or wrap errors.

<!-- factotum:blocked-protocol -->
**Blockers → Jira (fleet repo, system standard).** Anything only Evan can resolve — a credential, a deploy, external access, or a decision — becomes a ticket in the Jira `EA` space on *Needs Evan*, component `guzzolene`, **with the specific steps a human takes to unblock it** (the action, where, any URL / path / env-var). From a session on Evan's Mac, file it with `uv run --project ~/Documents/_system sys file-blocker --component guzzolene --title "…" --body-file steps.md` (add `--nice-to-have` for 🟡; default 🔴); fleet daemon runs on the box park their own ticket on *Needs Evan* instead. Two kinds stay in the root `BLOCKED.md`, in the standard format: **`[sec]` blockers** (`- [ ] 🔴 [sec] …`, because the security dashboard counts them only there, D-052) and anything Jira must not hold — roster/user data, secret values, unpublished writing (D-039). `BLOCKED.md` keeps its heading and a pointer to Jira. _system's blocked-router mirrors both into Evan's todo dashboard. Full rule: Evan's global `~/.claude/CLAUDE.md` and _system D-051/D-052.
<!-- /factotum:blocked-protocol -->
