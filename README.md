# Zot — Zero-Shot Prompt Routing System

<div align="center">

```
                                                    ███████╗ ██████╗ ████████╗
                                                    ╚══███╔╝██╔═══██╗╚══██╔══╝
                                                      ███╔╝ ██║   ██║   ██║   
                                                     ███╔╝  ██║   ██║   ██║   
                                                    ███████╗╚██████╔╝   ██║   
                                                    ╚══════╝ ╚═════╝    ╚═╝   
```

**An intelligent, zero-shot prompt routing & token optimization engine.**  
*Dynamic model arbitration, negative constraint preservation, interactive 2D node graphs, and budget matching across local and frontier LLMs.*

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## 🌟 Key Features

- **⚡ Zero-Shot Dynamic Routing**: Powered by Liquid AI LFM (Liquid Foundation Models) principles to categorize query intent, calculate structural complexity, and select optimal inference endpoints without fine-tuning overhead.
- **🛡️ Invariant & Negative Constraint Preservation**: Detects strict negative prompt rules (*"Do not use external libraries"*, *"Never include preamble"*) and ensures strict zero loss across model transformations.
- **💰 Expected Cost & Budget Arbiter**: Set your maximum token price threshold ($0.00 Free tier to $15.00+ Frontier) to instantly highlight budget-matched local and API models.
- **🕸️ Interactive 2D Node Graph Topology**: Real-time visual canvas with panning, zooming (In/Out/Reset/Fit), and port-connected execution wires showing prompt lexing, routing arbitration, and multi-model dispatch.
- **📊 Real-time Latency & Cost Telemetry**: Live ping latency tests, token throughput metrics (tokens/sec), context capacity visualization, and cost tracking with Recharts.
- **🔒 Protected Built-in & Custom Registry**: Protected built-in core foundation models alongside user-configurable endpoints for Ollama, vLLM, LM Studio, OpenRouter, and custom OpenAI-compatible APIs.
- **🎛️ Multi-Model Playground**: Side-by-side comparison, temperature/top-p tuning, and direct token streaming.

---

## 🏗️ Architecture & Pipeline

```
[ Invariant Prompt Lexer ] ──▶ [ Token Tensor & Negative Rule Extractor ]
                                         │
                                         ▼
                             [ Liquid AI LFM MoE Arbiter ]
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
        [ Budget Arbiter (≤ Max $) ]           [ Complexity & Domain Fit ]
                     │                                       │
                     └───────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ 100% Free / Local Node ]                      [ Frontier API Gateway ]
   (LFM 7B, Mistral, Qwen, Ollama)                (GPT-4o, Claude 3.5, Gemini 2.0)
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                       [ Output Sanitizer & Telemetry ]
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **bun** / **pnpm** / **yarn**

### Installation

```bash
# 1. Clone repository
git clone https://github.com/nameisvignesh/Zot.git
cd Zot

# 2. Install dependencies
npm install

# 3. Start local development server (binds to port 3000)
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## 📦 Building & Deployment

### Production Build

```bash
npm run build
```

This generates optimized static production assets in the `dist/` directory with relative asset paths ready for any static hosting provider.

### Preview Production Build

```bash
npm run preview
```

---

## 🌐 Deploying to GitHub Pages

Zot is configured with relative path resolution (`base: './'`), making deployment to GitHub Pages simple:

### Option 1: Using GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

1. Push this file to your `main` branch.
2. In your GitHub repository settings, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.

### Option 2: Using `gh-pages` branch

```bash
# Build the application
npm run build

# Deploy dist folder using git subtree or gh-pages package
npx gh-pages -d dist
```

---

## 💻 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **Charts & Telemetry**: [Recharts](https://recharts.org/)

---

## 🛠️ Project Structure

```
Zot/
├── public/                 # Static assets (favicons, logos)
├── src/
│   ├── components/         # Modular UI views & widgets
│   │   ├── accounts/       # Account & API key vault
│   │   ├── analytics/      # Cost & latency analytics
│   │   ├── dashboard/      # Unified overview & quick actions
│   │   ├── models/         # Model catalog & test telemetry
│   │   ├── nodes/          # 2D node graph canvas & wire renderer
│   │   ├── playground/     # Interactive multi-model test lab
│   │   ├── refinement/     # Prompt invariant refiner & diff view
│   │   └── routing/        # Zero-shot router & expected cost matcher
│   ├── context/            # Zot application state provider
│   ├── data/               # Model registry & benchmark prompts
│   ├── lib/                # Tokenizer, routing heuristics & engine
│   ├── types.ts            # Global TypeScript definitions
│   ├── App.tsx             # Main view router
│   └── main.tsx            # DOM root mounting
├── index.html              # HTML entry point
├── package.json            # Scripts & dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build & plugin setup
└── README.md               # Documentation
```

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
