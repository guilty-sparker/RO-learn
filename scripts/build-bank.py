#!/usr/bin/env python3
"""Build question-bank.json from clean MD files + verbs_dex.json."""
import json, re, hashlib, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def qid(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]

def clean(s):
    """Strip bold markers, leading/trailing whitespace."""
    return re.sub(r'\*\*', '', s).strip()

# ──────────────────────────────────────────────
# Parse bilingual MD files (feltételes, személyes, visszaható)
# Format: numbered or bulleted HU/RO pairs, grouped by difficulty
# ──────────────────────────────────────────────

def parse_bilingual_md(filepath, section_id, default_direction='hu-ro'):
    """
    Parse a structured bilingual MD file.
    Returns list of Question dicts.
    
    Handles:
    - Numbered items: "1.  **HU text**"  next line = RO
    - Bulleted items: "*   RO text"      next line = HU
    - Multiple answers with "*   " sub-bullets
    - Difficulty headers: ## A1-A2 / ## B1-B2 / ## C1-C2
    """
    if not os.path.exists(filepath):
        print(f"  [WARN] Not found: {filepath}")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    questions = []
    difficulty = 'B1-B2'  # default
    i = 0
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Detect difficulty headers
        if re.match(r'^#+\s*(A1-A2|B1-B2|C1-C2)', line) or re.match(r'^(A1-A2|B1-B2|C1-C2)\s*$', line):
            m = re.search(r'(A1-A2|B1-B2|C1-C2)', line)
            if m:
                difficulty = m.group(1)
            i += 1
            continue
        
        # Skip headers, empty lines, non-content
        if not line or line.startswith('#') or line.startswith('---'):
            i += 1
            continue
        
        # Numbered exercise: "1.  **Bold HU text**"
        num_match = re.match(r'^\d+\.\s+\*\*(.+?)\*\*\s*$', line)
        if num_match:
            bold_text = num_match.group(1).strip()
            # Collect answer lines
            answer_lines = []
            i += 1
            while i < len(lines):
                nxt = lines[i].rstrip()
                if not nxt:
                    i += 1
                    continue
                # Next numbered item or header = stop
                if re.match(r'^\d+\.\s+\*\*', nxt) or nxt.startswith('#') or re.match(r'^(A1-A2|B1-B2|C1-C2)', nxt):
                    break
                # Sub-bullet answer
                sub = re.match(r'^\s*\*\s+(.+)', nxt)
                if sub:
                    ans = clean(sub.group(1))
                    if ans and not ans.startswith('📌'):
                        answer_lines.append(ans)
                else:
                    ans = clean(nxt)
                    if ans and not ans.startswith('📌'):
                        answer_lines.append(ans)
                i += 1

            if bold_text and answer_lines:
                # Detect direction: is bold text Romanian or Hungarian?
                bold_is_ro = bool(re.search(r'[ăîâșțĂÎÂȘȚ]', bold_text))

                if bold_is_ro:
                    # Bold = RO prompt, answers = mix of alt RO forms + HU translation
                    # Last line with HU chars is the HU answer; RO lines are alt forms
                    hu_answers = []
                    for a in answer_lines:
                        has_ro_chars = bool(re.search(r'[ăîâșțĂÎÂȘȚ]', a))
                        if not has_ro_chars:
                            hu_answers.append(a)
                    # If no clear HU found, take last line as answer
                    if not hu_answers:
                        hu_answers = [answer_lines[-1]]
                    qid_val = qid(f"{section_id}:ro-hu:{bold_text}")
                    questions.append({
                        'id': qid_val,
                        'section': section_id,
                        'type': 'translate-ro-hu',
                        'difficulty': difficulty,
                        'prompt': bold_text,
                        'acceptedAnswers': hu_answers,
                        'source': os.path.basename(filepath),
                    })
                else:
                    # Bold = HU prompt, answers = RO translations
                    qid_val = qid(f"{section_id}:hu-ro:{bold_text}")
                    questions.append({
                        'id': qid_val,
                        'section': section_id,
                        'type': 'translate-hu-ro',
                        'difficulty': difficulty,
                        'prompt': bold_text,
                        'acceptedAnswers': answer_lines,
                        'source': os.path.basename(filepath),
                    })
            continue
        
        # Bulleted example: "*   RO text" followed by HU text
        bullet_match = re.match(r'^\*\s+(.+)', line)
        if bullet_match:
            first_text = clean(bullet_match.group(1))
            if not first_text or first_text.startswith('📌'):
                i += 1
                continue
            
            # Next non-empty line = translation
            i += 1
            second_text = ''
            while i < len(lines):
                nxt = lines[i].rstrip()
                if not nxt:
                    i += 1
                    continue
                if nxt.startswith('*') or nxt.startswith('#') or re.match(r'^\d+\.', nxt):
                    break
                second_text = clean(nxt)
                i += 1
                break
            
            if first_text and second_text:
                # In example sections: first=RO, second=HU → translate RO→HU
                # Detect: if first line has Romanian chars (ă, î, â, ș, ț), it's RO
                has_ro = bool(re.search(r'[ăîâșțĂÎÂȘȚ]', first_text))
                
                if has_ro:
                    # RO→HU
                    qid_val = qid(f"{section_id}:ro-hu:{first_text}")
                    questions.append({
                        'id': qid_val,
                        'section': section_id,
                        'type': 'translate-ro-hu',
                        'difficulty': difficulty,
                        'prompt': first_text,
                        'acceptedAnswers': [second_text],
                        'source': os.path.basename(filepath),
                    })
                else:
                    # HU→RO (unusual for bullet examples but handle it)
                    qid_val = qid(f"{section_id}:hu-ro:{first_text}")
                    questions.append({
                        'id': qid_val,
                        'section': section_id,
                        'type': 'translate-hu-ro',
                        'difficulty': difficulty,
                        'prompt': first_text,
                        'acceptedAnswers': [second_text],
                        'source': os.path.basename(filepath),
                    })
            continue
        
        i += 1
    
    return questions


def parse_mutato_nevmasok(filepath):
    """
    Parse mutatoNevmasok.md — demonstrative pronouns.
    Format: "* HU sentence" followed by either:
    - Full RO translation, or
    - RO with ______ (fill-blank), or  
    - Vocab hints with 📌
    
    For fill-blanks: skip (no answer provided in file).
    For full translations: create translate-hu-ro questions.
    For vocab-hint-only items: create translate-hu-ro with hints as context.
    """
    if not os.path.exists(filepath):
        print(f"  [WARN] Not found: {filepath}")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    questions = []
    difficulty = 'B1-B2'
    i = 0
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Difficulty
        if re.match(r'^(A1-A2|B1-B2|C1-C2)\s*$', line):
            difficulty = line.strip()
            i += 1
            continue
        
        if not line or line.startswith('#') or line.startswith('---'):
            i += 1
            continue
        
        # Bullet: "* HU sentence"
        bullet = re.match(r'^\*\s+(.+)', line)
        if bullet:
            hu_text = clean(bullet.group(1))
            if not hu_text:
                i += 1
                continue
            
            # Collect following lines until next bullet or header
            ro_lines = []
            hint_lines = []
            i += 1
            while i < len(lines):
                nxt = lines[i].rstrip()
                if not nxt:
                    i += 1
                    continue
                if nxt.startswith('*') or nxt.startswith('#') or re.match(r'^(A1-A2|B1-B2|C1-C2)\s*$', nxt):
                    break
                cleaned = clean(nxt)
                if cleaned.startswith('📌'):
                    hint_lines.append(cleaned)
                elif '______' in cleaned:
                    # Fill-blank without answer — skip
                    ro_lines = []
                    i += 1
                    break
                else:
                    ro_lines.append(cleaned)
                i += 1
            
            if hu_text and ro_lines:
                # Has full RO translation
                context = ' | '.join(hint_lines) if hint_lines else None
                qid_val = qid(f"demonstratives:{hu_text}")
                q = {
                    'id': qid_val,
                    'section': 'demonstratives',
                    'type': 'translate-hu-ro',
                    'difficulty': difficulty,
                    'prompt': hu_text,
                    'acceptedAnswers': ro_lines,
                    'source': os.path.basename(filepath),
                }
                if context:
                    q['context'] = context
                questions.append(q)
            elif hu_text and hint_lines and not ro_lines:
                # Only hints, no answer — create question with hints as context
                # User needs to translate using vocab hints
                context = ' | '.join(hint_lines)
                qid_val = qid(f"demonstratives:{hu_text}")
                q = {
                    'id': qid_val,
                    'section': 'demonstratives',
                    'type': 'translate-hu-ro',
                    'difficulty': difficulty,
                    'prompt': hu_text,
                    'acceptedAnswers': [],  # no answer — skip
                    'source': os.path.basename(filepath),
                    'context': context,
                }
                # Actually skip these — no answer to validate against
                pass
            continue
        
        i += 1
    
    return questions


# ──────────────────────────────────────────────
# Parse verbs from verbs_dex.json (conjugation grids only)
# ──────────────────────────────────────────────

TENSES = ['prezent', 'conjunctiv prezent', 'imperativ']
PERSON_ORDER = ['I (eu)', 'a II-a (tu)', 'a III-a (el, ea)', 'I (noi)', 'a II-a (voi)', 'a III-a (ei, ele)']

def parse_verbs(verbs_data):
    """Generate conjugation-grid questions from verbs_dex.json."""
    questions = []

    for verb in verbs_data:
        infinitive = verb.get('base_verb', '')
        conjugations = verb.get('conjugation', {})

        if not infinitive or not conjugations:
            continue

        for tense in TENSES:
            forms_list = conjugations.get(tense, [])
            if len(forms_list) != 6:
                continue

            # Build lookup: person -> form
            forms_by_person = {f['person']: f['form'] for f in forms_list}

            # Build grid cells in standard order
            cells = []
            valid = True
            for person in PERSON_ORDER:
                form = forms_by_person.get(person, '')
                if not form:
                    valid = False
                    break
                # Take first variant if "/" present
                form = form.split('/')[0].strip()
                cells.append({
                    'person': person,
                    'correct': form,
                })

            if not valid or len(cells) != 6:
                continue

            context = tense

            prompt = f"Ragozd: {infinitive}"
            qid_val = qid(f"verb:{infinitive}:{tense}")
            
            questions.append({
                'id': qid_val,
                'section': 'verbs-conjugation',
                'type': 'conjugation-grid',
                'difficulty': 'A1-A2' if tense == 'prezent' else 'B1-B2',
                'prompt': prompt,
                'context': context,
                'acceptedAnswers': [cells[0]['correct']],  # needed for type compat
                'gridCells': cells,
                'source': 'verbs_dex.json',
            })
    
    return questions


# ──────────────────────────────────────────────
# Cacofonie (hardcoded — small set)
# ──────────────────────────────────────────────

def build_cacofonie():
    pairs = [
        ("Nem akarok csinálni semmit.", "Nu vreau să fac nimic.", "A1-A2"),
        ("Ez a szó kakofóniát okoz, javítsd ki!", "Acest cuvânt provoacă cacofonie, corectează-l!", "B1-B2"),
        ("Arra kérte, hogy a saját akaratából menjen oda.", "L-a rugat ca de bunăvoie să meargă acolo.", "B1-B2"),
        ("Mivel nem volt otthon, nem tudtam átadni.", "Pentru că nu era acasă, nu am putut să-i dau.", "A1-A2"),
        ("Ő volt az, aki megtalálta a megoldást.", "El a fost cel care a găsit soluția.", "A1-A2"),
        ("Azt mondta, hogy nem akar jönni.", "A spus că nu vrea să vină.", "A1-A2"),
        ("Azért ment el, hogy megvegye az ajándékot.", "A plecat ca să cumpere cadoul.", "B1-B2"),
        ("Azt kérte, hogy figyeljen oda.", "I-a cerut să fie atent.", "A1-A2"),
        ("Az a lány, akit láttál, a nővérem.", "Fata pe care ai văzut-o este sora mea.", "B1-B2"),
        ("Mivel azt mondta, hogy nem tud jönni, mi is lemaradtunk.", "Pentru că a spus că nu poate veni, și noi am pierdut.", "C1-C2"),
    ]
    questions = []
    for hu, ro, diff in pairs:
        qid_val = qid(f"cacofonie:{hu}")
        questions.append({
            'id': qid_val,
            'section': 'cacofonie',
            'type': 'translate-hu-ro',
            'difficulty': diff,
            'prompt': hu,
            'acceptedAnswers': [ro],
            'source': 'cacofonie (built-in)',
        })
    return questions


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    print("Building question bank from clean MD files...")
    all_questions = []
    
    # 1. Verbs
    verbs_path = os.path.join(ROOT, 'verbs_dex.json')
    if os.path.exists(verbs_path):
        with open(verbs_path, 'r', encoding='utf-8') as f:
            verbs_data = json.load(f)
        verb_qs = parse_verbs(verbs_data)
        print(f"  verbs-conjugation: {len(verb_qs)}")
        all_questions.extend(verb_qs)
    
    # 2. Conditional mood (feltételes mód)
    cond_qs = parse_bilingual_md(
        os.path.join(ROOT, 'feltetelesMod-Megoldas.md'),
        'conditional-mood'
    )
    print(f"  conditional-mood: {len(cond_qs)}")
    all_questions.extend(cond_qs)
    
    # 3. Personal pronouns (személyes névmások)
    pers_qs = parse_bilingual_md(
        os.path.join(ROOT, 'szemelyesNevmasok-Megoldas.md'),
        'pronouns-personal'
    )
    print(f"  pronouns-personal: {len(pers_qs)}")
    all_questions.extend(pers_qs)
    
    # 4. Reflexive pronouns (visszaható névmások)
    refl_qs = parse_bilingual_md(
        os.path.join(ROOT, 'visszahatoNevmasok-Megoldas.md'),
        'pronouns-reflexive'
    )
    print(f"  pronouns-reflexive: {len(refl_qs)}")
    all_questions.extend(refl_qs)
    
    # 5. Demonstratives (mutató névmások) — DISABLED: no correct solutions yet
    # demo_qs = parse_mutato_nevmasok(
    #     os.path.join(ROOT, 'mutatoNevmasok.md')
    # )
    # print(f"  demonstratives: {len(demo_qs)}")
    # all_questions.extend(demo_qs)
    
    # 6. Cacofonie (disabled)
    # cac_qs = build_cacofonie()
    # print(f"  cacofonie: {len(cac_qs)}")
    # all_questions.extend(cac_qs)
    
    # Deduplicate
    by_id = {}
    for q in all_questions:
        if q['id'] not in by_id:
            by_id[q['id']] = q
    
    # Build sections
    SECTION_META = [
        ('verbs-conjugation', 'Conjugation', 'Igék ragozása'),
        ('pronouns-personal', 'Personal Pronouns', 'Személyes névmások'),
        ('pronouns-reflexive', 'Reflexive Pronouns', 'Visszaható névmások'),
        ('conditional-mood', 'Conditional Mood', 'Feltételes mód'),
    ]
    sections = []
    for sid, title, title_hu in SECTION_META:
        qids = [q['id'] for q in by_id.values() if q['section'] == sid]
        sections.append({
            'id': sid,
            'title': title,
            'titleHU': title_hu,
            'questionIds': qids,
        })

    bank = {
        'generatedAt': __import__('datetime').datetime.now().isoformat(),
        'sections': sections,
        'questions': by_id,
    }

    out_path = os.path.join(ROOT, 'app', 'public', 'question-bank.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)

    total = len(by_id)
    print(f"\nDone! {total} questions -> {out_path}")
    for s in sections:
        print(f"  {s['id']}: {len(s['questionIds'])}")

if __name__ == '__main__':
    main()
