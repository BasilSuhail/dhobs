# 🏛️ THE COUNCIL - Technical Documentation

## 1. Project Overview
**THE COUNCIL** is a multi-agent AI research terminal designed to provide high-accuracy information by orchestrating multiple Large Language Models (LLMs). It uses a "consensus-through-elimination" strategy to minimize hallucinations and ensure all claims are backed by verifiable sources.

---

## 2. Core Architecture

### 2.1 Agent System (`agents/`)
The application supports a pluggable agent architecture. Each agent inherits from a `BaseAgent` and implements its own `generate` and `evaluate` logic.
- **OllamaAgent:** Interfaces with local models via the Ollama REST API.
- **GeminiAgent:** Uses Google's Generative AI SDK/API.
- **DeepSeekAgent:** Interfaces with DeepSeek's OpenAI-compatible API.
- **BaseAgent:** Abstract class ensuring consistent behavior across all providers.

### 2.2 Consensus Engine (`consensus/`)
This is the "brain" of the application. It manages how agents interact:
- **Scoring (`scoring.py`):** Each output is rated on Accuracy, Completeness, Source Quality, and Clarity.
- **Voting (`voting.py`):** Agents cross-validate each other's work, assigning scores to their peers.
- **Elimination (`elimination.py`):** If the consensus threshold is not met, the lowest-scoring agent is removed from the round.

### 2.3 Knowledge Retrieval (`utils/`)
- **Web Search (`web_search.py`):** Uses DuckDuckGo to provide agents with real-time internet data.
- **RAG (`storage/rag.py`):** Uses vector embeddings to store and retrieve results from past research sessions.
- **Hallucination Check (`hallucination_check.py`):** Performs final cross-references between the top-rated outputs to identify contradictions.

---

## 3. User Interface (TUI)
Built with the `Textual` framework, the interface is divided into:
- **Sidebar:** Real-time status of active and eliminated agents.
- **Research Log:** Markdown-rendered output of the AI deliberation process.
- **System Log:** Technical background logs (API calls, RAG status, errors).
- **Command Input:** Terminal-style input with command history.

### Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Ctrl+B` | Toggle Active Agents sidebar (useful for text selection). |
| `Ctrl+Y` | Copy the most recent research consensus to clipboard. |
| `Ctrl+T` | Cycle through UI themes (Default, Cyberpunk, Nord, Dracula). |
| `Ctrl+L` | Clear all logs and buffers. |
| `Up/Down` | Navigate command history. |
| `Ctrl+C` | Request quit (requires double-press for safety). |

---

## 4. Commands Reference

### Research & Deliberation
- `/council research <query>`: Starts the competitive elimination mode.
- `/council begin <query>`: Starts the collaborative deliberation mode.
- `/council start`: Initializes the council with default local agents.

### Management
- `/council list`: Displays active agents and available local models.
- `/council add <provider> [model]`: Adds a new agent (e.g., `/council add gemini`).
- `/council remove <agent_id>`: Removes an agent by its ID.
- `/council toggle`: Toggles the sidebar visibility.

### Configuration
- `/council preferences <text>`: Sets global RAG tailoring (e.g., "Focus on medical papers").
- `/council config prompt <text>`: Changes the system prompt for all agents.
- `/council config threshold <0-100>`: Sets the required consensus percentage.
- `/council history`: Lists the last 10 research sessions.

---

## 5. Setup & Environment

### Installation
The app can be installed globally using the provided scripts:
- **Linux:** `bash scripts/install.sh`
- **macOS:** `bash scripts/install_mac.sh`

### Environment Variables (`.env`)
To use web providers, create a `.env` file from the example:
```env
GEMINI_API_KEY=your_key
DEEPSEEK_API_KEY=your_key
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 6. Security & Privacy
- **Local-First:** By default, the app uses Ollama for 100% private local processing.
- **No Hardcoding:** API keys are never stored in the codebase; they are loaded from the environment at runtime.
- **Session Data:** All research logs are stored locally in `storage/sessions/` in JSON format.

## 7. Tech Stack 
- Python 3.11+
- Django
- PostgreSQL/SQLite
- React/Angular
- HTML 5+ and Tailwind CSS
