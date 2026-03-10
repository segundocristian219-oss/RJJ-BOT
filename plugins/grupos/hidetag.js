import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

const handler = async (m, { conn, participants }) => {
    if (!m.isGroup || m.key.fromMe) return

    // === fkontak con icono ===
    const res = await fetch('https://cdn.russellxz.click/a8bbd3ad.jpeg');
    const thumb = Buffer.from(await res.arrayBuffer());
    const fkontak = {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "Halo"
        },
        message: {
            locationMessage: {
                name: `𝖧𝗈𝗅𝖺, 𝖲𝗈𝗒 𝐑𝐉 𝐁𝐎𝐓`,
                jpegThumbnail: thumb
            }
        },
        participant: "0@s.whatsapp.net"
    };

    const content = m.text || m.msg?.caption || ''
    if (!/^.?n(\s|$)/i.test(content.trim())) return

    await conn.sendMessage(m.chat, { react: { text: '®️', key: m.key } })

    const userText = content.trim().replace(/^.?n\s*/i, '')
    const finalText = userText || ''

    try {
        const users = participants.map(u => conn.decodeJid(u.id))
        const q = m.quoted ? m.quoted : m
        const mtype = q.mtype || ''

        const isMedia = ['imageMessage','videoMessage','audioMessage','stickerMessage'].includes(mtype)
        const originalCaption = (q.msg?.caption || q.text || '').trim()
        const finalCaption = finalText || originalCaption || '®️ Notificación'

        if (m.quoted && isMedia) {
            const media = await q.download()
            if (mtype === 'audioMessage') {
                try {
                    await conn.sendMessage(m.chat, {
                        audio: media,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: false,
                        mentions: users
                    }, { quoted: fkontak })

                    if (finalText) {
                        await conn.sendMessage(m.chat, {
                            text: `${finalText}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                            mentions: users
                        }, { quoted: fkontak })
                    }
                } catch {
                    await conn.sendMessage(m.chat, {
                        text: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                        mentions: users
                    }, { quoted: fkontak })
                }
            } else {
                if (mtype === 'imageMessage') await conn.sendMessage(m.chat, { image: media, caption: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`, mentions: users }, { quoted: fkontak })
                if (mtype === 'videoMessage') await conn.sendMessage(m.chat, { video: media, caption: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`, mentions: users, mimetype: 'video/mp4' }, { quoted: fkontak })
                if (mtype === 'stickerMessage') await conn.sendMessage(m.chat, { sticker: media, mentions: users }, { quoted: fkontak })
            }
        } else if (m.quoted && !isMedia) {
            const msg = conn.cMod(
                m.chat,
                generateWAMessageFromContent(
                    m.chat,
                    { [mtype || 'extendedTextMessage']: q.message?.[mtype] || { text: finalCaption } },
                    { quoted: fkontak, userJid: conn.user.id }
                ),
                `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                conn.user.jid,
                { mentions: users }
            )
            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        } else if (!m.quoted && isMedia) {
            const media = await m.download()
            if (mtype === 'audioMessage') {
                try {
                    await conn.sendMessage(m.chat, {
                        audio: media,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: false,
                        mentions: users
                    }, { quoted: fkontak })

                    if (finalText) {
                        await conn.sendMessage(m.chat, {
                            text: `${finalText}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                            mentions: users
                        }, { quoted: fkontak })
                    }
                } catch {
                    await conn.sendMessage(m.chat, {
                        text: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                        mentions: users
                    }, { quoted: fkontak })
                }
            } else {
                if (mtype === 'imageMessage') await conn.sendMessage(m.chat, { image: media, caption: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`, mentions: users }, { quoted: fkontak })
                if (mtype === 'videoMessage') await conn.sendMessage(m.chat, { video: media, caption: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`, mentions: users, mimetype: 'video/mp4' }, { quoted: fkontak })
                if (mtype === 'stickerMessage') await conn.sendMessage(m.chat, { sticker: media, mentions: users }, { quoted: fkontak })
            }
        } else {
            await conn.sendMessage(m.chat, {
                text: `${finalCaption}\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
                mentions: users
            }, { quoted: fkontak })
        }

    } catch (e) {
        const users = participants.map(u => conn.decodeJid(u.id))
        await conn.sendMessage(m.chat, {
            text: `®️ Notificación\n\n> 𝐑𝐉 𝐁𝐎𝐓`,
            mentions: users
        }, { quoted: fkontak })
    }
}

handler.customPrefix = /^(\.n|n)(\s|$)/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler