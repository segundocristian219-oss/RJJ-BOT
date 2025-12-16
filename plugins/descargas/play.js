"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { promisify } from "util"
import { pipeline } from "stream"

const streamPipe = promisify(pipeline)

const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY = process.env.API_KEY || "Russellxz"

const DEFAULT_VIDEO_QUALITY = "360"
const DEFAULT_AUDIO_FORMAT = "mp3"
const MAX_MB = 99

const VALID_QUALITIES = new Set(["144", "240", "360", "720", "1080", "1440", "4k"])
const pending = {}

function safeName(name = "file") {
  return (
    String(name)
      .slice(0, 90)
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "file"
  )
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024)
}

function ensureTmp() {
  const tmp = path.join(path.resolve(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

function extractQualityFromText(input = "") {
  const t = input.toLowerCase()
  if (t.includes("4k")) return "4k"
  const m = t.match(/\b(144|240|360|720|1080|1440)p?\b/)
  return m ? m[1] : ""
}

function splitQueryAndQuality(text = "") {
  const parts = text.trim().split(/\s+/)
  const last = parts[parts.length - 1]?.toLowerCase()
  if (VALID_QUALITIES.has(last.replace("p", ""))) {
    parts.pop()
    return { query: parts.join(" "), quality: last.replace("p", "") }
  }
  return { query: text.trim(), quality: "" }
}

function isApiUrl(url = "") {
  try {
    return new URL(url).host === new URL(API_BASE).host
  } catch {
    return false
  }
}

async function downloadToFile(url, filePath) {
  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "*/*"
  }
  if (isApiUrl(url)) headers.apikey = API_KEY

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    headers,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

async function callYoutubeResolve(url, opts) {
  const r = await axios.post(
    `${API_BASE}/youtube/resolve`,
    opts.type === "video"
      ? { url, type: "video", quality: opts.quality }
      : { url, type: "audio", format: opts.format },
    {
      headers: { apikey: API_KEY },
      validateStatus: () => true
    }
  )

  if (!r.data || r.data.status !== true) throw new Error("Error API")
  let dl = r.data.result.media.dl_download
  if (dl.startsWith("/")) dl = API_BASE + dl
  return dl
}

let handler = async (m, { conn, text }) => {
  const { query, quality } = splitQueryAndQuality(text)
  if (!query) {
    return conn.reply(m.chat, "✳️ Usa: .play <nombre> [calidad]", m)
  }

  await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

  const res = await yts(query)
  const video = res.videos?.[0]
  if (!video) return conn.reply(m.chat, "❌ No se encontraron resultados", m)

  const chosenQuality = VALID_QUALITIES.has(quality) ? quality : DEFAULT_VIDEO_QUALITY

  const caption = `
🎵 Título: ${video.title}
⏱ Duración: ${video.timestamp}
👁 Vistas: ${video.views.toLocaleString()}
👤 Autor: ${video.author?.name}

⚙️ Calidad: ${chosenQuality === "4k" ? "4K" : chosenQuality + "p"}

👍 Audio
❤️ Video
📄 Audio documento
📁 Video documento
`.trim()

  const preview = await conn.sendMessage(
    m.chat,
    { image: { url: video.thumbnail }, caption },
    { quoted: m }
  )

  pending[preview.key.id] = {
    chatId: m.chat,
    videoUrl: video.url,
    title: video.title,
    quality: chosenQuality
  }

  if (!conn._playListener) {
    conn._playListener = true
    conn.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        const react = msg.message?.reactionMessage
        if (react && pending[react.key.id]) {
          const job = pending[react.key.id]
          if (react.text === "👍") downloadAudio(conn, job, false, msg)
          if (react.text === "📄") downloadAudio(conn, job, true, msg)
          if (react.text === "❤️") downloadVideo(conn, job, false, msg)
          if (react.text === "📁") downloadVideo(conn, job, true, msg)
        }
      }
    })
  }
}

async function downloadAudio(conn, job, doc, quoted) {
  const tmp = ensureTmp()
  const inFile = path.join(tmp, `${Date.now()}.bin`)
  const outFile = path.join(tmp, `${safeName(job.title)}.mp3`)

  const url = await callYoutubeResolve(job.videoUrl, { type: "audio", format: "mp3" })
  await downloadToFile(url, inFile)

  await new Promise((res, rej) => {
    ffmpeg(inFile).toFormat("mp3").save(outFile).on("end", res).on("error", rej)
  })

  await conn.sendMessage(
    job.chatId,
    {
      [doc ? "document" : "audio"]: fs.readFileSync(outFile),
      mimetype: "audio/mpeg",
      fileName: `${job.title}.mp3`
    },
    { quoted }
  )

  fs.unlinkSync(inFile)
  fs.unlinkSync(outFile)
}

async function downloadVideo(conn, job, doc, quoted) {
  const tmp = ensureTmp()
  const outFile = path.join(tmp, `${safeName(job.title)}_${job.quality}.mp4`)
  const url = await callYoutubeResolve(job.videoUrl, { type: "video", quality: job.quality })

  await downloadToFile(url, outFile)

  await conn.sendMessage(
    job.chatId,
    {
      [doc ? "document" : "video"]: fs.readFileSync(outFile),
      mimetype: "video/mp4",
      fileName: `${job.title}.mp4`
    },
    { quoted }
  )

  fs.unlinkSync(outFile)
}

handler.help = ["play <texto>"]
handler.tags = ["descargas"]
handler.command = ["play"]

export default handler