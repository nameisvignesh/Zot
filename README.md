<div align="center">

# ZOT

### Zero-Shot Prompt Routing System

Route each prompt to the model that best matches its intent, complexity, context needs, latency, and cost.

<p>
  <a href="https://github.com/nameisvignesh/Zot">Repository</a> ·
  <a href="https://github.com/nameisvignesh/Zot/issues">Issues</a> ·
  <a href="https://github.com/nameisvignesh/Zot/pulls">Pull requests</a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=fff" alt="TypeScript 5.8" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/License-MIT-f5f5f5?labelColor=111" alt="MIT License" />
</p>

![ZOT dashboard](public/readme-dashboard.png)

</div>

## Contents

- [Overview](#overview)
- [Why ZOT](#why-zot)
- [Features](#features)
- [How routing works](#how-routing-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Using the application](#using-the-application)
- [Provider and model setup](#provider-and-model-setup)
- [Public model catalog](#public-model-catalog)
- [Local LFM checkpoint](#local-lfm-checkpoint)
- [Environment variables](#environment-variables)
- [Project architecture](#project-architecture)
- [Data and privacy](#data-and-privacy)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

ZOT is a local-first web workspace for routing prompts across local and hosted language models. It makes the routing decision visible instead of hiding it behind a single chat box:

1. A prompt is classified into a task category.
2. Its approximate token count and complexity are estimated.
3. Available models are compared using context length, cost, latency, capability, and priority.
4. The route is recorded with the selected model, reason, estimated cost, and request metrics.
5. A configured provider can generate the final chat response in the Playground.

ZOT is a client-side Vite application. It does not include a server-side API proxy. Provider requests are made from the browser to the endpoint configured by the user.

```text
┌──────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│ User prompt  │ -> │ Intent + token scan  │ -> │ Model comparison    │
└──────────────┘    └──────────────────────┘    └─────────┬──────────┘
                                                           │
                                                           ▼
                                                ┌────────────────────┐
                                                │ Selected route     │
                                                │ model + reason     │
                                                └─────────┬──────────┘
                                                          │
                                                          ▼
                                                ┌────────────────────┐
                                                │ Provider response  │
                                                │ metrics + history  │
                                                └────────────────────┘
```

## Why ZOT?

Using one expensive model for every prompt is often unnecessary. ZOT helps make that tradeoff explicit:

- **Task fit** — coding, reasoning, summarization, extraction, creative writing, classification, or general questions.
- **Context fit** — prefer a model with enough context for a long prompt.
- **Cost awareness** — estimate input and output cost before sending a request.
- **Latency awareness** — compare configured or published latency estimates.
- **Provider freedom** — use local models, OpenAI-compatible endpoints, Anthropic, Google Gemini, OpenRouter, Hugging Face, and custom endpoints.
- **Visibility** — retain routing decisions and request metrics for analytics.

## Features

### Dashboard

The dashboard explains the routing workflow and provides quick entry points to Prompt Router and the project repository.

### Prompt Router

Enter a prompt and inspect:

- detected task category;
- confidence and complexity;
- estimated input and output tokens;
- selected model and routing reason;
- estimated cost in the selected currency;
- configured model targets;
- public model alternatives from the live catalog.

The router supports an explicit target-model override when you want to compare a specific model rather than use automatic selection.

### Model Registry

The Models page supports:

- an optional local `LFM2.5-230M` checkpoint target;
- built-in templates for ChatGPT, Gemini, Claude, DeepSeek, Perplexity, and Mistral;
- custom provider, model ID, endpoint, context, latency, and pricing fields;
- API-key configuration and local persistence;
- connection testing;
- enable/disable switches;
- live public model catalog search and documentation links.

### Playground

The Playground is the normal chat surface. It routes the outgoing prompt, sends the conversation to the selected configured model, displays the assistant response, records errors, and provides a **Clear chat** action.

### Prompt Refinement

Prompt Refinement can be unlocked with a Hugging Face token. It also provides a common provider-token section for refinement workflows and reports approximate token savings, reduction percentage, and semantic similarity.

### Analytics

Analytics provides chart and table views for:

- request count;
- success rate;
- input and output token usage;
- average latency;
- model usage;
- routing history;
- request status and cost.

### Cost meter

Cost Analytics includes:

- current spend;
- total tokens and request count;
- model-level usage;
- alert limits from 100 to 50,000;
- custom numeric limits;
- INR, USD, EUR, and GBP display options;
- warning state when the configured limit is reached.

### Settings and localization

Settings control language, cost currency, default model, local device, request timeout, refinement version, and routing behavior. Draft changes are applied only after saving; navigating away with unsaved changes prompts for confirmation.

The interface includes English, Tamil, Hindi, Russian, German, Japanese, and Korean translations for the main navigation and settings workflows.

### Responsive design

The layout is optimized for desktop and compact mobile widths. Navigation becomes horizontally scrollable, cards collapse into single-column layouts, and long model tables remain horizontally scrollable instead of breaking the page.

## How routing works

The current router is deterministic and runs in the browser. It does not call a separate classifier model.

### 1. Prompt classification

The routing engine checks prompt signals for categories such as coding, reasoning, summarization, extraction, creative writing, classification, and general questions. It also detects code blocks, constraints, output formats, technical terms, and numeric requirements.

### 2. Token and complexity estimation

ZOT uses a lightweight tokenizer approximation for word boundaries, punctuation, whitespace, numbers, and common subword splits. Complexity increases with prompt length, technical density, constraints, and step-by-step or detailed instructions.

### 3. Model selection

Automatic selection considers the enabled models and chooses according to the prompt:

- very large prompts prefer the largest available context window;
- complex coding and reasoning prompts prefer capable, high-throughput targets;
- simple prompts prefer free, local, or lower-latency targets;
- balanced prompts prefer the highest-priority free target;
- an explicit model override takes precedence when valid.

### 4. Cost estimation

Estimated cost is calculated from the prompt token count, estimated output tokens, and the selected model's input/output price fields. Catalog entries without published pricing are shown as not published rather than silently treated as free.

### 5. Generation

Routing and generation are separate. The router can produce a decision without generating an answer. The Playground uses the selected model's configured endpoint to request the actual response.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git
- A modern browser with `fetch`, `AbortController`, and local storage support

Optional:

- Git LFS for the LFM checkpoint
- A provider API key for hosted model generation
- A compatible local inference runtime endpoint for local model generation

## Installation

### Clone the repository

```bash
git clone https://github.com/nameisvignesh/Zot.git
cd Zot
```

### Install dependencies

```bash
npm install
```

The repository also contains npm and pnpm lockfiles. Use one package manager consistently for a given checkout.

### Start development mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Vite server listens on all interfaces so it can be opened from another device on the same network when the host firewall allows it.

### Build and preview production output

```bash
npm run typecheck
npm run build
npm run preview
```

The preview server runs at [http://localhost:4173](http://localhost:4173).

## Configuration

### First-run workflow

After opening ZOT:

1. Open **Settings** and choose the language, currency, default model, timeout, and routing behavior.
2. Press **Save preferences**.
3. Open **Models** and configure at least one API model if you want generated chat responses.
4. Press **Test connection** for the configured model.
5. Use **Prompt Router** to inspect a route or **Playground** to generate a response.

### Provider setup workflow

1. Go to **Models**.
2. Select **Configure** on a built-in template or choose **Add custom model**.
3. Enter a display name and provider.
4. Enter the provider's model ID.
5. Enter the endpoint base or chat-completions endpoint.
6. Enter the API key.
7. Add context length, latency, and input/output price values when they are not known automatically.
8. Save the model and test the connection.

### Supported endpoint styles

ZOT normalizes common endpoint bases to a chat-completions route. Examples:

| Provider | Endpoint example | Request style |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | OpenAI-compatible chat completions |
| OpenRouter | `https://openrouter.ai/api/v1` | OpenAI-compatible chat completions |
| DeepSeek | `https://api.deepseek.com/v1` | OpenAI-compatible chat completions |
| Together | `https://api.together.xyz/v1` | OpenAI-compatible chat completions |
| Mistral | `https://api.mistral.ai/v1` | OpenAI-compatible chat completions |
| Anthropic | `https://api.anthropic.com/v1/messages` | Anthropic Messages API |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta` | Native `generateContent` fallback |
| Hugging Face | Provider-specific endpoint | Provider-specific inference endpoint |

Provider behavior can change independently of ZOT. Always confirm the current endpoint, model ID, API-key permissions, and browser-origin policy with the provider.

## Using the application

### Route a prompt

1. Open **Prompt Router**.
2. Enter a prompt in **Your prompt**.
3. Leave **Target model override** on Auto route or choose a configured target.
4. Select **Route prompt**.
5. Review the task, confidence, selected model, reason, token estimate, latency, and cost.

### Chat with a model

1. Open **Playground**.
2. Select Auto route or a configured enabled model.
3. Enter a message and select **Send**.
4. Read the routing event and assistant response in the chat timeline.
5. Select **Clear chat** to start a new conversation.

### Refine a prompt

1. Open **Refinement**.
2. Enter a Hugging Face token and select **Enter with token** when the gate is shown.
3. Optionally save a common provider token and endpoint.
4. Enter the original prompt.
5. Select **Refine** and compare the output and token metrics.

### Review usage and cost

Open **Analytics** for request charts and tables. Open **Cost** to choose a limit or type a custom threshold. The currency follows the value selected in Settings.

## Provider and model setup

### Built-in templates

The Models page includes templates for common public models, including:

- ChatGPT GPT-5 and GPT-4.1;
- Gemini 2.5 Pro and 2.5 Flash;
- Claude Opus 4.1 and Sonnet 4;
- DeepSeek V3.1 and R1;
- Perplexity Sonar Pro;
- Mistral Large and Magistral Small.

Templates provide starting values only. Before using a template, confirm the provider's current model ID, price, context window, endpoint, and API-key requirements.

### API keys and browser requests

ZOT stores configured model records in browser storage so the application can be used without a server account. A configured key is sent directly from the browser to its selected provider endpoint when testing or generating. Use restricted keys, appropriate spending limits, and providers that support browser-origin requests.

### Connection status

The header status dot is:

- green when the most recent connection state is healthy;
- yellow while a connection is in progress;
- red after a model test or Playground request fails.

The Models page also displays the provider response or error beside each model.

## Public model catalog

The Models and Prompt Router pages fetch public model metadata at runtime from the [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models).

The catalog can include hundreds of model entries and exposes, when available:

- provider and model ID;
- context length;
- published input and output pricing;
- documentation links.

ZOT calculates prompt-specific token counts and estimated output tokens locally. It calculates estimated request cost from the catalog pricing. Published latency is displayed when available; otherwise the UI reports that latency is not published.

If the catalog cannot be loaded, check the browser network connection, content-blocking extensions, and the provider's availability, then use **Refresh catalog**.

## Local LFM checkpoint

The optional Liquid AI LFM 2.5-230M checkpoint can be placed in `LFM2.5-230M/`. The directory is ignored by Git because the model weights are large and belong to the upstream Hugging Face repository.

### Download with Git LFS

```bash
git lfs install
git clone https://huggingface.co/LiquidAI/LFM2.5-230M LFM2.5-230M
```

The project can recognize the checkpoint as a local route target. The browser cannot execute the weights by itself; local chat generation requires an inference runtime that exposes a compatible endpoint, such as an application or service running on the user's machine. Without that runtime, configure an API model for generated chat responses.

## Environment variables

`.env.example` contains the local development setting:

```dotenv
VITE_APP_ENV=development
```

Copy it to `.env.local` only when you need a local override:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux:

```bash
cp .env.example .env.local
```

Do not put provider API keys in Vite environment variables for a public build. Values prefixed with `VITE_` are exposed to browser code.

## Project architecture

```text
.
├── public/
│   ├── fonts/Geist-Variable.woff2
│   ├── readme-dashboard.png
│   └── zot-logo.png
├── src/
│   ├── components/
│   │   ├── analytics/
│   │   ├── common/
│   │   ├── dashboard/
│   │   ├── models/
│   │   ├── playground/
│   │   ├── refinement/
│   │   ├── routing/
│   │   └── settings/
│   ├── context/ZotContext.tsx
│   ├── data/mockData.ts
│   ├── lib/
│   │   ├── i18n.ts
│   │   ├── modelClient.ts
│   │   ├── publicModelCatalog.ts
│   │   ├── routingEngine.ts
│   │   └── tokenizer.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Important modules

| Module | Responsibility |
| --- | --- |
| `src/context/ZotContext.tsx` | Shared application state, model persistence, settings, request history, and navigation |
| `src/lib/routingEngine.ts` | Prompt classification, complexity scoring, model selection, and cost estimation |
| `src/lib/tokenizer.ts` | Lightweight token estimation and constraint extraction |
| `src/lib/modelClient.ts` | Provider request normalization, chat calls, timeout handling, and connection tests |
| `src/lib/publicModelCatalog.ts` | Runtime loading and normalization of public model metadata |
| `src/lib/i18n.ts` | UI translation dictionaries and interpolation |
| `src/index.css` | Geist Variable font, color tokens, component styles, and responsive rules |

## Data and privacy

- ZOT is a browser application; there is no built-in backend or server-side key vault.
- Model configuration, settings, API keys, request history, and refinement access are stored in browser local storage by the current client implementation.
- Prompts are sent to external providers only when you submit a request or use a provider-backed workflow.
- The public model catalog is fetched from OpenRouter at runtime.
- Do not use production secrets in a shared browser profile.
- Do not commit `.env` files, API keys, provider tokens, or downloaded model weights.
- Clear the site's local storage from browser developer tools if you need to remove locally stored configuration and history.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server on port 3000 |
| `npm run typecheck` | Run TypeScript validation without emitting files |
| `npm run lint` | Alias for the current TypeScript validation command |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Serve the production bundle on port 4173 |

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
git diff --check
```

## Troubleshooting

### The page does not open on port 3000

Check whether another process is using the port. You can pass a different Vite port for a temporary development run:

```bash
npm run dev -- --port 3001
```

Then open [http://localhost:3001](http://localhost:3001).

### The public model list is empty

The catalog is loaded from OpenRouter in the browser. Check network access, browser extensions, CORS-related console messages, and the **Refresh catalog** action.

### A provider returns HTTP 404

Verify the endpoint base and model ID. For OpenAI-compatible providers, use the provider's `/v1` base or `/chat/completions` endpoint as documented by that provider. For Google Gemini, use a valid Gemini model ID and the `generativelanguage.googleapis.com/v1beta` endpoint.

### The connection test fails

Check:

1. The API key is valid and has permission for the selected model.
2. The model ID matches the provider exactly.
3. The endpoint is reachable from the browser.
4. The provider allows browser-origin requests.
5. The request timeout in Settings is long enough.

### The local model is listed but chat cannot answer

The presence of `LFM2.5-230M/` does not start an inference server. Configure a compatible local runtime endpoint in Models or select a tested API model in Playground.

### Language or settings changes do not appear

Press **Save preferences**. Draft settings intentionally do not apply until they are saved.

### Reset local application data

Use the browser developer tools to clear local storage for `localhost:3000`, then reload the page. This removes locally saved models, settings, request history, and refinement access state.

## Contributing

Contributions are welcome for routing rules, provider adapters, model metadata, accessibility, translations, and responsive UI improvements.

### Recommended workflow

1. Fork the repository.
2. Create a focused branch, for example `feature/provider-adapter`.
3. Make the smallest change that solves the issue.
4. Keep API keys, `.env` files, and model weights out of commits.
5. Run `npm run typecheck`, `npm run build`, and `git diff --check`.
6. Include screenshots or a short reproduction for visual and interaction changes.
7. Open a pull request describing the behavior, validation, and any provider assumptions.

### Pull request checklist

- [ ] The change is scoped to one problem.
- [ ] TypeScript validation passes.
- [ ] Production build passes.
- [ ] Responsive layout was checked when UI changed.
- [ ] No API key, token, or model weight is included.
- [ ] README or translation copy was updated when user-facing behavior changed.

## License

ZOT is released under the [MIT License](LICENSE).

The Geist Variable font is bundled under its own open-source font license. See the upstream [Geist font project](https://github.com/vercel/geist-font) for font licensing details.
