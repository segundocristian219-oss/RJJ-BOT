import { createHash } from 'crypto'
import fetch from 'node-fetch'

const handler = async (m, { conn, command, args, isOwner, isAdmin }) => {
  let chat = global.db.data.chats[m.chat]
  let bot = global.db.data.settings[conn.user.jid] || {}

  if (!args[0]) {
    return conn.reply(
      m.chat,
      '⚠️ Usa:\n.on <comando>\n.off <comando>',
      m
    )
  }

  let type = args[0].toLowerCase()
  let isAll = false
  let isUser = false
  let isEnable = command === 'on'
  let current

  switch (type) {
    case 'welcome':
    case 'bv':
    case 'bienvenida':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.welcome
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *welcome* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.welcome = isEnable
      break

    case 'antiprivado':
    case 'antipriv':
    case 'antiprivate':
      isAll = true
      if (!isOwner) return global.dfail('rowner', m, conn)
      current = bot.antiPrivate
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *antiprivado* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      bot.antiPrivate = isEnable
      break

    case 'antibot':
    case 'antibots':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.antiBot
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *antibot* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.antiBot = isEnable
      break

    case 'autoaceptar':
    case 'aceptarauto':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.autoAceptar
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *autoaceptar* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.autoAceptar = isEnable
      break

    case 'autorechazar':
    case 'rechazarauto':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.autoRechazar
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *autorechazar* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.autoRechazar = isEnable
      break

    case 'autoresponder2':
    case 'ar2':
    case 'autorespond2':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.autoresponder2
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *autoresponder2* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.autoresponder2 = isEnable
      break

    case 'autoresponder':
    case 'autorespond':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.autoresponder
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *autoresponder* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.autoresponder = isEnable
      break

    case 'modoadmin':
    case 'soloadmin':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.modoadmin
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *modoadmin* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.modoadmin = isEnable
      break

    case 'nsfw':
    case 'nsfwhot':
    case 'nsfwhorny':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.nsfw
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *nsfw* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.nsfw = isEnable
      break

    case 'antidelete':
    case 'antieliminar':
    case 'delete':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.delete
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *antidelete* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.delete = isEnable
      break

    case 'jadibotmd':
    case 'modejadibot':
      isAll = true
      if (!isOwner) return global.dfail('rowner', m, conn)
      current = bot.jadibotmd
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *jadibotmd* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      bot.jadibotmd = isEnable
      break

    case 'detect':
    case 'configuraciones':
    case 'avisodegp':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.detect
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *detect* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.detect = isEnable
      break

    case 'antilink':
      if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
      current = chat.antiLink
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *antilink* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      chat.antiLink = isEnable
      break

    case 'justbot':
    case 'solonumero':
      isAll = true
      if (!isOwner) return global.dfail('owner', m, conn)
      current = !!bot.soloParaJid
      if (current === isEnable)
        return conn.reply(m.chat, `ℹ️ *justbot* ya estaba ${isEnable ? 'activado' : 'desactivado'}`, m)
      bot.soloParaJid = isEnable ? m.sender : false
      break

    default:
      return conn.reply(m.chat, '❌ Comando no válido', m)
  }

  conn.reply(
    m.chat,
    `✅ La función *${type}* se *${isEnable ? 'activó' : 'desactivó'}* ${isAll ? 'para el bot' : 'en este chat'}`,
    m
  )
}

handler.help = ['on <comando>', 'off <comando>']
handler.tags = ['nable']
handler.command = ['on', 'off']

export default handler