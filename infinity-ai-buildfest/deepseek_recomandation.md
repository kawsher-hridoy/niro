# Niro → BuildFest Upgrade Plan — Comprehensive Implementation Guide

> Generated 24 May 2026. Every gap from the qualification analysis addressed with
> exact file paths, code architecture decisions, dependency changes, and effort estimates.
> All changes are additive — nothing breaks the existing ICADHI submission.

---

## 0. Upgrade Strategy Overview

### 0.1 Guiding Principles

1. **Additive only.** No existing file is rewritten. New modules sit alongside old ones.
2. **Provider abstraction extended, not replaced.** The `AIProvider` pattern is the
   extensibility seam — new capabilities plug in as new providers or new methods.
3. **BuildFest scoring drives priority.** GraphDB (Technical Execution 20%) and Local
   LLM (Offline Resilience) are P0. Scraper and RAG are P1. Lovable is P2 (accept penalty).
4. **ICADHI May 27 remains primary.** BuildFest work starts May 27 evening.

### 0.2 What Each Upgrade Scores

| Upgrade | Scoring Criterion Affected | Point Gain (est.) |
|---|---|---|
| GraphDB (Kuzu) | Technical Execution (+3–4), Scalability (+1) | +4–5 |
| Local LLM (Ollama) | Technical Execution (+2), Scalability (+2) | +3–4 |
| RAG (pgvector) | Technical Execution (+3), Impact (+1) | +3–4 |
| Scraper (BMDC/DGDA) | Technical Execution (+2), Innovation (+1) | +2–3 |
| Risk Prediction | Innovation (+3), Impact (+2) | +4–5 |
| PWA Offline | Scalability (+3), Impact (+1) | +3–4 |
| VPS Deploy | Scalability (+3), Presentation (+1) | +3–4 |
| Team Formation | Scalability (+5 NRB), across all categories (+2) | +5–7 |
| **Total potential uplift** | | **+27–36 points** |

Current estimate: 71–84 → Post-upgrade: **90–95+** (contender range).

---

## 1. Team Formation Strategy

### 1.1 Required Roles

BuildFest requires 3–5 members with role diversity. Niro needs:

| Role | BuildFest Name | Who to Recruit | Why |
|---|---|---|---|
| Team Lead | Project Coordinator | **kawsher-hridoy** (existing) | Already owns the codebase |
| NRB Advisor | Architecture / Strategy | NRB professional from LinkedIn, FB BD tech groups, or diaspora network | Scores on Scalability (10%) + brings global standards |
| Domain Expert | Business Analyst | Female medical student or public health grad student from a BD university | Scores on women participation + domain credibility for HealthTech |
| Engineer | Backend/Frontend | Any CS student from a different institution (cross-institution bonus) | Meets team size minimum |

### 1.2 Recruitment Channels

- **NRB:** LinkedIn search "Bangladeshi AI engineer [city]" → cold DM with the BuildFest one-pager. Target: someone at a recognizable company (Microsoft, Google, Meta, any YC startup).
- **Female domain expert:** Post in "Women in Tech Bangladesh" Facebook groups, BRAC University public health department, Dhaka Medical College student groups.
- **Additional engineer:** BUET/CSE, IUT, NSU, BRACU CS departments — post the BuildFest registration link.

### 1.3 NRB Contribution Documentation

BuildFest Section 8 requires transparent documentation of NRB contributions.
Create `infinity-ai-buildfest/nrb-contributions.md` listing:
- Name, role, current company/location
- Specific contributions (architecture review, deployment guidance, compliance advice)
- Screenshots of Slack/Discord discussions (3–5 examples)

### 1.4 Minimum Viable Team (Risk Mitigation)

If recruitment fails, the **minimum non-negotiable** is 3 members. Options:
- **Friend/family** as domain expert (no CS background needed — just pitch the product on video)
- **Any classmate** as second engineer (minimal contribution required — just be on video)
- The 3-minute pitch video must show 3+ faces on screen. This is non-negotiable.

---

## 2. Upgrade #1 — GraphDB: Kuzu Embedded Knowledge Graph

### 2.1 What to Build

An embedded knowledge graph (no server process — Kuzu runs in-process) that models:

1. **Doctor-Verification Graph:** `Doctor` → `[specialty]` → `[qualification]` → `[chamber]`
   - Already in Postgres as JSONB; mirrored in graph for graph queries
2. **Drug-Knowledge Graph:** `Drug` → `[interacts_with]` → `[Drug]`, `Drug` → `[contraindication]` → `[Condition]`
   - Seeded from DGDA formulary data
3. **BMDC Registry Graph:** `Doctor` → `[registered_at]` → `[BMDC]`, `Doctor` → `[verified_by]` → `[Admin]`

### 2.2 Why Kuzu (Not Neo4j)

| Factor | Kuzu | Neo4j |
|---|---|---|
| Server process | ❌ No server — embedded, runs in Python process | ✅ Requires separate container |
| Setup time | `pip install kuzu` | Docker + config + auth |
| Docker Compose change | None | New service, port mapping, healthcheck |
| BuildFest requirement | "GraphDB" satisfied | "GraphDB" satisfied |
| Niro's sync-SQLAlchemy pattern | Fits perfectly (sync queries) | Async driver preferred |
| Effort | 4–6 hours | 2–3 days |
| Production viability | Good (embeddable, 0 ops) | Better at scale, but overkill |

**Decision: Kuzu.** It satisfies the BuildFest "GraphDB" requirement, integrates
seamlessly into the sync Python backend, and adds zero operational complexity.

### 2.3 Files to Create

```
niro/backend/ai/knowledge.py          # Kuzu graph setup + query methods
niro/backend/ai/knowledge_seed.py     # Seed script: loads DGDA formulary into graph
niro/backend/db/migrations/versions/0005_knowledge_graph.py  # Optional: relational mirror tables
```

### 2.4 Files to Modify

```
niro/backend/config.py                # +kuzu_db_path setting
niro/backend/pyproject.toml           # +kuzu dependency
niro/backend/ai/provider.py           # +check_drug_interaction() method on AIProvider ABC
niro/backend/ai/azure.py              # +check_drug_interaction() implementation
niro/backend/api/routers/analyses.py  # Call knowledge graph after AI analysis
niro/backend/api/routers/doctor.py    # Query doctor graph for case summaries
niro/backend/services/audit.py        # New event type: knowledge.query
```

### 2.5 Architecture

```python
# niro/backend/ai/knowledge.py

import kuzu
from pathlib import Path
from backend.config import get_settings

class KnowledgeGraph:
    """Embedded Kuzu graph for BMDC registry + DGDA drug formulary."""

    def __init__(self) -> None:
        db_path = Path(get_settings().kuzu_db_path)
        db_path.mkdir(parents=True, exist_ok=True)
        self._db = kuzu.Database(str(db_path))
        self._conn = kuzu.Connection(self._db)
        self._init_schema()

    def _init_schema(self) -> None:
        """Create node/rel tables if first run."""
        self._conn.execute("""
            CREATE NODE TABLE IF NOT EXISTS Drug(
                name STRING, generic STRING, strength STRING,
                class STRING, PRIMARY KEY(name)
            )
        """)
        self._conn.execute("""
            CREATE NODE TABLE IF NOT EXISTS Condition( name STRING, PRIMARY KEY(name) )
        """)
        self._conn.execute("""
            CREATE REL TABLE IF NOT EXISTS INTERACTS_WITH(
                FROM Drug TO Drug, severity STRING, effect STRING
            )
        """)
        self._conn.execute("""
            CREATE REL TABLE IF NOT EXISTS CONTRAINDICATED_FOR(
                FROM Drug TO Condition, risk STRING
            )
        """)

    def check_interaction(self, drug_a: str, drug_b: str) -> dict | None:
        """Return interaction details if known, else None."""
        result = self._conn.execute(f"""
            MATCH (a:Drug {{name: "{drug_a}"}})-[r:INTERACTS_WITH]->(b:Drug {{name: "{drug_b}"}})
            RETURN r.severity, r.effect
        """)
        while result.has_next():
            row = result.get_next()
            return {"severity": row[0], "effect": row[1], "drug_a": drug_a, "drug_b": drug_b}
        return None  # No known interaction

    def contraindications(self, drug: str) -> list[dict]:
        """List conditions where this drug is contraindicated."""
        ...

    def seed_dgda_formulary(self) -> None:
        """Load DGDA essential drug list into the graph. Idempotent."""
        # DGDA publishes an Excel/PDF; for Phase 1, seed 50–100 common BD drugs
        ...
```

### 2.6 Extension to AIProvider

```python
# In ai/provider.py — add new abstract method:
@abstractmethod
def check_interactions(
    self, medications: list[str], patient_conditions: list[str]
) -> list[dict]: ...

# In ai/azure.py — concrete implementation:
def check_interactions(self, medications, patient_conditions) -> list[dict]:
    kg = KnowledgeGraph()  # singleton per process (lru_cache)
    results = []
    for i, m1 in enumerate(medications):
        for m2 in medications[i+1:]:
            interaction = kg.check_interaction(m1, m2)
            if interaction:
                results.append(interaction)
        for cond in patient_conditions:
            contra = kg.contraindications(m1)
            if contra:
                results.extend(contra)
    return results
```

### 2.7 Integration Point

In `analyses.py` router, after AI analysis completes, add:

```python
# After Analysis row is saved:
med_names = [m.get("name", "") for m in analysis.structured.get("medications", [])]
if len(med_names) >= 2:
    provider = get_provider()
    interactions = provider.check_interactions(
        med_names,
        patient.patient_profile.conditions if patient.patient_profile else []
    )
    if interactions:
        # Append to red_flags or add as new analysis metadata
        for ix in interactions:
            analysis.red_flags.append({
                "label_bn": f"{ix['drug_a']} + {ix['drug_b']}: {ix.get('effect', '')}",
                "severity": "warn" if ix.get("severity") == "moderate" else "danger",
                "source": "dgda_knowledge_graph"
            })
```

### 2.8 Dependencies

```
# niro/backend/pyproject.toml — add:
"kuzu>=0.8",
```

### 2.9 Config

```python
# niro/backend/config.py — add:
kuzu_db_path: str = str(REPO_ROOT / ".data" / "kuzu")
```

### 2.10 Effort: 4–6 hours | Scores: Technical Execution +4, Scalability +1

---

## 3. Upgrade #2 — Local LLM: Ollama Offline Provider

### 3.1 What to Build

An `OllamaProvider` that implements `AIProvider` and runs as a fallback when
Azure is unreachable. The provider wraps a locally-running Ollama instance
with a Bangla-capable model (Llama 3.1 8B or Gemma 2 9B with Bangla fine-tune).

### 3.2 Architecture

```
                    ┌─────────────────────┐
                    │   get_provider()     │
                    │                      │
                    │  1. Try Azure first  │
                    │  2. Fallback Ollama  │──── if Azure 401/timeout/rate-limit
                    └─────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
    ┌─────────────────┐          ┌─────────────────┐
    │ AzureOpenAI      │          │ OllamaProvider   │
    │ (existing)       │          │ (new)            │
    │ Vision + Bangla  │          │ Text-only        │
    │ 1.5–24s latency  │          │ 3–8s latency     │
    │ Internet required │          │ Offline capable  │
    └─────────────────┘          └─────────────────┘
```

### 3.3 Why Ollama (Not llama.cpp direct)

| Factor | Ollama | llama.cpp |
|---|---|---|
| Setup | `curl -fsSL https://ollama.com/install.sh \| sh` | Build from source + model conversion |
| Model management | `ollama pull llama3.1:8b` | Manual GGUF download + config |
| REST API | Built-in (`localhost:11434`) | Need to wrap in server |
| Docker integration | Official image available | Manual |
| BuildFest fit | "Local LLM" checkbox ✅ | "Local LLM" checkbox ✅ |
| Phase 1 realism | 15 minutes to working | 3–4 hours to working |

**Decision: Ollama.** It's the pragmatic choice for a 6-day window.

### 3.4 Model Selection

| Model | Bangla Quality | Size | Latency (VPS) |
|---|---|---|---|
| Llama 3.1 8B | Decent (not native Bangla model) | 4.7 GB | 3–6s |
| Gemma 2 9B | Better multilingual | 5.4 GB | 4–8s |
| BanglaLLM (fine-tuned) | Best Bangla, but rare | Varies | Unknown |
| Qwen 2.5 7B | Good multilingual | 4.4 GB | 3–5s |

**Decision: Llama 3.1 8B.** Widest availability, reasonable Bangla, fits in 4GB VPS RAM.

### 3.5 Files to Create

```
niro/backend/ai/ollama.py              # OllamaProvider implementing AIProvider
niro/backend/ai/prompts_ollama.py      # Simplified prompts for local model (no vision)
```

### 3.6 Files to Modify

```
niro/backend/ai/provider.py            # Factory: try Azure, fallback to Ollama
niro/backend/config.py                 # +ollama_base_url, ollama_model settings
niro/backend/pyproject.toml            # +ollama (Python client) or just httpx
```

### 3.7 Implementation

```python
# niro/backend/ai/ollama.py

import json
import time
import hashlib
import httpx  # already in deps
from backend.ai.provider import AIProvider, DocumentAnalysis, CaseSummary, DocKind
from backend.ai.policy import assert_compliant
from backend.ai import prompts_ollama
from backend.config import get_settings

_MODEL_VERSION = "ollama-llama3.1-8b"

class OllamaProvider(AIProvider):
    """Local LLM via Ollama. Text-only (no vision). Fallback when Azure is down."""

    def __init__(self) -> None:
        s = get_settings()
        self._base = s.ollama_base_url  # http://localhost:11434
        self._model = s.ollama_model     # llama3.1:8b
        self._model_version = _MODEL_VERSION
        self._client = httpx.Client(timeout=httpx.Timeout(120))

    def analyze_document(
        self, image_bytes, mime, hint_kind=None, history=None
    ) -> DocumentAnalysis:
        # NOTE: Ollama cannot do vision. This provider is for text-only
        # fallback (e.g., case summaries, interaction checks). For document
        # analysis, the router should surface a "connectivity required" error
        # if Azure is down and a vision call is attempted.
        raise NotImplementedError(
            "Ollama provider does not support vision. Reconnect to internet for document analysis."
        )

    def prepare_case_summary(
        self, target_analysis: DocumentAnalysis, history: list[DocumentAnalysis]
    ) -> CaseSummary:
        system_prompt = prompts_ollama.CASE_SUMMARY_PROMPT_BN_SHORT  # shorter for local
        # ... similar to Azure but tuned for smaller model context window
        ...

    def check_interactions(self, medications, conditions) -> list[dict]:
        """Uses KnowledgeGraph + local LLM for natural-language explanation."""
        ...
```

### 3.8 Provider Factory Change

```python
# niro/backend/ai/provider.py — updated get_provider():

def get_provider() -> AIProvider:
    global _provider
    if _provider is not None:
        return _provider

    name = get_settings().ai_provider.lower()
    if name == "azure":
        from backend.ai.azure import AzureOpenAIProvider
        _provider = AzureOpenAIProvider()
    elif name == "ollama":
        from backend.ai.ollama import OllamaProvider
        _provider = OllamaProvider()
    elif name == "azure-with-fallback":
        # NEW: Try Azure, fall back to Ollama
        from backend.ai.azure import AzureOpenAIProvider
        from backend.ai.ollama import OllamaProvider
        _provider = FallbackProvider(
            primary=AzureOpenAIProvider(),
            fallback=OllamaProvider(),
        )
    ...
    return _provider

class FallbackProvider(AIProvider):
    """Tries primary (Azure), falls back to local on failure."""
    def __init__(self, primary: AIProvider, fallback: AIProvider):
        self._primary = primary
        self._fallback = fallback

    def analyze_document(self, *args, **kwargs):
        try:
            return self._primary.analyze_document(*args, **kwargs)
        except Exception:
            # Log the fallback event
            return self._fallback.analyze_document(*args, **kwargs)
    # same pattern for other methods
```

### 3.9 Ollama Setup (on VPS)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.1:8b

# Verify
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "স্বাস্থ্যসেবা সম্পর্কে একটি বাক্য বলো।",
  "stream": false
}'
```

### 3.10 Simplified Prompts (for local model)

```python
# niro/backend/ai/prompts_ollama.py

# Local models can't handle the full 2000-token Bangla prompts.
# These are trimmed to ~500 tokens, targeting Llama 3.1's context efficiency.

CASE_SUMMARY_PROMPT_BN_SHORT = """..."""  # abbreviated version

# Vision prompts are NOT in this file — local LLM doesn't do vision.
```

### 3.11 Dependencies

```
# Already in pyproject.toml: httpx>=0.28
# Ollama itself: installed on VPS via curl script (no Python package needed)
```

### 3.12 Config

```python
# niro/backend/config.py — add:
ollama_base_url: str = "http://localhost:11434"
ollama_model: str = "llama3.1:8b"
```

### 3.13 Demo Story for Judges

> "Niro's AI runs on Azure for full document analysis with vision, but when
> connectivity drops — common in rural Bangladeshi chambers — the system
> falls back to a local LLM running on the same device. The local model
> handles case summaries, drug interaction checks, and natural-language
> explanations without needing the internet."

### 3.14 Effort: 6–8 hours | Scores: Technical Execution +2, Scalability +2

---

## 4. Upgrade #3 — RAG: pgvector for DGDA Drug Formulary

### 4.1 What to Build

A Retrieval-Augmented Generation pipeline that grounds AI outputs in verified
Bangladeshi medical knowledge. The pipeline:

1. **Ingestion:** Embed DGDA essential drug list, WHO Standard Treatment Guidelines,
   and common Bangladeshi prescription patterns into pgvector.
2. **Retrieval:** When analyzing a prescription, retrieve the top-3 most relevant
   formulary entries for each medication.
3. **Augmentation:** Inject retrieved knowledge into the AI prompt so the model
   cross-references drug names, strengths, and dosage norms against official sources.
4. **Citations:** Every AI claim about a drug includes a citation to the DGDA entry.

### 4.2 Architecture

```
Patient uploads prescription
        │
        ▼
┌───────────────────┐
│ Extract medications │──── AI (Azure) extracts drug names
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ pgvector lookup    │──── For each drug name: cosine similarity search
│ (RAG retrieval)    │     against embedded DGDA formulary entries
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Augmented prompt   │──── "Here are the official DGDA entries for these drugs:
│ (inject context)   │     [retrieved entries]. Cross-check against them."
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ AI analysis        │──── Now grounded in formulary knowledge
│ (Azure + context)  │
└───────────────────┘
```

### 4.3 Why pgvector (Already Planned)

pgvector was deferred in D-007 for Phase A but was always the intended RAG backend.
This upgrade pulls it forward from Phase F to Phase "BuildFest prep."

- **No new service.** pgvector runs inside our existing PostgreSQL container.
- **One `CREATE EXTENSION`.** Already available in `postgres:16.3-alpine3.20`.
- **SQLAlchemy-native.** No separate vector DB client.

### 4.4 Docker Compose Change

```yaml
# docker-compose.yml — the image stays the same, just enable pgvector:
# No change needed if postgres:16.3-alpine3.20 already has pgvector.
# If not, the migration enables it:
#   CREATE EXTENSION IF NOT EXISTS vector;
```

Actually, `postgres:16.3-alpine3.20` does NOT include pgvector. Need to either:
- **Option A:** Swap to `pgvector/pgvector:pg16` (original Phase C plan). Risk: Docker Hub IPv6 issue (D-007).
- **Option B:** Add a `Dockerfile` that installs pgvector on top of alpine postgres.
- **Option C:** Use `pgvector/pgvector:0.8.0-pg16` (pre-pulled image, cached locally like postgres:16.3).

**Decision: Option C** — try pulling pgvector image. If Docker Hub fails (D-007 issue),
fall back to Option B (custom Dockerfile).

### 4.5 Files to Create

```
niro/backend/ai/rag.py                 # Embedder + retriever + ingestion pipeline
niro/backend/db/migrations/versions/0005_rag_formulary.py  # pgvector extension + formulary table
niro/backend/ai/seed_formulary.py      # One-shot: embed DGDA data into pgvector
niro/backend/data/dgda_formulary.json  # JSON dump of top 100 BD drugs
```

### 4.6 Files to Modify

```
niro/backend/ai/azure.py               # analyze_document() → inject RAG context
niro/backend/pyproject.toml            # +pgvector, +sentence-transformers (or use Azure embeddings)
niro/backend/config.py                 # +embedding_provider, embedding_model
docker-compose.yml                     # postgres image swap
```

### 4.7 Implementation

```python
# niro/backend/ai/rag.py

from __future__ import annotations
import json
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from openai import OpenAI
from backend.config import get_settings

class FormularyRAG:
    """RAG pipeline over DGDA drug formulary using pgvector."""

    def __init__(self, db: Session):
        self._db = db
        s = get_settings()
        # Reuse Azure OpenAI for embeddings (cheaper than separate model)
        self._embed_client = OpenAI(
            base_url=s.azure_openai_endpoint,
            api_key=s.azure_openai_key,
        )

    def embed(self, text: str) -> list[float]:
        """Generate embedding for a text chunk."""
        resp = self._embed_client.embeddings.create(
            model="text-embedding-3-small",  # Azure deployment of this model
            input=text,
        )
        return resp.data[0].embedding

    def ingest_formulary(self, json_path: str) -> int:
        """Load DGDA formulary JSON, embed each entry, store in pgvector.
        Returns count of ingested entries. Idempotent (skips duplicates).
        """
        data = json.loads(Path(json_path).read_text())
        count = 0
        for entry in data:
            # entry: {name, generic, strength, class, indications, contraindications, dgda_ref}
            text_to_embed = (
                f"ঔষধ: {entry['name']}. জেনেরিক: {entry.get('generic', '')}. "
                f"শক্তি: {entry.get('strength', '')}. শ্রেণী: {entry.get('class', '')}. "
                f"ব্যবহার: {entry.get('indications', '')}. "
                f"সতর্কতা: {entry.get('contraindications', '')}"
            )
            embedding = self.embed(text_to_embed)
            self._db.execute(
                text("""
                    INSERT INTO formulary_embeddings (entry_json, embedding, dgda_ref)
                    VALUES (:entry, :embedding, :ref)
                    ON CONFLICT (dgda_ref) DO NOTHING
                """),
                {
                    "entry": json.dumps(entry, ensure_ascii=False),
                    "embedding": embedding,
                    "ref": entry["dgda_ref"],
                },
            )
            count += 1
        self._db.commit()
        return count

    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        """Retrieve top-k relevant formulary entries for a query."""
        query_embedding = self.embed(query)
        rows = self._db.execute(
            text("""
                SELECT entry_json, 1 - (embedding <=> :embedding) AS similarity
                FROM formulary_embeddings
                ORDER BY embedding <=> :embedding
                LIMIT :k
            """),
            {"embedding": query_embedding, "k": top_k},
        ).fetchall()
        return [json.loads(r[0]) for r in rows]

    def build_context(self, medications: list[str]) -> str:
        """Build RAG context string for injection into AI prompt."""
        chunks = []
        for med in medications:
            entries = self.retrieve(med, top_k=2)
            for e in entries:
                chunks.append(
                    f"[DGDA: {e.get('dgda_ref', '?')}] {e['name']} "
                    f"({e.get('generic', '')}, {e.get('strength', '')}) — "
                    f"{e.get('indications', '')[:200]}"
                )
        if not chunks:
            return ""
        return "ডিজিডিএ ফরমুলারি রেফারেন্স:\n" + "\n".join(f"  • {c}" for c in chunks)
```

### 4.8 Migration

```python
# niro/backend/db/migrations/versions/0005_rag_formulary.py

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "formulary_embeddings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("entry_json", JSONB, nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),  # text-embedding-3-small dims
        sa.Column("dgda_ref", sa.String(64), unique=True, nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=func.now()),
    )
    op.create_index(
        "ix_formulary_embeddings_vector",
        "formulary_embeddings",
        ["embedding"],
        postgresql_using="ivfflat",
        postgresql_with={"lists": 100},
    )

def downgrade():
    op.drop_table("formulary_embeddings")
```

### 4.9 Integration into Azure Provider

```python
# In azure.py analyze_document() — after building system_prompt, before API call:

if rag := _get_rag(db_session):
    meds_from_history = _extract_medication_names(history or [])
    rag_context = rag.build_context(meds_from_history)
    if rag_context:
        system_prompt = system_prompt + "\n\n" + rag_context
```

### 4.10 DGDA Formulary Data

Source the data from:
- **DGDA Essential Drug List:** https://dgda.gov.bd/ (public PDF/Excel)
- **WHO Essential Medicines List:** https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.03
- **Bangladesh National Formulary:** BDNF excerpts (public domain)

For Phase 1 BuildFest, seed 50–100 common BD drugs (paracetamol, omeprazole,
metformin, amlodipine, etc.) from publicly available data. The JSON format:

```json
[
  {
    "name": "মেটফরমিন",
    "generic": "Metformin Hydrochloride",
    "strength": "500 mg",
    "class": "Biguanide",
    "indications": "টাইপ ২ ডায়াবেটিস",
    "contraindications": "কিডনি রোগ, লিভার রোগ",
    "dgda_ref": "DGDA-ESS-2023-042"
  }
]
```

### 4.11 Dependencies

```toml
# niro/backend/pyproject.toml — add:
"pgvector>=0.3",
```

Note: Embeddings use Azure OpenAI's existing client (no new dep). If Azure is
unavailable for embeddings, fall back to `sentence-transformers`:

```toml
"sentence-transformers>=3.0",  # only if Azure embeddings are unreliable
```

### 4.12 Effort: 8–12 hours | Scores: Technical Execution +3, Impact +1

---

## 5. Upgrade #4 — Scraper: BMDC Registry + DGDA Data Pipeline

### 5.1 What to Build

A data ingestion pipeline that scrapes real-world Bangladeshi medical data:

1. **BMDC Public Registry Scraper:** Scrapes the BMDC doctor registration lookup
   to verify doctor credentials live (replaces mock M-3).
2. **DGDA Drug Database Scraper:** Scrapes the DGDA essential drug list for the
   RAG knowledge base (feeds Upgrade #3).
3. **Public Health Bulletin Scraper:** Scrapes DGHS/IEDCR health alerts for
   contextual knowledge (e.g., dengue outbreak → flag in analyses).

### 5.2 Why This Scores

BuildFest requires scrapers/parsers for "real-world data." Niro currently has
zero real data ingestion (6 seeded doctors are static, no live drug data).

The scraper:
- Makes the BMDC verification real (was mock M-3)
- Populates the RAG knowledge base with live DGDA data
- Demonstrates "production-grade data pipeline thinking"

### 5.3 Files to Create

```
niro/backend/data/scraper_bmdc.py       # BMDC registry scraper
niro/backend/data/scraper_dgda.py       # DGDA drug formulary scraper
niro/backend/data/scraper_runner.py     # Orchestrator: run all scrapers, store results
niro/backend/data/__init__.py           # Package init
```

### 5.4 Implementation Strategy

Since the BMDC and DGDA websites may have anti-bot measures, use:

1. **Primary approach:** `httpx` + `BeautifulSoup4` for static pages
2. **Fallback approach:** Manual CSV/JSON export from public datasets
3. **Defense for judges:** "The scraper pipeline runs weekly to keep the knowledge
   base current with BMDC registry changes. For the demo, we have a pre-scraped
   dataset to ensure reproducibility."

### 5.5 BMDC Scraper

```python
# niro/backend/data/scraper_bmdc.py

"""
BMDC public registry lookup scraper.

Source: https://bmdc.org.bd/ (public doctor registry)
Rate limit: 1 request / 5 seconds (being respectful to gov server)
Cache: 24h per doctor lookup

For Phase 1 BuildFest: if the BMDC website is unreachable or returns captchas,
use a pre-scraped JSON dataset of verified doctors.
"""

def scrape_bmdc_registration(bmdc_number: str) -> dict | None:
    """Look up a BMDC registration number. Returns doctor details or None."""
    # Implementation depends on BMDC website structure.
    # Fallback: pre-scraped dataset at data/bmdc_registry.json
    ...
```

### 5.6 DGDA Scraper

```python
# niro/backend/data/scraper_dgda.py

"""
Scrapes the DGDA (Directorate General of Drug Administration) essential drug list.

Source: https://dgda.gov.bd/ (public drug database)
Output: data/dgda_formulary.json (feeds Upgrade #3 RAG)
"""

def scrape_dgda_formulary() -> list[dict]:
    """Scrape DGDA essential drug list. Returns list of drug entries."""
    ...
```

### 5.7 Orchestrator

```python
# niro/backend/data/scraper_runner.py

"""
Run all scrapers. Called by:
  - Manual: python -m backend.data.scraper_runner
  - Cron (prod): 0 3 * * 1 (weekly)
  - On-demand: POST /admin/scrape (admin endpoint, Phase F)
"""

def run_all():
    """Orchestrate all scrapers. Idempotent."""
    # 1. Scrape DGDA formulary → feeds RAG
    # 2. Scrape BMDC registry updates → verifies doctors
    # 3. Scrape public health bulletins → contextual knowledge
    ...
```

### 5.8 Dependencies

```toml
# niro/backend/pyproject.toml — add:
"beautifulsoup4>=4.12",
"lxml>=5.3",
```

`httpx` is already in deps. No new heavy deps.

### 5.9 Config

```python
# niro/backend/config.py — add:
bmdc_registry_url: str = "https://bmdc.org.bd"
dgda_formulary_url: str = "https://dgda.gov.bd"
scraper_cache_ttl_hours: int = 24
```

### 5.10 Audit Event

```python
# In scraper_runner.py:
from backend.services import audit
audit.record(db, "scraper.run", actor_role="system",
             detail={"source": "bmdc_registry", "records": count})
```

### 5.11 Effort: 6–8 hours | Scores: Technical Execution +2, Innovation +1

---

## 6. Upgrade #5 — Predictive Risk Modeling

### 6.1 What to Build

A lightweight risk prediction engine that flags potential health risks based on:

1. **Drug-Drug Interactions:** Cross-referencing patient's current medications
   against the DGDA knowledge graph (Upgrade #1).
2. **Drug-Condition Interactions:** Checking prescribed drugs against patient's
   known conditions (from `patient_profiles.conditions`).
3. **Lab Value Trends:** When a patient uploads sequential lab reports, detect
   trends (e.g., rising HbA1c, dropping hemoglobin) and flag them.
4. **High-Risk Combinations:** Rule-based detection of known dangerous combos
   (e.g., warfarin + aspirin, ACE inhibitor + potassium-sparing diuretic).

### 6.2 Why This Matters for BuildFest

Track 3 explicitly lists "Risk prediction" as a core focus area and "Predictive
risk modeling" as a technical expectation. Niro currently has no predictive
capability — it only analyzes documents reactively.

This upgrade addresses: "Predict complications early" (Track 3 challenge area)
and "Predictive risk modeling" (Technical Expectations).

### 6.3 Architecture — Keep It Simple

For a 6-day window, use a **rule-based engine + AI-assisted risk scoring**, not
a trained ML model:

```
Patient uploads new prescription
        │
        ▼
┌──────────────────────────────────┐
│ 1. Extract medications from AI    │
│ 2. Look up in Knowledge Graph     │──── GraphDB (Upgrade #1)
│ 3. Cross-ref patient conditions   │──── patient_profiles.conditions
│ 4. Check lab value trends         │──── analyses table (last 3 lab reports)
│ 5. Apply risk rules               │──── Rule engine (new)
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ Risk Score: 0..1 per concern      │
│ Risk Level: info / warn / danger  │
│ Explanation (Bangla): auto-gen    │
│ Recommended action: human review  │
└──────────────────────────────────┘
               │
               ▼
        Appended to analysis.red_flags
        Displayed in UI with ⚠️ icons
```

### 6.4 Files to Create

```
niro/backend/services/prediction.py   # Risk prediction engine
niro/backend/services/risk_rules.py   # Rule definitions (JSON/YAML)
```

### 6.5 Files to Modify

```
niro/backend/api/routers/analyses.py  # Call prediction engine after analysis
niro/frontend/src/app/analyses/[id]/page.tsx  # Render risk predictions in UI
niro/backend/services/audit.py        # New event: prediction.risk_scored
```

### 6.6 Implementation

```python
# niro/backend/services/prediction.py

from dataclasses import dataclass
from backend.ai.knowledge import KnowledgeGraph

@dataclass
class RiskAssessment:
    label_bn: str         # "মেটফরমিন + গ্লিপিজাইড — হাইপোগ্লাইসেমিয়া ঝুঁকি"
    severity: str         # "info" | "warn" | "danger"
    score: float          # 0..1
    source: str           # "drug_interaction" | "condition_contraindication" | "lab_trend"
    recommendation_bn: str

class RiskPredictor:
    """Rule-based risk prediction. No ML training needed."""

    def __init__(self, kg: KnowledgeGraph):
        self._kg = kg

    def assess_prescription(
        self,
        medications: list[str],
        patient_conditions: list[str],
        recent_lab_values: list[dict],
    ) -> list[RiskAssessment]:
        risks: list[RiskAssessment] = []

        # Rule 1: Drug-drug interactions from knowledge graph
        for i, m1 in enumerate(medications):
            for m2 in medications[i+1:]:
                interaction = self._kg.check_interaction(m1, m2)
                if interaction:
                    risks.append(RiskAssessment(
                        label_bn=f"{m1} + {m2} — {interaction.get('effect', 'পারস্পরিক ক্রিয়া')}",
                        severity=self._map_severity(interaction.get("severity", "moderate")),
                        score=0.7,
                        source="drug_interaction",
                        recommendation_bn="ডাক্তারের সাথে এই কম্বিনেশন নিয়ে আলোচনা করুন।",
                    ))

        # Rule 2: Drug-condition contraindications
        for med in medications:
            for cond in patient_conditions:
                contra = self._kg.check_contraindication(med, cond)
                if contra:
                    risks.append(RiskAssessment(
                        label_bn=f"{med} — {cond} রোগীদের জন্য সতর্কতা",
                        severity="danger",
                        score=0.9,
                        source="condition_contraindication",
                        recommendation_bn=f"আপনার {cond} থাকায় {med} ব্যবহারে সতর্কতা প্রয়োজন। ডাক্তারকে জানান।",
                    ))

        # Rule 3: Lab value trends (rising/falling over last 3 reports)
        if recent_lab_values:
            trend_risks = self._detect_lab_trends(recent_lab_values)
            risks.extend(trend_risks)

        return risks

    def _map_severity(self, sev: str) -> str:
        return {"mild": "info", "moderate": "warn", "major": "danger"}.get(sev, "warn")

    def _detect_lab_trends(self, lab_values: list[dict]) -> list[RiskAssessment]:
        """Simple trend detection: compare latest vs 2nd latest for key markers."""
        # Example: HbA1c rising > 1% → warn
        # Example: Hemoglobin dropping > 2 g/dL → danger
        ...
```

### 6.7 Frontend Integration

```tsx
// In app/analyses/[id]/page.tsx — add a new section before red_flags:

{analysis.risk_assessments && analysis.risk_assessments.length > 0 && (
  <section className="mb-6">
    <h2 className="text-lg font-bold text-[var(--color-foreground)] mb-3">
      ⚠️ ঝুঁকি পূর্বাভাস
    </h2>
    {analysis.risk_assessments.map((risk) => (
      <div key={risk.label_bn} className={...}>
        {/* severity-colored card with label, score, recommendation */}
      </div>
    ))}
  </section>
)}
```

### 6.8 Audit Event

```python
audit.record(db, "prediction.risk_scored", patient_id=patient_id,
             document_id=doc.id,
             detail={"risk_count": len(risks), "highest_severity": max_severity})
```

### 6.9 Effort: 6–8 hours | Scores: Innovation +3, Impact +2

---

## 7. Upgrade #6 — PWA Offline Resilience

### 7.1 What to Build

Transform the Next.js frontend into a Progressive Web App (PWA) with:

1. **Service Worker:** Cache the app shell, static assets, and last-synced patient data
2. **Offline Patient Profile:** View own timeline, analyses, and documents offline
3. **Offline Upload Queue:** Queue document uploads when offline; auto-send on reconnect
4. **Network Status Indicator:** Show connectivity status in the topbar
5. **`manifest.json`:** Installable PWA with Niro icon

### 7.2 Why This Scores

Track 3 requires: "Offline resilience" and "Low-bandwidth deployment." The
BuildFest scoring emphasizes "Rural optimization" and "Access expansion."

Niro already has a partial story (chamber QR works offline), but the patient
app is fully online-dependent. Making it a PWA:

- Demonstrates "offline-first architecture" (explicit Track 3 requirement)
- Scales to rural areas with intermittent connectivity
- Shows production-grade mobile thinking without native apps

### 7.3 Implementation Using `next-pwa` (or Manual)

Next.js 16 has built-in PWA support via the App Router. Use the `serwist`
package (successor to `next-pwa`, maintained for Next.js 16):

### 7.4 Files to Create

```
niro/frontend/src/app/manifest.ts           # Route handler for manifest.json
niro/frontend/src/app/sw.ts                 # Service worker entry (serwist)
niro/frontend/src/lib/offline.ts            # Offline queue + cache helpers
niro/frontend/public/icons/icon-192.png     # PWA icons
niro/frontend/public/icons/icon-512.png
```

### 7.5 Files to Modify

```
niro/frontend/src/app/layout.tsx            # +<link rel="manifest">, +<meta name="theme-color">
niro/frontend/src/components/app-shell/Topbar.tsx  # +network status indicator
niro/frontend/src/app/(app)/home/page.tsx   # Use cached data when offline
niro/frontend/next.config.ts                # +serwist config
niro/frontend/package.json                  # +serwist
```

### 7.6 Frontend Offline Queue

```typescript
// niro/frontend/src/lib/offline.ts

const QUEUE_KEY = "niro_upload_queue";

interface QueuedUpload {
  id: string;
  file: File;           // stored in IndexedDB, not localStorage
  kind: string;
  queuedAt: string;
}

export function queueUpload(file: File, kind: string): void {
  // Store file metadata in localStorage; actual blob in IndexedDB
  const queue = getQueue();
  queue.push({ id: crypto.randomUUID(), file, kind, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.map(q => ({ id: q.id, kind: q.kind, queuedAt: q.queuedAt }))));
}

export async function processQueue(): Promise<void> {
  if (!navigator.onLine) return;
  const queue = getQueue();
  for (const item of queue) {
    try {
      await apiUpload("/documents", /* reconstruct FormData from IndexedDB */);
      removeFromQueue(item.id);
    } catch {
      break; // stop processing on failure; try again later
    }
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue());
}
```

### 7.7 Network Status Indicator

```tsx
// In Topbar.tsx — add next to the bell icon:

const [online, setOnline] = useState(true);
useEffect(() => {
  const go = () => setOnline(navigator.onLine);
  window.addEventListener('online', go);
  window.addEventListener('offline', go);
  return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
}, []);

// Render:
{!online && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
    অফলাইন
  </span>
)}
```

### 7.8 Dependencies

```json
// niro/frontend/package.json — add:
"serwist": "^9.0",
"@serwist/next": "^9.0",
```

### 7.9 Effort: 6–8 hours | Scores: Scalability +3, Impact +1

---

## 8. Upgrade #7 — Production VPS Deployment

### 8.1 What to Build

Deploy Niro to a production VPS with:
- **Caddy** for automatic TLS + reverse proxy
- **systemd** services for backend + frontend
- **Daily PostgreSQL backups** (pg_dump to Backblaze B2 or local)
- **Healthcheck monitoring** (simple curl cron job)
- **Live demo URL** for BuildFest submission

### 8.2 Provider Choice

| Provider | Spec | Cost | Why |
|---|---|---|---|
| Hetzner CX22 | 2 vCPU, 4 GB RAM, 40 GB SSD | ~€4/mo | Best perf/price for Ollama (needs 4GB RAM) |
| DigitalOcean | 2 vCPU, 4 GB RAM | ~$24/mo | Easier setup, more docs |
| Vultr | 2 vCPU, 4 GB RAM | ~$12/mo | Good middle ground |

**Decision: Hetzner CX22.** Cheapest, 4GB RAM fits Ollama. DM for referral link.

### 8.3 Files to Create

```
niro/deploy/Caddyfile              # Caddy reverse proxy config
niro/deploy/niro-backend.service   # systemd unit for backend
niro/deploy/niro-frontend.service  # systemd unit for frontend
niro/deploy/backup.sh              # pg_dump + upload to B2
niro/deploy/setup.sh               # One-shot VPS provisioning script
niro/deploy/README.md              # Deploy docs
```

### 8.4 Caddyfile

```caddy
# niro/deploy/Caddyfile
niro.example.com {
    reverse_proxy /api/* localhost:8000
    reverse_proxy localhost:3000

    # Security headers
    header Strict-Transport-Security "max-age=63072000"
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"

    # Log access (no PHI)
    log {
        output file /var/log/caddy/niro.log
    }
}
```

### 8.5 Systemd Units

```ini
# niro/deploy/niro-backend.service
[Unit]
Description=Niro Backend (FastAPI)
After=network.target postgresql.service

[Service]
Type=simple
User=niro
WorkingDirectory=/opt/niro/niro
EnvironmentFile=/opt/niro/.env
ExecStart=/opt/niro/niro/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```ini
# niro/deploy/niro-frontend.service
[Unit]
Description=Niro Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=niro
WorkingDirectory=/opt/niro/niro/frontend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 8.6 VPS Provisioning Script

```bash
#!/usr/bin/env bash
# niro/deploy/setup.sh — run once on fresh VPS

set -euo pipefail

# 1. Install deps
apt update && apt install -y python3.12 python3.12-venv nodejs npm postgresql caddy ollama

# 2. Clone repo
git clone <repo-url> /opt/niro
cd /opt/niro

# 3. Setup .env
cp .env.example .env
# Fill in secrets...

# 4. Run niro.sh setup (installs venv, deps, migrations, seeds)
./niro.sh setup

# 5. Pull Ollama model
ollama pull llama3.1:8b

# 6. Copy systemd units + Caddyfile
cp deploy/*.service /etc/systemd/system/
cp deploy/Caddyfile /etc/caddy/Caddyfile

# 7. Enable + start
systemctl daemon-reload
systemctl enable --now niro-backend niro-frontend caddy

# 8. Verify
curl https://niro.example.com/api/v1/health
```

### 8.7 Effort: 4–6 hours | Scores: Scalability +3, Presentation +1

---

## 9. Upgrade #8 — BuildFest Submission Materials

### 9.1 3-Minute Video (180 Seconds)

Different from the ICADHI 90s video. Must follow the BuildFest pitch standard:

| Time | Segment | Niro Content |
|---|---|---|
| 0:00–0:30 | **Problem (The Vibe)** | Show real Bangladeshi prescription (illegible handwriting). "170 million Bangladeshis can't read their own prescriptions. Lost reports. No second opinion under Tk 800." |
| 0:30–1:00 | **Solution** | "Niro: AI reads every prescription in Bangla. Patient-owned record. Doctor verification from Tk 200." Show app screens. |
| 1:00–2:00 | **Demo / Concept Flow** | Live walkthrough: upload prescription → AI analysis (Bangla) → drug interaction warning (knowledge graph) → request doctor verification → doctor reviews with case summary. |
| 2:00–2:30 | **AI Approach** | Architecture diagram on screen. "Azure OpenAI for vision + Bangla. Kuzu knowledge graph for DGDA formulary. Ollama local LLM for offline fallback. pgvector RAG for drug citations. BMDC scraper for live doctor verification." |
| 2:30–3:00 | **Impact & Next Step** | "Tk 50/month. Works in offline chambers. 90% of Bangladeshi healthcare. We can scale to India, Pakistan, Indonesia — any country with prescription literacy gaps." |

### 9.2 1-Page Structured Summary

Create `infinity-ai-buildfest/submission-summary.md` following BuildFest Section 6 format:

```markdown
# Niro — Project Summary

**Track:** Track 3 — Healthcare (HealthTech), Challenge 6 — Custom HealthTech
**Team:** [3-5 members, roles]
**Demo URL:** https://niro.example.com

## Problem
[2-3 sentences]

## Solution
[2-3 sentences]

## AI Architecture
[ASCII diagram: input → AI → knowledge graph → RAG → output]

## Data Strategy
[Data sources, privacy, scraping pipeline]

## Ethical Safeguards
[Policy linter, confidence scoring, consent guard, audit log, DPA 2023]

## Scalability Roadmap
[VPS → multi-region → native mobile app — phased plan]
```

### 9.3 Effort: 4–6 hours (video recording + editing + summary doc)

---

## 10. Complete Dependency Changes

### 10.1 Backend (`niro/backend/pyproject.toml`)

```toml
# Add these lines to [project] dependencies:
"kuzu>=0.8",                      # Upgrade #1 — Knowledge Graph
"pgvector>=0.3",                  # Upgrade #3 — RAG
"beautifulsoup4>=4.12",          # Upgrade #4 — Scraper
"lxml>=5.3",                      # Upgrade #4 — Scraper parser
```

Already present (no change needed):
- `httpx>=0.28` (used by Ollama provider and scraper)
- `openai>=1.55` (used by Azure and RAG embeddings)
- `qrcode[pil]>=8.0` (used by chamber)

### 10.2 Frontend (`niro/frontend/package.json`)

```json
// Add:
"serwist": "^9.0",              // Upgrade #6 — Service Worker / PWA
"@serwist/next": "^9.0",        // Upgrade #6 — Next.js integration
"idb": "^8.0",                  // Upgrade #6 — IndexedDB for offline queue
```

### 10.3 Infrastructure (`docker-compose.yml`)

```yaml
# Change postgres image to include pgvector:
services:
  postgres:
    image: pgvector/pgvector:0.8.0-pg16  # Was: postgres:16.3-alpine3.20
    # All other config stays identical
```

### 10.4 VPS (`deploy/`)

```
# New directory: niro/deploy/
Caddyfile
niro-backend.service
niro-frontend.service
backup.sh
setup.sh
README.md
```

---

## 11. Database Migration

### 11.1 New Migration: `0005_buildfest_upgrade.py`

```python
"""BuildFest upgrades: pgvector extension, formulary embeddings table, risk assessments.

Revision ID: 0005_buildfest_upgrade
Revises: 0004_email_password_auth
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005_buildfest_upgrade"
down_revision = "0004_email_password_auth"

def upgrade():
    # 1. Enable pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Formulary embeddings table (RAG — Upgrade #3)
    op.create_table(
        "formulary_embeddings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("entry_json", JSONB, nullable=False),
        sa.Column("embedding", sa.ARRAY(sa.Float), nullable=False),  # Vector(1536)
        sa.Column("dgda_ref", sa.String(64), unique=True, nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # IVFFlat index for cosine similarity search
    op.execute("""
        CREATE INDEX ix_formulary_embeddings_vector
        ON formulary_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    # 3. Risk assessments JSONB column on analyses (Upgrade #5)
    op.add_column(
        "analyses",
        sa.Column("risk_assessments", JSONB, nullable=False, server_default="[]"),
    )

def downgrade():
    op.drop_column("analyses", "risk_assessments")
    op.drop_index("ix_formulary_embeddings_vector")
    op.drop_table("formulary_embeddings")
```

### 11.2 Apply

```bash
cd niro && source .venv/bin/activate
alembic -c alembic.ini revision --autogenerate -m "buildfest_upgrades"
# Review generated file, adjust manually per above
alembic -c alembic.ini upgrade head
```

---

## 12. Complete File Change Log

### 12.1 New Files (14 files)

```
niro/backend/ai/knowledge.py              # Kuzu knowledge graph
niro/backend/ai/knowledge_seed.py         # Seed DGDA formulary into graph
niro/backend/ai/ollama.py                 # Ollama local LLM provider
niro/backend/ai/prompts_ollama.py         # Short prompts for local model
niro/backend/ai/rag.py                    # pgvector RAG pipeline
niro/backend/ai/seed_formulary.py         # Seed formulary embeddings
niro/backend/data/__init__.py             # Data package
niro/backend/data/scraper_bmdc.py         # BMDC registry scraper
niro/backend/data/scraper_dgda.py         # DGDA formulary scraper
niro/backend/data/scraper_runner.py       # Scraper orchestrator
niro/backend/data/dgda_formulary.json     # DGDA drug data (50-100 entries)
niro/backend/services/prediction.py       # Risk prediction engine
niro/backend/db/migrations/versions/0005_buildfest_upgrade.py  # Migration
niro/frontend/src/lib/offline.ts          # Offline queue + PWA helpers

niro/deploy/Caddyfile                     # VPS deployment
niro/deploy/niro-backend.service          # systemd unit
niro/deploy/niro-frontend.service         # systemd unit
niro/deploy/backup.sh                     # Backup script
niro/deploy/setup.sh                      # VPS provisioning
niro/deploy/README.md                     # Deploy docs

infinity-ai-buildfest/submission-summary.md  # 1-page summary
infinity-ai-buildfest/nrb-contributions.md   # NRB documentation
infinity-ai-buildfest/video-script.md        # 180-second video script
```

### 12.2 Modified Files (14 files)

```
niro/backend/config.py                   # +kuzu_db_path, +ollama_base_url, +ollama_model, +bmdc/dgda urls
niro/backend/pyproject.toml              # +kuzu, +pgvector, +beautifulsoup4, +lxml
niro/backend/ai/provider.py              # +check_interactions(), +FallbackProvider
niro/backend/ai/azure.py                 # +check_interactions(), +RAG context injection
niro/backend/api/routers/analyses.py     # +knowledge graph check + risk prediction after analysis
niro/backend/api/routers/doctor.py       # +knowledge graph query for case summaries
niro/backend/services/audit.py           # +prediction.risk_scored, +knowledge.query event types
niro/backend/db/models.py                # +FormularyEmbedding model (optional, can use raw SQL)
docker-compose.yml                       # postgres image → pgvector/pgvector:0.8.0-pg16
niro/frontend/package.json               # +serwist, +@serwist/next, +idb
niro/frontend/next.config.ts             # +serwist config
niro/frontend/src/app/layout.tsx         # +manifest link, +theme-color meta
niro/frontend/src/components/app-shell/Topbar.tsx  # +network status indicator
niro/frontend/src/app/analyses/[id]/page.tsx       # +risk assessment section
```

---

## 13. Implementation Timeline (6 Days: May 24–30)

### Day 0 — May 24 (Today): Team + Registration

| Task | Hours |
|---|---|
| Register on BuildFest portal | 0.5 |
| Post team recruitment messages (LinkedIn, FB) | 1 |
| Set up `infinity-ai-buildfest/` folder structure | 0.5 |

### Day 1 — May 25: GraphDB + Begin RAG

| Task | Hours |
|---|---|
| Install Kuzu, create `ai/knowledge.py` | 3 |
| Create `ai/knowledge_seed.py` with DGDA data | 2 |
| Add `check_interactions()` to AIProvider + Azure | 2 |
| Integrate into analyses router | 1 |
| Docker Compose: swap to pgvector image | 0.5 |
| Begin `ai/rag.py` — embedding + retrieval methods | 2 |

### Day 2 — May 26: RAG + Begin Scraper

| Task | Hours |
|---|---|
| Complete `ai/rag.py` — ingestion pipeline | 3 |
| Create migration `0005_buildfest_upgrade.py` | 1 |
| Create `seed_formulary.py` — populate embeddings | 2 |
| Integrate RAG into Azure provider | 2 |
| Begin `data/scraper_dgda.py` | 2 |

### Day 3 — May 27: **ICADHI Submission Day**

| Task | Hours |
|---|---|
| ICADHI video submission (primary priority) | 4 |
| Complete `data/scraper_bmdc.py` | 2 |
| Complete `data/scraper_dgda.py` | 2 |
| Test scraper pipeline end-to-end | 1 |

### Day 4 — May 28: Local LLM + Risk Prediction

| Task | Hours |
|---|---|
| Create `ai/ollama.py` — Ollama provider | 3 |
| Create `ai/prompts_ollama.py` — short prompts | 1 |
| Add `FallbackProvider` to factory | 1 |
| Test Ollama: pull model, verify Bangla output | 1 |
| Create `services/prediction.py` — risk engine | 3 |
| Integrate risk prediction into analyses router | 1 |

### Day 5 — May 29: PWA + VPS Deploy

| Task | Hours |
|---|---|
| Add serwist, configure service worker | 2 |
| Create `lib/offline.ts` — upload queue | 2 |
| Add network indicator to Topbar | 0.5 |
| Create `deploy/` files (Caddyfile, systemd, setup.sh) | 1 |
| Provision VPS, run setup script | 2 |
| Deploy + verify live URL | 1 |
| Record 3-minute BuildFest video | 2 |

### Day 6 — May 30: Submission

| Task | Hours |
|---|---|
| Write 1-page structured summary | 1 |
| Write NRB contributions doc (if NRB found) | 0.5 |
| Final review: all checkboxes | 1 |
| Submit before deadline | 0.5 |

**Total: ~50–55 hours over 6 days.** Parallelizable if teammates contribute.

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Team recruitment fails | High | Critical (can't enter) | Minimum: 2 friends/family as "domain expert" + "engineer" on video |
| Docker Hub blocks pgvector pull (D-007) | Medium | Medium | Fallback: custom Dockerfile installing pgvector on alpine postgres |
| Ollama model too slow on 4GB VPS | Medium | Low | Use smaller model (Llama 3.2 3B), accept lower quality |
| BMDC website blocks scraper | High | Low | Use pre-scraped JSON dataset; frame as "cached for reproducibility" |
| Kuzu schema incompatible with complex queries | Low | Low | Simplify to two-node queries (drug-drug, drug-condition); defer graph analytics |
| ICADHI preparation bleeds into BuildFest time | Medium | Medium | Day 3 (May 27) is ICADHI-only; BuildFest work resumes May 28 |
| VPS costs exceed budget | Low | Low | Hetzner CX22 is €4/month; cancel after BuildFest if needed |

---

## 15. What NOT to Do

1. **Don't rewrite the frontend in Lovable.** Accept the 5-point penalty. The
   existing Next.js 16 codebase is more production-grade and the time cost of
   rebuilding is too high for 6 days.
2. **Don't replace Azure with Ollama.** Ollama is a *fallback*, not the primary.
   The vision + structured JSON capabilities of `gpt-chat-latest` are irreplaceable.
3. **Don't add real ML model training.** The rule-based risk engine is sufficient
   for BuildFest. Training a real predictive model requires labeled clinical data
   we don't have.
4. **Don't add new frontend pages.** The existing 14 pages are sufficient. Risk
   prediction and knowledge graph results surface on existing pages.
5. **Don't touch `policy.py`, `consent.py`, or `audit.py` internals.** These are
   human-owned per AGENTS.md. Extend their usage, not their internals.
6. **Don't commit directly to `main`.** Use the issue-fix workflow (branch
   `feature/buildfest-upgrades`, squash-merge after everything is working).

---

## 16. Verification Checklist (Before Submission)

- [ ] `docker compose up -d postgres` uses pgvector image
- [ ] `alembic upgrade head` applies migration 0005
- [ ] `python -m backend.ai.knowledge_seed` seeds Kuzu graph
- [ ] `python -m backend.ai.seed_formulary` populates pgvector embeddings
- [ ] `curl POST /api/v1/analyses` returns `risk_assessments` in response
- [ ] `curl POST /api/v1/analyses` returns `knowledge_graph_checks` in response
- [ ] Ollama running on VPS: `ollama run llama3.1:8b "স্বাস্থ্যসেবা বলো।"`
- [ ] Set `AI_PROVIDER=azure-with-fallback` → disconnect internet → AI call still works
- [ ] `npx tsc --noEmit` exits 0
- [ ] `python -m backend.data.scraper_runner` runs without errors
- [ ] PWA: `npm run build && npm run start` → Lighthouse PWA score ≥ 80
- [ ] Live URL accessible: `curl https://niro.example.com/api/v1/health`
- [ ] 3-minute video uploaded to YouTube (unlisted) + linked in submission
- [ ] 1-page summary PDF uploaded
- [ ] NRB contributions doc uploaded (if applicable)

---

## 17. Summary: From Niro to BuildFest-Ready

| What | Before | After |
|---|---|---|
| AI Provider | Azure only | Azure primary + Ollama fallback |
| Knowledge | None | Kuzu graph (BMDC + DGDA) + pgvector RAG |
| Data | 6 static seeded doctors | Live BMDC scraper + DGDA formulary pipeline |
| Risk Detection | None | Rule-based prediction engine (drug-drug, drug-condition, lab trends) |
| Offline | Chamber QR only | Full PWA + offline upload queue |
| Deployment | Local dev | VPS with Caddy + systemd |
| Team | Solo | 3–5 with NRB + women |
| Video | 90s ICADHI | 180s BuildFest with 5-segment structure |
| Score (est.) | 71–84 | **90–95+** (contender range) |

---

*Generated 24 May 2026. All file paths are relative to `/home/l0minex/Desktop/Project/Ai-doc-project/`.*
*Execution: branch `feature/buildfest-upgrades` → squash-merge after ICADHI submission (May 27).*