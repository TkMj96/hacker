const axios = require('axios');
const validUrl = require('valid-url');
const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');
const { v4: uuidv4 } = require('uuid');

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const YT_API = "http://65.109.80.126:20409/aryan/yx";
const EDIT_API = "https://gemini-edit-omega.vercel.app/edit";

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// 📥 download
const downloadFile = async (url, ext) => {
  const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, Buffer.from(response.data));
  return filePath;
};

// ♻️ reset
const resetConversation = async (api, event, message) => {
  api.setMessageReaction("♻️", event.messageID, () => {}, true);
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${event.senderID}`);
    return message.reply(`✅ Reset done`);
  } catch {
    return message.reply("❌ Reset failed");
  }
};

// 🎨 edit
const handleEdit = async (api, event, message, args) => {
  const prompt = args.join(" ");
  if (!prompt) return message.reply("❗ Give prompt");

  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  try {
    const params = { prompt };
    if (event.messageReply?.attachments?.[0]?.url) {
      params.imgurl = event.messageReply.attachments[0].url;
    }

    const res = await axios.get(EDIT_API, { params });

    if (!res.data?.images?.[0]) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ Failed");
    }

    const base64 = res.data.images[0].replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const filePath = path.join(TMP_DIR, `${Date.now()}.png`);
    fs.writeFileSync(filePath, buffer);

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    await message.reply({ attachment: fs.createReadStream(filePath) });

    fs.unlinkSync(filePath);
  } catch {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply("⚠️ Edit error");
  }
};

// 🎬 youtube
const handleYouTube = async (api, event, message, args) => {
  const option = args[0];
  if (!["-v", "-a"].includes(option)) {
    return message.reply("❌ youtube [-v|-a]");
  }

  const query = args.slice(1).join(" ");
  if (!query) return message.reply("❌ Missing query");

  const sendFile = async (url, type) => {
    try {
      const { data } = await axios.get(`${YT_API}?url=${encodeURIComponent(url)}&type=${type}`);
      const filePath = await downloadFile(data.download_url, type);
      await message.reply({ attachment: fs.createReadStream(filePath) });
      fs.unlinkSync(filePath);
    } catch {
      message.reply(`❌ Failed ${type}`);
    }
  };

  if (query.startsWith("http")) return sendFile(query, option === "-v" ? "mp4" : "mp3");

  try {
    const results = (await ytSearch(query)).videos.slice(0, 6);
    if (!results.length) return message.reply("❌ No results");

    const list = results.map((v, i) => `${i + 1}. ${v.title}`).join("\n");

    api.sendMessage(
      { body: list + "\nReply 1-6" },
      event.threadID,
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "ai",
          messageID: info.messageID,
          author: event.senderID,
          results,
          type: option
        });
      }
    );
  } catch {
    message.reply("❌ YouTube error");
  }
};

// 🧠 AI CORE
const handleAIRequest = async (api, event, userInput, message) => {
  const args = userInput.split(" ");
  const first = args[0]?.toLowerCase();

  if (["edit", "-e"].includes(first)) {
    return handleEdit(api, event, message, args.slice(1));
  }

  if (["youtube", "yt", "ytb"].includes(first)) {
    return handleYouTube(api, event, message, args.slice(1));
  }

  let messageContent = userInput;
  let imageUrl = null;

  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/)?.[0];
  if (urlMatch && validUrl.isWebUri(urlMatch)) {
    imageUrl = urlMatch;
    messageContent = messageContent.replace(urlMatch, '').trim();
  }

  if (!messageContent && !imageUrl) {
    return message.reply("💬 Send text");
  }

  try {
    const res = await axios.post(API_ENDPOINT, {
      uid: event.senderID,
      message: messageContent,
      image_url: imageUrl
    });

    let finalReply = res.data.reply || "AI Response";

    // 🔥 CLEAN FIX (your request fully applied)
    finalReply = finalReply
      .replace(/Shizu/gi, '')
      .replace(/🎀\s*𝗦𝗵𝗶𝘇𝘂/gi, '')
      .replace(/LONELY AI AI/gi, "LONELY AI")
      .replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g, '') // removes (105/86872)
      .replace(/🎀/g, '')
      .trim();

    // 🧠 HEADER
    finalReply = `꧁➤⃟Chucky࿐ ⃪⃝NZR꧂\n\n${finalReply}`;

    const sent = await message.reply({ body: finalReply });

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: "ai",
      messageID: sent.messageID,
      author: event.senderID
    });

    api.setMessageReaction("✅", event.messageID, () => {}, true);

  } catch (e) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply("⚠️ AI error");
  }
};

module.exports = {
  config: {
    name: "ai",
    version: "3.2.3",
    author: "Christus",
    role: 0,
    category: "ai"
  },

  onStart: async ({ api, event, args, message }) => {
    const input = args.join(" ");
    if (!input) return message.reply("❗ Input needed");
    if (["clear", "reset"].includes(input.toLowerCase())) {
      return resetConversation(api, event, message);
    }
    return handleAIRequest(api, event, input, message);
  },

  onReply: async ({ api, event, Reply, message }) => {
    if (event.senderID !== Reply.author) return;
    return handleAIRequest(api, event, event.body, message);
  },

  onChat: async ({ api, event, message }) => {
    const body = event.body?.trim();
    if (!body?.toLowerCase().startsWith("ai ")) return;
    return handleAIRequest(api, event, body.slice(3), message);
  }
};