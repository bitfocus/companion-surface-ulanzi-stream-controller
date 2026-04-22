import {
	type CardGenerator,
	type HostCapabilities,
	type SurfaceContext,
	type SurfaceDrawProps,
	type SurfaceInstance,
	createModuleLogger,
	type ModuleLogger,
} from '@companion-surface/base'
import * as imageRs from '@julusian/image-rs'
import type { HIDAsync } from 'node-hid'
import { D200Device } from './device.js'
import {
	ICON_HEIGHT,
	ICON_WIDTH,
	SMALL_WINDOW_BG_HEIGHT,
	SMALL_WINDOW_BG_WIDTH,
} from './protocol.js'
import { SMALL_WINDOW_DISABLED } from './config.js'
import { type ButtonRenderInput } from './zip-builder.js'
import { LCD_BUTTON_POSITIONS, controlIdFromIndex, positionFromControlId } from './surface-schema.js'

export class D200Surface implements SurfaceInstance {
	readonly #logger: ModuleLogger
	readonly #surfaceId: string
	readonly #context: SurfaceContext
	readonly #device: D200Device

	/** Keyed by controlId (`col_row`). */
	readonly #pending = new Map<string, ButtonRenderInput>()
	#flushTimer?: NodeJS.Timeout
	#initialPushDone = false
	#statusActive = false
	#smallWindowMode: number = SMALL_WINDOW_DISABLED

	public get surfaceId(): string {
		return this.#surfaceId
	}
	public get productName(): string {
		return 'Ulanzi Stream Controller D200'
	}

	constructor(surfaceId: string, device: HIDAsync, context: SurfaceContext) {
		this.#logger = createModuleLogger(`Instance/${surfaceId}`)
		this.#surfaceId = surfaceId
		this.#context = context
		this.#device = new D200Device(device)

		this.#device.on('error', (e) => {
			this.#logger.error(`D200 error: ${e.message}`)
			context.disconnect(e)
		})
		this.#device.on('input', (event) => {
			const controlId = controlIdFromIndex(event.index)
			if (!controlId) return

			if (event.type === 'encoder') {
				if (event.action === 'left') this.#context.rotateLeftById(controlId)
				else if (event.action === 'right') this.#context.rotateRightById(controlId)
				else if (event.action === 'press') this.#context.keyDownById(controlId)
				else if (event.action === 'release') this.#context.keyUpById(controlId)
			} else if (controlId === 'page_left') {
				if (event.action === 'press') this.#context.changePage(false)
			} else if (controlId === 'page_right') {
				if (event.action === 'press') this.#context.changePage(true)
			} else {
				if (event.action === 'press') this.#context.keyDownById(controlId)
				else if (event.action === 'release') this.#context.keyUpById(controlId)
			}
		})
		this.#device.on('deviceInfo', (info) => {
			this.#logger.info(`Device info: ${info}`)
		})
		this.#device.on('log', (line) => this.#logger.info(line))
	}

	async init(): Promise<void> {
		for (const pos of LCD_BUTTON_POSITIONS) {
			const key = `${pos.col}_${pos.row}`
			this.#pending.set(key, { col: pos.col, row: pos.row })
		}
		await this.#flush(false)
		this.#initialPushDone = true
	}

	async close(): Promise<void> {
		if (this.#flushTimer) clearTimeout(this.#flushTimer)
		await this.#device.close()
	}

	updateCapabilities(_caps: HostCapabilities): void {
		// not used
	}

	async updateConfig(config: Record<string, any>): Promise<void> {
		const mode = Number(config.smallWindowMode ?? SMALL_WINDOW_DISABLED)
		this.#smallWindowMode = mode

		if (mode === SMALL_WINDOW_DISABLED) {
			this.#device.pauseKeepAlive()
		} else {
			this.#device.setSmallWindowMode(mode)
			this.#device.setTwelveHour(!!config.twelveHour)
			this.#device.resumeKeepAlive()
		}
	}

	async ready(): Promise<void> {}

	async setBrightness(percent: number): Promise<void> {
		await this.#device.setBrightness(percent)
	}

	async blank(): Promise<void> {
		for (const pos of LCD_BUTTON_POSITIONS) {
			this.#pending.set(`${pos.col}_${pos.row}`, { col: pos.col, row: pos.row })
		}
		await this.#flush(false)
	}

	async draw(signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void> {
		const pos = positionFromControlId(drawProps.controlId)
		if (!pos) return
		const key = `${pos.col}_${pos.row}`

		if (!drawProps.image) {
			this.#pending.set(key, { col: pos.col, row: pos.row })
			this.#scheduleFlush()
			return
		}

		const isSmallWindowSlot = pos.col === 3 && pos.row === 2
		const iconW = isSmallWindowSlot ? SMALL_WINDOW_BG_WIDTH : ICON_WIDTH
		const iconH = isSmallWindowSlot ? SMALL_WINDOW_BG_HEIGHT : ICON_HEIGHT

		const png = await imageRs.ImageTransformer.fromBuffer(
			drawProps.image,
			iconW,
			iconH,
			'rgb',
		).toEncodedImage('png')
		if (signal.aborted) return

		this.#pending.set(key, {
			col: pos.col,
			row: pos.row,
			iconPng: Buffer.from(png.buffer),
		})
		this.#scheduleFlush()
	}

	async showStatus(signal: AbortSignal, cards: CardGenerator, _statusMessage?: string): Promise<void> {
		if (signal.aborted) return

		this.#device.pauseKeepAlive()

		const buttonPixels = await cards.generateLogoCard(SMALL_WINDOW_BG_WIDTH, SMALL_WINDOW_BG_HEIGHT, 'rgb')
		if (signal.aborted) return

		const buttonPng = await imageRs.ImageTransformer.fromBuffer(
			Buffer.from(buttonPixels),
			SMALL_WINDOW_BG_WIDTH,
			SMALL_WINDOW_BG_HEIGHT,
			'rgb',
		).toEncodedImage('png')
		if (signal.aborted) return

		const batch: ButtonRenderInput[] = LCD_BUTTON_POSITIONS.map((pos) => ({
			col: pos.col,
			row: pos.row,
			iconPng: Buffer.from(buttonPng.buffer),
		}))

		try {
			await this.#device.setButtons(batch, {
				partial: false,
				smallWindowMode: this.#smallWindowMode,
			})
			this.#statusActive = true
		} catch (e) {
			this.#logger.warn(`showStatus setButtons failed: ${(e as Error).message}`)
		}
	}

	#scheduleFlush(): void {
		if (this.#flushTimer) return
		this.#flushTimer = setTimeout(() => {
			this.#flushTimer = undefined
			void this.#flush(true)
		}, 75)
	}

	async #flush(partial: boolean): Promise<void> {
		if (this.#pending.size === 0) return
		let isPartial = partial && this.#initialPushDone
		if (this.#statusActive) {
			this.#statusActive = false
			if (this.#smallWindowMode !== SMALL_WINDOW_DISABLED) {
				this.#device.resumeKeepAlive()
			}
			isPartial = false
			for (const pos of LCD_BUTTON_POSITIONS) {
				const key = `${pos.col}_${pos.row}`
				if (!this.#pending.has(key)) this.#pending.set(key, { col: pos.col, row: pos.row })
			}
		}
		const batch = Array.from(this.#pending.values())
		this.#pending.clear()
		try {
			await this.#device.setButtons(batch, {
				partial: isPartial,
				smallWindowMode: this.#smallWindowMode,
			})
		} catch (e) {
			this.#logger.warn(`setButtons failed: ${(e as Error).message}`)
		}
	}
}
