# Clinical Insight Hub

Professional UI/UX Design Prompt — Blood Pressure Clinical RAG System

Copy the text below in full and use it as a direct prompt for any design/code-generation tool (Claude, v0, Lovable, etc.).

 Context

Design a user interface (frontend only) for a medical web application built on RAG (Retrieval-Augmented Generation) technology. Its purpose is to deliver clinical recommendations for hypertension grounded in authoritative guidelines (WHO, NICE, CDC, USPSTF), with a citation for every claim.

Target audience: physicians and clinical staff using the tool as a clinical decision-support assistant — not general patients. The design must feel serious, precise, and trustworthy, evoking scientific credibility — not a colorful, playful consumer-app aesthetic.

🎨 Visual Identity — Dark Mode

Overall feel: A dark, focused, developer-tool-grade workspace — closer to Cursor, Linear, or Windsurf than a typical light "medical portal." Calm, low-glare, built for long reading sessions. Precise and technical, not moody or gamer-dark.

Color system (near-black, not pure black — avoids the harsh OLED look and gives depth between layers):

App background: #0B0F14 (near-black slate)

Panel/sidebar background: #0F141B (one step lighter than the app background, for the left and right rails)

Card/surface background: #141A22

Borders/dividers: #232B36 (hairline, 1px, never a heavy shadow)

Primary text: #E6E9ED (off-white, not pure white)

Secondary/meta text: #8A94A3

Accent (interactive, active states, links, the assistant's avatar ring): a cool teal/cyan, #2DD4BF-ish, used sparingly

Citation marker pill: warm amber outline/text on transparent dark fill (#D89A4E border+text on #1C1710-ish tint) — this is the one warm note against an otherwise cool palette, and it's what the eye should catch first when scanning an answer

Semantic state colors (risk levels), kept desaturated so they read clearly on dark backgrounds without glowing: green #3FB68A = allowed, amber #D9A441 = caution, red #E0645A = reject

No gradients, no glow/neon effects, no heavy shadows. Depth comes only from the three background layers (app → panel → card) plus hairline borders.

Typography:

UI text: a clean grotesque sans-serif that renders both Arabic and English well (Inter, IBM Plex Sans Arabic, or Cairo) — bilingual support is required since some backend values (e.g. confidence levels) arrive in Arabic.

Code / IDs / technical values (chunk IDs, filenames, line numbers): a monospace face (e.g. JetBrains Mono or IBM Plex Mono), used specifically for anything that looks like a system identifier — this is what gives the interface its technical, trustworthy character.

Clear type scale by weight, not just size: message text is regular weight; labels, filenames, and section eyebrows are uppercase, smaller, and letter-spaced.

Shape language: Small rounded corners (6–8px, slightly tighter than a typical consumer app), 1px hairline borders, flat cards — nothing skeuomorphic.

Motion: Subtle, fast transitions only (150–200ms). One deliberate signature interaction: when a citation marker [n] in the chat is hovered/clicked, a thin dotted connector line draws from the marker to its matching card in the right-hand source panel, and that card highlights. This is the one moment of "personality" in the UI — everything else stays quiet.

Full RTL support (Arabic) with the ability to switch to LTR (English), since fields like confidence arrive from the backend in Arabic (عالي/متوسط/منخفض/أدلة غير كافية). Mirror the three-column layout completely in RTL (source panel moves to the left, conversation list stays on the outer edge).

🗂️ Information Architecture

Use a three-column, chat-first layout (this is the primary structural decision — see reference screenshot): a narrow icon rail + conversation list on the far left, the chat thread in the center (the main working area), and a persistent Source Trace panel on the right that lists the citations behind whatever answer is currently visible. This replaces a single "submit and wait for a result card" screen with an ongoing, referenceable conversation.

1) Left column — Icon rail + Conversation history

A slim vertical icon rail (workspace switcher, search, chat, knowledge base, evaluation, history) pinned to the far edge.

Next to it, a Conversations list: each past query session shown as a short title (auto-derived from the first question) plus a small meta line underneath, e.g. top_k: 5 or the number of sources touched. The active conversation is highlighted with a left accent bar and a slightly lighter background than its neighbors.

A "New conversation" affordance at the top of the list.

This column is collapsible (the icon-rail toggle in the top bar shown in the reference) to give the chat more room.

2) Center column — Chat thread (Clinical Query Console)

This is the primary, default view.

Each turn is rendered as a labeled block, not a rounded bubble: a small caption row (USER / ASSISTANT + name, in uppercase, muted, monospace-ish) above the message content — matching the reference screenshot's plain, IDE-like message framing rather than a chat-bubble style.

The user's question appears as plain text under the USER label.

The assistant's answer (from /generate) appears under the ASSISTANT label as flowing text, with citation markers [1] [2] [3] rendered as small pill-shaped badges (amber outline, monospace numerals) inline in the sentence — never as plain bracket text. Hovering or clicking a marker highlights its matching card in the Source Trace panel on the right and draws a thin dotted connector between them (the signature interaction of this UI).

Directly below the answer text, render a compact clinical summary card in place of a code block: risk level badge (allowed/caution/reject), confidence indicator, the safety note, and the supporting-evidence list — styled like a dark code/output panel (header row with a label such as clinical-summary and a small copy icon, monospace metadata, 1px border) so it reads as structured, verifiable output rather than prose.

Below each assistant turn, a quiet action row: Copy, Regenerate, and Save to notes (icon + label, muted text, no button chrome until hover).

The input box sits fixed at the bottom of the center column: a single-line/expanding text field, a top_k stepper tucked to one side, and a send button. Placeholder: "Ask a clinical question about blood pressure management…"

Loading state: the assistant block appears immediately with a muted "Analyzing clinical guidelines…" line and a subtle pulsing indicator, instead of blocking the whole screen.

Empty state (new conversation, no messages yet): a short prompt line plus 2–3 clickable example questions, centered in the thread area.

If unsupported_claims is non-empty for a turn, show it as a small flagged note under the clinical summary card (muted red), not hidden away.

3) Right column — Source Trace panel

Header: SOURCE TRACE (uppercase, small, muted) — always reflects the citations for whichever assistant turn is currently focused/hovered in the center column.

Each citation renders as a card: marker number in a small badge, document name in bold, a right-aligned locator (L. 22 for a text file, p. 4 for a PDF page — adapt the label to what page_start/page_end vs. a section reference actually represents), and a 1–2 line excerpt/summary of the chunk beneath it.

The card matching the currently hovered/clicked citation marker is visually emphasized (accent-colored left border or outline); others stay neutral.

This panel is what makes the tool feel auditable — a clinician should be able to scan it independently of the prose answer.

4) Top bar

Sidebar-collapse toggle, current conversation title, and on the far side a small system-status pill (green/red dot + label) reflecting /health — connected/disconnected to the vector store, with collection name and chunk count available on click/hover.

5) "Knowledge Base" Page (Documents)

A top stats card row (3–4 large, clear numbers, from /internal/stats): total documents, total chunks, embedding model name.

A table or card grid listing documents (/internal/documents): document name + chunk count per document, with a source-type icon.

A prominent "Add Document" button opening a modal with just two fields: source URL and an optional document name, wired to /documents/upload.

While processing: a clear loading state (indexing can take time — show a message like "Uploading and indexing document…").

On success/rejection/error: a toast or inline message clearly showing status, chunks_indexed, and detail.

6) "Evaluation" Dashboard — based on /internal/benchmark

Important for demonstrating system credibility to hackathon judges:

Three large, clear metric cards at the top: retrieval_precision_at_5, citation_accuracy, faithfulness (as percentages with a simple visual, e.g. a circular progress ring).

questions_evaluated shown as context.

A detailed table below showing details[]: question, precision, correct citations out of total, unsupported claims out of total — clean, readable, sortable table formatting.

 Reusable Components to Build

RiskLevelBadge — takes the value (allowed|caution|reject) and renders a badge with the matching color and icon.

ConfidenceIndicator — takes the Arabic confidence value and renders it as a visual (color/dot count).

CitationMarker — the inline amber [n] pill in the assistant's message text; owns the hover/click connection to its SourceTraceCard.

SourceTraceCard — a citation card in the right panel (marker, document name, page/line locator, excerpt), with an "active" visual state.

ClinicalSummaryCard — the code-panel-styled block under an assistant message: risk badge, confidence, safety note, evidence list, unsupported-claims note.

ConversationListItem — a single entry in the left conversation history list, with an active/selected state.

SystemStatusPill — backend connection status indicator, shown in the top bar.

MetricCard — a large number/metric card (used on both the Documents and Evaluation pages).

Unified EmptyState, ErrorState, and LoadingState components used consistently across all pages.

⚙️ Mandatory Frontend Architecture Requirements — for seamless integration with the real backend later

This section is non-negotiable at implementation time:

Fully separate networking logic from UI components. No React component should call fetch/axios directly. Build a dedicated services layer, e.g.:

/src/services/api/    client.ts             // base client setup (baseURL, headers, error handling)    health.service.ts     // getHealth()    stats.service.ts      // getStats(), getDocuments()    search.service.ts     // generateAnswer(query, top_k)    documents.service.ts  // uploadDocument(url, document_name)    benchmark.service.ts  // getBenchmark()


Every service function must return exactly the same shape described in the real API above (same field names and types), even when using mock data.

The backend base URL must be read from a single environment variable (e.g. VITE_API_BASE_URL), never hardcoded anywhere.

Mock data must live in a fully separate /src/mocks/ folder, mirroring the real response structure exactly, and used only as a fallback or via a toggle flag (e.g. USE_MOCK_DATA=true) inside the service files themselves — never inline mock data inside components.

Request states (Loading / Success / Error / Empty) must be handled uniformly (via a custom hook like useApiRequest, or React Query/SWR if possible), so every page is already equipped to render all four states without any future structural changes.

Types/interfaces for every API response must be defined centrally in /src/types/api.ts, matching the schemas below exactly, and reused across services and components.

Do not assume any fields not present in the schemas (e.g. user avatars or undocumented dates) — stick strictly to the given fields.

Endpoints actually used in the UI: GET /health, GET /internal/stats, GET /internal/documents, POST /documents/upload, POST /generate, GET /internal/benchmark. /search and /internal/config are not needed at this stage.

Suggested Stack

React (TypeScript) + Tailwind CSS, with a clear folder structure separating: /pages, /components, /services, /types, /mocks, /hooks. The design must be fully responsive — it should look excellent on a large presentation screen during the demo, as well as on a standard laptop.

End goal: an interface that looks like it was designed by a dedicated UX team specializing in medical products — calm, organized, with clear visual priority, emphasizing scientific trust and credibility first, and technically ready for immediate integration with the real backend without any rework.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/341c1721-9010-49b6-ab98-705873d3450d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
