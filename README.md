# companion-surface-ulanzi-stream-controller

> [!TIP]
> If this plugin is useful to you, you can buy me a coffee at
> [ko-fi.com/jcalado](https://ko-fi.com/jcalado). Support helps keep the project
> maintained and encourages future work (more surfaces, bug fixes, features).

Companion surface plugin for the **[Ulanzi Stream Controller D200 / D200X](https://www.ulanzi.com/products/stream-controller-d200)**: 13–14 physical
buttons on a 5×3 grid plus a status window, 196×196 px icons.

Built against [`@companion-surface/base`](https://github.com/bitfocus/companion-surface-api).
Wire protocol reverse-engineered with help from
[redphx/strmdck](https://github.com/redphx/strmdck) and USBPcap captures of
Ulanzi Studio.

## Features

- 13 configurable buttons, each with a Companion-rendered icon
- Button press/release events
- Brightness control from Companion
- Page navigation from the two bottom-outer buttons (previous / next),
  gated by Companion's own per-surface page-navigation setting
- Small-window status display with seven modes — analog dial clock, four
  digital clock variants (time; time + weekday; time + date; date + time +
  weekday), system stats (CPU / RAM), or a custom background image — selectable
  per surface via the ⚙ **Config** panel. Digital modes honour a 12/24-hour
  checkbox. The background image is loaded from a local file path (PNG/JPEG) and
  scaled to fill the 458×196 window.
- Optional idle screensaver that blanks the LCDs via the firmware lockscreen

## Quickstart

Requires **Companion 4.3.0+** and **Node 22**.

```bash
yarn install
yarn build
```

Then register the build directory with Companion as a developer module and
enable it under **Modules → Surfaces**. Plug the device in and it appears under
**Surfaces**.

- **Windows / macOS** — works out of the box once Ulanzi Studio is closed (Studio
  fights Companion for the USB interface).
- **Linux** — the device needs access to its `/dev/hidraw*` nodes.
  Companion 4.3+ generates the required udev rule automatically from the module's
  declared USB IDs (`companion-sync-udev-rules`); on companion-pi this is handled
  for you, and Companion 5.0+ offers a one-click sync (or suggests a one-line
  command) when it detects the device lacks access. If your Companion version
  doesn't sync the rule, apply it manually with `sudo ./tools/install-udev.sh` —
  see [**SETUP.md**](./SETUP.md).

See [**SETUP.md**](./SETUP.md) for the full walkthrough, platform notes,
firmware quirks, and troubleshooting.

## Development

```bash
yarn dev       # tsc --watch
yarn build     # → dist/
yarn package   # full package for Companion
```

## Not yet implemented

- Keyboard emulation on interface 1 (intentionally left to `usbhid`)

## License

MIT.
