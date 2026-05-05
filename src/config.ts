import type { SomeCompanionInputField } from '@companion-surface/base'

export const SMALL_WINDOW_DISABLED = -1

export const CONFIG_FIELDS: SomeCompanionInputField[] = [
	{
		id: 'smallWindowMode',
		type: 'dropdown',
		label: 'Small window mode (3_2 slot)',
		choices: [
			{ id: String(SMALL_WINDOW_DISABLED), label: 'Full-width button (no clock overlay)' },
			{ id: '1', label: 'Analog dial clock' },
			{ id: '203', label: 'Digital: time' },
			{ id: '201', label: 'Digital: time + weekday' },
			{ id: '202', label: 'Digital: time + date' },
			{ id: '200', label: 'Digital: date + time + weekday' },
			{ id: '0', label: 'System stats (CPU / memory)' },
			{ id: '2', label: 'Background image' },
		],
		default: String(SMALL_WINDOW_DISABLED),
		tooltip: 'When set to "Full-width button", the 3_2 slot renders a Companion button at 458×196 with no clock overlay. Other modes use the device\'s built-in small-window display.',
	},
	{
		id: 'twelveHour',
		type: 'checkbox',
		label: 'Use 12-hour clock (digital modes)',
		default: false,
		tooltip: 'Only applies when small window mode is set to a device digital clock option.',
	},
	{
		id: 'pageButtonsNavigate',
		type: 'checkbox',
		label: 'Use page buttons for page navigation',
		default: true,
		tooltip: 'When enabled, the two bottom outer buttons switch Companion pages. When disabled, they act as normal programmable controls (`page_left` / `page_right`).',
	},
	{
		id: 'screensaverEnabled',
		type: 'checkbox',
		label: 'Enable idle blank screensaver',
		default: false,
		tooltip: 'Use the D200 firmware lockscreen after a period of inactivity to reduce burn-in. Any input wakes the surface and restores Companion content.',
	},
	{
		id: 'screensaverMinutes',
		type: 'number',
		label: 'Screensaver timeout (minutes)',
		default: 5,
		min: 1,
		max: 240,
		tooltip: 'Minutes of inactivity before the LCD buttons are blanked.',
	},
	{
		id: 'backgroundImagePath',
		type: 'textinput',
		label: 'Background image path (PNG/JPEG, 458×196)',
		default: '',
		tooltip: 'Only applies when small window mode is set to "Background image".',
	},
]
