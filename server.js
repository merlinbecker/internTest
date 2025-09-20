const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to capture request information
app.use((req, res, next) => {
    req.requestInfo = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        pathname: req.path,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
    };
    next();
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'src', 'static')));

// Main route handler - simulates Azure Functions behavior
app.get('*', (req, res) => {
    console.log(`Request processed for url "${req.url}"`);

    const pathname = req.path;

    // Serve the main page for root route
    if (pathname === '/' || pathname === '') {
        try {
            const htmlPath = path.join(__dirname, 'src', 'static', 'index.html');
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Inject request information into the HTML
            const requestInfoScript = `
                <script>
                    window.requestInfo = ${JSON.stringify(req.requestInfo, null, 2)};
                </script>
            `;
            htmlContent = htmlContent.replace('</head>', requestInfoScript + '</head>');
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(htmlContent);
            
        } catch (error) {
            console.error('Error reading HTML file:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        // For other routes, show request info as JSON
        res.json({
            message: 'Route not found, but here\'s your request info:',
            requestInfo: req.requestInfo
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Intern Test PWA Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the Progressive Web App`);
    console.log('');
    console.log('Features available:');
    console.log('✓ Request header capture and display');
    console.log('✓ Keyboard and mouse event capturing');
    console.log('✓ Camera access and photo capture');
    console.log('✓ Progressive Web App capabilities');
    console.log('✓ Service Worker for offline functionality');
});

module.exports = app;