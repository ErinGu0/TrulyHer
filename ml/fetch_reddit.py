"""Step 0b -- pull targeted imposter-syndrome posts from Reddit.

Why this exists
---------------
The HuggingFace datasets reachable without credentials turned out to contain
almost no imposter syndrome. Measured marker rates:

    r/careerguidance                            2.0%
    counsel-chat                                2.1%
    mental_health_counseling_conversations      1.5%
    Student-Mental-Health-Counseling-10K        0.8%

and when Gemini annotated 300 of those texts, only 5 carried any label at all.
Those corpora are about relationships, logistics and clinical distress. This
classifier needs people writing about doubting their own competence, and the
places that happens are r/ImposterSyndrome, r/cscareerquestions, r/GradSchool
and similar.

Reddit blocks unauthenticated API access (403), so this needs a free app
credential. Application-only OAuth is enough -- read-only, no user account
involved, no password grant.

Setup (about 10 minutes, free):
    1. https://www.reddit.com/prefs/apps  ->  "create another app..."
    2. Type: script.  Redirect URI: http://localhost:8080  (required, unused)
    3. Copy the client id (under the app name) and the secret
    4. Add to .env:
           REDDIT_CLIENT_ID=...
           REDDIT_CLIENT_SECRET=...

Usage:
    python3 ml/fetch_reddit.py
    python3 ml/fetch_reddit.py --per-query 200

Output: ml/data/raw/reddit_scan.jsonl, picked up automatically by fetch_corpus.py
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from config import PROJECT_ROOT, RAW_DIR

TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
API = "https://oauth.reddit.com"
USER_AGENT = "python:trulyher-corpus:v1.0 (research corpus for a classifier)"

MIN_CHARS = 80          # higher than the HF path: Reddit titles alone are noise
MAX_CHARS = 4000

# Reddit allows 100 requests/minute on OAuth. Half that leaves room for retries
# and keeps this well inside the free allowance.
REQUESTS_PER_MINUTE = 30

# Subreddits where people actually write about doubting their own competence,
# rather than asking for career logistics.
SUBREDDITS = [
    "ImposterSyndrome",
    "cscareerquestions",
    "ExperiencedDevs",
    "GradSchool",
    "AskAcademia",
    "womenintech",
    "learnprogramming",
    "jobs",
]

# Phrasings people actually use. Deliberately overlapping -- Reddit's relevance
# search is fuzzy, and the union across queries beats any single one.
QUERIES = [
    "imposter syndrome",
    "impostor syndrome",
    "feel like a fraud",
    "not good enough for this job",
    "don't deserve this job",
    "everyone else knows more than me",
    "faking it until they find out",
    "only got the job because",
    "they will realize I'm not qualified",
    "in over my head at work",
    "compared to my coworkers I'm behind",
]

JUNK = {"[removed]", "[deleted]", "", "."}


def load_credentials():
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    secret = os.environ.get("REDDIT_CLIENT_SECRET")
    if client_id and secret:
        return client_id, secret

    env_path = PROJECT_ROOT / ".env"
    values = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip()

    return values.get("REDDIT_CLIENT_ID"), values.get("REDDIT_CLIENT_SECRET")


def get_token(client_id, secret):
    """Application-only OAuth: read-only, tied to the app rather than a user."""
    credentials = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    request = urllib.request.Request(
        TOKEN_URL,
        data=urllib.parse.urlencode({"grant_type": "client_credentials"}).encode(),
        headers={
            "Authorization": f"Basic {credentials}",
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as error:
        body = error.read().decode()[:200]
        if error.code == 401:
            raise SystemExit(
                "Reddit rejected the credentials (401).\n"
                "Check that the app type is 'script' and that the client id is the\n"
                "short string UNDER the app name, not the app name itself."
            )
        raise SystemExit(f"Token request failed: {error.code} {body}")


def api_get(token, path, **params):
    url = f"{API}{path}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT}
    )

    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429:
                wait = 30 * (attempt + 1)
                print(f"    rate limited, waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if error.code in (403, 404):
                return None          # private, banned, or nonexistent subreddit
            if error.code >= 500 and attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < 3:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    return None


def extract(post):
    data = post.get("data", {})
    body = (data.get("selftext") or "").strip()
    if body.lower() in JUNK:
        body = ""
    title = (data.get("title") or "").strip()

    text = " ".join(f"{title}. {body}".split()).strip(". ").strip()
    if not (MIN_CHARS <= len(text) <= MAX_CHARS):
        return None
    return text, data.get("subreddit", "unknown")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-query", type=int, default=100,
                        help="posts to request per subreddit+query pair (max 100)")
    parser.add_argument("--negatives", type=int, default=1200,
                        help="untargeted posts from the same subreddits, as negatives")
    args = parser.parse_args()

    client_id, secret = load_credentials()
    if not client_id or not secret:
        raise SystemExit(
            "REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not found in the environment "
            "or .env.\nSee this file's docstring for the 10-minute setup."
        )

    token = get_token(client_id, secret)
    print("Authenticated with Reddit (application-only, read-only)\n")

    interval = 60.0 / REQUESTS_PER_MINUTE
    collected = {}
    per_subreddit = {}

    # --- Targeted: where the positives are -------------------------------
    print(f"Searching {len(SUBREDDITS)} subreddits x {len(QUERIES)} queries")
    for subreddit in SUBREDDITS:
        before = len(collected)
        for query in QUERIES:
            started = time.time()
            payload = api_get(
                token, f"/r/{subreddit}/search",
                q=query, restrict_sr="on", sort="relevance",
                limit=min(args.per_query, 100), t="all",
            )
            if payload:
                for post in payload.get("data", {}).get("children", []):
                    result = extract(post)
                    if not result:
                        continue
                    text, sub = result
                    key = text.lower()[:200]
                    if key not in collected:
                        collected[key] = (text, sub, "targeted")
                        per_subreddit[sub] = per_subreddit.get(sub, 0) + 1

            elapsed = time.time() - started
            if interval > elapsed:
                time.sleep(interval - elapsed)

        print(f"  r/{subreddit:<20} +{len(collected) - before:>4}  (total {len(collected)})")

    targeted_count = len(collected)

    # --- Untargeted: same voices, same subreddits, mostly NOT imposter ----
    # Negatives drawn from elsewhere would let the model separate classes on
    # style. These read identically and force it to learn the content.
    print(f"\nCollecting up to {args.negatives} untargeted posts as negatives")
    for subreddit in SUBREDDITS:
        after = None
        for _ in range(6):
            if len(collected) - targeted_count >= args.negatives:
                break
            started = time.time()
            params = {"limit": 100, "t": "year"}
            if after:
                params["after"] = after
            payload = api_get(token, f"/r/{subreddit}/top", **params)
            if not payload:
                break

            children = payload.get("data", {}).get("children", [])
            after = payload.get("data", {}).get("after")
            for post in children:
                result = extract(post)
                if not result:
                    continue
                text, sub = result
                key = text.lower()[:200]
                if key not in collected:
                    collected[key] = (text, sub, "untargeted")

            elapsed = time.time() - started
            if interval > elapsed:
                time.sleep(interval - elapsed)
            if not after:
                break

        print(f"  r/{subreddit:<20} total {len(collected)}")

    # --- Write -----------------------------------------------------------
    output = RAW_DIR / "reddit_scan.jsonl"
    with output.open("w") as handle:
        for text, subreddit, kind in collected.values():
            handle.write(json.dumps(
                {"text": text, "subreddit": subreddit, "retrieval": kind}) + "\n")

    print(f"\nWrote {len(collected)} posts to {output}")
    print(f"  targeted (likely positives):   {targeted_count}")
    print(f"  untargeted (mostly negatives): {len(collected) - targeted_count}")

    try:
        from fetch_corpus import MARKER_RE
        hits = sum(1 for text, _, _ in collected.values() if MARKER_RE.search(text))
        print(f"\nMarker rate: {hits}/{len(collected)} ({hits / max(len(collected), 1):.1%})")
        print("  (compare: 2.0% for r/careerguidance, which was too thin to train on)")
    except ImportError:
        pass

    print("\nNext: python3 ml/fetch_corpus.py --limit 3000")
    print("      then: python3 ml/label_data.py --limit 3000")


if __name__ == "__main__":
    main()
