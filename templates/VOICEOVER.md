# Voiceover draft

Write for the ear, like a person teaching a colleague. Rules (see the plugin's references/voiceover.md):
- Present tense, second person: "Open Settings." "Now press Run."
- About 2.5 words per second of the scene it plays over (165 words a minute).
- Spell out URLs ("acme dot com slash billing") and amounts ("twelve hundred dollars").
- Short sentences, contractions, no em dashes, parentheses or symbols.
- Open with the relatable problem, signpost each part, end with the payoff and where to get it.

Once the cut exists, these lines move into `handoff.json` (one per scene), and build-handoff.py
checks that each fits before the next one starts.

## Promo

1. <scene name>: <line>

## How-to

1. <scene name>: <line>
