#!/usr/bin/env node
/**
 * Write the device SerialNumber to D200 secure flash via HID command 0xFE.
 *
 * Maps to firmware path:
 *   HidProtocolHelper::processMessage(0x00FE, payload)
 *     → memcpy(local_buf, payload, 17)
 *     → SecurityManager::writeSecData(local_buf, 17, page=3)
 *     → zk_security_write_data → oflash_sec_auth.write_data → /dev/oflash
 *
 * Length (17), page (3), and call signature are all hardcoded in the handler
 * (verified via ARM disassembly of libzkgui.so at 0x99644-0x996b4).
 *
 * After a successful write, replug the device and the original SerialNumber
 * should be present in both:
 *   - /sys/class/zkswe_usb/zkswe0/iSerial         (USB descriptor, what Studio reads)
 *   - 0x0303 IN_DEVICE_INFO.SerialNumber          (HID protocol)
 *
 * IRREVERSIBLE: writes to secure flash. Cannot revert to "blank" — only
 * overwrite with another value (and only if the page is not write-protect-locked).
 *
 * Usage:
 *   node tools/write-serial.mjs <serial>
 *   node tools/write-serial.mjs <your-17-char-serial>
 */
import HID from 'node-hid'

const VID = 0x2207
const PID = 0x0019
const INTERFACE = 0
const PACKET_SIZE = 1024
const CMD_WRITE_SERIAL = 0x00fe
const SERIAL_LEN = 17

function buildPacket(command, payload) {
  const buf = Buffer.alloc(PACKET_SIZE)
  buf[0] = 0x7c
  buf[1] = 0x7c
  buf.writeUInt16BE(command, 2)
  buf.writeUInt32LE(payload.length, 4)
  payload.copy(buf, 8)
  return buf
}

async function main() {
  const serial = process.argv[2]
  if (!serial) {
    console.error('Usage: node tools/write-serial.mjs <serial>')
    console.error('Serial must be exactly 17 ASCII characters.')
    process.exit(1)
  }
  if (serial.length !== SERIAL_LEN) {
    console.error(`Serial must be exactly ${SERIAL_LEN} chars; got ${serial.length} ("${serial}")`)
    process.exit(1)
  }
  const payload = Buffer.from(serial, 'ascii')
  if (payload.length !== SERIAL_LEN) {
    console.error('Serial must be plain ASCII (no multibyte characters).')
    process.exit(1)
  }

  const devices = await HID.devicesAsync()
  const info = devices.find(
    (d) => d.vendorId === VID && d.productId === PID && d.interface === INTERFACE,
  )
  if (!info) {
    console.error('D200 HID device not found. Is it plugged in (in HID mode)?')
    process.exit(1)
  }

  console.log(`Found D200 HID: ${info.path}`)
  console.log(`Writing serial: "${serial}" (page=3, len=${SERIAL_LEN})`)
  console.log('Sending command 0xFE → SecurityManager::writeSecData → /dev/oflash...')

  const device = await HID.HIDAsync.open(info.path)
  const pkt = buildPacket(CMD_WRITE_SERIAL, payload)
  const buf = Buffer.alloc(PACKET_SIZE + 1)
  buf[0] = 0x00 // HID report ID
  pkt.copy(buf, 1)
  await device.write(buf)

  console.log('Sent. Replug the device, then verify with:')
  console.log('  node tools/probe.mjs              (or run Ulanzi Studio)')
  console.log('Expect /sys/class/zkswe_usb/zkswe0/iSerial to read back the new serial')
  console.log('once zkgui re-runs at boot and reads it from secure flash.')

  await new Promise((r) => setTimeout(r, 500))
  try { await device.close() } catch {}
}

main().catch((e) => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
