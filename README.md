# ZOT

ZOT (Zero-Shot Prompt Routing System) is a browser-based workspace for routing prompts to local or hosted language models. It classifies tasks, lets you choose a configured model, and records request results and cost estimates.

> **Hosted model requests are sent directly from your browser.** Some providers block browser requests with CORS. Those providers require a trusted server-side proxy; ZOT does not currently include one.

## Features

- Configure local Ollama models and compatible hosted APIs.
- Discover model IDs when a provider exposes a model-list endpoint.
- Route prompts, refine text, and use the Playground to chat with configured models.
- Review request history, token estimates, latency, and configured cost estimates.
- Keep model settings and request history in the current browser.

## Requirements

- Node.js 20 or newer
- npm
- A modern browser
- Ollama or a compatible hosted model API to generate responses

## Run locally

```sh
git clone https://github.com/nameisvignesh/Zot.git
cd Zot
npm install
npm run dev
```

Open the local URL printed by Vite. To validate or preview a production build:

```sh
npm run lint
npm run build
npm run preview
```

## Configure a model

1. Open **Models** and select **Add custom model** or a provider template.
2. Select **Local** for Ollama or **Using API** for a hosted provider.
3. Enter a model name, model ID, endpoint, and API key where required.
4. Select **Find models** if the provider supports model discovery.
5. Save the model, enable it, and select **Test connection**.
6. Choose the model in **Prompt Router**, **Playground**, or **Refinement**.

ZOT stores the endpoint you enter. When a compatible API base URL ends in `/v1`, ZOT sends chat requests to `/v1/chat/completions`. You can also enter a complete request URL, such as one ending in `/chat/completions`.

### NVIDIA NIM

For NVIDIA NIM, use your NIM API key and model ID, and enter this base endpoint:

```text
https://integrate.api.nvidia.com/v1
```

ZOT keeps that base URL in the model configuration and adds `/chat/completions` for the chat request. The API key must have access to the selected model.

### Connection errors and CORS

If a model test reports that the browser could not reach the endpoint, check the endpoint, network connection, provider status, and browser console. A `Failed to fetch` error can mean the provider does not allow browser-origin requests through CORS; it does not by itself prove that the API key or model ID is wrong.

There is no safe browser setting that fixes a provider's CORS policy. Do not disable browser security. The provider must allow the app's origin, or requests must go through a trusted server-side proxy. A proxy should keep provider API keys server-side; never put a private key in frontend code or a public repository.

Finding a model in the provider's catalog does not guarantee permission to use it for inference. Access, billing, region, and model availability are controlled by the provider.

## Local models with Ollama

1. Install and start [Ollama](https://ollama.com/download).
2. Download a model, for example:
   ```sh
   ollama pull LiquidAI/lfm2.5-2.6b
   ```
3. In **Models**, configure a local model with:
   - Provider: `Ollama`
   - Model ID: `LiquidAI/lfm2.5-2.6b`
   - Endpoint: `http://localhost:11434/api/chat`
4. Save the model and select **Test connection**.

If the browser cannot connect, confirm Ollama is running and that the browser and firewall allow local connections to port `11434`.

## Privacy and telemetry

Model settings, API keys, preferences, and request history are stored in the browser's local storage. They are not synchronized between browsers, and ZOT does not provide an account service or central database. Clearing browser storage removes this data.

Prompts are sent to the selected model provider and are subject to that provider's privacy and retention policies. Token counts may be estimates when a provider does not return usage data. Cost estimates use the prices configured in ZOT and may differ from provider invoices.

## Deployment

The GitHub Actions workflow builds the app on pushes to `main` or `master` and publishes it to the `gh-pages` branch. To configure Pages for a fork, open **Settings → Pages** and select the `gh-pages` branch and root folder.

GitHub Pages hosts only the frontend. It cannot act as a private proxy for provider API requests.

## Project structure

```text
src/components/       Application screens and UI
src/context/          Application state and browser persistence
src/data/             Default models and sample data
src/lib/               Model clients, routing, catalog, and utilities
src/types.ts           Shared TypeScript types
.github/workflows/     Build and deployment workflow
public/                Static assets
```

## Contributing

Issues and pull requests are welcome. Include reproduction steps, browser and provider details, and non-secret error text. Never include API keys, access tokens, or private prompts.

### AI assistance

AI tools used in the development of this project include ChatGPT (OpenAI) and Claude (Anthropic). The GitHub Contributors panel is generated from commits associated with GitHub accounts, so listing AI tools here does not add them to that panel.

## License

ZOT is distributed under the [MIT License](LICENSE).
