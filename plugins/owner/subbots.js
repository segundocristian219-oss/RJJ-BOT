import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util'
import * as ws from 'ws'
const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { fileURLToPath } from 'url'

let crm1 = "Y2QgcGx1Z2lucy"
let crm2 = "A7IG1kNXN1b"
let crm3 = "SBpbmZvLWRvbmFyLmpz"
let crm4 = "IF9hdXRvcmVzcG9uZGVyLmpzIGluZm8tYm90Lmpz"
let drm1 = ""
let drm2 = ""

let rtx = "*🤖 ISAGI  • MODE QR*\n\n🤖 Con otro celular o en la PC escanea este QR para convertirte en un *Sub-Bot* Temporal.\n\n\`1\` » Haga clic en los tres puntos en la esquina superior derecha\n\n\`2\` » Toque dispositivos vinculados\n\n\`3\` » Escanee este codigo QR para iniciar sesion con el bot\n\n✧ ¡Este código QR expira en 45 segundos!."
let rtx2 = "*🤖 ISAGI • MODE CODE*\n\n🤖 Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n\`1\` » Haga clic en los tres puntos en la esquina superior derecha\n\n\`2\` » Toque dispositivos vinculados\n\n\`3\` » Selecciona Vincular con el número de teléfono\n\n\`4\` » Escriba el Código para iniciar sesion con el bot\n\n✧ Disfruta del bot ✨."

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const yukiJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []

function isSubBotConnected(jid) { return global.conns.some(sock => sock?.user?.jid && sock.user.jid.split("@")[0] === jid.split("@")[0]) }

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
if (!globalThis.db.data.settings[conn.user.jid].jadibotmd) return m.reply(`ꕥ El Comando *${command}* está desactivado temporalmente.`)
let time = global.db.data.users[m.sender].Subs + 120000
if (new Date - global.db.data.users[m.sender].Subs < 120000) return conn.reply(m.chat, `ꕥ Debes esperar ${msToTime(time - new Date())} para volver a vincular un *Sub-Bot.*`, m)
let socklimit = global.conns.filter(sock => sock?.user && sock.ws?.readyState !== ws.CLOSED).length
if (socklimit >= 20) {
return m.reply(`ꕥ No se han encontrado espacios para *Sub-Bots* disponibles.`)
}
let mentionedJid = await m.mentionedJid
let who = mentionedJid && mentionedJid[0] ? mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let id = `${who.split`@`[0]}`
let pathYukiJadiBot = path.join(`./${jadi}/`, id)
if (!fs.existsSync(pathYukiJadiBot)){
fs.mkdirSync(pathYukiJadiBot, { recursive: true })
}

yukiJBOptions.pathYukiJadiBot = pathYukiJadiBot
yukiJBOptions.m = m
yukiJBOptions.conn = conn
yukiJBOptions.args = args
yukiJBOptions.usedPrefix = usedPrefix
yukiJBOptions.command = command
yukiJBOptions.fromCommand = true
yukiJadiBot(yukiJBOptions)
global.db.data.users[m.sender].Subs = new Date * 1
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']
export default handler

export async function yukiJadiBot(options) {
let { pathYukiJadiBot, m, conn, args, usedPrefix, command } = options
if (command === 'code') {
command = 'qr'
args.unshift('code')
}
const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : args[1] && /(--code|code)/.test(args[1].trim()) ? true : false
let txtCode, codeBot, txtQR
if (mcode) {
args[0] = args[0].replace(/^--code$|^code$/, "").trim()
if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim()
if (args[0] == "") args[0] = undefined
}

const pathCreds = path.join(pathYukiJadiBot, "creds.json")
if (!fs.existsSync(pathYukiJadiBot)){
fs.mkdirSync(pathYukiJadiBot, { recursive: true })}
try {
args[0] && args[0] != undefined ? fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t')) : ""
} catch {
conn.reply(m.chat, `ꕥ Use correctamente el comando » ${usedPrefix + command}`, m)
return
}

const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
const drmer = Buffer.from(drm1 + drm2, `base64`)
let { version, isLatest } = await fetchLatestBaileysVersion()
const msgRetry = (MessageRetryMap) => { }
const msgRetryCache = new NodeCache()
const { state, saveState, saveCreds } = await useMultiFileAuthState(pathYukiJadiBot)
const connectionOptions = {
logger: pino({ level: "fatal" }),
printQRInTerminal: false,
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
msgRetry,
msgRetryCache, 
browser: ['Windows', 'Firefox'],
version: version,
generateHighQualityLinkPreview: true
}

let sock = makeWASocket(connectionOptions)

let handlerModule = await import('../handler.js')
sock.handler = handlerModule.handler.bind(sock)
sock.connectionUpdate = connectionUpdate.bind(sock)
sock.credsUpdate = saveCreds.bind(sock, true)

sock.ev.on("messages.upsert", sock.handler)
sock.ev.on("connection.update", sock.connectionUpdate)
sock.ev.on("creds.update", sock.credsUpdate)

sock.isInit = true

setTimeout(async () => {
if (!sock.user) {
try { fs.rmSync(pathYukiJadiBot, { recursive: true, force: true }) } catch {}
try { sock.ws?.close() } catch {}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)
if (i >= 0) global.conns.splice(i, 1)
console.log(`[AUTO-LIMPIEZA] Sesión ${path.basename(pathYukiJadiBot)} eliminada credenciales invalidos.`)
}}, 60000)

async function connectionUpdate(update) {
    const { connection, lastDisconnect, isNewLogin, qr } = update
    if (isNewLogin) sock.isInit = false
    if (qr && !mcode) {
        if (m?.chat) {
            txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx.trim()}, { quoted: m})
        } else {
            return 
        }
        if (txtQR && txtQR.key) {
            setTimeout(() => { conn.sendMessage(m.sender, { delete: txtQR.key })}, 30000)
        }
        return
    } 
    if (qr && mcode) {
        let secret = await sock.requestPairingCode((m.sender.split`@`[0]))
        secret = secret.match(/.{1,4}/g)?.join("-")
        txtCode = await conn.sendMessage(m.chat, {text : rtx2}, { quoted: m })
        codeBot = await m.reply(secret)
        console.log(secret)
    }
    if (txtCode && txtCode.key) {
        setTimeout(() => { conn.sendMessage(m.sender, { delete: txtCode.key })}, 30000)
    }
    if (codeBot && codeBot.key) {
        setTimeout(() => { conn.sendMessage(m.sender, { delete: codeBot.key })}, 30000)
    }

    const endSesion = async (loaded) => {
        if (!loaded) {
            try { sock.ws.close() } catch {}
            sock.ev.removeAllListeners()
            let i = global.conns.indexOf(sock)                
            if (i < 0) return 
            delete global.conns[i]
            global.conns.splice(i, 1)
        }
    }

    const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
    if (connection === 'close') {
        if (reason === 428 || reason === 408 || reason === 440 || reason == 405 || reason == 401 || reason === 500 || reason === 515 || reason === 403) {
            console.log(chalk.bold.magentaBright(`╭───────── Sub-Bot Update ─────────╮\n│ Motivo: ${reason}\n╰──────────────────────────────────╯`))
            try { await creloadHandler(true) } catch (e) { console.error(e) }
            if (reason == 405 || reason == 401 || reason === 403) fs.rmdirSync(pathYukiJadiBot, { recursive: true })
        }
    }

    if (global.db.data == null) loadDatabase()
    if (connection == `open`) {
        if (!global.db.data?.users) loadDatabase()
        await joinChannels(conn)
        let userName, userJid 
        userName = sock.authState.creds.me.name || 'Anónimo'
        userJid = sock.authState.creds.me.jid || `${path.basename(pathYukiJadiBot)}@s.whatsapp.net`
        console.log(chalk.bold.cyanBright(`\n❒ Sub-Bot Conectado:\n│ ❍ ${userName} (+${path.basename(pathYukiJadiBot)})\n❒──────────────────────────`))
        sock.isInit = true
        global.conns.push(sock)
        m?.chat ? await conn.sendMessage(m.chat, { text: isSubBotConnected(m.sender) ? `@${m.sender.split('@')[0]}, ya estás conectado, leyendo mensajes entrantes...` : `❀ Has registrado un nuevo *Sub-Bot!* [@${m.sender.split('@')[0]}]\n\n> Puedes ver la información del bot usando el comando *#infobot*`, mentions: [m.sender] }, { quoted: m }) : ''
    }
}

setInterval(async () => {
    if (!sock.user) {
        try { sock.ws.close() } catch (e) {}
        sock.ev.removeAllListeners()
        let i = global.conns.indexOf(sock)
        if (i < 0) return
        delete global.conns[i]
        global.conns.splice(i, 1)
    }
}, 60000)

let creloadHandler = async function (restatConn) {
    try {
        const Handler = await import(`../handler.js?update=${Date.now()}`).catch(console.error)
        if (Object.keys(Handler || {}).length) handler = Handler
    } catch (e) {
        console.error('⚠︎ Nuevo error: ', e)
    }
    if (restatConn) {
        const oldChats = sock.chats
        try { sock.ws.close() } catch {}
        sock.ev.removeAllListeners()
        sock = makeWASocket(connectionOptions, { chats: oldChats })
        isInit = true
    }
    if (!isInit) {
        sock.ev.off("messages.upsert", sock.handler)
        sock.ev.off("connection.update", sock.connectionUpdate)
        sock.ev.off('creds.update', sock.credsUpdate)
    }
    sock.handler = handler.handler.bind(sock)
    sock.connectionUpdate = connectionUpdate.bind(sock)
    sock.credsUpdate = saveCreds.bind(sock, true)
    sock.ev.on("messages.upsert", sock.handler)
    sock.ev.on("connection.update", sock.connectionUpdate)
    sock.ev.on("creds.update", sock.credsUpdate)
    isInit = false
    return true
}

creloadHandler(false)