const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3000;

const visitorsFile = path.join(__dirname, 'visitors.log');
const backupFile = path.join(__dirname, 'backup.log');

const AUTH_TOKEN = 'secret123';

const server = http.createServer((req, res) =>
{
    const { method, url, headers, socket } = req;

    const send = (status, message, type = 'text/plain') =>
    {
        res.writeHead(status, { 'Content-Type': type });
        res.end(message);
    };
    
    const isAuthorized = () =>
    {
        return headers.authorization === AUTH_TOKEN;
    };

    if (method === 'POST' && url === '/updateUser')
    {
        const log = `${new Date().toISOString()} | ${socket.remoteAddress}\n`;

        return fs.appendFile(visitorsFile, log, err =>
        {
            if (err) return send(500, 'Error updating visitor log');
            return send(200, 'Visitor logged successfully');
        });
    }

    else if (method === 'GET' && url === '/savelog')
    {
        return fs.readFile(visitorsFile, 'utf-8', (err, data) =>
        {
            if (err)
            {
                if (err.code === 'ENOENT')
                {
                    return send(200, 'No logs yet');
                }
                return send(500, 'Error reading log file');
            }

            return send(200, data);
        });
    }

    else if (method === 'POST' && url === '/backup')
    {
        if (!isAuthorized())
        {
            return send(401, 'Unauthorized');
        }

        return fs.access(visitorsFile, fs.constants.F_OK, err =>
        {
            if (err) return send(404, 'No log file to backup');

            fs.copyFile(visitorsFile, backupFile, err =>
            {
                if (err) return send(500, 'Error creating backup');
                return send(200, 'Backup created successfully');
            });
        });
    }

    else if (method === 'DELETE' && url === '/clearlog')
    {
        if (!isAuthorized())
        {
            return send(401, 'Unauthorized');
        }

        return fs.writeFile(visitorsFile, '', err =>
        {
            if (err) return send(500, 'Error clearing log');
            return send(200, 'Log cleared successfully');
        });
    }

    else if (method === 'GET' && url === '/serverinfo')
    {
        const info =
        {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: `${Math.floor(os.uptime() / 60)} minutes`,
            memory:
            {
                total: `${(os.totalmem() / 1e9).toFixed(2)} GB`,
                free: `${(os.freemem() / 1e9).toFixed(2)} GB`
            },
            cpuCores: os.cpus().length
        };

        return send(200, JSON.stringify(info, null, 2), 'application/json');
    }

    else
    {
        return send(404, 'Route not found');
    }
});

server.listen(PORT, () =>
{
    console.log(`Server running at http://localhost:${PORT}`);
});