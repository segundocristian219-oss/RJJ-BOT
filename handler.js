import { smsg } from "./lib/simple.js"
import { format } from "util"
import { fileURLToPath } from "url"
import path, { join } from "path"
import fs, { unwatchFile, watchFile } from "fs"
import chalk from "chalk"
import fetch from "node-fetch"
import ws from "ws"

const strRegex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")

const ___dirname = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "plugins"
)

const delay = ms => new Promise(r => setTimeout(r, ms))

/* ========= CACHE GLOBAL ========= */
global.processedMessages ||= new Set()
global.groupCache ||= new Map()
global.adminCache ||= new Map()
global.ownerCache ||= new Set(global.owner.map(v => v.replace(/\D/g, "") + "@lid"))
global.premsCache ||= new Set(global.prems.map(v => v.replace(/\D/g, "") + "@lid"))

export async function handler(chatUpdate) {
  if (!chatUpdate?.messages?.length) return

  this.msgqueque ||= []
  this.uptime ||= Date.now()

  this.pushMessage(chatUpdate.messages).catch(() => {})

  let m = chatUpdate.messages.at(-1)
  if (!m || m.key?.fromMe) return

  const msgId = m.key?.id
  if (!msgId) return
  if (global.processedMessages.has(msgId)) return

  global.processedMessages.add(msgId)
  setTimeout(() => global.processedMessages.delete(msgId), 60000)

  if (global.db.data == null) await global.loadDatabase()

  m = smsg(this, m) || m
  if (!m) return
  if (typeof m.text !== "string") m.text = ""

  /* ========= PREFIX / COMMAND ========= */
  const prefixes = Array.isArray(global.prefix) ? global.prefix : [global.prefix]
  const isCommand =
    typeof m.text === "string" &&
    prefixes.some(p => typeof p === "string" && m.text.startsWith(p))

  /* ========= DB ========= */
  const users = global.db.data.users
  const chats = global.db.data.chats
  const settingsDB = global.db.data.settings

  const user = users[m.sender] ||= {
    name: m.name,
    genre: "",
    birth: "",
    marry: "",
    description: "",
    packstickers: null,
    premium: false,
    banned: false,
    bannedReason: ""
  }

  const chat = chats[m.chat] ||= {
    isBanned: false,
    isMute: false,
    welcome: false,
    sWelcome: "",
    sBye: "",
    detect: true,
    primaryBot: null,
    modoadmin: false,
    antiLink: true
  }

  const settings = settingsDB[this.user.jid] ||= {
    self: false,
    restrict: true,
    jadibotmd: true,
    antiPrivate: false,
    gponly: false
  }

  if (m.pushName && m.pushName !== user.name) user.name = m.pushName

  /* ========= ROLES ========= */
  const isROwner = global.ownerCache.has(m.sender)
  const isOwner = isROwner || m.fromMe
  const isPrems = isROwner || global.premsCache.has(m.sender) || user.premium
  const isOwners = isOwner || m.sender === this.user.jid

  if (settings.self && !isOwners) return
  if (m.isBaileys) return

  /* ========= GRUPOS (ULTRA OPTIMIZADO) ========= */
  let groupMetadata = {}
  let participants = []
  let isAdmin = false
  let isRAdmin = false
  let isBotAdmin = false
  let userGroup = {}
  let botGroup = {}

  const needsGroup =
    m.isGroup &&
    [...Object.values(global.plugins)].some(p =>
      p?.group || p?.admin || p?.botAdmin || p?.detect
    )

  if (needsGroup) {
    const cached = global.groupCache.get(m.chat)
    if (cached && Date.now() - cached.time < 60000) {
      groupMetadata = cached.data
    } else {
      groupMetadata = await this.groupMetadata(m.chat)
      global.groupCache.set(m.chat, { data: groupMetadata, time: Date.now() })
    }

    participants = groupMetadata.participants || []
    userGroup = participants.find(p => p.id === m.sender) || {}
    botGroup = participants.find(p => p.id === this.user.jid) || {}

    const adminKey = m.chat + ":" + m.sender
    const cachedAdmin = global.adminCache.get(adminKey)

    if (cachedAdmin && Date.now() - cachedAdmin.time < 60000) {
      isAdmin = cachedAdmin.admin
      isRAdmin = cachedAdmin.radmin
    } else {
      isRAdmin = userGroup.admin === "superadmin" || m.sender === groupMetadata.owner
      isAdmin = isRAdmin || userGroup.admin === "admin"
      global.adminCache.set(adminKey, { admin: isAdmin, radmin: isRAdmin, time: Date.now() })
    }

    isBotAdmin = botGroup.admin === "admin" || botGroup.admin === "superadmin"
  }

  /* ========= PLUGINS ========= */
  for (const name in global.plugins) {
    const plugin = global.plugins[name]
    if (!plugin || plugin.disabled) continue

    const __filename = join(___dirname, name)

    if (!isCommand && typeof plugin.all !== "function") continue

    if (typeof plugin.all === "function") {
      try {
        await plugin.all.call(this, m, {
          chatUpdate,
          __dirname: ___dirname,
          __filename,
          user,
          chat,
          settings
        })
      } catch {}
    }

    if (!isCommand) continue

    if (!settings.restrict && plugin.tags?.includes("admin")) continue

    const prefixList = plugin.customPrefix || global.prefix
    let match = null

    if (prefixList instanceof RegExp) {
      match = prefixList.exec(m.text)
    } else if (Array.isArray(prefixList)) {
      match = prefixList.map(p => {
        const r = p instanceof RegExp ? p : new RegExp(strRegex(p))
        return r.exec(m.text)
      }).find(Boolean)
    } else {
      const r = new RegExp(strRegex(prefixList))
      match = r.exec(m.text)
    }

    if (!match) continue

    const usedPrefix = match[0]
    const noPrefix = m.text.slice(usedPrefix.length)
    let [command, ...args] = noPrefix.trim().split(/\s+/)
    command = (command || "").toLowerCase()
    const text = args.join(" ")

    const accept =
      plugin.command instanceof RegExp
        ? plugin.command.test(command)
        : Array.isArray(plugin.command)
          ? plugin.command.includes(command)
          : plugin.command === command

    if (!accept) continue

    const fail = plugin.fail || global.dfail

    if (plugin.rowner && !isROwner) return fail("rowner", m, this)
    if (plugin.owner && !isOwner) return fail("owner", m, this)
    if (plugin.premium && !isPrems) return fail("premium", m, this)
    if (plugin.group && !m.isGroup) return fail("group", m, this)
    if (plugin.botAdmin && !isBotAdmin) return fail("botAdmin", m, this)
    if (plugin.admin && !isAdmin) return fail("admin", m, this)
    if (plugin.private && m.isGroup) return fail("private", m, this)

    try {
      await plugin.call(this, m, {
        match,
        usedPrefix,
        noPrefix,
        args,
        command,
        text,
        conn: this,
        participants,
        groupMetadata,
        userGroup,
        botGroup,
        isROwner,
        isOwner,
        isRAdmin,
        isAdmin,
        isBotAdmin,
        isPrems,
        chatUpdate,
        __dirname: ___dirname,
        __filename,
        user,
        chat,
        settings
      })
    } catch (e) {
      m.error = e
      console.error(e)
    }
  }

  try {
    if (!opts["noprint"]) {
      const print = (await import("./lib/print.js")).default
      await print(m, this)
    }
  } catch {}
}

/* ========= DFAIL (SIN CAMBIOS) ========= */
global.dfail = (type, m, conn) => {
  const msg = {
    rowner: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`,
    owner: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`,
    mods: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝗋 𝖽𝖾𝗌𝖺𝗋𝗋𝗈𝗅𝗅𝖺𝖽𝗈𝗋𝖾𝗌 𝖮𝖿𝗂𝖼𝗂𝖺𝗅𝖾𝗌*`,
    premium: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖫𝗈 𝖯𝗎𝖾𝖽𝖾𝗇 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝗋 𝖴𝗌𝗎𝖺𝗋𝗂𝗈𝗌 𝖯𝗋𝖾𝗆𝗂𝗎𝗆*`,
    group: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖥𝗎𝗇𝖼𝗂𝗈𝗇𝖺 𝖤𝗇 𝖦𝗋𝗎𝗉𝗈𝗌*`,
    private: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖲𝖾 𝖯𝗎𝖾𝖽𝖾 𝖮𝖼𝗎𝗉𝖺𝗋 𝖤𝗇 𝖤𝗅 𝖯𝗋𝗂𝗏𝖺𝖽𝗈 𝖣𝖾𝗅 𝖡𝗈𝗍*`,
    admin: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝖺𝖽𝗈 𝖯𝗈𝗋 𝖠𝖽𝗆𝗂𝗇𝗂𝗌𝗍𝗋𝖺𝖽𝗈𝗋𝖾𝗌*`,
    botAdmin: `*𝖭𝖾𝖼𝖾𝗌𝗂𝗍𝗈 𝗌𝖾𝗋 𝖠𝖽𝗆𝗂𝗇 𝖯𝖺𝗋𝖺 𝖴𝗌𝖺𝗋 𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈*`,
    restrict: `*𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖠𝗁 𝖲𝗂𝖽𝗈 𝖣𝖾𝗌𝖺𝖻𝗂𝗅𝗂𝗍𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋*`
  }[type]

  if (msg) return conn.reply(m.chat, msg, m, rcanal).then(() => m.react("✖️"))
}

/* ========= HOT RELOAD ========= */
let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.magenta("Se actualizo 'handler.js'"))
  if (global.reloadHandler) console.log(await global.reloadHandler())
})