const handler = async (m, { conn }) => {
  const body = m.text?.trim()
  if (!body) return

  if (!/^brat|.brat\s+/i.test(body)) return

  const text = body.replace(/^(brat|.brat)\s+/i, "").trim()
  if (!text) {
    return m.reply(`☁️ 𝘼𝙂𝙍𝙀𝙂𝘼 𝙏𝙀𝙓𝙏𝙊 𝙋𝘼𝙍𝘼 𝙂𝙀𝙉𝙀𝙍𝘼𝙍 𝙀𝙇 𝙎𝙏𝙄𝘾𝙆𝙀𝙍\n\nEjemplo: brat angelito`)
  }

  try {
    // reacción ⌛
    await conn.sendMessage(m.chat, { react: { text: "⌛", key: m.key } })

    const url = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}`
    await conn.sendMessage(m.chat, {
      sticker: { url },
      packname: "AngelBot",
      author: "AngelBot",
    }, { quoted: m })

    // reacción ✅
    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } })
  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    conn.reply(m.chat, '❌ 𝙀𝙍𝙍𝙊𝙍 𝘼𝙇 𝙂𝙀𝙉𝙀𝙍𝘼𝙍 𝙀𝙇 𝙎𝙏𝙄𝘾𝙆𝙀𝙍', m)
  }
}

// igual que play: brat <texto> o .brat <texto>
handler.customPrefix = /^(brat|.brat)\s+/i
handler.command = new RegExp
handler.help = ["brat <texto>"]
handler.tags = ["sticker"]

export default handler