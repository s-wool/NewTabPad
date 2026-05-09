# NewTabPad

A Chrome extension that replaces the new tab page with a plain-text notepad.

## Features

- Multiple notes with auto-save (500ms debounce)
- Line numbers with overflow indicator (`›`) for lines exceeding the visible width
- Syncs across tabs in real time
- Safe during Japanese IME input — updates from other tabs are held until composition ends
- No build step — plain HTML / CSS / ES Modules

## Installation

### From source

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repository root

### From Chrome Web Store

https://chromewebstore.google.com/detail/fheahjkhknoainbllbkijhmjknhbfkme?utm_source=item-share-cb

## Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|---|---|---|
| New note | `Cmd + Shift + Enter` | `Ctrl + Shift + Enter` |
| Note list | `Cmd + Shift + K` | `Ctrl + Shift + K` |
| Back to editor | `Esc` | `Esc` |

## License

[MIT](LICENSE) © Norikazu Kato
