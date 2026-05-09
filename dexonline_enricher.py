#!/usr/bin/env python3
"""
dexonline_enricher.py
─────────────────────
Reads verbs.json → scrapes dexonline.ro for definition + conjugation
of each base verb → saves verbs_dex.json in the same folder.

Requirements:
    pip install requests beautifulsoup4

Run:
    python dexonline_enricher.py

Input:  verbs.json   (must be in the same folder as this script)
Output: verbs_dex.json (created/updated in the same folder)

Resume-safe: if interrupted, re-running skips already-scraped verbs.
"""

import json
import os
import random
import sys
import time
import warnings

import requests
from bs4 import BeautifulSoup

# Suppress SSL warnings — corporate proxies use self-signed certs
warnings.filterwarnings("ignore", message="Unverified HTTPS request")
try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except Exception:
    pass

# ── Phrase → base infinitive mapping (all 166 phrases) ───────────────────────
PHRASE_TO_BASE = {
    "îi laudă":           "lăuda",
    "l-am așteptat":      "aștepta",
    "m-a sunat":          "suna",
    "a văzut-o":          "vedea",
    "vă aștept":          "aștepta",
    "le cunosc":          "cunoaște",
    "o așteptăm":         "aștepta",
    "îl voi căuta":       "căuta",
    "le laudă":           "lăuda",
    "am așteptat-o":      "aștepta",
    "te pot suna":        "suna",
    "ne-a văzut":         "vedea",
    "te așteptăm":        "aștepta",
    "îi cunoaștem":       "cunoaște",
    "o vom aștepta":      "aștepta",
    "mă vei căuta":       "căuta",
    "i-am cerut":         "cere",
    "îmi plac":           "plăcea",
    "ți-am cumpărat":     "cumpăra",
    "i-am trimis":        "trimite",
    "îți mulțumesc":      "mulțumi",
    "îmi vei trimite":    "trimite",
    "dă-i":               "da",
    "ne cumpărați":       "cumpăra",
    "ți-am cerut":        "cere",
    "îi plac":            "plăcea",
    "v-am cumpărat":      "cumpăra",
    "ne-au trimis":       "trimite",
    "vă mulțumesc":       "mulțumi",
    "vă voi trimite":     "trimite",
    "dă-mi":              "da",
    "le cumpărați":       "cumpăra",
    "mă întreabă":        "întreba",
    "te va vizita":       "vizita",
    "te-am căutat":       "căuta",
    "te voi invita":      "invita",
    "te va mușca":        "mușca",
    "l-am văzut":         "vedea",
    "o sun":              "suna",
    "îl voi îmbrățișa":   "îmbrățișa",
    "am cunoscut-o":      "cunoaște",
    "îl cunosc":          "cunoaște",
    "îi vom lua":         "lua",
    "ne-au vizitat":      "vizita",
    "ne ajută":           "ajuta",
    "v-am trimis":        "trimite",
    "vă pot ajuta":       "ajuta",
    "vă va suna":         "suna",
    "le-am văzut":        "vedea",
    "îi chem":            "chema",
    "îi voi ruga":        "ruga",
    "le-am întrebat":     "întreba",
    "îl suni":            "suna",
    "îi vei aduce":       "aduce",
    "îi pot explica":     "explica",
    "v-a adus":           "aduce",
    "îți dau":            "da",
    "îmi spui":           "spune",
    "îl găsesc":          "găsi",
    "să ne sune":         "suna",
    "i-am răspuns":       "răspunde",
    "te-am scris":        "scrie",
    "m-a rugat":          "ruga",
    "l-a sunat":          "suna",
    "a sunat-o":          "suna",
    "mă afectează":       "afecta",
    "m-au invitat":       "invita",
    "ne-a părăsit":       "părăsi",
    "o sperie":           "speria",
    "m-a împins":         "împinge",
    "mi-am scăpat":       "scăpa",
    "îți trimit":         "trimite",
    "mă vei înțelege":    "înțelege",
    "a învățat-o":        "învăța",
    "au concediat-o":     "concedia",
    "îmi place":          "plăcea",
    "să vă cumpărăm":     "cumpăra",
    "ai văzut-o":         "vedea",
    "le-am spus":         "spune",
    "mă sune":            "suna",
    "avertizați-mă":      "avertiza",
    "m-ați primit":       "primi",
    "ți-a spus":          "spune",
    "ți-a venit":         "veni",
    "deschide-i":         "deschide",
    "așteaptă-mă":        "aștepta",
    "te duc":             "duce",
    "mă pensezi":         "pensa",
    "să le trimitem":     "trimite",
    "o refuză":           "refuza",
    "îi mai invităm":     "invita",
    "mi-a promis":        "promite",
    "să-l primesc":       "primi",
    "îl cred":            "crede",
    "îți promit":         "promite",
    "îl perfecționez":    "perfecționa",
    "să-ți spună":        "spune",
    "ne-am întâlnit":     "întâlni",
    "l-am chemat":        "chema",
    "a luat-o":           "lua",
    "a închiriat-o":      "închiria",
    "l-ai văzut":         "vedea",
    "l-am achiziționat":  "achiziționa",
    "îi rog":             "ruga",
    "i-am avertizat":     "avertiza",
    "le duc":             "duce",
    "le repar":           "repara",
    "le vând":            "vinde",
    "le-am dus":          "duce",
    "le-am reparat":      "repara",
    "le-am vândut":       "vinde",
    "le împrumut":        "împrumuta",
    "le-am împrumutat":   "împrumuta",
    "mi-am cumpărat":     "cumpăra",
    "ți-ai cumpărat-o":   "cumpăra",
    "m-am rătăcit":       "rătăci",
    "te pricepi":         "pricepe",
    "ne aflăm":           "afla",
    "și-a întins":        "întinde",
    "m-a prins":          "prinde",
    "se simte":           "simți",
    "s-a vindecat":       "vindeca",
    "te comporti":        "comporta",
    "mă descurcam":       "descurca",
    "m-am accidentat":    "accidenta",
    "te-ai tuns":         "tunde",
    "și-au încercat":     "încerca",
    "ai veni":            "veni",
    "ne-am întâlni":      "întâlni",
    "ți-aș putea da":     "da",
    "ar fi venit":        "veni",
    "aș fi primit":       "primi",
    "ne-a abandonat":     "abandona",
    "atenționați-mă":     "atenționa",
    "îl cereți":          "cere",
    "vă însoțească":      "însoți",
    "ascultă-mă":         "asculta",
    "s-a terminat":       "termina",
    "ne vom întâlni":     "întâlni",
    "îmi permit":         "permite",
    "s-au spălat":        "spăla",
    "s-au îmbrăcat":      "îmbrăca",
    "m-am înscris":       "înscrie",
    "mă acceptă":         "accepta",
    "s-a trezit":         "trezi",
    "se roagă":           "ruga",
    "mă pieptăn":         "pieptăna",
    "vă pregătiți":       "pregăti",
    "ne certăm":          "certa",
    "m-ai fi ascultat":   "asculta",
    "mă voi înscrie":     "înscrie",
    "o vei înțelege":     "înțelege",
    "să-ți cumperi":      "cumpăra",
    "m-aș fi trezit":     "trezi",
    "le-aș fi trimis":    "trimite",
    "te-ar fi ajutat":    "ajuta",
    "te-ar suna":         "suna",
    "le-ați fi văzut":    "vedea",
    "îl voi chema":       "chema",
    "i-ai cere":          "cere",
    "le-aș cere":         "cere",
    "i-ai fi sunat":      "suna",
    "ne vei lua":         "lua",
    "mi-ai putea aduce":  "aduce",
    "ne vom distra":      "distra",
    "mi-am încercat":     "încerca",
}

# ── HTTP session ──────────────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})


def fetch_with_retry(url: str, retries: int = 4, base_delay: float = 2.0):
    """GET with exponential backoff + jitter. Raises on final failure.
    404 is never retried — it's a definitive 'not found'."""
    last_exc = None
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=12, verify=False)
            r.raise_for_status()
            return r
        except requests.exceptions.HTTPError as exc:
            # 404 = page doesn't exist — retrying won't help
            if exc.response is not None and exc.response.status_code == 404:
                raise
            last_exc = exc
            if attempt < retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0.3, 1.2)
                print(f"    ↻ retry {attempt + 1}/{retries - 1} in {delay:.1f}s ({exc})")
                time.sleep(delay)
        except requests.exceptions.RequestException as exc:
            last_exc = exc
            if attempt < retries - 1:
                delay = base_delay * (2 ** attempt) + random.uniform(0.3, 1.2)
                print(f"    ↻ retry {attempt + 1}/{retries - 1} in {delay:.1f}s ({exc})")
                time.sleep(delay)
    raise last_exc


def _el_text(el) -> str:
    """
    Extract clean text from a BeautifulSoup element.
    dexonline wraps stressed vowels in <span class="tonic-accent">, which causes
    get_text(separator=' ') to produce 'abandon a' instead of 'abandona'.
    Fix: remove tonic-accent wrappers by unwrapping them before extracting text.
    We work on a copy so the original soup is not modified.
    """
    import copy
    node = copy.copy(el)
    for ta in node.select(".tonic-accent"):
        ta.replace_with(ta.get_text())
    return node.get_text(" ", strip=True)


def _el_text_compact(el) -> str:
    """Same as _el_text but no spaces between tokens (for regex parsing of DOOM3)."""
    import copy
    node = copy.copy(el)
    for ta in node.select(".tonic-accent"):
        ta.replace_with(ta.get_text())
    return node.get_text("", strip=True)


def parse_definition(soup: BeautifulSoup) -> str:
    """First non-trivial definition text from span.def elements, max 500 chars."""
    # dexonline uses <span class="def"> — NOT <div class="def">
    for el in soup.select(".def"):
        text = _el_text(el)
        if len(text) > 30:
            return text[:500]
    return ""


def parse_doom3(soup: BeautifulSoup) -> str:
    """
    DOOM 3 morphology entry — most compact + reliable.
    Contains patterns like 'ind.prez.' in the compact (no-space) form.
    We return the compact form so regexes in parse_doom3_forms() work cleanly.
    Example (compact): 'abandona(a ~)vb.,ind.prez.1sg.abandonez,3abandonează;
                         conj.prez.1sg.să abandonez,3să abandoneze'
    """
    for el in soup.select(".def"):
        compact = _el_text_compact(el)
        if "ind.prez." in compact or "conj.prez." in compact:
            return compact[:600]
    return ""


def parse_doom3_forms(text: str) -> dict:
    """
    Parse DOOM 3 compact morphology text (no-space format from _el_text_compact).
    Input:  'abandona(a ~)vb.,ind.prez.1sg.abandonez,3abandonează;
             conj.prez.1sg.să abandonez,3să abandoneze'
    Output: {'prezent_1sg': 'abandonez', 'prezent_3': 'abandonează', ...}
    """
    import re
    forms = {}

    def find(pattern):
        m = re.search(pattern, text)
        return m.group(1).strip().rstrip(",;").strip() if m else ""

    # In compact format: "ind.prez.1sg." (no spaces), then the form follows
    forms["prezent_1sg"]     = find(r"ind\.prez\.[^;]*?1\s*sg\.(?:și3pl\.)?\s*([^,;]+)")
    forms["prezent_2sg"]     = find(r"ind\.prez\.[^;]*?2\s*sg\.\s*([^,;]+)")
    forms["prezent_3sg"]     = find(r"ind\.prez\.[^;]*?3\s*sg\.\s*([^,;]+)")
    forms["prezent_3"]       = find(r"ind\.prez\.[^;]*?,\s*3\s*([^,;]+)")
    forms["perf_simplu_1sg"] = find(r"perf\.s\.[^;]*?1\s*sg\.\s*([^,;]+)")
    forms["perf_simplu_1pl"] = find(r"perf\.s\.[^;]*?1\s*pl\.\s*([^,;]+)")
    forms["mmcp_1pl"]        = find(r"m\.m\.c\.p\.[^;]*?1\s*pl\.\s*([^,;]+)")
    forms["conjunctiv_1sg"]  = find(r"conj\.prez\.[^;]*?1\s*sg\.\s*([^,;]+)")
    forms["conjunctiv_3"]    = find(r"conj\.prez\.[^;]*?,\s*3\s*([^,;]+)")
    forms["gerunziu"]        = find(r"ger\.\s*([^,;]+)")
    forms["participiu"]      = find(r"part\.\s*([^,;]+)")

    return {k: v for k, v in forms.items() if v}


def parse_conjugation(soup: BeautifulSoup) -> dict:
    """
    Parse dexonline conjugation table.

    dexonline structure (confirmed from live HTML):
      <table>
        <tr>  ← header: <td class="inflection">numărul</td>
                         <td class="inflection">persoana</td>
                         <td class="inflection">prezent</td>
                         <td class="inflection">conjunctiv prezent</td> ...
        <tr>  ← data:   <td class="inflection">singular</td>
                         <td class="inflection person">I (eu)</td>
                         <td class="form">abandonez</td> ...
        <tr>             <td class="inflection person">a II-a (tu)</td>
                         <td class="form">abandonezi</td> ...
        ...
      </table>

    Returns dict keyed by tense name, each value is list of
    {"person": "I (eu)", "form": "abandonez"} dicts.
    """
    # Find the table that contains .person cells
    target_table = None
    for table in soup.select("table"):
        if table.select(".person"):
            target_table = table
            break

    if not target_table:
        return {}

    rows = target_table.select("tr")

    # Extract tense column headers from the header row
    # (the row that contains 'prezent' as an inflection label)
    tense_names = []
    for row in rows:
        inflection_cells = row.select("td.inflection, th")
        texts = [c.get_text(strip=True) for c in inflection_cells]
        if "prezent" in texts:
            # Skip structural labels like 'numărul', 'persoana'
            skip = {"numărul", "persoana", "singular", "plural", "imperativ pers. a II-a",
                    "infinitiv", "infinitiv lung", "participiu", "gerunziu", ""}
            tense_names = [t for t in texts if t not in skip]
            break

    if not tense_names:
        tense_names = ["prezent", "conjunctiv prezent", "imperativ"]

    # Collect one entry per person: {person, forms[]}
    entries = []
    for row in rows:
        person_cell = row.select_one(".person")
        if not person_cell:
            continue
        person_label = person_cell.get_text(strip=True)
        form_cells = row.select(".form")
        # Extract forms; cells may contain multiple alternatives in .commaList li
        def _form_text(fc):
            items = fc.select(".commaList li")
            if items:
                return " / ".join(_el_text_compact(li) for li in items if _el_text_compact(li))
            return _el_text_compact(fc)

        forms = [_form_text(fc) for fc in form_cells]
        if forms:
            entries.append({"person": person_label, "forms": forms})

    if not entries:
        return {}

    # Pivot into tense → [{person, form}]
    result = {}
    for i, tense in enumerate(tense_names):
        tense_entries = []
        for entry in entries:
            if i < len(entry["forms"]):
                form = entry["forms"][i]
                if form:
                    tense_entries.append({"person": entry["person"], "form": form})
        if tense_entries:
            result[tense] = tense_entries

    return result


def scrape_verb(verb: str) -> dict:
    """
    Fetch dexonline for `verb`.
    - Main page  → definition + doom3
    - /flexiuni  → conjugation table (dedicated paradigm page)
    """
    url_main = f"https://dexonline.ro/definitie/{verb}"
    r_main = fetch_with_retry(url_main)
    soup_main = BeautifulSoup(r_main.text, "html.parser")

    definition = parse_definition(soup_main)
    doom3_text = parse_doom3(soup_main)
    conjugation = parse_conjugation(soup_main)

    # Dedicated paradigm sub-page (more reliable for conjugation)
    if not conjugation:
        try:
            url_flex = f"https://dexonline.ro/definitie/{verb}/flexiuni"
            time.sleep(0.6 + random.uniform(0, 0.3))
            r_flex = fetch_with_retry(url_flex)
            soup_flex = BeautifulSoup(r_flex.text, "html.parser")
            conjugation = parse_conjugation(soup_flex)
            if not doom3_text:
                doom3_text = parse_doom3(soup_flex)
        except requests.exceptions.HTTPError as exc:
            # 404 = this verb has no /flexiuni sub-page — perfectly normal
            pass
        except Exception:
            pass  # network hiccup — doom3_forms still gives key forms

    doom3_forms = parse_doom3_forms(doom3_text) if doom3_text else {}

    return {
        "url": r_main.url,
        "definition": definition,
        "doom3_morphology": doom3_text,
        "doom3_forms": doom3_forms,
        "conjugation": conjugation,
    }


def debug_verb(verb: str, script_dir: str):
    """
    Fetch verb page, save raw HTML to debug_{verb}.html, and print diagnostic info.
    Run with: python dexonline_enricher.py --debug <verb>
    """
    print(f"\n=== DEBUG MODE: {verb} ===\n")
    url = f"https://dexonline.ro/definitie/{verb}"
    print(f"Fetching: {url}")
    r = SESSION.get(url, timeout=15, verify=False)
    print(f"Status     : {r.status_code}")
    print(f"Final URL  : {r.url}")
    print(f"Content-len: {len(r.text)} chars")
    print(f"Encoding   : {r.encoding}")

    html_path = os.path.join(script_dir, f"debug_{verb}.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(r.text)
    print(f"\nFull HTML saved → {html_path}")

    # Show first 3000 chars of body text
    soup = BeautifulSoup(r.text, "html.parser")
    print("\n--- First 3000 chars of page text ---")
    print(soup.get_text(" ", strip=True)[:3000])

    # Show what selectors actually found
    print("\n\n--- Selector hits ---")
    for sel in ["div.def", ".def", "div.definition", ".definition",
                "div.paradigm", ".fl-paradigms", "[class*='paradigm']",
                "table", "article"]:
        hits = soup.select(sel)
        print(f"  {sel:<30} → {len(hits)} match(es)")
        for h in hits[:2]:
            print(f"       text[:120]: {h.get_text(' ', strip=True)[:120]!r}")

    definition = parse_definition(soup)
    doom3 = parse_doom3(soup)
    conj = parse_conjugation(soup)
    print(f"\nDefinition  : {definition[:200]!r}")
    print(f"DOOM3       : {doom3[:200]!r}")
    print(f"Conjugation : {conj}")
    print("\n=== END DEBUG ===")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    verbs_path  = os.path.join(script_dir, "verbs.json")
    output_path = os.path.join(script_dir, "verbs_dex.json")

    # ── CLI flags ─────────────────────────────────────────────────────────────
    args = sys.argv[1:]

    # --debug <verb>  : fetch one verb, print diagnostics, save HTML, exit
    if "--debug" in args:
        idx = args.index("--debug")
        verb = args[idx + 1] if idx + 1 < len(args) else "trimite"
        debug_verb(verb, script_dir)
        return

    # --reset  : delete verbs_dex.json and start fresh
    if "--reset" in args:
        if os.path.exists(output_path):
            os.remove(output_path)
            print("Deleted verbs_dex.json — will start fresh.\n")
        else:
            print("verbs_dex.json not found — nothing to reset.\n")

    # ── Load phrases ──────────────────────────────────────────────────────────
    if not os.path.exists(verbs_path):
        sys.exit(f"ERROR: verbs.json not found at {verbs_path}")

    with open(verbs_path, encoding="utf-8") as f:
        phrases = json.load(f)

    print(f"Loaded {len(phrases)} phrases from verbs.json")

    # ── Check for unmapped phrases ────────────────────────────────────────────
    unmapped = [p for p in phrases if p not in PHRASE_TO_BASE]
    if unmapped:
        print(f"\nWARNING: {len(unmapped)} phrase(s) have no base verb mapping:")
        for p in unmapped:
            print(f"  - '{p}'")
        print("These will be skipped.\n")

    # ── Build base_verb → [phrases] index ────────────────────────────────────
    base_to_phrases: dict[str, list[str]] = {}
    for phrase in phrases:
        base = PHRASE_TO_BASE.get(phrase)
        if base:
            base_to_phrases.setdefault(base, []).append(phrase)

    # ── Load existing results (resume support) ────────────────────────────────
    existing: dict[str, dict] = {}
    if os.path.exists(output_path):
        with open(output_path, encoding="utf-8") as f:
            try:
                for entry in json.load(f):
                    key = entry.get("base_verb", "").lstrip("a ").strip()
                    existing[key] = entry
                print(f"Resuming: {len(existing)} verbs already scraped.")
            except json.JSONDecodeError:
                print("WARNING: verbs_dex.json was corrupt — starting fresh.")

    # ── Determine what still needs scraping ──────────────────────────────────
    todo = [b for b in sorted(base_to_phrases) if b not in existing]
    skip = len(base_to_phrases) - len(todo)

    print(f"\nTotal unique base verbs : {len(base_to_phrases)}")
    print(f"Already done            : {skip}")
    print(f"To scrape               : {len(todo)}")
    if not todo:
        print("\nAll verbs already scraped. Nothing to do.")
        return

    print(f"\nStarting scrape (~{len(todo) * 2}s estimated)...\n")

    results = dict(existing)

    for i, base_verb in enumerate(todo, 1):
        label = f"a {base_verb}"
        print(f"[{i:3}/{len(todo)}] {label:<30}", end=" ", flush=True)

        try:
            data = scrape_verb(base_verb)
            entry = {
                "base_verb": label,
                "source_phrases": base_to_phrases[base_verb],
                **data,
            }
            parts = []
            if data.get("definition"):
                parts.append("def")
            if data.get("doom3_morphology"):
                parts.append("doom3")
            if data.get("conjugation"):
                parts.append(f"conj({len(data['conjugation'])} tenses)")
            status = "✓ " + (", ".join(parts) if parts else "⚠ nothing parsed — run --debug")
        except Exception as exc:
            entry = {
                "base_verb": label,
                "source_phrases": base_to_phrases[base_verb],
                "url": f"https://dexonline.ro/definitie/{base_verb}",
                "error": str(exc),
                "definition": "",
                "doom3_morphology": "",
                "conjugation": {},
            }
            status = f"✗ ERROR: {exc}"

        print(status)
        results[base_verb] = entry

        # Save after every verb — safe to interrupt anytime
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(list(results.values()), f, ensure_ascii=False, indent=2)

        # Polite delay between requests
        if i < len(todo):
            delay = 1.5 + random.uniform(0.0, 0.8)
            time.sleep(delay)

    # ── Final summary ─────────────────────────────────────────────────────────
    errors = [v for v in results.values() if "error" in v]
    print(f"\n{'─'*50}")
    print(f"Done. {len(results)} verbs saved → {output_path}")
    if errors:
        print(f"\n{len(errors)} failed (network/HTTP errors):")
        for e in errors:
            print(f"  - {e['base_verb']}: {e['error']}")
        print("\nRe-run the script to retry failed verbs automatically.")


if __name__ == "__main__":
    main()
