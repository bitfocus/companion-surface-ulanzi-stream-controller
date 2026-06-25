## Ulanzi Stream Controller

A Companion surface plugin for the **Ulanzi Stream Controller D200 and D200X**.
The device exposes a 5×3 grid of LCD push-buttons plus a wide status window. Each
button is rendered by Companion at 196×196 px.

The wire protocol was reverse-engineered with help from
[redphx/strmdck](https://github.com/redphx/strmdck) and USB captures of Ulanzi
Studio. The vendor software (Ulanzi Studio) must not be running while Companion
uses the device, or the two will fight over the USB interface.

Requires **Companion 4.3.0 or newer** (the surface plugin system landed in
4.3.0) and the **Node 22** runtime.

### Features

- 13 configurable buttons, each with a Companion-rendered icon
- Button press / release events
- Brightness control from Companion
- A wide status window with seven selectable modes (see below)

### Status window

The wide window to the right of the keys can show one of seven modes, selectable
per surface from the ⚙ **Config** panel:

- Analog dial clock
- Digital clock — time only
- Digital clock — time + weekday
- Digital clock — time + date
- Digital clock — date + time + weekday
- System stats (CPU / RAM)
- A custom background image

The digital clock modes honour a **12 / 24-hour** checkbox. For the custom image
mode, supply a local file path to a PNG or JPEG; it is automatically resized and
center-cropped to 458×196.

### Ulanzi Stream Controller D200

_5×3 grid, 13 LCD keys_

The keys map directly to the Companion grid.

### Ulanzi Stream Controller D200X

_5×3 grid, 14 LCD keys, additional programmable controls_

The D200X adds programmable controls on top of the D200 layout. It also supports
a screensaver. Otherwise the keys map directly to the Companion grid as on the
D200.

### Platform notes

- **Windows** — works out of the box once Ulanzi Studio is closed.
- **macOS** — expected to work like Windows (untested).
- **Linux** — requires a udev rule granting access to the device's
  `/dev/hidraw*` nodes, and a USB 2.0 hub between the device and the host.
  Connecting through a USB-2 hub rather than directly is the single most
  important point on Linux.

See the project repository for the full setup walkthrough, udev rule, firmware
quirks, and troubleshooting.
