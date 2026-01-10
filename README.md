# SPT Web Quest Builder

A modern web-based tool for building quests for [SPT (Single Player Tarkov)](https://www.sp-tarkov.com/). This application provides an intuitive interface for creating custom quests, conditions, and rewards for your SPT server.

## Features

- **Quest Builder** - Create and configure custom quests with various types and parameters
- **Condition Builder** - Set up quest completion conditions (kill targets, find items, visit locations, etc.)
- **Reward Builder** - Configure quest rewards including items, experience, trader reputation, and more

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime and package manager

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jhayashi1/spt-web-quest-builder.git
   cd spt-web-quest-builder
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun dev
   ```

4. Open your browser and navigate to `http://localhost:8080`

### Building

```bash
bun run build
```

## Usage

1. Create a new quest by filling in the quest details (name, description, trader, etc.)
2. Add conditions that players must complete
3. Configure rewards for quest completion
4. Export your quest configuration as JSON
5. Add the exported files to your SPT server's mod folder

## Credits

This project is a web-based reimplementation inspired by the original **[SPT Quest Builder](https://github.com/ThePi1/SPT-Trader-Builder)** Python desktop application. The original tool was built using PyQt6 and provided the foundation for the quest structure and data formats used in this web version.

[wiki references](https://github.com/sp-tarkov/wiki/tree/main/modding/references)

## License

MIT License
