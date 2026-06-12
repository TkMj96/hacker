const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "delete",
    aliases: ["del"],
    version: "3.0",
    author: "lonely",
    countDown: 5,
    role: 2,
    shortDescription: "Delete command files",
    longDescription: "Delete cmds from scripts/cmds folder",
    category: "owner",
    guide: {
      en: "{pn} help.js"
    }
  },

  onStart: async function ({ message, args, api }) {
    try {
      if (!args[0]) {
        return message.reply(`
╭─ ❌ 𝗗𝗘𝗟𝗘𝗧𝗘 𝗖𝗠𝗗
│
│ Please enter a cmd name.
│
│ Example:
│ -del help.js
╰───────────────
ᏞᏫᏁᎬᏞᎽ 💙
        `);
      }

      let fileName = args[0];

      if (!fileName.endsWith(".js")) {
        fileName += ".js";
      }

      const cmdPath = path.join(__dirname, fileName);

      if (!fs.existsSync(cmdPath)) {
        return message.reply(`
╭─ ❌ 𝗙𝗜𝗟𝗘 𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗
│
│ Cmd: ${fileName}
│
│ This cmd does not exist.
╰───────────────
ᏞᏫᏁᎬᏞᎽ 💙
        `);
      }

      const loading = await message.reply(`
╭─ ⚙️ 𝗗𝗘𝗟𝗘𝗧𝗜𝗡𝗚
│
│ Removing ${fileName}
│
│ ▰▰▱▱▱▱▱▱ 20%
╰───────────────
      `);

      setTimeout(async () => {
        await api.editMessage(`
╭─ ⚙️ 𝗗𝗘𝗟𝗘𝗧𝗜𝗡𝗚
│
│ Processing file...
│
│ ▰▰▰▰▱▱▱▱ 59%
╰───────────────
        `, loading.messageID);

        setTimeout(async () => {
          await api.editMessage(`
╭─ ⚙️ 𝗗𝗘𝗟𝗘𝗧𝗜𝗡𝗚
│
│ Finalizing...
│
│ ▰▰▰▰▰▰▰▱ 99%
╰───────────────
          `, loading.messageID);

          setTimeout(async () => {

            delete require.cache[require.resolve(cmdPath)];

            await fs.unlink(cmdPath);

            await api.editMessage(`
╭─ ✅ 𝗖𝗠𝗗 𝗗𝗘𝗟𝗘𝗧𝗘𝗗
│
│ Successfully deleted:
│ ${fileName}
│
│ Folder:
│ scripts/cmds
╰───────────────
ᏞᏫᏁᎬᏞᎽ 💙
            `, loading.messageID);

          }, 1000);
        }, 1000);
      }, 1000);

    } catch (err) {
      console.log(err);

      return message.reply(`
╭─ ❌ 𝗘𝗥𝗥𝗢𝗥
│
│ Failed to delete cmd.
│
│ ${err.message}
╰───────────────
ᏞᏫᏁᎬᏞᎽ 💙
      `);
    }
  }
};