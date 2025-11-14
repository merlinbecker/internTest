const { app } = require('@azure/functions');
const fs = require('fs');
const path = require('path');

app.http('httpTrigger1', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: '{*restOfPath}',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const url = new URL(request.url);
        const pathname = url.pathname;

        // Capture all request information
        const requestInfo = {
            method: request.method,
            url: request.url,
            headers: Object.fromEntries(request.headers.entries()),
            query: Object.fromEntries(url.searchParams.entries()),
            pathname: pathname,
            timestamp: new Date().toISOString()
        };

        // Serve the main page for root route
        if (pathname === '/' || pathname === '') {
            try {
                const htmlPath = path.join(__dirname, '..', 'static', 'index.html');
                let htmlContent = fs.readFileSync(htmlPath, 'utf8');
                
                // Inject request information into the HTML
                const requestInfoScript = `
                    <script>
                        window.requestInfo = ${JSON.stringify(requestInfo, null, 2)};
                    </script>
                `;
                htmlContent = htmlContent.replace('</head>', requestInfoScript + '</head>');
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body: htmlContent
                };
            } catch (error) {
                context.log.error('Error reading HTML file:', error);
                return {
                    status: 500,
                    body: 'Internal Server Error'
                };
            }
        }

        // Serve static files
        if (pathname.startsWith('/static/')) {
            const filePath = path.join(__dirname, '..', pathname);
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath);
                    const ext = path.extname(filePath);
                    let contentType = 'text/plain';
                    
                    switch (ext) {
                        case '.css':
                            contentType = 'text/css';
                            break;
                        case '.js':
                            contentType = 'application/javascript';
                            break;
                        case '.json':
                            contentType = 'application/json';
                            break;
                        case '.png':
                            contentType = 'image/png';
                            break;
                        case '.ico':
                            contentType = 'image/x-icon';
                            break;
                    }
                    
                    return {
                        status: 200,
                        headers: {
                            'Content-Type': contentType
                        },
                        body: content
                    };
                }
            } catch (error) {
                context.log.error('Error serving static file:', error);
            }
        }

        // Default response for other routes
        return {
            status: 404,
            body: 'Not Found'
        };
    }
});