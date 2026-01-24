/**
 * VPS Gateway Universal CLI (Zero Dependency)
 * 
 * 這是為了讓任何專案都能方便註冊到 Gateway 而設計的單一腳本。
 * 不依賴任何 npm 套件 (如 axios, dotenv)，直接用 node 即可執行。
 * 
 * 下載與安裝:
 *   curl -o gateway.js https://my8020.cloud/jen/tools/gateway.js
 * 
 * 使用方式:
 *   node gateway.js register --id "my-app" --port 3000
 */

const https = require('https');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// --- Config ---
const CONFIG = {
    baseUrl: 'https://my8020.cloud/jen/api',
    defaultKey: 'ShinyGateway2026' // Fallback defaulting for convenience
};

// --- Helpers ---

// Simple arg parser
// node script.js command --key val --flag
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0] && !args[0].startsWith('-') ? args[0] : 'help';
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace(/^--/, '');
            const val = args[i + 1] && !args[i + 1].startsWith('-') ? args[i + 1] : true;
            params[key] = val;
        }
    }
    return { command, params };
}

// HTTP Request Wrapper (Native)
function request(method, endpoint, data = null, apiKey) {
    return new Promise((resolve, reject) => {
        const url = new URL(CONFIG.baseUrl + endpoint);
        if (apiKey) url.searchParams.append('key', apiKey);

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`API Error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// --- Commands ---

async function register(params) {
    console.log('🚀 開始註冊專案到 VPS Gateway...');

    const required = ['id', 'port'];
    const missing = required.filter(k => !params[k]);
    
    // Interactive fallback if missing args
    if (missing.length > 0) {
        // Simple manual check for now, can be improved
        if (!params.id) throw new Error('Missing parameter: --id');
        if (!params.port) throw new Error('Missing parameter: --port');
    }

    const projectId = params.id;
    const name = params.name || projectId;
    const domain = params.domain || `${projectId}.com`;
    // Ports handling
    const ports = params.port.toString().split(',').map(p => parseInt(p.trim()));
    const type = params.type || 'Docker'; // Docker or PM2
    const stack = params.stack ? params.stack.split(',') : ['Docker'];

    // Construct Payload
    const payload = {
        name: name,
        runtime: type,
        stack: stack,
        domains: [domain, `www.${domain}`],
        ports: ports
    };

    // Smart defaults for paths and configs based on type
    if (type === 'Docker') {
        payload.path = `/home/docker-server/projects/${projectId}`;
        payload.docker = {
            nameIncludes: projectId
        };
        payload.deploy = {
            steps: [
                { type: 'gitPull', cwd: payload.path },
                { type: 'dockerComposeUp', cwd: payload.path, build: true }
            ]
        };
    } else if (type === 'PM2') {
        payload.path = `/var/www/${projectId}`;
        payload.pm2 = {
            name: `${projectId}-web`
        };
        payload.deploy = {
            steps: [
                { type: 'gitPull', cwd: payload.path },
                { type: 'exec', cmd: 'npm install && pm2 restart ecosystem.config.js' }
            ]
        };
    }

    // Call API
    try {
        const apiKey = params.key || CONFIG.defaultKey;
        await request('PUT', `/projects/${projectId}`, payload, apiKey);
        
        console.log('\n✅ 註冊成功！');
        console.log('------------------------------------------------');
        console.log(`專案 ID:   ${projectId}`);
        console.log(`URL:       https://my8020.cloud/jen/`);
        console.log('------------------------------------------------');
        console.log('下一步:');
        console.log('1. 前往 Dashboard 查看卡片');
        console.log('2. 點擊 Deploy 按鈕進行首次部署');
        console.log('3. 使用 connect-domain 腳本設定域名');
        console.log('------------------------------------------------');

    } catch (e) {
        console.error('❌ 註冊失敗:', e.message);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
VPS Gateway Client Tool (v1.0)
------------------------------
用法: node gateway.js <command> [options]

指令:
  register    註冊新專案到 Gateway

通用參數:
  --key       API_KEY (預設使用內建 Public Key)

Register 參數:
  --id        [必填] 專案唯一 ID (例: my-app)
  --port      [必填] 內部端口 (例: 3000)
  --name      專案顯示名稱
  --domain    主要網域
  --type      Docker (預設) 或 PM2
  --stack     技術棧 (逗號分隔, 例: React,Node)

範例:
  node gateway.js register --id "my-shop" --port 4005 --stack "Next.js"
`);
}

// --- Main ---

(async () => {
    const { command, params } = parseArgs();

    switch (command) {
        case 'register':
            await register(params);
            break;
        default:
            showHelp();
            break;
    }
})();
