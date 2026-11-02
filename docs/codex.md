# Floorplan — Guilhermexp no Codex

Floorplan works in [Codex](https://developers.openai.com/codex) the same way it works in Claude Code: the same skill, scripts and map, on your own ChatGPT sign-in. There are no API keys to set up.

## What you need

- Codex: the desktop app or the CLI, signed in with your ChatGPT account.
- [Node.js](https://nodejs.org) 18 or newer.

## Install

**In the Codex app** (no terminal needed):

1. Open **Plugins** and choose **Add a marketplace**.
2. For **Source**, enter `guilhermexp/floorplan`. Leave **Git ref** empty, and click **Add marketplace**.
3. Find **Floorplan — Guilhermexp** in the list and click **+** to install it.
4. Start a new chat.

**From a terminal**, with the [Codex CLI](https://developers.openai.com/codex/cli):

```bash
codex plugin marketplace add guilhermexp/floorplan
codex plugin add floorplan@floorplan-guilhermexp
```

The app and the CLI share their plugins, so installing in one makes Floorplan available in both.

## Make your first map

Open your project in Codex and ask in plain words:

> Draw a floorplan of this codebase

To call the skill by name, type `$floorplan`. Everything after that is the same as in Claude Code ([Getting started](getting-started.md#make-your-first-map)): Codex scans the code, describes every part, file and web request, builds the map and opens it. Later, "update the floorplan" re-reads only what changed.

When Codex opens the map, it asks to run the map's server outside its sandbox. The server has to keep running after the command ends, and the Ask bar needs to reach Codex. If you'd rather not allow it, run the server yourself from the project folder:

```bash
node floorplan/serve.mjs
```

## Asking questions on the map

The map's Ask bar runs your own Codex on your computer: `codex exec` in Codex's **read-only** sandbox, in your project folder, with your ChatGPT sign-in. It reads the map and your source to answer, and can't change any files. These runs aren't saved to your Codex history; a follow-up question brings the last few questions and answers along instead.

The server uses whichever agent built the map, and falls back to the other one if that one isn't installed. To choose:

```bash
node floorplan/serve.mjs --engine codex
```

It finds `codex` on your PATH, and on Windows the CLI that comes with the Codex desktop app. If yours is somewhere else, pass `--codex /path/to/codex`. `--model <name>` picks the model; otherwise your Codex settings decide.

## What's different from Claude Code

- **No notes file.** In Claude Code, Floorplan can keep a short note in `CLAUDE.local.md` (personal and never committed, and only if you say yes) that points future sessions at the map. Codex has no personal, uncommitted equivalent (`AGENTS.md` is shared with your team), so in Codex Floorplan leaves your project's notes alone.
- **No Claude app.** Publishing the map to the Claude app is a Claude feature. In Codex the map opens in your browser, served from your computer.
- **"Fix with Codex".** The Health panel's ready-made fix prompts are for pasting into Codex. On a [blueprint](getting-started.md#plan-something-you-havent-built-yet), the same goes for **Build this with Codex**, and the Ask bar's **Change** switch runs Codex in its read-only sandbox too: Codex replies with the updated plan, and the map's server saves it.

## Update or remove it

In the app, open **Plugins**, find the Floorplan marketplace and choose **Upgrade** to get the latest version, or **Remove marketplace** to take it out. From a terminal:

```bash
codex plugin marketplace upgrade floorplan-guilhermexp
codex plugin add floorplan@floorplan-guilhermexp
```

```bash
codex plugin remove floorplan@floorplan-guilhermexp
codex plugin marketplace remove floorplan-guilhermexp
```

Your maps stay in each project's `floorplan/` folder until you delete them.

## Trying a working copy

Point Codex at your local clone instead of GitHub:

```bash
codex plugin marketplace add /path/to/floorplan
codex plugin add floorplan@floorplan-guilhermexp
```

Codex copies a local plugin into its cache when you add it (unlike Claude Code, which runs a local plugin straight from the folder). After you change the plugin, run `codex plugin add floorplan@floorplan-guilhermexp` again and start a new session.

## Desenvolvimento e atualização deste fork

O marketplace desta versão se chama `floorplan-guilhermexp`, separado do original. A skill continua sendo `$floorplan`. O crédito do autor original e a licença MIT foram preservados.

Durante o desenvolvimento, registre o caminho absoluto deste checkout com `codex plugin marketplace add /caminho/para/floorplan` e instale `codex plugin add floorplan@floorplan-guilhermexp`. O resultado JSON de `codex plugin add --json` informa o cache instalado. Confira a cópia com `node tools/checksums.mjs --check /caminho/do/cache`.

A instalação é uma cópia: depois de alterar e validar o plugin, atualize sua versão e CHECKSUMS.txt, execute o comando de instalação novamente e inicie um novo chat. Para trocar a origem local pela publicação do GitHub, remova somente o marketplace `floorplan-guilhermexp`, adicione `guilhermexp/floorplan` e reinstale o mesmo plugin.

O plugin não precisa conter projetos reais para funcionar. Mapas, planos, respostas, versões e imagens ficam na pasta ignorada `floorplan/` de cada projeto. O Git do plugin recebe apenas ferramentas, instruções e testes sintéticos. O servidor local é iniciado quando necessário para abrir cada mapa; instalar o plugin não mantém todos os mapas rodando.
