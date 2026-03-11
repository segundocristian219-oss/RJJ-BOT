import fetch from 'node-fetch'
import fs from 'fs/promises'

const OWNER_LID = ['159606034665538@lid', '205819731832938@lid']
const DB_DIR = './database'
const DATA_FILE = `${DB_DIR}/muted.json`

if (!await fs.stat(DB_DIR).catch(() => false)) await fs.mkdir(DB_DIR)
if (!await fs.stat(DATA_FILE).catch(() => false))
  await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2))

let mutedData
try {
  mutedData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'))
} catch {
  mutedData = {}
  await fs.writeFile(DATA_FILE, JSON.stringify(mutedData, null, 2))
}

const saveMutedData = async () => {
  for (const [chat, list] of Object.entries(mutedData))
    if (!Array.isArray(list) || !list.length) delete mutedData[chat]
  await fs.writeFile(DATA_FILE, JSON.stringify(mutedData, null, 2))
}

const THUMB_CACHE = {}
async function getThumb(url) {
  if (THUMB_CACHE[url]) return THUMB_CACHE[url]
  try {
    const buf = await (await fetch(url)).buffer()
    THUMB_CACHE[url] = buf
    return buf
  } catch {
    return null
  }
}

let handler = async (m, { conn, from, command }) => {
  const ctx = m.message?.extendedTextMessage?.contextInfo
  const user = m.mentionedJid?.[0] || ctx?.participant || m.quoted?.sender

  if (!user) return conn.sendMessage(from, { text: '⚠️ Usa: *.mute @usuario* o responde a su mensaje.' }, { quoted: m })
  if (user === m.sender) return conn.sendMessage(from, { text: '❌ No puedes mutearte a ti mismo.' }, { quoted: m })
  if (user === conn.user.jid) return conn.sendMessage(from, { text: '🤖 No puedes mutear al bot.' }, { quoted: m })
  if (OWNER_LID.includes(user)) return conn.sendMessage(from, { text: '👑 No puedes mutear a un Owner.' }, { quoted: m })

  const imgUrl = command === 'mute'
    ? 'https://telegra.ph/file/f8324d9798fa2ed2317bc.png'
    : 'https://telegra.ph/file/aea704d0b242b8c41bf15.png'

  const thumb = await getThumb(imgUrl)

  const preview = {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: from
    },
    message: {
      locationMessage: {
        name: command === 'mute' ? 'Usuario muteado' : 'Usuario desmuteado',
        jpegThumbnail: thumb
      }
    }
  }

  if (!mutedData[from]) mutedData[from] = []

  let name = 'Usuario'
  try { name = await conn.getName(user) } catch {}

  if (command === 'mute') {
    if (mutedData[from].includes(user)) return
    mutedData[from].push(user)
    await saveMutedData()
    await conn.sendMessage(from, { text: `🔇 *${name}* fue muteado.`, mentions: [user] }, { quoted: preview })
  } else {
    if (!mutedData[from].includes(user)) return
    mutedData[from] = mutedData[from].filter(u => u !== user)
    if (!mutedData[from].length) delete mutedData[from]
    await saveMutedData()
    await conn.sendMessage(from, { text: `🔊 *${name}* fue desmuteado.`, mentions: [user] }, { quoted: preview })
  }
}

handler.before = async (m, { conn, isCommand }) => {
  if (!m.isGroup) return
  if (m.fromMe) return
  if (OWNER_LID.includes(m.sender)) return

  const mutedList = mutedData[m.chat]
  if (!mutedList || !mutedList.includes(m.sender)) return
  if (isCommand) return true

  await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  return true
}

handler.all = async (m) => {
  if (!m.isGroup) return
  if (m.fromMe || OWNER_LID.includes(m.sender)) return
  const mutedList = mutedData[m.chat]
  if (mutedList && mutedList.includes(m.sender)) return false
}

handler.help = ['mute @usuario', 'unmute @usuario']
handler.tags = ['GRUPOS']
handler.command = ['mute', 'unmute']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler