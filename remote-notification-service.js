const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

function loadSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return {
            telegram: {
                enabled: false,
                botToken: '',
                chatId: '',
                notifyOnStatusChange: true
            }
        };
    }
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {
        return { telegram: { enabled: false, botToken: '', chatId: '', notifyOnStatusChange: true } };
    }
}

function saveSettings(settings) {
    if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
        fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

async function sendTelegramMessage(message) {
    const settings = loadSettings();
    console.log('Telegram Sender - Enabled:', settings.telegram?.enabled);
    if (!settings.telegram?.enabled || !settings.telegram?.botToken || !settings.telegram?.chatId) {
        console.log('Telegram Sender - Discarded (missing config)');
        return { success: false, error: 'Telegram not configured or disabled' };
    }

    const { botToken, chatId } = settings.telegram;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    console.log(`Telegram Sender - Sending to ${chatId}...`);

    try {
        const response = await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('Telegram Sender - Response:', response.status);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Telegram Notify Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.description || error.message };
    }
}

async function testTelegram(botToken, chatId) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        const response = await axios.post(url, {
            chat_id: chatId,
            text: '🚀 <b>VPS Gateway 測試通知</b>\n這是一條測試訊息，代表您的 Telegram 監控已設置成功！',
            parse_mode: 'HTML'
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.description || error.message };
    }
}

async function fetchChatId(botToken) {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    try {
        const response = await axios.get(url);
        const updates = response.data.result;
        if (updates && updates.length > 0) {
            // Get the last message sender's chat id
            const lastUpdate = updates[updates.length - 1];
            const chat = lastUpdate.message?.chat || lastUpdate.callback_query?.message?.chat;
            if (chat) {
                return { success: true, chatId: chat.id, firstName: chat.first_name || chat.title };
            }
        }
        return { success: false, error: 'No updates found. Please send a message to the bot first.' };
    } catch (error) {
        return { success: false, error: error.response?.data?.description || error.message };
    }
}

// Simple state to track last known status to prevent spam
let lastStatus = {};

async function startMonitorLoop(getStatusFn) {
    console.log('Starting proactive monitoring loop...');
    setInterval(async () => {
        const settings = loadSettings();
        if (!settings.telegram?.enabled) return;

        try {
            const { mapped } = await getStatusFn();

            for (const [id, current] of Object.entries(mapped)) {
                const prev = lastStatus[id];

                // If status changed to error or stopped, notify
                if (prev && prev.status !== current.status) {
                    // Try to resolve alias
                    let alias = current.name || id;
                    try {
                        const prefsPath = path.join(__dirname, 'data', 'preferences.json');
                        if (fs.existsSync(prefsPath)) {
                            const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
                            if (prefs.aliases && prefs.aliases[id]) {
                                alias = prefs.aliases[id];
                            }
                        }
                    } catch(e) {}

                    const displayName = alias;

                    if (current.status === 'error' || current.status === 'stopped') {
                        const msg = `🚨 <b>服務異常警報</b>\n\n` +
                            `<b>專案:</b> ${displayName} (${id})\n` +
                            `<b>狀態變更:</b> <code>${prev.status}</code> ➔ <code>${current.status}</code>\n` +
                            `<b>詳情:</b> ${current.info || '無'}\n\n` +
                            `請盡速前往 Dashboard 檢查！`;
                        await sendTelegramMessage(msg);
                    } else if (current.status === 'running' || current.status === 'online') {
                        const msg = `✅ <b>服務恢復正常</b>\n\n` +
                            `<b>專案:</b> ${displayName} (${id})\n` +
                            `<b>狀態:</b> 已恢復為 <code>${current.status}</code>\n` +
                            `時間: ${new Date().toLocaleString()}`;
                        await sendTelegramMessage(msg);
                    }
                }
                lastStatus[id] = { status: current.status };
            }
        } catch (err) {
            console.error('Monitor Loop Error:', err.message);
        }
    }, 60000); // Check every 1 minute
}

module.exports = {
    loadSettings,
    saveSettings,
    sendTelegramMessage,
    testTelegram,
    fetchChatId,
    startMonitorLoop
};
