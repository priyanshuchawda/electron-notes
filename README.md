# Quick Notes

A fast, modern desktop note-taking application built with Electron, React, and Bun.

![Quick Notes](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- 📝 **Create and manage notes** - Simple, distraction-free note-taking
- 🏷️ **Tag system** - Organize notes with colorful tags
- 🔍 **Full-text search** - Quickly find any note using SQLite FTS5
- 💾 **Auto-save** - Notes are automatically saved as you type
- 🌙 **Dark theme** - Easy on the eyes
- ⚡ **Fast** - Built with Bun and SQLite for lightning-fast performance

## Tech Stack

- **Desktop**: Electron + React + TypeScript + Vite
- **Server**: Bun + Elysia
- **Database**: SQLite with FTS5 full-text search
- **State Management**: TanStack Query (React Query)

## Project Structure

```
quick-notes/
├── packages/
│   ├── desktop/     # Electron + React frontend
│   ├── server/      # Bun + Elysia API server
│   └── shared/      # Shared TypeScript types
├── package.json     # Workspace root
└── tsconfig.base.json
```

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Node.js](https://nodejs.org/) >= 18 (for Electron)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/quick-notes.git
cd quick-notes

# Install dependencies
bun install
```

## Development

Start the server and desktop app in separate terminals:

```bash
# Terminal 1: Start the API server
bun run dev:server

# Terminal 2: Start the desktop app
bun run dev:desktop
```

The server runs on `http://localhost:3001` and the desktop app connects to it automatically.

## Building for Production

```bash
# Build the desktop app
bun run build:desktop

# Create distributable (Windows)
cd packages/desktop
bun run dist
```

The built application will be in `packages/desktop/release/`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/notes` | List notes (with search & pagination) |
| GET | `/notes/:id` | Get single note |
| POST | `/notes` | Create note |
| PUT | `/notes/:id` | Update note |
| DELETE | `/notes/:id` | Delete note |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| PUT | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag |

## Type Checking

```bash
bun run typecheck
```

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
