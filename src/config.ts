import type { SomeCompanionInputField } from '@companion-surface/base'

export const SMALL_WINDOW_DISABLED = -1

export const CONFIG_FIELDS: SomeCompanionInputField[] = [
	{
		id: 'smallWindowMode',
		type: 'dropdown',
		label: 'Small window mode (3_2 slot)',
		choices: [
			{ id: String(SMALL_WINDOW_DISABLED), label: 'Disabled — use as button' },
			{ id: '1', label: 'Analog dial clock' },
			{ id: '203', label: 'Digital: time' },
			{ id: '201', label: 'Digital: time + weekday' },
			{ id: '202', label: 'Digital: time + date' },
			{ id: '200', label: 'Digital: date + time + weekday' },
			{ id: '0', label: 'System stats (CPU / memory)' },
			{ id: '2', label: 'Background image' },
		],
		default: String(SMALL_WINDOW_DISABLED),
		tooltip: 'When set to "Disabled", the 3_2 slot acts as a regular button with a 458×196 icon. Otherwise, the small window displays the selected mode.',
	},
	{
		id: 'twelveHour',
		type: 'checkbox',
		label: 'Use 12-hour clock (digital modes)',
		default: false,
		tooltip: 'Only applies when small window mode is set to a digital clock option.',
	},
	{
		id: 'backgroundImagePath',
		type: 'textinput',
		label: 'Background image path (PNG/JPEG, 458×196)',
		default: '',
		tooltip: 'Only applies when small window mode is set to "Background image".',
	},
]
