const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.GATEWAY_DATA_DIR || path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'preferences.json');

function ensureDataDir() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        if (!raw.trim()) return fallbackValue;
        return JSON.parse(raw);
    } catch (err) {
        console.error(`❌ Data Protection: Failed to parse ${filePath}! Backing up corrupted file.`, err);
        try {
            fs.copyFileSync(filePath, `${filePath}.corrupted.${Date.now()}`);
        } catch (e) {}
        return fallbackValue;
    }
}

function writeJsonFileAtomic(filePath, value) {
    ensureDataDir();
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
}

function getDefaultProjects() {
    return [
        {
            id: 'my8020',
            name: 'my8020.cloud',
            domains: ['my8020.cloud', 'www.my8020.cloud'],
            runtime: 'PM2',
            path: '/var/www/my8020_nuxt',
            pm2: { name: 'my8020-web' },
            deploy: {
                steps: [
                    { type: 'pm2Restart', pm2Name: 'my8020-web' }
                ]
            }
        },
        {
            id: 'goldlab',
            name: 'goldlab.tw',
            domains: ['goldlab.tw', 'goldlab.cloud'],
            runtime: 'Docker',
            path: '/home/docker-server/projects/goldlab',
            docker: { nameIncludes: 'goldlab', containerName: 'goldlab' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/home/docker-server/projects/goldlab', build: true }
                ]
            }
        },
        {
            id: 'liro',
            name: 'liro.world',
            domains: ['liro.world', 'www.liro.world'],
            runtime: 'Docker',
            path: '/home/docker-server/projects/liro',
            docker: { nameIncludes: 'liro-app', containerName: 'liro-app' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/home/docker-server/projects/liro', build: true }
                ]
            }
        },
        {
            id: 'royal-booking',
            name: 'royal.gowork.run',
            domains: ['royal.gowork.run'],
            runtime: 'Docker',
            path: '/var/www/royal-booking',
            docker: { nameIncludes: 'royal-booking-app', containerName: 'royal-booking-app' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/var/www/royal-booking', build: true }
                ]
            }
        },
        {
            id: 'book-gowork',
            name: 'book.gowork.run',
            domains: ['book.gowork.run'],
            runtime: 'Docker',
            path: '/var/www/booking',
            docker: { nameIncludes: 'book-gowork-app', containerName: 'book-gowork-app' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/var/www/booking', build: true }
                ]
            }
        },
        {
            id: 'let-gowork',
            name: 'let.gowork.run',
            domains: ['let.gowork.run'],
            runtime: 'Docker',
            path: '/home/docker-server/projects/let-clean',
            docker: { nameIncludes: 'let-final-site', containerName: 'let-final-site' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/home/docker-server/projects/let-clean', build: true }
                ]
            }
        },
        {
            id: 'seo-gowork',
            name: 'seo.gowork.run',
            domains: ['seo.gowork.run'],
            runtime: 'PM2',
            path: '/var/www/seo_portfolio',
            pm2: { name: 'seo-portfolio' },
            deploy: {
                steps: [
                    { type: 'pm2Restart', pm2Name: 'seo-portfolio' }
                ]
            }
        },
        {
            id: 'goldlab-cloud',
            name: 'Goldlab Cloud App',
            domains: [],
            runtime: 'Docker',
            path: '/home/docker-server/projects/goldlab-cloud',
            docker: { nameIncludes: 'goldlab-cloud', containerName: 'goldlab-cloud-frontend' },
            deploy: {
                steps: [
                    { type: 'dockerComposeUp', cwd: '/home/docker-server/projects/goldlab-cloud', build: true }
                ]
            }
        },
        {
            id: 'shiny-web',
            name: 'Shiny Web',
            domains: [],
            runtime: 'PM2',
            path: '/var/www/my8020_nuxt',
            pm2: { name: 'shiny-web' },
            deploy: {
                steps: [
                    { type: 'pm2Restart', pm2Name: 'shiny-web' }
                ]
            }
        },
        {
            id: 'flashrates',
            name: 'Flashrates API',
            domains: [],
            runtime: 'PM2',
            path: '/var/www/flashrates',
            pm2: { name: 'flashrates-backend' },
            deploy: {
                steps: [
                    { type: 'pm2Restart', pm2Name: 'flashrates-backend' }
                ]
            }
        },
        {
            id: 'e111-booking',
            name: 'E111 Booking',
            domains: [],
            runtime: 'PM2',
            path: '/root/e111-booking/e111-booking',
            pm2: { name: 'e111-booking' },
            deploy: {
                steps: [
                    { type: 'pm2Restart', pm2Name: 'e111-booking' }
                ]
            }
        }
    ];
}

function loadProjects() {
    ensureDataDir();
    const defaults = getDefaultProjects();
    
    if (fs.existsSync(PROJECTS_FILE)) {
        try {
            const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
            if (!raw.trim()) {
                console.warn('⚠️ projects.json is empty. Returning existing cache or defaults, but not overwriting to prevent data loss.');
                return defaults;
            }
            const projects = JSON.parse(raw);
            if (projects && Array.isArray(projects)) {
                return projects;
            }
        } catch (err) {
            console.error('❌ Failed to parse projects.json! Backing up and returning defaults to prevent data wipeout.', err);
            fs.copyFileSync(PROJECTS_FILE, `${PROJECTS_FILE}.corrupted.${Date.now()}`);
            return defaults; // Return defaults for runtime stability, but do NOT overwrite PROJECTS_FILE yet
        }
    } else {
        // Only write defaults if the file truly does not exist
        writeJsonFileAtomic(PROJECTS_FILE, defaults);
    }

    return defaults;
}

function saveProjects(projects) {
    if (!Array.isArray(projects)) throw new Error('projects must be an array');
    writeJsonFileAtomic(PROJECTS_FILE, projects);
}

function upsertProject(projectId, projectPatch) {
    const projects = loadProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    const now = new Date().toISOString();

    const normalized = normalizeProject({ ...(projects[idx] || {}), ...(projectPatch || {}), id: projectId, updatedAt: now });
    if (!normalized.createdAt) normalized.createdAt = now;

    // === Isolation safety: check for Docker resource naming conflicts ===
    const otherProjects = projects.filter(p => p.id !== projectId);

    // Check containerName uniqueness
    if (normalized.docker?.containerName) {
        const conflict = otherProjects.find(p => p.docker?.containerName === normalized.docker.containerName);
        if (conflict) {
            throw new Error(`Container name "${normalized.docker.containerName}" already used by project "${conflict.id}". Use a unique name to avoid Docker isolation conflicts.`);
        }
    }

    // Check domain uniqueness
    if (normalized.domains?.length) {
        for (const domain of normalized.domains) {
            const conflict = otherProjects.find(p => p.domains?.includes(domain));
            if (conflict) {
                throw new Error(`Domain "${domain}" already registered by project "${conflict.id}". Each domain must belong to only one project.`);
            }
        }
    }

    if (idx >= 0) projects[idx] = normalized;
    else projects.push(normalized);

    saveProjects(projects);
    return normalized;
}

function deleteProject(projectId) {
    const projects = loadProjects();
    const next = projects.filter(p => p.id !== projectId);
    saveProjects(next);
    return projects.length !== next.length;
}

function normalizeProject(project) {
    const out = { ...project };
    if (!out.domains) out.domains = [];
    if (typeof out.domains === 'string') out.domains = [out.domains];
    if (!out.runtime) out.runtime = 'Docker';
    if (out.runtime !== 'Docker' && out.runtime !== 'PM2') throw new Error('runtime must be Docker or PM2');

    // Preserve notes field (optional user-entered text)
    if (typeof out.notes !== 'string') out.notes = out.notes || '';

    if (out.runtime === 'PM2') {
        out.pm2 = out.pm2 || {};
        if (out.pm2.name && typeof out.pm2.name !== 'string') throw new Error('pm2.name must be string');
    }

    if (out.runtime === 'Docker') {
        out.docker = out.docker || {};
        if (out.docker.nameIncludes && typeof out.docker.nameIncludes !== 'string') throw new Error('docker.nameIncludes must be string');
        if (out.docker.containerName && typeof out.docker.containerName !== 'string') throw new Error('docker.containerName must be string');
    }

    if (out.deploy && out.deploy.steps && !Array.isArray(out.deploy.steps)) {
        throw new Error('deploy.steps must be an array');
    }

    return out;
}

function loadReports() {
    ensureDataDir();
    const reports = readJsonFile(REPORTS_FILE, {});
    return reports && typeof reports === 'object' ? reports : {};
}

function saveReports(reports) {
    writeJsonFileAtomic(REPORTS_FILE, reports);
}

function upsertReport(projectId, report) {
    const reports = loadReports();
    const now = new Date().toISOString();
    reports[projectId] = {
        ...(reports[projectId] || {}),
        ...(report || {}),
        projectId,
        reportedAt: now
    };
    saveReports(reports);
    return reports[projectId];
}

function loadPreferences() {
    ensureDataDir();
    return readJsonFile(PREFERENCES_FILE, {});
}

function savePreferences(preferences) {
    writeJsonFileAtomic(PREFERENCES_FILE, preferences);
}

module.exports = {
    DATA_DIR,
    PROJECTS_FILE,
    REPORTS_FILE,
    loadProjects,
    saveProjects,
    upsertProject,
    deleteProject,
    loadReports,
    upsertReport,
    loadPreferences,
    savePreferences
};
