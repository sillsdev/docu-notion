# Terminal

The vscode terminal often loses the first character sent from copilot agents. So if you send "cd" it might just say "bash: d: command not found". Try prefixing commands with a space.

**CRITICAL**: If current terminal is BUSY (running a command), `isBackground: false` commands will NOT execute until that terminal is free. You must spawn a new terminal by running a command with `isBackground: true`.

- `isBackground: false` - Uses current terminal, waits for completion
- `isBackground: true` - Creates NEW terminal, returns immediately

**Working pattern:**

```bash
yarn dev          # isBackground: true (starts server in NEW terminal A)
curl localhost:3000  # isBackground: true (creates NEW terminal B for curl)
curl localhost:3000  # isBackground: false (runs in current terminal B)
Wrong pattern:

yarn dev           # isBackground: false (blocks current terminal forever)
curl localhost:3000  # isBackground: false (will never execute - terminal is busy)

```
