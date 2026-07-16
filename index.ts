import { Client, IntentsBitField, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CONFIG ======
const GUILD_ID = '1504422135303634994'; // Guild ID của bạn

// ====== FAKE PORT CHO RENDER ======
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

server.listen(PORT, () => {
    console.log(`✅ Fake server đang chạy trên port ${PORT}`);
});

// ====== LẤY TOKEN TỪ ENVIRONMENT VARIABLE ======
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN không tìm thấy trong environment variables!');
    console.log('📝 Thêm BOT_TOKEN vào Render Environment Variables');
    process.exit(1);
}

// ====== LƯU TOKEN USER VÀO FILE ======
const TOKEN_FILE = path.join(__dirname, 'user-tokens.json');

function loadTokens(): { [userId: string]: string } {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
        }
    } catch (error) {
        console.error('❌ Lỗi đọc file token:', error);
    }
    return {};
}

function saveToken(userId: string, token: string): boolean {
    try {
        const tokens = loadTokens();
        tokens[userId] = token;
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu token:', error);
        return false;
    }
}

function getUserToken(userId: string): string | null {
    const tokens = loadTokens();
    return tokens[userId] || null;
}

function deleteToken(userId: string): boolean {
    try {
        const tokens = loadTokens();
        delete tokens[userId];
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Lỗi xóa token:', error);
        return false;
    }
}

// ====== IMPORT CODE GỐC ======
let startQuest: (token: string) => Promise<any>;

async function initBot() {
    try {
        const botModule = await import('./bot.js');
        startQuest = botModule.startQuest || botModule.default;
        
        if (!startQuest) {
            console.warn('⚠️ bot.ts không export hàm startQuest, sẽ chạy qua child_process');
            startQuest = async (token: string) => {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                const { stdout, stderr } = await execAsync(`TOKEN=${token} tsx bot.ts`);
                if (stderr) console.error('stderr:', stderr);
                return stdout || 'Quest completed!';
            };
        }
        
        console.log('✅ Đã import code gốc thành công!');
    } catch (error) {
        console.error('❌ Lỗi import code gốc:', error);
        startQuest = async (token: string) => {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const { stdout, stderr } = await execAsync(`TOKEN=${token} tsx bot.ts`);
            if (stderr) console.error('stderr:', stderr);
            return stdout || 'Quest completed!';
        };
    }

    // ====== KHỞI TẠO BOT DISCORD ======
    const client = new Client({
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.MessageContent,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.DirectMessages,
        ],
    });

    let isRunning = false;
    const ALLOWED_USERS: string[] = [];

    // ====== HÀM TẠO EMBED ======
    function createEmbed(
        title: string,
        description: string,
        color: number = 0x5865F2,
        fields: { name: string; value: string; inline?: boolean }[] = [],
        thumbnail?: string,
        footer?: string
    ) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }

        if (footer) {
            embed.setFooter({ text: footer });
        }

        return embed;
    }

    // ====== ĐĂNG KÝ SLASH COMMAND ======
    client.once('ready', async () => {
        console.log(`✅ Bot Discord đã online: ${client.user?.tag}`);
        
        const commands = [
            new SlashCommandBuilder()
                .setName('token')
                .setDescription('Lưu token Discord của bạn')
                .addStringOption(option =>
                    option.setName('token')
                        .setDescription('Token Discord của bạn')
                        .setRequired(true)
                ),
            new SlashCommandBuilder()
                .setName('complete')
                .setDescription('Chạy auto-complete quest'),
            new SlashCommandBuilder()
                .setName('mytoken')
                .setDescription('Xem token đã lưu (ẩn một phần)'),
            new SlashCommandBuilder()
                .setName('deltoken')
                .setDescription('Xóa token đã lưu'),
            new SlashCommandBuilder()
                .setName('status')
                .setDescription('Xem trạng thái bot hiện tại'),
            new SlashCommandBuilder()
                .setName('log')
                .setDescription('Xem log gần nhất (6 dòng cuối)')
                .addIntegerOption(option =>
                    option.setName('lines')
                        .setDescription('Số dòng log muốn xem (mặc định 6)')
                        .setMinValue(1)
                        .setMaxValue(50)
                ),
            new SlashCommandBuilder()
                .setName('help')
                .setDescription('Hiển thị hướng dẫn sử dụng bot'),
        ];

        const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

        try {
            console.log(`🔄 Đang đăng ký slash command cho guild ${GUILD_ID}...`);
            await rest.put(
                Routes.applicationGuildCommands(client.user?.id || '', GUILD_ID),
                { body: commands }
            );
            console.log('✅ Đã đăng ký slash command thành công!');
            console.log('📋 Slash Command: /token, /complete, /mytoken, /deltoken, /status, /log, /help');
        } catch (error) {
            console.error('❌ Lỗi đăng ký slash command:', error);
        }
    });

    // ====== XỬ LÝ INTERACTION ======
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, user } = interaction;

        if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(user.id)) {
            await interaction.reply({
                embeds: [createEmbed(
                    '⛔ Không có quyền',
                    'Bạn không có quyền sử dụng bot này.',
                    0xFF0000
                )],
                ephemeral: true
            });
            return;
        }

        // ====== /TOKEN ======
        if (commandName === 'token') {
            const token = interaction.options.getString('token', true);
            
            const saved = saveToken(user.id, token);
            
            if (saved) {
                const masked = token.substring(0, 8) + '...' + token.substring(token.length - 4);
                await interaction.reply({
                    embeds: [createEmbed(
                        '✅ Đã lưu token!',
                        `Token của bạn đã được lưu thành công.`,
                        0x00FF00,
                        [
                            { name: '📌 Token', value: `\`${masked}\``, inline: false },
                            { name: '🆔 User', value: user.tag, inline: true },
                            { name: '💡 Hướng dẫn', value: 'Dùng `/complete` để chạy quest.', inline: true }
                        ],
                        user.displayAvatarURL(),
                        'Token được lưu riêng cho từng user'
                    )],
                    ephemeral: true
                });
                console.log(`🔑 ${user.tag} đã lưu token.`);
            } else {
                await interaction.reply({
                    embeds: [createEmbed(
                        '❌ Lỗi!',
                        'Không thể lưu token. Vui lòng thử lại.',
                        0xFF0000
                    )],
                    ephemeral: true
                });
            }
            return;
        }

        // ====== /COMPLETE (FIX CRASH) ======
        if (commandName === 'complete') {
            const token = getUserToken(user.id);
            
            if (!token) {
                await interaction.reply({
                    embeds: [createEmbed(
                        '❌ Chưa có token!',
                        'Bạn chưa lưu token Discord.',
                        0xFFA500,
                        [
                            { name: '📝 Hướng dẫn', value: 'Dùng `/token <your_token>` để lưu trước.', inline: false }
                        ]
                    )],
                    ephemeral: true
                });
                return;
            }

            if (isRunning) {
                await interaction.reply({
                    embeds: [createEmbed(
                        '⏳ Đang chạy!',
                        'Bot đang chạy quest, vui lòng đợi!',
                        0xF1C40F
                    )],
                    ephemeral: true
                });
                return;
            }

            isRunning = true;
            const startTime = Date.now();
            
            const startEmbed = createEmbed(
                '🚀 Bắt đầu auto-complete quest!',
                'Quá trình đang được thực thi...',
                0x5865F2,
                [
                    { name: '⏱️ Thời gian dự kiến', value: '15-20 phút', inline: true },
                    { name: '🔄 Trạng thái', value: '🟢 Đang chạy...', inline: true },
                    { name: '👤 Người dùng', value: user.tag, inline: true }
                ]
            );

            await interaction.reply({ embeds: [startEmbed], ephemeral: true });

            try {
                // Chạy quest với timeout 30 phút để tránh treo
                const result = await Promise.race([
                    startQuest(token),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('⏰ Quest chạy quá 30 phút, tự động dừng!')), 30 * 60 * 1000)
                    )
                ]);
                
                const duration = ((Date.now() - startTime) / 60000).toFixed(1);
                
                const successEmbed = createEmbed(
                    '✅ Hoàn thành!',
                    'Quest đã được hoàn thành thành công.',
                    0x00FF00,
                    [
                        { name: '📊 Kết quả', value: `\`\`\`\n${result || 'Quest completed successfully!'}\n\`\`\``, inline: false },
                        { name: '⏱️ Thời gian', value: `${duration} phút`, inline: true },
                        { name: '👤 Người dùng', value: user.tag, inline: true }
                    ]
                );
                
                await interaction.followUp({ embeds: [successEmbed] });
                
                console.log(`✅ ${user.tag} đã chạy quest thành công.`);
                
            } catch (error: any) {
                console.error('❌ Lỗi khi chạy quest:', error);
                
                const errorMessage = error.message || 'Unknown error';
                let userMessage = errorMessage;
                
                // Nếu lỗi là do process.exit từ code gốc
                if (errorMessage.includes('process.exit') || 
                    errorMessage.includes('exited') ||
                    errorMessage.includes('Worker') ||
                    errorMessage.includes('child_process')) {
                    userMessage = '⚠️ Code gốc đã tự động thoát sau khi hoàn thành. Bot vẫn đang chạy bình thường! ✅';
                    console.log('🔄 Bot vẫn sống sau khi quest hoàn thành.');
                }
                
                const errorEmbed = createEmbed(
                    '❌ Lỗi xảy ra!',
                    'Quest đã thất bại hoặc xảy ra lỗi.',
                    0xFF0000,
                    [
                        { name: 'Lỗi', value: `\`\`\`\n${userMessage}\n\`\`\``, inline: false },
                        { name: '💡 Hướng dẫn', value: 'Kiểm tra token và thử lại.', inline: true }
                    ]
                );
                
                await interaction.followUp({ embeds: [errorEmbed] });
                
            } finally {
                isRunning = false;
            }
            return;
        }

        // ====== /MYTOKEN ======
        if (commandName === 'mytoken') {
            const token = getUserToken(user.id);
            if (!token) {
                await interaction.reply({
                    embeds: [createEmbed(
                        '❌ Chưa có token!',
                        'Bạn chưa lưu token.',
                        0xFFA500,
                        [
                            { name: '📝 Hướng dẫn', value: 'Dùng `/token <your_token>` để lưu.', inline: false }
                        ]
                    )],
                    ephemeral: true
                });
                return;
            }
            const masked = token.substring(0, 8) + '...' + token.substring(token.length - 4);
            await interaction.reply({
                embeds: [createEmbed(
                    '🔑 Token của bạn',
                    'Đây là token bạn đã lưu.',
                    0x5865F2,
                    [
                        { name: '📌 Token', value: `\`${masked}\``, inline: false },
                        { name: '🆔 User ID', value: user.id, inline: true }
                    ],
                    user.displayAvatarURL()
                )],
                ephemeral: true
            });
            return;
        }

        // ====== /DELTOKEN ======
        if (commandName === 'deltoken') {
            const deleted = deleteToken(user.id);
            if (deleted) {
                await interaction.reply({
                    embeds: [createEmbed(
                        '🗑️ Đã xóa token!',
                        'Token của bạn đã được xóa thành công.',
                        0x00FF00
                    )],
                    ephemeral: true
                });
                console.log(`🗑️ ${user.tag} đã xóa token.`);
            } else {
                await interaction.reply({
                    embeds: [createEmbed(
                        '❌ Không có token!',
                        'Bạn chưa có token để xóa.',
                        0xFF0000
                    )],
                    ephemeral: true
                });
            }
            return;
        }

        // ====== /STATUS (Lấy 6 dòng log cuối) ======
        if (commandName === 'status') {
            const token = getUserToken(user.id);
            
            let logContent = 'Chưa có log nào.';
            let logFileExists = false;
            let logFileSize = 0;
            let lastModified = 'Không có';
            
            try {
                const logFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.log'));
                
                if (logFiles.length > 0) {
                    const latestLog = logFiles.sort((a, b) => {
                        return fs.statSync(path.join(__dirname, b)).mtime.getTime() - 
                               fs.statSync(path.join(__dirname, a)).mtime.getTime();
                    })[0];
                    
                    const logPath = path.join(__dirname, latestLog);
                    const stats = fs.statSync(logPath);
                    
                    logFileExists = true;
                    logFileSize = stats.size;
                    lastModified = stats.mtime.toLocaleString('vi-VN');
                    
                    const content = fs.readFileSync(logPath, 'utf-8');
                    const lines = content.split('\n').filter(line => line.trim());
                    // CHỈ LẤY 6 DÒNG CUỐI
                    const lastLines = lines.slice(-6).join('\n');
                    
                    if (lastLines) {
                        logContent = `\`\`\`\n${lastLines}\n\`\`\``;
                    } else {
                        logContent = 'File log trống.';
                    }
                }
            } catch (error: any) {
                logContent = `❌ Lỗi đọc log: ${error.message}`;
            }
            
            const statusEmbed = createEmbed(
                '📊 Trạng thái bot',
                'Thông tin trạng thái hiện tại của bot.',
                0x5865F2,
                [
                    { name: '🔄 Trạng thái quest', value: isRunning ? '🟡 Đang chạy...' : '🟢 Sẵn sàng', inline: true },
                    { name: '🔑 Token', value: token ? '✅ Đã lưu' : '❌ Chưa lưu', inline: true },
                    { name: '👤 Người dùng', value: user.tag, inline: true },
                    { name: '🤖 Bot', value: client.user?.tag || 'Unknown', inline: true },
                    { name: '📋 Server', value: interaction.guild?.name || 'DM', inline: true },
                    { name: '⏱️ Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: '📁 Log file', value: logFileExists ? `✅ Tồn tại (${(logFileSize / 1024).toFixed(1)} KB)` : '❌ Không có', inline: true },
                    { name: '🕐 Cập nhật log', value: lastModified, inline: true },
                    { name: '📝 Log (6 dòng cuối)', value: logContent, inline: false }
                ],
                'https://cdn.discordapp.com/emojis/1234567892.png',
                `ID: ${user.id}`
            );
            
            await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
            return;
        }

        // ====== /LOG (Mặc định 6 dòng) ======
        if (commandName === 'log') {
            const lines = interaction.options.getInteger('lines') || 6;
            
            try {
                const logFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.log'));
                
                if (logFiles.length === 0) {
                    await interaction.reply({
                        embeds: [createEmbed(
                            '📁 Không có log',
                            'Chưa có file log nào được tạo.',
                            0xFFA500
                        )],
                        ephemeral: true
                    });
                    return;
                }
                
                const latestLog = logFiles.sort((a, b) => {
                    return fs.statSync(path.join(__dirname, b)).mtime.getTime() - 
                           fs.statSync(path.join(__dirname, a)).mtime.getTime();
                })[0];
                
                const logPath = path.join(__dirname, latestLog);
                const content = fs.readFileSync(logPath, 'utf-8');
                const logLines = content.split('\n').filter(line => line.trim());
                const lastLines = logLines.slice(-lines).join('\n');
                
                await interaction.reply({
                    embeds: [createEmbed(
                        `📝 Log từ ${latestLog}`,
                        `Hiển thị ${Math.min(lines, logLines.length)}/${logLines.length} dòng cuối:`,
                        0x5865F2,
                        [
                            { name: '📄 Nội dung', value: `\`\`\`\n${lastLines || 'Không có nội dung'}\n\`\`\``, inline: false },
                            { name: '📊 Tổng số dòng', value: `${logLines.length} dòng`, inline: true },
                            { name: '🕐 Cập nhật', value: fs.statSync(logPath).mtime.toLocaleString('vi-VN'), inline: true }
                        ]
                    )],
                    ephemeral: true
                });
            } catch (error: any) {
                await interaction.reply({
                    embeds: [createEmbed(
                        '❌ Lỗi đọc log',
                        `Không thể đọc log: ${error.message}`,
                        0xFF0000
                    )],
                    ephemeral: true
                });
            }
            return;
        }

        // ====== /HELP ======
        if (commandName === 'help') {
            await interaction.reply({
                embeds: [createEmbed(
                    '📖 Hướng dẫn sử dụng bot',
                    'Dưới đây là danh sách các lệnh bạn có thể sử dụng:',
                    0x5865F2,
                    [
                        { name: '🔹 `/token <token>`', value: 'Lưu token Discord của bạn', inline: false },
                        { name: '🔹 `/complete`', value: 'Chạy auto-complete quest', inline: false },
                        { name: '🔹 `/mytoken`', value: 'Xem token đã lưu (ẩn một phần)', inline: false },
                        { name: '🔹 `/deltoken`', value: 'Xóa token của bạn', inline: false },
                        { name: '🔹 `/status`', value: 'Xem trạng thái bot + 6 dòng log cuối', inline: false },
                        { name: '🔹 `/log [số dòng]`', value: 'Xem log (mặc định 6 dòng)', inline: false },
                        { name: '🔹 `/help`', value: 'Hiển thị hướng dẫn này', inline: false }
                    ],
                    null,
                    '⚠️ Selfbot vi phạm ToS Discord. Sử dụng có rủi ro!'
                )],
                ephemeral: true
            });
            return;
        }
    });

    // ====== ĐĂNG NHẬP BOT ======
    client.login(BOT_TOKEN).catch((error) => {
        console.error('❌ Đăng nhập bot thất bại:', error);
    });
}

// ====== CHẠY BOT ======
initBot();