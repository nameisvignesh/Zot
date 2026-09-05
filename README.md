<div align="center">

```
                         ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄        ▄▄▄▄▄▄        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄    
                         █▒▓██████████████▓░░    ▄▄▀▀▒▓███▒▀▀▄▄    █░░░▒▓██▓▒░░▒▒▀▀▀▄
                         █▄▄▄▄▄▄▄▄▄▄▄░▒▓▓▓▒░▒   █░▒▓▒░▄▄▄▄░▒▓▒░█   ▀▀▀▀▀▄▓█░▒▓▒░░▒▒░░
                                  ▄▀░▒▒▒▒░▄▀   █░▒▒░▄▀    ▀▄▒▒░█       █▒░▒▒░▄▀▀▀▀▀▀
                             ▄▀▀▀▀ ░░░░ ▄▀    █ ░░ ▄▀      ▀▄ ░░ █      █░░░  █      
                              █ ░   ░  █      █    █        █    █      █░    █      
                            ▄▀      ▄▄▄▄▀     ▄    ▀▄      ▄▀    █      ▄ ■   █      
                          ▄▀      ▄▀   ▄▄▄▀▀█  ▀    ▀▄    ▄▀    █       █ ·   █      
                         █       ▀▀▀▀▀▀     ░   █     ▀▀▀▀     █        █     █      
                         █ ■·-              ▒    ▀▀▄▄■·-  ■▄▄▀▀         █    ▄█      
                         ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀        ▀▀▀▀▀▀             ▀▀▀▀▀        
```

# ⚡ Zot

### Intelligent Zero-Shot Prompt Routing & Token Optimization Engine

**Dynamic model arbitration · Constraint preservation · Cost optimization · Multi-model inference**

<br>

[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react\&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite\&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC.svg?logo=tailwind-css\&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/nameisvignesh/Zot/pulls)

**[Demo](#-demo)** · **[Features](#-key-features)** · **[Architecture](#️-architecture)** · **[Quick Start](#-quick-start)** · **[Roadmap](#-roadmap)**

</div>

---

# 📖 About Zot

**Zot** is a zero-shot prompt routing and token optimization engine designed to intelligently select the most appropriate LLM for each individual request.

Instead of sending every prompt to an expensive frontier model, Zot analyzes the request first and determines whether it can be handled by a smaller, cheaper, or local model.

```text
                 USER PROMPT
                      │
                      ▼
              ┌───────────────┐
              │ Prompt Lexer  │
              └───────┬───────┘
                      │
                      ▼
          ┌────────────────────────┐
          │ Intent & Complexity    │
          │ Classification         │
          └───────────┬────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Budget Arbiter│
              └───────┬───────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
        LOCAL MODELS      FRONTIER APIs
             │                 │
             └────────┬────────┘
                      ▼
             ┌────────────────┐
             │ Output         │
             │ Sanitizer      │
             └───────┬────────┘
                     │
                     ▼
                FINAL OUTPUT
```

---

# 🎯 Why Zot?

Modern AI applications often use the same model for every task.

That creates three major problems:

### 💸 Unnecessary Cost

Simple prompts are frequently sent to expensive models even when a smaller model could solve them.

### 🧠 Poor Model Utilization

Different models have different strengths. A coding task, summarization task, reasoning task, and creative task should not necessarily use the same model.

### 🔒 Vendor Lock-in

Applications become tightly coupled to a single AI provider.

### Zot's Solution

Zot evaluates every request before inference and dynamically selects the best available model based on:

* Task intent
* Prompt complexity
* Domain compatibility
* Budget
* Latency
* Context capacity
* User-defined constraints

---

# ✨ Key Features

## ⚡ Zero-Shot Dynamic Routing

Analyze and route prompts without:

* Fine-tuning
* Training datasets
* A separately trained classifier
* Manual model selection

The router evaluates each request at runtime.

---

## 🛡️ Negative Constraint Preservation

Zot treats strict instructions as **invariants**.

Example:

```text
Do not use external libraries.

Never include a preamble.

Return JSON only.

Keep the response under 100 words.
```

These rules are extracted and verified against the generated response.

| Rule             | Example                  | Enforcement          |
| ---------------- | ------------------------ | -------------------- |
| Dependency ban   | No external libraries    | Import validation    |
| Preamble ban     | No introduction          | Structure validation |
| Format lock      | JSON only                | JSON validation      |
| Tone restriction | Avoid marketing language | Lexical checks       |
| Length bound     | Under 100 words          | Token / word count   |

---

## 💰 Budget-Aware Routing

Set the maximum amount you're willing to spend.

```text
Maximum Budget
      │
      ▼
    $0.00
      │
      ▼
┌───────────────┐
│ Local Models  │
│ Ollama        │
│ LM Studio     │
│ vLLM          │
└───────────────┘
```

Models outside the configured budget are automatically excluded.

---

## 🕸️ Interactive 2D Node Graph

Visualize the entire routing pipeline.

The graph provides:

* Pan
* Zoom
* Reset
* Fit-to-screen
* Execution wires
* Node inspection
* Routing visualization

---

## 📊 Real-Time Telemetry

Monitor:

* Request latency
* Tokens/sec
* Context utilization
* Expected cost
* Historical usage
* Model performance

---

## 🎛️ Multi-Model Playground

Compare models side-by-side before routing.

Supported controls include:

* Temperature
* Top-p
* Token streaming
* Model comparison
* Custom endpoints

---

## 🔐 Client-Side API Key Vault

Zot does not require a central backend.

Provider credentials remain inside the user's browser storage and requests are sent directly to the configured provider.

---

# 🧠 How Routing Works

Every request passes through five stages.

## 01 — Prompt Lexing

The raw prompt is tokenized and structurally analyzed.

```text
RAW PROMPT
    │
    ├── Token Count
    ├── Code Detection
    ├── Language Markers
    └── Instruction Density
```

---

## 02 — Negative Rule Extraction

Hard constraints are identified and registered as invariants.

```text
"Do not use external libraries"

             ↓

       CONSTRAINT RULE

             ↓

       dependency_ban
```

---

## 03 — Intent & Complexity Classification

Zot determines what the prompt is trying to accomplish.

Example:

```text
Write a Python function
          │
          ▼
      CODE TASK
          │
          ▼
    LOW COMPLEXITY
          │
          ▼
     LOCAL MODEL
```

Complex reasoning tasks can instead be routed to stronger models.

---

## 04 — Budget & Capability Arbitration

Candidate models are evaluated using multiple signals:

```text
route_score(model) =

    w₁ · domain_fit
  + w₂ · complexity_match
  + w₃ · budget_score
  + w₄ · latency_score
  + w₅ · context_fit
```

The highest-scoring compatible model becomes the routing target.

---

## 05 — Dispatch, Sanitization & Telemetry

The selected model generates the response.

Zot then:

```text
Generated Response
        │
        ▼
Output Sanitizer
        │
   ┌────┴─────┐
   ▼          ▼
Valid       Invalid
   │          │
   ▼          ▼
Output     Refinement
```

Latency and cost information are recorded for analytics.

---

# 🏗️ Architecture

```text
┌──────────────────────────────┐
│          USER PROMPT         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Invariant Prompt Lexer   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Token Tensor & Rule Extractor│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      LFM MoE Arbiter         │
│ Intent + Complexity + Domain │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│Budget Arbiter │  │Capability    │
│              │  │Matcher       │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Model Selection │
       └────────┬────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Local Models │  │ Frontier APIs│
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Output Sanitizer│
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │    Telemetry    │
       └────────┬────────┘
                │
                ▼
          FINAL OUTPUT
```

---

# 🤖 Supported Models & Providers

## Local / Free

| Provider          | Example Models        |    Cost |
| ----------------- | --------------------- | ------: |
| Built-in Registry | LFM, Mistral, Qwen    | `$0.00` |
| Ollama            | Any local model       | `$0.00` |
| LM Studio         | GGUF models           | `$0.00` |
| vLLM              | Supported checkpoints | `$0.00` |

## Frontier / API

| Provider   | Example                | Cost         |
| ---------- | ---------------------- | ------------ |
| OpenAI     | GPT models             | Configurable |
| Anthropic  | Claude models          | Configurable |
| Google     | Gemini models          | Configurable |
| OpenRouter | Multi-provider models  | Varies       |
| Custom     | OpenAI-compatible APIs | User-defined |

---

# 🖼️ Demo

Add project screenshots under:

```text
docs/
└── screenshots/
    ├── dashboard.png
    ├── routing.png
    ├── node-graph.png
    ├── playground.png
    ├── refinement.png
    └── analytics.png
```

Then embed them:

```md
![Zot Dashboard](docs/screenshots/dashboard.png)

![Zot Routing](docs/screenshots/routing.png)

![Zot Node Graph](docs/screenshots/node-graph.png)
```

> 🎥 Live demo coming soon.

---

# 🚀 Quick Start

## Prerequisites

* Node.js `18+`
* npm / pnpm / bun / yarn
* Optional: Ollama, LM Studio, or vLLM

## Installation

```bash
git clone https://github.com/nameisvignesh/Zot.git

cd Zot

npm install
```

## Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🦙 Ollama Setup

Start your local Ollama server:

```bash
ollama serve
```

Example endpoint:

```text
http://localhost:11434/v1
```

Example model:

```text
qwen2.5:7b
```

Configure it in Zot:

| Setting           | Value                       |
| ----------------- | --------------------------- |
| Provider          | Ollama                      |
| Base URL          | `http://localhost:11434/v1` |
| Model ID          | `qwen2.5:7b`                |
| API Key           | Optional                    |
| Context           | `32768`                     |
| Price / 1M tokens | `0.00`                      |

If CORS blocks browser requests:

```bash
OLLAMA_ORIGINS=http://localhost:3000 ollama serve
```

---

# ⚙️ Configuration

Zot's model registry supports:

| Field          | Description               |
| -------------- | ------------------------- |
| Model Name     | Display name              |
| Provider       | Model provider            |
| Base URL       | API endpoint              |
| Model ID       | Provider model identifier |
| API Key        | Authentication            |
| Context Length | Maximum context           |
| Token Price    | Cost per 1M tokens        |
| Capabilities   | Supported tasks           |

Any OpenAI-compatible endpoint can be registered.

---

# 🕹️ Application Modules

| Module         | Purpose                             |
| -------------- | ----------------------------------- |
| **Dashboard**  | Overall system overview             |
| **Routing**    | Prompt analysis and model selection |
| **Node Graph** | Visual routing pipeline             |
| **Playground** | Multi-model testing                 |
| **Refinement** | Constraint analysis                 |
| **Analytics**  | Cost and latency monitoring         |
| **Accounts**   | API key management                  |
| **Models**     | Model registry                      |

---

# 📦 Build

Create a production build:

```bash
npm run build
```

Output:

```text
dist/
```

Preview:

```bash
npm run preview
```

---

# 🌐 GitHub Pages

Zot is designed to work as a static web application.

### Build

```bash
npm run build
```

### Deploy

```bash
npx gh-pages -d dist
```

GitHub Actions can also be used for automated deployment.

---

# 💻 Tech Stack

| Layer           | Technology                  |
| --------------- | --------------------------- |
| UI              | React 19                    |
| Language        | TypeScript 5.8              |
| Build           | Vite 6                      |
| Styling         | Tailwind CSS 4              |
| Icons           | Lucide React                |
| Animation       | Motion                      |
| Charts          | Recharts                    |
| Local Inference | Ollama / LM Studio / vLLM   |
| API             | OpenAI-compatible endpoints |
| Deployment      | GitHub Pages                |

---

# 📁 Project Structure

```text
Zot/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── accounts/
│   │   ├── analytics/
│   │   ├── dashboard/
│   │   ├── models/
│   │   ├── nodes/
│   │   ├── playground/
│   │   ├── refinement/
│   │   └── routing/
│   │
│   ├── context/
│   ├── data/
│   ├── lib/
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 🗺️ Roadmap

* [ ] Multi-model fan-out
* [ ] Routing policy files
* [ ] Cost history export
* [ ] Streaming node graph
* [ ] Prompt A/B refinement
* [ ] Embedding-based semantic cache
* [ ] Desktop application
* [ ] Internationalization
* [ ] Advanced routing benchmarks
* [ ] Automated model performance scoring

---

# ❓ FAQ

<details>
<summary><b>Does Zot proxy API requests through a backend?</b></summary>

No. Zot is designed as a client-side application. Requests are sent directly from the browser to the configured model endpoint.

</details>

<details>
<summary><b>Where are API keys stored?</b></summary>

API keys are stored locally in the browser and are only used with the provider endpoint configured by the user.

</details>

<details>
<summary><b>Can Zot work without paid APIs?</b></summary>

Yes. Zot can connect to local inference servers such as Ollama, LM Studio, and vLLM.

</details>

<details>
<summary><b>What does zero-shot routing mean?</b></summary>

The routing system does not require a separately trained classifier or task-specific fine-tuning. Prompt characteristics are evaluated dynamically during inference.

</details>

<details>
<summary><b>Can custom models be added?</b></summary>

Yes. Zot supports configurable OpenAI-compatible endpoints.

</details>

---

# 🔧 Troubleshooting

### Ollama CORS Error

```bash
OLLAMA_ORIGINS=http://localhost:3000 ollama serve
```

### Local Model Not Appearing

Check:

```text
✓ Ollama / server is running
✓ Base URL ends with /v1
✓ Model ID matches the server
✓ Price is configured correctly
```

### Routing Ignores $0 Budget

Make sure the local model has:

```text
Price / 1M tokens = 0.00
```

### Build Problems

Use Node.js 20 LTS or newer:

```bash
node --version
```

Then reinstall:

```bash
rm -rf node_modules
npm install
```

### GitHub Pages Blank Screen

Verify that:

```text
✓ npm run build succeeds
✓ dist/ contains the generated application
✓ GitHub Pages serves the contents of dist/
✓ Relative asset paths are configured
```

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork

```bash
git clone https://github.com/<your-username>/Zot.git

cd Zot
```

### 2. Create a branch

```bash
git checkout -b feat/awesome-routing-heuristic
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start development

```bash
npm run dev
```

### 5. Commit

```bash
git commit -m "feat(routing): improve model selection"
```

### 6. Push

```bash
git push origin feat/awesome-routing-heuristic
```

Then open a Pull Request.

---

# 🔒 Security

Zot follows a client-side architecture:

* No central API proxy
* API keys remain in browser storage
* Requests go directly to configured providers
* No API keys are embedded into the production build

> ⚠️ Never hard-code provider API keys into the source code or production build.

For production deployments, always prefer secure HTTPS endpoints.

---

# 🙏 Acknowledgements

* **Liquid AI** — LFM concepts inspiring the routing architecture
* **React** — Frontend framework
* **Vite** — Build tooling
* **Tailwind CSS** — UI styling
* **Lucide** — Interface icons
* **Motion** — UI animation
* **Recharts** — Data visualization
* **Ollama** — Local model execution

---

# 📄 License

This project is licensed under the **MIT License**.

See [`LICENSE`](LICENSE) for details.

---

<div align="center">

# ⚡ Zot

### *Route smarter. Spend less. Break nothing.*

<br>

**Zero-shot routing · Token optimization · Model arbitration**

<br>

⭐ **Star the repository if Zot saves you tokens.**

</div>
