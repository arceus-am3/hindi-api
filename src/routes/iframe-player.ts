export const getIframeEmbedHtml = (servers: Array<{ name: string, url: string }>, title: string = 'Video') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #000; 
            overflow: hidden; 
            height: 100vh; 
        }
        
        .player-container {
            width: 100%;
            height: 100%;
            position: relative;
            background: #000;
        }
        
        iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
        
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-family: Arial, sans-serif;
            font-size: 16px;
            text-align: center;
        }
        
        .loader {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #ff0032;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff0032;
            font-family: Arial, sans-serif;
            font-size: 16px;
            text-align: center;
            display: none;
        }
    </style>
</head>
<body>
    <div class="player-container">
        <div class="loading" id="loading">
            <div class="loader"></div>
            <div>Loading player...</div>
        </div>
        <div class="error" id="error">All servers failed. Please try again later.</div>
        <iframe id="playerFrame" src="" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
    </div>

    <script>
        const servers = ${JSON.stringify(servers)};
        let currentServerIndex = 0;
        let loadTimeout = null;
        
        const iframe = document.getElementById('playerFrame');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        
        function loadServer(index) {
            if (index >= servers.length) {
                // All servers failed
                console.error('All servers failed');
                loading.style.display = 'none';
                error.style.display = 'block';
                return;
            }
            
            currentServerIndex = index;
            const server = servers[index];
            
            console.log(\`Attempting to load \${server.name} (Server \${index + 1}/\${servers.length})...\`);
            
            // Show loading
            loading.style.display = 'block';
            error.style.display = 'none';
            
            // Clear any existing timeout
            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }
            
            // Set timeout to try next server if this one takes too long
            loadTimeout = setTimeout(() => {
                console.warn(\`Server \${index + 1} timed out, trying next...\`);
                tryNextServer();
            }, 10000); // 10 second timeout
            
            // Load iframe
            iframe.src = server.url;
        }
        
        function tryNextServer() {
            const nextIndex = currentServerIndex + 1;
            if (nextIndex < servers.length) {
                console.log(\`Server \${currentServerIndex + 1} failed, switching to Server \${nextIndex + 1}...\`);
                loadServer(nextIndex);
            } else {
                console.error('All servers exhausted');
                loading.style.display = 'none';
                error.style.display = 'block';
            }
        }
        
        // Hide loading when iframe loads successfully
        iframe.addEventListener('load', () => {
            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }
            
            // Check if iframe actually loaded content (not an error page)
            try {
                // If we can access iframe content and it's not empty, consider it loaded
                if (iframe.src && iframe.src !== 'about:blank') {
                    console.log(\`Server \${currentServerIndex + 1} loaded successfully\`);
                    loading.style.display = 'none';
                }
            } catch (e) {
                // Cross-origin, but that's expected - still consider it loaded
                console.log(\`Server \${currentServerIndex + 1} loaded (cross-origin)\`);
                loading.style.display = 'none';
            }
        });
        
        // Handle iframe errors
        iframe.addEventListener('error', () => {
            console.error(\`Server \${currentServerIndex + 1} error\`);
            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }
            tryNextServer();
        });
        
        // Start loading first server
        if (servers.length === 0) {
            loading.style.display = 'none';
            error.textContent = 'No servers available';
            error.style.display = 'block';
        } else {
            loadServer(0);
        }
    </script>
</body>
</html>
`;
