import type { SurfacePincodeMap, SurfaceSchemaLayoutDefinition } from '@companion-surface/base'
import { ICON_HEIGHT, ICON_WIDTH, SMALL_WINDOW_BG_HEIGHT, SMALL_WINDOW_BG_WIDTH } from './protocol.js'

/**
 * The D200X has 14 physical LCD buttons in a 5×3 grid (including the small-window
 * touch area) plus 2 page buttons and 3 rotary encoders:
 *
 *   row 0: col 0  col 1  col 2  col 3  col 4
 *   row 1: col 0  col 1  col 2  col 3  col 4
 *   row 2: col 0  col 1  col 2  col 3  (small-window touch, 2 cells wide)
 *   row 3: [pg_L] enc1   enc2   enc3  [pg_R]
 *
 * The device emits indices 0–12 for the standard grid buttons, 13 for the
 * small-window touch area, 15/16 for page buttons, and 17–19 for encoders.
 */
export const LCD_BUTTON_POSITIONS: ReadonlyArray<{ col: number; row: number }> = [
	{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }, { col: 4, row: 0 },
	{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 },
	{ col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
]

export type InputControlType = 'button' | 'encoder' | 'page'

interface InputControlDef {
	controlId: string
	type: InputControlType
	col: number
	row: number
}

interface VirtualControlDef {
	controlId: string
	col: number
	row: number
}

const VIRTUAL_ENCODER_TURN_CONTROLS: ReadonlyArray<VirtualControlDef> = [
	{ controlId: 'enc_1_left', col: 0, row: 4 },
	{ controlId: 'enc_1_right', col: 1, row: 4 },
	{ controlId: 'enc_2_left', col: 2, row: 4 },
	{ controlId: 'enc_2_right', col: 3, row: 4 },
	{ controlId: 'enc_3_left', col: 1, row: 5 },
	{ controlId: 'enc_3_right', col: 2, row: 5 },
]

/**
 * Complete input map for the D200X. Maps device input indices to control IDs.
 *
 * Indices 0–12: LCD grid buttons (same as D200)
 * Index 13: small-window slot (status display, not a button/control)
 * Index 14: does not exist
 * Index 15: left page button
 * Index 16: right page button
 * Index 17: encoder 1
 * Index 18: encoder 2
 * Index 19: encoder 3
 */
const INPUT_CONTROLS: ReadonlyArray<InputControlDef | null> = [
	{ controlId: '0_0', type: 'button', col: 0, row: 0 },
	{ controlId: '1_0', type: 'button', col: 1, row: 0 },
	{ controlId: '2_0', type: 'button', col: 2, row: 0 },
	{ controlId: '3_0', type: 'button', col: 3, row: 0 },
	{ controlId: '4_0', type: 'button', col: 4, row: 0 },
	{ controlId: '0_1', type: 'button', col: 0, row: 1 },
	{ controlId: '1_1', type: 'button', col: 1, row: 1 },
	{ controlId: '2_1', type: 'button', col: 2, row: 1 },
	{ controlId: '3_1', type: 'button', col: 3, row: 1 },
	{ controlId: '4_1', type: 'button', col: 4, row: 1 },
	{ controlId: '0_2', type: 'button', col: 0, row: 2 },
	{ controlId: '1_2', type: 'button', col: 1, row: 2 },
	{ controlId: '2_2', type: 'button', col: 2, row: 2 },
	{ controlId: '3_2', type: 'button', col: 3, row: 2 },
	null,
	{ controlId: 'page_left',  type: 'page',    col: 0, row: 3 },
	{ controlId: 'page_right', type: 'page',    col: 4, row: 3 },
	{ controlId: 'enc_1',      type: 'encoder', col: 1, row: 3 },
	{ controlId: 'enc_2',      type: 'encoder', col: 2, row: 3 },
	{ controlId: 'enc_3',      type: 'encoder', col: 3, row: 3 },
]

export function controlIdFromIndex(index: number): string | null {
	return INPUT_CONTROLS[index]?.controlId ?? null
}

export function inputTypeFromIndex(index: number): InputControlType | null {
	return INPUT_CONTROLS[index]?.type ?? null
}

export function indexFromControlId(controlId: string): number | null {
	const idx = INPUT_CONTROLS.findIndex((p) => p?.controlId === controlId)
	return idx === -1 ? null : idx
}

export function positionFromControlId(controlId: string): { col: number; row: number } | null {
	const idx = indexFromControlId(controlId)
	const entry = idx !== null ? INPUT_CONTROLS[idx] : null
	if (!entry || entry.type !== 'button') return null
	return { col: entry.col, row: entry.row }
}

export function virtualTurnControlId(controlId: string, direction: 'left' | 'right'): string | null {
	if (controlId !== 'enc_1' && controlId !== 'enc_2' && controlId !== 'enc_3') return null
	return `${controlId}_${direction}`
}

/**
 * Numpad-style pincode entry: 7/8/9 on the top row, 4/5/6 middle,
 * 1/2/3 bottom, 0 next to 6. The small-window button (3_2) is available
 * as a general-purpose control but not assigned a pincode digit.
 */
export const PINCODE_MAP: SurfacePincodeMap = {
	type: 'single-page',
	pincode: null,
	7: '0_0', 8: '1_0', 9: '2_0',
	4: '0_1', 5: '1_1', 6: '2_1',
	1: '0_2', 2: '1_2', 3: '2_2',
	0: '3_1',
}

export function createSurfaceSchema(): SurfaceSchemaLayoutDefinition {
	const layout: SurfaceSchemaLayoutDefinition = {
		stylePresets: {
			default: {},
			button: {
				bitmap: { w: ICON_WIDTH, h: ICON_HEIGHT, format: 'rgb' },
			},
			wide: {
				bitmap: { w: SMALL_WINDOW_BG_WIDTH, h: SMALL_WINDOW_BG_HEIGHT, format: 'rgb' },
			},
		},
		controls: {},
	}
	for (const { col, row } of LCD_BUTTON_POSITIONS) {
		layout.controls[`${col}_${row}`] = {
			row,
			column: col,
			stylePreset: col === 3 && row === 2 ? 'wide' : 'button',
		}
	}
	for (const entry of INPUT_CONTROLS) {
		if (!entry || entry.type === 'button') continue
		layout.controls[entry.controlId] = {
			row: entry.row,
			column: entry.col,
		}
	}
	for (const entry of VIRTUAL_ENCODER_TURN_CONTROLS) {
		layout.controls[entry.controlId] = {
			row: entry.row,
			column: entry.col,
			stylePreset: 'button',
		}
	}
	return layout
}
