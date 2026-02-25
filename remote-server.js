
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { getStatus, restartService, stopService, startService, getLogs } = require('./control-service');
const { listDockerContainers } = require('./docker-service');
const { getProviders, addProvider, deleteProvider, syncDomains, refreshExpiryDates, updateDomainMetadata, getCachedDomains } = require('./domain-service');
const { getAIInfo } = require('./ai-service');
const { loadProjects, upsertProject, deleteProject, loadReports, upsertReport, loadPreferences, savePreferences } = require('./project-registry');
const { deployProject } = require('./deploy-service');
const { getOpenApiSpec } = require('./openapi');
const { loadSettings, saveSettings, testTelegram, fetchChatId, startMonitorLoop } = require('./notification-service');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

// 為 rate-limit 啟用 proxy trust (解決 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

// ========== 簡易密碼驗證中間件 ==========
// 優先使用環境變數，若無則使用預設值以確保系統穩定性 (v1.81 Revert)
const API_KEY = process.env.API_KEY || 'ShinyGateway2026';

if (!process.env.API_KEY) {
    console.warn('⚠️  Warning: API_KEY environment variable not found. Using default fallback key.');
}

const JWT_SECRET = process.env.GATEWAY_JWT_SECRET || API_KEY || 'GatewaySecret2026';
const PREFS_FILE = path.join(__dirname, 'data', 'preferences.json');

function authMiddleware(req, res, next) {
    // 允許 /api/specs 或 AI 提示詞 或 login 不需驗證
    if (req.path === '/api/specs' || req.path === '/api/openapi.json' || req.path === '/api/health' || req.path === '/api/agent-context' || req.path === '/api/login') {
        return next();
    }

    // 檢查 Authorization header 或 query param
    const authHeader = req.headers['authorization'];
    const queryKey = req.query.key;

    if (authHeader) {
        // 支援 Bearer token (JWT) 
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (err) {
                return res.status(401).json({ error: 'Token expired or invalid' });
            }
        }
        
        // 舊版 Basic auth 支援 (單純比對 API_KEY)
        const token = authHeader.replace('Basic ', '');
        if (token === API_KEY) {
            return next();
        }
    }

    if (queryKey === API_KEY) {
        return next();
    }

    // 未授權
    res.status(401).json({ error: 'Unauthorized. Please provide API key or Bearer token.' });
}

app.use(cors());
app.use(bodyParser.json());

// 靜態文件 (Dashboard)
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // HTML 禁止緩存，確保用戶獲取最新版本
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // JS/CSS 等資源長期緩存 (依賴文件名 hash)
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// ========== Security Middlewares ==========

// 1. Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter);

const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min
    max: 10,
    message: 'Too many operations created from this IP, please try again after a minute'
});

// 2. Input Validation Helper
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

// 3. Validation Schemas
const controlSchema = Joi.object({
    serviceName: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('PM2', 'Docker').required()
});

const projectSchema = Joi.object({
    id: Joi.string().alphanum().min(3).max(30).required(),
    name: Joi.string().min(3).max(100).required(),
    domains: Joi.array().items(Joi.string()).optional(),
    runtime: Joi.string().valid('Docker', 'PM2').required(),
    notes: Joi.string().allow('').optional(),
    path: Joi.string().optional(),
    docker: Joi.object().optional(),
    pm2: Joi.object().optional(),
    deploy: Joi.object().optional(),
    updatedAt: Joi.string().optional(),
    createdAt: Joi.string().optional()
}).unknown(true);

const deploySchema = Joi.object({
    dryRun: Joi.boolean().optional()
});

// ========== API 路由 ==========

// 0. Login API (取得 JWT)
app.post('/api/login', strictLimiter, (req, res) => {
    const { password } = req.body;
    if (password === API_KEY) {
        const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '3h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});


// 1. Status API (需要驗證)
app.get('/api/status', authMiddleware, async (req, res) => {
    try {
        const live = await getStatus(); // Now returns { mapped, rawPm2, rawDocker }
        const projects = loadProjects();
        const reports = loadReports();

        const mappedLive = live.mapped || {};

        // Legacy compatibility (dashboard expects my8020/goldlab/liro keys)
        const legacy = {
            my8020: mappedLive.my8020 || { name: 'my8020.cloud', type: 'PM2', status: 'unknown', info: '' },
            goldlab: mappedLive.goldlab || { name: 'goldlab.tw', type: 'Docker', status: 'unknown', info: '' },
            liro: mappedLive.liro || { name: 'liro.world', type: 'Docker', status: 'unknown', info: '' }
        };

        const format = (req.query.format || 'legacy').toString();
        if (format === 'full') {
            return res.json({
                generatedAt: new Date().toISOString(),
                projects,
                live: mappedLive,
                rawPm2: live.rawPm2,
                rawDocker: live.rawDocker,
                reports,
                legacy
            });
        }

        // default legacy
        res.json(legacy);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Control API (需要驗證)
app.post('/api/control/restart', authMiddleware, strictLimiter, validate(controlSchema), async (req, res) => {
    const { serviceName, type } = req.body;
    try {
        const result = await restartService(serviceName, type);
        res.json({ success: true, result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/stop', authMiddleware, strictLimiter, validate(controlSchema), async (req, res) => {
    const { serviceName, type } = req.body;
    try {
        const result = await stopService(serviceName, type);
        res.json({ success: true, result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/start', authMiddleware, strictLimiter, validate(controlSchema), async (req, res) => {
    const { serviceName, type } = req.body;
    try {
        const result = await startService(serviceName, type);
        res.json({ success: true, result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Logs API (需要驗證) - NEW
app.get('/api/logs/:serviceName', authMiddleware, async (req, res) => {
    const { serviceName } = req.params;
    const lines = parseInt(req.query.lines) || 50;

    try {
        const logsResult = await getLogs(serviceName, lines);
        const format = (req.query.format || 'text').toString();
        if (format === 'json') {
            return res.json(logsResult);
        }

        if (logsResult.error) {
            res.status(500);
            return res.type('text/plain').send(logsResult.error);
        }

        return res.type('text/plain').send(logsResult.logs || '');
    } catch (err) {
        console.error(err);
        res.status(500).type('text/plain').send(err.message);
    }
});

// 4. AI Docs API (不需驗證 - 供其他 AI 讀取)
app.get('/api/specs', (req, res) => {
    res.json(getAIInfo());
});

// 4.1 OpenAPI (不需驗證)
app.get('/api/openapi.json', (req, res) => {
    const basePath = process.env.BASE_PATH || '/jen';
    res.json(getOpenApiSpec(basePath));
});

// 4.2 IDE AI Context (不需驗證 - 供 AI 閱讀的純文字/Markdown 版)
app.get('/api/agent-context', async (req, res) => {
    try {
        const live = await getStatus(); // Fetch real-time status mapped by projects
        const mappedLive = live.mapped || {};

        let md = `# VPS Central Gateway - AI Developer Context\n\n`;
        md += `You are an AI assisting a developer. Read these rules before generating code or configuration files.\n\n`;
        md += `## 1. Project Standards (Rules)\n`;
        md += `- **Port Allocation**: Must use an unassigned internal port. (Node.js/PM2: 4000-4999, Docker: 9000-9999).\n`;
        md += `- **Docker Network**: Services that need external access must join the \`web-proxy\` network.\n`;
        md += `- **Domain/Proxy**: Use Caddy labels in docker-compose.yml for automatic proxy and SSL. NO Nginx manual configs.\n`;
        md += `  - Example:\n    \`\`\`yaml\n    labels:\n      caddy: your-domain.com\n      caddy.reverse_proxy: "{{upstreams 80}}"\n    \`\`\`\n`;
        md += `- **Container Naming**: Ensure container and volume names are unique by prefixing with the project ID.\n`;
        md += `- **Line Endings**: Must use LF (Linux) line endings for .env or shell scripts.\n`;
        md += `- **Project Registration**: After deployment, register your project using: \`POST /api/register-project\`.\n\n`;

        md += `## 2. Currently Registered Projects & Resources\n`;
        md += `DO NOT use port numbers, PM2 names, or Docker container names that are already listed below:\n\n`;

        const projects = loadProjects();
        projects.forEach(p => {
            md += `- **Project ID:** ${p.id} (${p.runtime})\n`;
            if (p.domains && p.domains.length) md += `  - Domains: ${p.domains.join(', ')}\n`;
            if (p.docker && p.docker.containerName) md += `  - Docker Cont: ${p.docker.containerName}\n`;
            if (p.pm2 && p.pm2.name) md += `  - PM2 Name: ${p.pm2.name}\n`;

            // Try to extract known port from mapped live info
            const pLive = mappedLive[p.id];
            if (pLive && pLive.info) {
                // pLive.info might contain text like "Port 9005"
                const memMatch = pLive.info.match(/Port (\d+)/i) || pLive.info.match(/(\d+)->/i);
                if (memMatch) {
                    md += `  - Known Port: ${memMatch[1]}\n`;
                }
            }
        });

        md += `\n*End of context.*`;

        res.type('text/markdown').send(md);
    } catch (err) {
        console.error('Error generating AI text context', err);
        res.status(500).type('text/plain').send('Error generating context.');
    }
});

// ========== Project Registry APIs (需要驗證) ==========

app.get('/api/preferences', authMiddleware, (req, res) => {
    res.json(loadPreferences());
});

app.post('/api/preferences', authMiddleware, (req, res) => {
    savePreferences(req.body);
    res.json({ success: true });
});

app.get('/api/projects', authMiddleware, (req, res) => {
    const projects = loadProjects();
    res.json({ projects });
});

app.get('/api/projects/:id', authMiddleware, (req, res) => {
    const projects = loadProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
});

app.put('/api/projects/:id', authMiddleware, (req, res) => {
    try {
        const saved = upsertProject(req.params.id, req.body || {});
        res.json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', authMiddleware, (req, res) => {
    const ok = deleteProject(req.params.id);
    res.json({ success: ok });
});

// Mechanism 1: Active reporting via Webhook / API Push
app.post('/api/register-project', authMiddleware, (req, res) => {
    try {
        const { project_id, type, domains, port, container_name, status } = req.body;

        if (!project_id) {
            return res.status(400).json({ error: 'project_id is required' });
        }

        // Map the incoming payload to our internal project structure
        const projectPatch = {
            id: project_id,
            runtime: type === 'docker' ? 'Docker' : (type === 'pm2' ? 'PM2' : 'Docker'),
            domains: domains || [],
            status: status || 'active'
        };

        if (projectPatch.runtime === 'Docker') {
            projectPatch.docker = {
                containerName: container_name
            };
        } else if (projectPatch.runtime === 'PM2') {
            projectPatch.pm2 = {
                name: container_name // For PM2, we use this as the app name
            };
        }

        // upsertProject already handles:
        // 1. Validation of ID
        // 2. Conflict checking for container_name and domains
        // 3. Saving to projects.json
        const saved = upsertProject(project_id, projectPatch);

        res.json({
            success: true,
            message: `Project ${project_id} registered/updated successfully`,
            project: saved
        });
    } catch (err) {
        console.error('Error in /api/register-project:', err);
        res.status(400).json({ error: err.message });
    }
});

// Mechanism 2: Docker Auto Discovery (Pull / Manual Sync)
app.post('/api/sync-discovery', authMiddleware, async (req, res) => {
    try {
        const containers = await listDockerContainers();
        const projects = loadProjects();
        const results = [];

        for (const container of containers) {
            const labels = container.Labels || {};
            const caddyDomain = labels['caddy'] || Object.keys(labels).find(k => k.startsWith('caddy='));

            // If it has a caddy label, it's a candidate for auto-registration
            if (caddyDomain) {
                const domainValue = labels['caddy'] || caddyDomain.split('=')[1];
                const containerName = (container.Names || [])[0]?.replace(/^\//, '');

                // Extract public port if available (from Labels or Ports)
                let port = null;
                const portLabel = labels['caddy.reverse_proxy'] || '';
                const portMatch = portLabel.match(/upstreams\s+(\d+)/);
                if (portMatch) port = parseInt(portMatch[1]);

                if (!port && container.Ports) {
                    const mapped = container.Ports.find(p => p.PublicPort);
                    if (mapped) port = mapped.PublicPort;
                }

                const projectId = containerName || domainValue.split('.')[0];

                // Upsert to registry
                const patch = {
                    id: projectId,
                    name: domainValue,
                    domains: [domainValue],
                    runtime: 'Docker',
                    docker: { containerName: containerName },
                    status: container.State === 'running' ? 'active' : 'inactive',
                    notes: 'Auto-discovered via Caddy labels'
                };

                const saved = upsertProject(projectId, patch);
                results.push({ id: projectId, domain: domainValue, status: 'synced' });
            }
        }

        res.json({
            success: true,
            discovered: results.length,
            projects: results
        });
    } catch (err) {
        console.error('Error in /api/sync-discovery:', err);
        res.status(500).json({ error: err.message });
    }
});

// Projects report runtime/deploy status back to Gateway
app.post('/api/projects/:id/report', authMiddleware, (req, res) => {
    try {
        const saved = upsertReport(req.params.id, req.body || {});
        res.json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Trigger deploy via allowlisted SSH commands
app.post('/api/projects/:id/deploy', authMiddleware, strictLimiter, validate(deploySchema), async (req, res) => {
    try {
        const projects = loadProjects();
        const project = projects.find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const dryRun = !!(req.body && req.body.dryRun);
        const result = await deployProject(project, { dryRun });
        res.json({ projectId: project.id, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Domain Management API (New)
app.get('/api/domains', authMiddleware, async (req, res) => {
    try {
        const providers = await getProviders();
        // 如果請求帶有 sync=true，則進行同步
        let domains = [];
        if (req.query.sync === 'true') {
            domains = await syncDomains();
        } else {
            // Default to cache for speed
            domains = getCachedDomains();
            // If cache is empty, force sync
            if (!domains || domains.length === 0) {
                domains = await syncDomains();
            }
        }
        res.json({ providers, domains });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/domains/providers', authMiddleware, async (req, res) => {
    try {
        const { name, type, credentials } = req.body;
        if (!name || !type) throw new Error('Name and Type are required');

        const newProvider = await addProvider({ name, type, credentials });
        res.json(newProvider);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/domains/providers/:id', authMiddleware, async (req, res) => {
    try {
        await deleteProvider(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Refresh domain expiry dates via WHOIS/RDAP
app.post('/api/domains/refresh-expiry', authMiddleware, async (req, res) => {
    try {
        console.log('Starting WHOIS expiry refresh...');
        const result = await refreshExpiryDates();
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Refresh expiry error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update domain metadata (Manual Override)
app.post('/api/domains/:domain/metadata', authMiddleware, async (req, res) => {
    const { domain } = req.params;
    const { expires, registrar } = req.body;
    try {
        const updated = updateDomainMetadata(domain, { expires, registrar });
        res.json({ success: true, domain: updated });
    } catch (err) {
        console.error('Update metadata error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Notification Settings API
app.get('/api/settings/notifications', authMiddleware, (req, res) => {
    res.json(loadSettings());
});

app.post('/api/settings/notifications', authMiddleware, (req, res) => {
    try {
        saveSettings(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/settings/notifications/test', authMiddleware, async (req, res) => {
    const { botToken, chatId } = req.body;
    const result = await testTelegram(botToken, chatId);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

app.get('/api/settings/notifications/fetch-chat-id', authMiddleware, async (req, res) => {
    const { botToken } = req.query;
    if (!botToken) return res.status(400).json({ error: 'Bot token required' });
    const result = await fetchChatId(botToken);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// 5. Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dataDir: process.env.GATEWAY_DATA_DIR || 'default'
    });
});

// ========== 啟動服務器 ==========
app.listen(PORT, () => {
    console.log(`Gateway Backend running on port ${PORT}`);
    console.log(`API Key: ${API_KEY.substring(0, 3)}***`);

    // 啟動監控回圈
    startMonitorLoop(getStatus);
});
