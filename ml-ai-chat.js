// Include marked.js library for Markdown rendering
const marked = (() => {
    // Create script to load marked.js
    if (!window.marked) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked@9.1.2/marked.min.js';
        script.async = false;
        document.head.appendChild(script);
        
        // Return promise that will resolve when library loads
        return new Promise((resolve) => {
            script.onload = () => resolve(window.marked);
        });
    }
    return Promise.resolve(window.marked);
})();

class MLAIChat extends HTMLElement {
    constructor() {
        super();
        
        // Create Shadow DOM for style isolation
        this.attachShadow({ mode: 'open' });
        
        // State initialization
        this.sessionId = null;
        this.messages = [];
        this.isInitialized = false;
        this.currentState = 'idle'; // idle, loading, answer
        
        // Fixed backend URL (not a parameter)
        this.backendUrl = 'https://widget-chat-with-page-backend-production-dca7.up.railway.app';
        
        // Parse parameters from params attribute
        this.params = this.parseParams(this.getAttribute('params') || '');
        
        // Try to restore session or create new one
        this.initializeSession();
        
        // Create interface
        this.render();
        this.attachEventListeners();
        
        // Restore messages if available
        this.restoreMessages();
        
        // Show widget
        this.style.display = 'block';
    }
    
    parseParams(paramsString) {
        const params = {};
        if (!paramsString.trim()) {
            return params;
        }

        // Regular expression to match _paramName=value patterns
        // Supports spaces around = and quoted values
        const regex = /(_\w+)\s*=\s*([^_]+?)(?=\s+_\w+\s*=|$)/g;
        let match;

        while ((match = regex.exec(paramsString)) !== null) {
            const paramName = match[1]; // includes _
            const paramValue = match[2].trim(); // remove extra spaces
            params[paramName] = paramValue;
        }

        console.log('📋 [ML-AI-Chat] Parsed params:', params);
        return params;
    }
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    initializeSession() {
        // Always create new session when page loads
        this.sessionId = this.generateUUID();
        console.log(`🆕 [ML-AI-Chat] Created new session: ${this.sessionId}`);
        
        // Clear old sessions from sessionStorage
        this.cleanupOldSessions();
    }
    
    cleanupOldSessions() {
        // Clear all old sessions from sessionStorage
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('ml-ai-chat-')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`🧹 [ML-AI-Chat] Cleaned ${keysToRemove.length} old sessions`);
        }
    }
    
    restoreMessages() {
        // For new session always generate welcome message
        console.log('📭 [ML-AI-Chat] New session, generating welcome message...');
        this.generateWelcome();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --ml-chat-bg: #ffffff;
                    --ml-chat-surface: #fbfbfb;
                    --ml-chat-border: #e0e0e0;
                    --ml-chat-text: #0c0c0c;
                    --ml-chat-text-secondary: #656565;
                    --ml-chat-user-bg: rgb(19, 113, 255);
                    --ml-chat-user-text: #ffffff;
                    --ml-chat-assistant-bg: #ffffff;
                    --ml-chat-button-bg: rgb(19, 113, 255);
                    --ml-chat-button-hover: rgba(19, 113, 255, 0.8);
                    --ml-chat-input-bg: #f5f5f7;
                    --ml-chat-input-focus: #e8e8ed;
                    --ml-chat-suggestion-bg: #f0f0f0;
                    --ml-chat-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
                    --ml-chat-shadow-light: 0 1px 3px rgba(0, 0, 0, 0.04);
                    --ml-chat-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
                    
                    /* Widget takes 100% of parent container */
                    width: 100%;
                    height: 100%;
                    background: var(--ml-chat-bg);
                    border: 1px solid var(--ml-chat-border);
                    border-radius: 12px;
                    font-family: var(--ml-chat-font);
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--ml-chat-shadow);
                    overflow: hidden;
                }
                
                .chat-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--ml-chat-border);
                    background: var(--ml-chat-surface);
                    border-radius: 12px 12px 0 0;
                    text-align: center;
                    position: relative;
                    backdrop-filter: blur(10px);
                }
                
                .chat-title {
                    font-weight: 400;
                    color: var(--ml-chat-text);
                    font-size: 1.625rem;
                    margin: 0;
                    letter-spacing: -0.4px;
                }
                
                .clear-btn {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    font-size: 1.625rem;
                    color: var(--ml-chat-text-secondary);
                    transition: all 0.2s ease;
                }
                
                .clear-btn:hover {
                    background: var(--ml-chat-input-bg);
                    color: var(--ml-chat-text);
                    transform: translateY(-50%) scale(1.1);
                }
                
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    scroll-behavior: smooth;
                    min-height: 0;
                }
                
                .chat-messages::-webkit-scrollbar {
                    width: 6px;
                }
                
                .chat-messages::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .chat-messages::-webkit-scrollbar-thumb {
                    background: var(--ml-chat-border);
                    border-radius: 3px;
                }
                
                .chat-messages::-webkit-scrollbar-thumb:hover {
                    background: var(--ml-chat-text-secondary);
                }
                
                .message {
                    padding: 16px 24px;
                    position: relative;
                }
                
                .message-user {
                    background: transparent;
                    display: flex;
                    justify-content: flex-end;
                    padding: 8px 24px;
                }
                
                .message-ai {
                    background: transparent;
                    padding: 16px 24px;
                }
                
                .message-content {
                    word-wrap: break-word;
                    font-size: 1.25rem;
                    line-height: 1.6;
                    color: var(--ml-chat-text);
                    margin: 0;
                    font-weight: 400;
                    letter-spacing: -0.2px;
                }
                
                .message-user .message-content {
                    background: var(--ml-chat-user-bg);
                    color: var(--ml-chat-user-text);
                    border-radius: 18px;
                    padding: 12px 16px;
                    max-width: 75%;
                    font-weight: 400;
                    display: inline-block;
                    box-shadow: var(--ml-chat-shadow-light);
                }
                
                .message-ai .message-content {
                    white-space: normal;
                    max-width: 100%;
                    padding: 0;
                }
                
                /* Styles for Markdown elements */
                .message-content h1,
                .message-content h2,
                .message-content h3,
                .message-content h4,
                .message-content h5,
                .message-content h6 {
                    color: var(--ml-chat-text);
                    margin: 16px 0 8px 0;
                    font-weight: 400;
                    line-height: 1.4;
                }
                
                .message-content h1 { font-size: 2.5rem; }
                .message-content h2 { font-size: 2.25rem; }
                .message-content h3 { font-size: 2rem; }
                .message-content h4 { font-size: 1.875rem; }
                .message-content h5 { font-size: 1.75rem; }
                .message-content h6 { font-size: 1.625rem; }
                
                .message-content p {
                    margin: 8px 0;
                    line-height: 1.6;
                }
                
                .message-content ul,
                .message-content ol {
                    margin: 8px 0;
                    padding-left: 20px;
                }
                
                .message-content li {
                    margin: 4px 0;
                    line-height: 1.5;
                }
                
                .message-content code {
                    background: var(--ml-chat-input-bg);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    font-size: 1.625rem;
                    color: var(--ml-chat-text);
                    border: 1px solid var(--ml-chat-border);
                }
                
                .message-content pre {
                    background: var(--ml-chat-input-bg);
                    padding: 12px;
                    border-radius: 8px;
                    margin: 12px 0;
                    overflow-x: auto;
                    border: 1px solid var(--ml-chat-border);
                }
                
                .message-content pre code {
                    background: transparent;
                    padding: 0;
                    border: none;
                    border-radius: 0;
                }
                
                .message-content blockquote {
                    border-left: 3px solid var(--ml-chat-user-bg);
                    margin: 12px 0;
                    padding: 8px 16px;
                    background: var(--ml-chat-input-bg);
                    color: var(--ml-chat-text-secondary);
                    border-radius: 0 8px 8px 0;
                    font-style: italic;
                }
                
                .message-content strong,
                .message-content b {
                    font-weight: 400;
                    color: var(--ml-chat-text);
                }
                
                .message-content em,
                .message-content i {
                    font-style: italic;
                }
                
                .message-content a {
                    color: var(--ml-chat-user-bg);
                    text-decoration: none;
                    border-bottom: 1px solid transparent;
                    transition: border-color 0.2s ease;
                }
                
                .message-content a:hover {
                    border-bottom-color: var(--ml-chat-user-bg);
                }
                
                .message-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12px 0;
                    font-size: 1.625rem;
                }
                
                .message-content table th,
                .message-content table td {
                    border: 1px solid var(--ml-chat-border);
                    padding: 8px 12px;
                    text-align: left;
                }
                
                .message-content table th {
                    background: var(--ml-chat-input-bg);
                    font-weight: 400;
                }
                
                .message-content hr {
                    border: none;
                    border-top: 1px solid var(--ml-chat-border);
                    margin: 16px 0;
                }
                
                .suggestions {
                    padding: 8px 24px 16px;
                    background: transparent;
                    display: none;
                    gap: 10px;
                    flex-direction: column;
                }
                
                .suggestions.show {
                    display: flex;
                }
                
                .suggestion-btn {
                    text-align: left;
                    padding: 14px 16px;
                    background: var(--ml-chat-suggestion-bg);
                    border: 1px solid transparent;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1.625rem;
                    color: var(--ml-chat-text);
                    transition: all 0.2s ease;
                    font-family: inherit;
                    font-weight: 400;
                    letter-spacing: -0.2px;
                }
                
                .suggestion-btn:hover {
                    background: var(--ml-chat-input-focus);
                    transform: translateY(-1px);
                    box-shadow: var(--ml-chat-shadow-light);
                }
                
                .chat-input-area {
                    padding: 16px 20px 20px;
                    border-top: 1px solid var(--ml-chat-border);
                    background: var(--ml-chat-surface);
                    border-radius: 0 0 12px 12px;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 10;
                }
                
                .input-group {
                    position: relative;
                    background: var(--ml-chat-input-bg);
                    border: 1px solid transparent;
                    border-radius: 16px;
                    padding: 12px 50px 12px 16px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                }
                
                .input-group:focus-within {
                    background: var(--ml-chat-input-focus);
                    border-color: var(--ml-chat-border);
                    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.04);
                }
                
                .chat-input {
                    border: none;
                    outline: none;
                    background: transparent;
                    width: 100%;
                    font-size: 1.625rem;
                    color: var(--ml-chat-text);
                    font-family: inherit;
                    resize: none;
                    line-height: 1.4;
                    max-height: 120px;
                    overflow-y: auto;
                }
                
                .chat-input::placeholder {
                    color: var(--ml-chat-text-secondary);
                }
                
                .send-btn {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 28px;
                    height: 28px;
                    background: var(--ml-chat-button-bg);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                
                .send-btn:hover:not(:disabled) {
                    background: var(--ml-chat-button-hover);
                    transform: translateY(-50%) scale(1.05);
                }
                
                .send-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                    transform: translateY(-50%);
                }
                
                .loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--ml-chat-text);
                    opacity: 0.7;
                    font-size: 14px;
                }
                
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--ml-chat-border);
                    border-top: 2px solid var(--ml-chat-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Skeleton message */
                .skeleton-message {
                    background: transparent;
                    padding: 16px 24px;
                }
                
                .skeleton-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .skeleton-lines {
                    flex: 1;
                }
                
                .skeleton-line {
                    height: 14px;
                    background: linear-gradient(90deg, var(--ml-chat-input-bg) 25%, var(--ml-chat-border) 50%, var(--ml-chat-input-bg) 75%);
                    background-size: 200% 100%;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    animation: shimmer 2s infinite;
                }
                
                .skeleton-line:last-child {
                    margin-bottom: 0;
                    width: 65%;
                }
                
                @keyframes shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
                
                .welcome-message {
                    text-align: center;
                    color: var(--ml-chat-text-secondary);
                    font-size: 15px;
                    padding: 40px 24px;
                    background: var(--ml-chat-assistant-bg);
                    font-weight: 400;
                    letter-spacing: -0.2px;
                }
                
                /* Responsiveness - only content adjustments, no size changes */
                @media (max-width: 768px) {
                    .message {
                        padding: 12px 16px;
                    }
                    
                    .message-user {
                        padding: 6px 16px;
                    }
                    
                    .message-user .message-content {
                        max-width: 85%;
                    }
                    
                    .chat-input-area {
                        padding: 12px 16px 16px;
                    }
                    
                    .chat-input {
                        font-size: 1.125rem;
                    }
                    
                    .suggestions {
                        padding: 0 20px 16px;
                    }
                    
                    .chat-title {
                        font-size: 1.125rem;
                    }
                    
                    .clear-btn {
                        font-size: 1.125rem;
                    }
                    
                    .message-content {
                        font-size: .875rem;
                    }
                    
                    .message-content h1 { font-size: 1.75rem; }
                    .message-content h2 { font-size: 1.625rem; }
                    .message-content h3 { font-size: 1.5rem; }
                    .message-content h4 { font-size: 1.375rem; }
                    .message-content h5 { font-size: 1.25rem; }
                    .message-content h6 { font-size: 1.125rem; }
                    
                    .message-content code {
                        font-size: 1.125rem;
                    }
                    
                    .message-content table {
                        font-size: 1.125rem;
                    }
                    
                    .suggestion-btn {
                        font-size: 1.125rem;
                    }
                }
                
                /* Dark theme in Apple style */
                @media (prefers-color-scheme: dark) {
                    :host {
                        --ml-chat-bg: #1c1c1e;
                        --ml-chat-surface: #2c2c2e;
                        --ml-chat-border: #38383a;
                        --ml-chat-text: #ffffff;
                        --ml-chat-text-secondary: #8e8e93;
                        --ml-chat-user-bg: #007aff;
                        --ml-chat-user-text: #ffffff;
                        --ml-chat-assistant-bg: #1c1c1e;
                        --ml-chat-button-bg: #007aff;
                        --ml-chat-button-hover: #0056cc;
                        --ml-chat-input-bg: #3a3a3c;
                        --ml-chat-input-focus: #48484a;
                        --ml-chat-suggestion-bg: #2c2c2e;
                        --ml-chat-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
                        --ml-chat-shadow-light: 0 1px 3px rgba(0, 0, 0, 0.2);
                    }
                    
                    .scroll-to-bottom {
                        background: rgba(44, 44, 46, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
                    }
                    
                    .scroll-to-bottom:hover {
                        background: rgba(44, 44, 46, 0.6);
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                    }
                    
                    .scroll-to-bottom svg {
                        fill: rgba(142, 142, 147, 0.8);
                    }
                    
                    .scroll-to-bottom:hover svg {
                        fill: rgba(255, 255, 255, 0.9);
                    }
                    
                    /* Dark theme for Markdown elements */
                    .message-content code {
                        background: #3a3a3c;
                        border-color: #48484a;
                        color: #ffffff;
                    }
                    
                    .message-content pre {
                        background: #3a3a3c;
                        border-color: #48484a;
                    }
                    
                    .message-content blockquote {
                        background: #3a3a3c;
                        border-left-color: #007aff;
                        color: #8e8e93;
                    }
                    
                    .message-content table th {
                        background: #3a3a3c;
                    }
                    
                    .message-content table th,
                    .message-content table td {
                        border-color: #48484a;
                    }
                    
                    .message-content hr {
                        border-top-color: #48484a;
                    }
                }
                
                /* Chat container */
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: relative;
                }
                
                /* Messages area - stretches and scrolls */
                .chat-messages-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0; /* Important for correct flex shrinking */
                    overflow: hidden;
                }
                
                /* Scroll to bottom button */
                .scroll-to-bottom {
                    position: absolute;
                    bottom: 96px; /* Increased offset to not interfere with input area */
                    left: 50%;
                    transform: translateX(-50%);
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .scroll-to-bottom:hover {
                    transform: translateX(-50%) translateY(-2px);
                    background: rgba(255, 255, 255, 0.6);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                
                .scroll-to-bottom.show {
                    display: flex;
                }
                
                .scroll-to-bottom svg {
                    width: 16px;
                    height: 16px;
                    fill: rgba(102, 102, 102, 0.8);
                    transition: fill 0.2s ease;
                }
                
                .scroll-to-bottom:hover svg {
                    fill: rgba(51, 51, 51, 0.9);
                }
            </style>
            
            <div class="chat-container">
                <div class="chat-header">
                                            <h3 class="chat-title">💬 Chat with page</h3>
                    <button class="clear-btn" id="clearBtn" title="Start new dialog">🗑️</button>
                </div>
                
                <div class="chat-messages-wrapper">
                    <div class="chat-messages" id="messages">
                        <!-- Welcome message will be generated automatically -->
                    </div>
                    <button class="scroll-to-bottom" id="scrollToBottom" title="Scroll to bottom of dialog">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="chat-input-area">
                    <div class="input-group">
                        <textarea 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Write your question..."
                            rows="1"
                        ></textarea>
                        <button class="send-btn" id="sendBtn" title="Send">
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const sendBtn = this.shadowRoot.getElementById('sendBtn');
        const chatInput = this.shadowRoot.getElementById('chatInput');
        const clearBtn = this.shadowRoot.getElementById('clearBtn');
        
        // Send message
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter for sending, Shift+Enter for new line
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-adjust textarea height
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
        });
        
        // Clear history
        clearBtn.addEventListener('click', () => this.clearHistory());
        
        // Scroll to bottom button
        const scrollToBottomBtn = this.shadowRoot.getElementById('scrollToBottom');
        scrollToBottomBtn.addEventListener('click', () => this.scrollToBottom());
        
        // Scroll listener to show/hide button
        const messagesContainer = this.shadowRoot.getElementById('messages');
        messagesContainer.addEventListener('scroll', () => this.handleScroll());
    }
    
    async sendMessage(messageText = null) {
        const chatInput = this.shadowRoot.getElementById('chatInput');
        const message = messageText || chatInput.value.trim();
        
        if (!message) return;
        
        // Clear input field
        if (!messageText) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        
        // Add user message
        await this.addMessage(message, 'user');
        
        // Hide all suggestions
        this.hideAllSuggestions();
        
        // Show skeleton and set loading state
        this.showSkeleton();
        this.setState('loading');
        
        try {
            const response = await this.callAPI(message);
            
            // Remove skeleton and add AI answer with suggested questions
            this.removeSkeleton();
            await this.addMessage(response.answer, 'ai', true, response.suggested);
            
            this.setState('answer');
            
        } catch (error) {
            console.error('API error:', error);
            this.removeSkeleton();
            await this.addMessage('Sorry, an error occurred. Please try again.', 'ai');
            this.setState('idle');
        }
    }
    
    extractPageContent() {
        console.log('🔍 [ML-AI-Chat] Extracting page content...');
        
        // Extract text from the entire page, excluding scripts and styles
        const content = document.cloneNode(true);
        
        // Remove unnecessary elements
        const elementsToRemove = content.querySelectorAll('script, style, noscript, meta, link, title');
        console.log(`🧹 [ML-AI-Chat] Removing ${elementsToRemove.length} unnecessary elements`);
        elementsToRemove.forEach(el => el.remove());
        
        // Remove our chat widget so it doesn't get into context
        const chatWidgets = content.querySelectorAll('ml-ai-chat');
        console.log(`🤖 [ML-AI-Chat] Removing ${chatWidgets.length} chat widgets`);
        chatWidgets.forEach(el => el.remove());
        
        // Get clean text
        const text = content.body ? content.body.innerText : content.innerText;
        
        // Clean up extra spaces and line breaks
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const finalText = cleanText.substring(0, 20000);
        
        console.log(`📝 [ML-AI-Chat] Extracted page text:`, {
            originalLength: text.length,
            cleanedLength: cleanText.length,
            finalLength: finalText.length,
            truncated: cleanText.length > 20000,
            preview: finalText.substring(0, 200) + '...'
        });
        
        return finalText;
    }

    async generateWelcome() {
        console.log('👋 [ML-AI-Chat] Generating welcome message...');
        
        // Remove static welcome message
        const welcomeMsg = this.shadowRoot.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        // 1. Show immediately hardcoded welcome message
        await this.addMessage("Hey! I can help with anything on this page. Just a sec — grabbing a quick summary.", 'ai', false);
        
        // 2. Show skeleton for second message
        this.showSkeleton();
        
        // 3. Now ask for personalized welcome
        this.setState('loading');
        
        try {
            const payload = {
                session_id: this.sessionId,
                page_url: window.location.href,
                page_content: this.extractPageContent(),
                params: this.params
            };
            
            console.log('📤 [ML-AI-Chat] Sending request for welcome message generation:', {
                session_id: payload.session_id,
                page_url: payload.page_url,
                contentLength: payload.page_content.length,
                params: payload.params
            });
            
            const response = await fetch(`${this.backendUrl}/welcome`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Remove skeleton
            this.removeSkeleton();
            
            // Add welcome message with questions
            await this.addMessage(data.answer, 'ai', true, data.suggested);
            
            // Update message history (save both welcomes)
            this.messages = [
                { role: 'assistant', content: "Hi! I'm your AI assistant." },
                { role: 'assistant', content: data.answer, suggested: data.suggested }
            ];
            this.isInitialized = true;
            
            // Save to sessionStorage
            this.saveToStorage();
            
            this.setState('idle');
            
            console.log('✅ [ML-AI-Chat] Welcome message loaded and saved');
            
        } catch (error) {
            console.error('❌ [ML-AI-Chat] Welcome loading error:', error);
            
            // Remove skeleton
            this.removeSkeleton();
            
            // Fallback - show standard welcome
            const fallbackSuggestions = [
                'What is this page about?',
                'What is the main topic here?',
                'What is the most interesting thing on this page?'
            ];
            await this.addMessage('I\'m ready to answer any questions about the content of this page!', 'ai', true, fallbackSuggestions);
            
            // Set as not initialized so fallback logic works in callAPI
            this.isInitialized = false;
            
            this.setState('idle');
        }
    }

    async callAPI(message) {
        const payload = {
            session_id: this.sessionId,
            page_url: window.location.href,
            message: message,
            init: !this.isInitialized,
            messages: this.isInitialized ? this.messages : null,
            params: this.params
        };
        
        // Check initialization - if this is first user message after welcome messages
        const isFirstUserMessage = this.isInitialized && 
                                  this.messages.length === 2 && 
                                  this.messages.every(msg => msg.role === 'assistant');
        
        if (isFirstUserMessage) {
            // First user request after welcome - context is already saved in backend
            payload.init = true;
            console.log('📤 [ML-AI-Chat] First user request after welcome:', {
                session_id: payload.session_id,
                message: payload.message,
                init: payload.init,
                messagesCount: payload.messages ? payload.messages.length : 0,
                params: payload.params
            });
        } else if (!this.isInitialized) {
            // Case when welcome wasn't loaded (fallback)
            payload.page_content = this.extractPageContent();
            console.log('📤 [ML-AI-Chat] Fallback: first request with page context:', {
                session_id: payload.session_id,
                page_url: payload.page_url,
                message: payload.message,
                init: payload.init,
                contentLength: payload.page_content.length,
                params: payload.params
            });
        } else {
            console.log('📤 [ML-AI-Chat] Regular request:', {
                session_id: payload.session_id,
                message: payload.message,
                init: payload.init,
                messagesCount: payload.messages ? payload.messages.length : 0,
                params: payload.params
            });
        }
        
        const response = await fetch(`${this.backendUrl}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update message history
        if (isFirstUserMessage || !this.isInitialized) {
            // If this is the first user request after welcome or fallback
            this.messages.push(
                { role: 'user', content: message },
                { role: 'assistant', content: data.answer, suggested: data.suggested }
            );
            this.isInitialized = true;
        } else {
            // Regular subsequent messages
            this.messages.push(
                { role: 'user', content: message },
                { role: 'assistant', content: data.answer, suggested: data.suggested }
            );
        }
        
        // Save to sessionStorage
        this.saveToStorage();
        
        return data;
    }
    
    async addMessage(text, type, shouldScroll = true, suggestions = null) {
        const messagesContainer = this.shadowRoot.getElementById('messages');
        
        // Remove welcome message for first message
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // For AI messages use Markdown rendering
        if (type === 'ai') {
            try {
                // Wait for marked library to load if it's not already
                const markedLib = await marked;
                
                // Configure marked for safe rendering
                markedLib.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: false,
                    mangle: false
                });
                
                // Render Markdown to HTML
                const renderedHtml = markedLib.parse(text);
                contentDiv.innerHTML = renderedHtml;
            } catch (error) {
                console.warn('❌ [ML-AI-Chat] Markdown rendering error:', error);
                // Fallback to plain text
                contentDiv.textContent = text;
            }
        } else {
            // For user messages use plain text
            contentDiv.textContent = text;
        }
        
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        
        // If this is an AI message and there are suggested questions, add them immediately after the message
        if (type === 'ai' && suggestions && suggestions.length > 0) {
            this.addSuggestionsToMessage(messagesContainer, suggestions);
        }
        
        // Scroll down only if needed
        if (shouldScroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Check scroll state after adding message
        setTimeout(() => this.handleScroll(), 100);
    }
    
    addSuggestionsToMessage(container, questions) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'suggestions show';
        
        questions.forEach(question => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = question;
            btn.addEventListener('click', () => {
                // Hide all questions when clicked
                this.hideAllSuggestions();
                this.sendMessage(question);
            });
            suggestionsDiv.appendChild(btn);
        });
        
        container.appendChild(suggestionsDiv);
    }
    
    showSuggestions(questions) {
        // This method is no longer used, as questions are added directly to messages
        // Leaving for backward compatibility
    }
    
    hideSuggestions() {
        // Method is no longer used, replaced with hideAllSuggestions
    }
    
    hideAllSuggestions() {
        const messagesContainer = this.shadowRoot.getElementById('messages');
        const allSuggestions = messagesContainer.querySelectorAll('.suggestions');
        allSuggestions.forEach(suggestions => {
            suggestions.style.display = 'none';
        });
    }
    
    setState(state) {
        this.currentState = state;
        const sendBtn = this.shadowRoot.getElementById('sendBtn');
        const chatInput = this.shadowRoot.getElementById('chatInput');
        
        switch (state) {
            case 'loading':
                sendBtn.disabled = true;
                // Input field remains active, disable only button
                sendBtn.innerHTML = '➤';
                break;
            case 'idle':
            case 'answer':
                sendBtn.disabled = false;
                chatInput.disabled = false;
                sendBtn.innerHTML = '➤';
                break;
        }
    }
    
    showSkeleton() {
        const messagesContainer = this.shadowRoot.getElementById('messages');
        
        const skeletonDiv = document.createElement('div');
        skeletonDiv.className = 'skeleton-message';
        skeletonDiv.id = 'skeleton-message';
        
        skeletonDiv.innerHTML = `
            <div class="skeleton-content">
                <div class="skeleton-lines">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(skeletonDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Check scroll state after adding skeleton
        setTimeout(() => this.handleScroll(), 100);
    }
    
    removeSkeleton() {
        const skeleton = this.shadowRoot.getElementById('skeleton-message');
        if (skeleton) {
            skeleton.remove();
            // Check scroll state after removing skeleton
            setTimeout(() => this.handleScroll(), 100);
        }
    }
    
    saveToStorage() {
        // Saving disabled - new session on reload
        // Leaving method for backward compatibility
        console.log('💾 [ML-AI-Chat] Saving to sessionStorage disabled (new session on reload)');
    }
    
    loadFromStorage() {
        // Loading disabled - new session on reload
        return false;
    }
    
    handleScroll() {
        const messagesContainer = this.shadowRoot.getElementById('messages');
        const scrollToBottomBtn = this.shadowRoot.getElementById('scrollToBottom');
        
        // Check if user scrolled enough from bottom
        const scrollTop = messagesContainer.scrollTop;
        const scrollHeight = messagesContainer.scrollHeight;
        const clientHeight = messagesContainer.clientHeight;
        
        // Get widget height as threshold value
        const widgetHeight = this.offsetHeight;
        
        // If user scrolled more than widget height from bottom, show button
        const isScrolledUp = scrollHeight - scrollTop - clientHeight > widgetHeight;
        
        if (isScrolledUp) {
            scrollToBottomBtn.classList.add('show');
        } else {
            scrollToBottomBtn.classList.remove('show');
        }
    }
    
    scrollToBottom() {
        const messagesContainer = this.shadowRoot.getElementById('messages');
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    clearHistory() {
        if (confirm('Clear dialog history and start new conversation?')) {
            // Clear state
            this.messages = [];
            this.isInitialized = false;
            
            // Create new session
            this.sessionId = this.generateUUID();
            
            // Clear storage
            this.saveToStorage();
            
            // Clear interface
            const messagesContainer = this.shadowRoot.getElementById('messages');
            messagesContainer.innerHTML = '';
            
            // Hide all suggestions
            this.hideAllSuggestions();
            
            // Generate new welcome
            console.log('🧹 [ML-AI-Chat] History cleared, new session created:', this.sessionId);
            this.generateWelcome();
        }
    }
}

// Register web component
customElements.define('ml-ai-chat', MLAIChat);

// Automatic initialization removed - widget now added manually in HTML

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLAIChat;
} 
