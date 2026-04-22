import JSZip from 'jszip'
import { randomBytes, randomUUID } from 'node:crypto'
import { FIRST_CHUNK_DATA, PACKET_SIZE, SmallWindowMode, isPayloadSafe } from './protocol.js'

export interface ButtonRenderInput {
	col: number
	row: number
	name?: string
	/** PNG-encoded icon; omit for a blank slot. */
	iconPng?: Buffer
}

interface FontStyle {
	Align: 'bottom' | 'middle' | 'top'
	Color: number
	FontName: string
	ShowTitle: boolean
	Size: number
	Weight: number
}

interface ViewParam {
	Font: FontStyle
	Icon?: string
	Text?: string
}

interface ManifestEntry {
	State: number
	ViewParam: ViewParam[]
	SmallViewMode?: number
}

const DEFAULT_FONT: FontStyle = {
	Align: 'bottom',
	Color: 0xffffff,
	FontName: 'Source Han Sans SC',
	ShowTitle: true,
	Size: 10,
	Weight: 80,
}

/** Slot occupied by the small-window status display (2 cells wide). */
export const SMALL_WINDOW_SLOT = { col: 3, row: 2 }

export interface BuildButtonZipOptions {
	/**
	 * PNG for the 458×196 small-window background image.
	 * Only used when smallWindowMode is SmallWindowMode.BACKGROUND (2).
	 */
	backgroundPng?: Buffer
	/**
	 * SmallWindowMode for the 3_2 slot in the manifest.
	 * -1 = disabled (button-only, uses SmallViewMode:2 with the button icon
	 *     as background so the firmware allocates the full 458px width).
	 * 0–203 = clock/stats mode (the matching SmallViewMode is set in the manifest
	 *     and the keep-alive will push live data).
	 */
	smallWindowMode: number
}

/**
 * Build the ZIP payload the D200 expects. Structure mirrors what Ulanzi Studio
 * sends (captured via USBPcap):
 *
 *   manifest.json            — at archive root
 *   Images/<uuid>.png        — icons referenced from the manifest
 *
 * The firmware has a bug where the byte at offsets 1016, 1016+1024, ... must
 * not be 0x00 or 0x7c. We retry compression with a random dummy file until
 * the payload is safe.
 */
export async function buildButtonZip(
	buttons: ButtonRenderInput[],
	options: BuildButtonZipOptions = { smallWindowMode: -1 },
): Promise<Buffer> {
	const manifest: Record<string, ManifestEntry> = {}
	const icons = new Map<string, Buffer>()

	for (const button of buttons) {
		const key = `${button.col}_${button.row}`
		const viewParam: ViewParam = { Font: DEFAULT_FONT }
		if (button.name) viewParam.Text = button.name
		if (button.iconPng) {
			const iconId = randomUUID()
			viewParam.Icon = `Images/${iconId}.png`
			icons.set(iconId, button.iconPng)
		}
		manifest[key] = { State: 0, ViewParam: [viewParam] }
	}

	// The 3_2 slot spans 2 cells (458×196). The firmware only allocates the
	// full width when SmallViewMode is present in the manifest. We always
	// set it so that every button gets correct dimensions.
	const smallKey = `${SMALL_WINDOW_SLOT.col}_${SMALL_WINDOW_SLOT.row}`
	const smallEntry = manifest[smallKey]

	if (options.smallWindowMode === -1) {
		// "Disabled" mode: use SmallViewMode:2 (background image) so the
		// firmware allocates the full 458px width, but display only the
		// Companion-rendered button icon with no clock overlay.
		if (smallEntry) {
			smallEntry.SmallViewMode = SmallWindowMode.BACKGROUND
			if (smallEntry.ViewParam[0]) smallEntry.ViewParam[0].Text = ''
		} else {
			manifest[smallKey] = {
				State: 0,
				SmallViewMode: SmallWindowMode.BACKGROUND,
				ViewParam: [{ Font: DEFAULT_FONT, Text: '' }],
			}
		}
	} else {
		// Clock/stats mode: set the appropriate SmallViewMode.
		// Mode 2 (background) can carry a custom background image.
		if (options.smallWindowMode === SmallWindowMode.BACKGROUND && options.backgroundPng) {
			// Replace the 3_2 entry with a background image entry.
			const iconId = randomUUID()
			icons.set(iconId, options.backgroundPng)
			manifest[smallKey] = {
				State: 0,
				SmallViewMode: SmallWindowMode.BACKGROUND,
				ViewParam: [{ Font: DEFAULT_FONT, Icon: `Images/${iconId}.png`, Text: '' }],
			}
		} else if (smallEntry) {
			smallEntry.SmallViewMode = options.smallWindowMode
			if (smallEntry.ViewParam[0]) smallEntry.ViewParam[0].Text = ''
		} else {
			manifest[smallKey] = {
				State: 0,
				SmallViewMode: options.smallWindowMode,
				ViewParam: [{ Font: DEFAULT_FONT, Text: '' }],
			}
		}
	}

	let payload = await compress(manifest, icons, '')
	let retries = 0
	while (!isPayloadSafe(payload)) {
		retries++
		if (retries > 64) throw new Error('Failed to build D200-safe ZIP after 64 retries')
		const dummy = randomBytes(8 * retries).toString('hex')
		payload = await compress(manifest, icons, dummy)
	}
	return payload
}

async function compress(
	manifest: Record<string, ManifestEntry>,
	icons: Map<string, Buffer>,
	dummy: string,
): Promise<Buffer> {
	const zip = new JSZip()
	zip.file('manifest.json', JSON.stringify(manifest))
	if (dummy) zip.file('dummy.txt', dummy)
	const imagesDir = zip.folder('Images')!
	for (const [id, data] of icons) imagesDir.file(`${id}.png`, data)
	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: { level: 1 },
	})
}

export function findUnsafeOffsets(payload: Buffer): number[] {
	const offsets: number[] = []
	for (let i = FIRST_CHUNK_DATA; i < payload.length; i += PACKET_SIZE) {
		const b = payload[i]
		if (b === 0x00 || b === 0x7c) offsets.push(i)
	}
	return offsets
}
