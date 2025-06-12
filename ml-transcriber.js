// Define web component
class MLTranscriber extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

            :host {
                display: block;
                width: 100%;
                height: 100%;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #19223d;
            }

            #ml-transcriber-container {
                width: 100%;
                height: 100%;
                text-align: center;
                margin: 0;
            }

            #ml-transcriber-upload-box {
                width: 100%;
                height: 100%;
                margin: 0;
                border-radius: 1.5rem;
                background-color: white;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border: 1px solid #ededf2;
                padding: 1.5rem 1rem;
                box-sizing: border-box;
                overflow-y: auto;
                position: relative;
            }

            #ml-transcriber-dropzone {
                width: 100%;
                height: 100%;
                border: 2px dashed #d2d6e1;
                border-radius: 1rem;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 140px;
                background-color: #fafbfc;
                box-sizing: border-box;
            }

            #ml-transcriber-dropzone.hidden {
                display: none;
            }

            #ml-transcriber-button {
                background-color: #2468f2;
                color: white;
                border-radius: 0.75rem;
                padding: 0.75rem 2rem;
                font-size: 1rem;
                font-weight: 600;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border: none;
                cursor: pointer;
            }

            #ml-transcriber-button:hover {
                background-color: #245ee2;
            }

            #ml-transcriber-button:active {
                background-color: #1a49a3;
            }

            #ml-transcriber-input {
                display: none;
            }

            #ml-transcriber-drag-text {
                margin-top: 1rem;
                font-size: 1rem;
                color: #b4bacb;
            }

            #ml-transcriber-file-name {
                margin-top: 0.5rem;
                font-size: 0.875rem;
                color: #4b5563;
            }

            #ml-transcriber-formats {
                margin-top: 1rem;
                font-size: 0.875rem;
                color: #b4bacb;
            }

            #ml-transcriber-upgrade {
                margin-top: 0.5rem;
                font-size: 0.875rem;
            }

            #ml-transcriber-link {
                color: #2468f2;
                font-weight: 600;
                text-decoration: none;
            }

            #ml-transcriber-link:hover {
                text-decoration: underline;
            }

            #ml-transcriber-transcription-output {
                display: none;
                margin: 0;
                padding: 0 1.5rem 1.5rem 1.5rem;
                border: none;
                border-radius: 1.5rem;
                background-color: white;
                box-shadow: none;
                text-align: left;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 10;
                flex-direction: column;
                overflow: hidden;
            }

            #ml-transcriber-transcription-output.visible {
                display: flex;
            }

            #ml-transcriber-transcription-output.scrollable {
                overflow: auto;
            }

            #ml-transcriber-output-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 0;
                border-bottom: 1px solid #ededf2;
                position: sticky;
                top: 0;
                background-color: white;
                z-index: 1;
                flex-shrink: 0;
            }

            #ml-transcriber-output-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #19223d;
            }

            #ml-transcriber-output-actions {
                display: flex;
                gap: 0.5rem;
            }

            .ml-action-button {
                background-color: #e0e6f6;
                color: #2468f2;
                border-radius: 0.5rem;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                font-weight: 600;
                transition: background-color 0.2s, color 0.2s;
                display: flex;
                align-items: center;
                gap: 0.25rem;
                border: none;
                cursor: pointer;
            }

            .ml-action-button:hover {
                background-color: #d2d6e1;
                color: #1a49a3;
            }

            .ml-action-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .ml-transcript-section {
                padding: 1rem;
                margin-bottom: 1rem;
                background-color: #f8f9fa;
                border-left-width: 4px;
                border-left-style: solid;
                border-radius: 0.5rem;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }

            .ml-transcript-section:last-child {
                margin-bottom: 0;
            }

            .ml-transcript-section:hover {
                transform: translateX(5px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .ml-speaker-header {
                font-weight: bold;
                margin-bottom: 0.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: color 0.3s ease;
                font-size: 0.95rem;
            }

            .ml-timestamp {
                color: #666;
                font-size: 0.85em;
                font-weight: normal;
            }

            .ml-transcript-text {
                line-height: 1.6;
                margin: 0;
                color: #333;
                font-size: 0.9rem;
            }

            .ml-error-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1.5rem;
                padding: 2rem;
                text-align: center;
            }

            .ml-error-message {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: #dc2626;
                font-size: 1.125rem;
                font-weight: 500;
            }

            .ml-error-message i {
                font-size: 1.5rem;
            }

            .ml-try-again-button {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background-color: #2468f2;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .ml-try-again-button:hover {
                background-color: #1d4ed8;
            }

            .skeleton-loading {
                display: none;
                padding: 20px;
                overflow: hidden;
            }

            .skeleton-loading.visible {
                display: block;
            }

            .skeleton-line {
                height: 20px;
                background: #f0f0f0;
                margin-bottom: 12px;
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }

            .skeleton-line::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 255, 255, 0.8) 50%,
                    rgba(255, 255, 255, 0) 100%);
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% {
                    transform: translateX(-100%);
                }
                100% {
                    transform: translateX(100%);
                }
            }

            .hidden {
                display: none;
            }

            #ml-transcriber-transcription-content {
                display: none;
                flex: 1;
                overflow-y: auto;
                padding: 1rem 0.5rem 0 0;
                min-height: 0;
            }

            #ml-transcriber-transcription-content.visible {
                display: block;
            }
        `;

        // Create HTML structure
        const template = document.createElement('template');
        template.innerHTML = `
            <div id="ml-transcriber-container">
                <div id="ml-transcriber-upload-box">
                    <div id="ml-transcriber-dropzone">
                        <label id="ml-transcriber-label">
                            <button id="ml-transcriber-button">
                                <svg id="ml-transcriber-icon" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="22" height="22" rx="4" fill="#ffffff00"/>
                                    <path d="M12 4v8h3l-4 4-4-4h3V4h2Zm-8 14v-2h16v2H4Z" fill="#fff"/>
                                </svg>
                                Choose files
                            </button>
                            <input id="ml-transcriber-input" type="file" class="hidden">
                        </label>
                        <div id="ml-transcriber-drag-text">or drag and drop your file here</div>
                        <div id="ml-transcriber-file-name"></div>
                        <div id="ml-transcriber-formats">
                            Supported Formats: WAV, MP3, M4A, CAF, AIFF, AAC, OGG, WMA, AMR, APE, FLAC, ALAC, DS2, DSS, MP2, MKA, AU, RA, GSM, VOX, RAW, AVI, RMVB, FLV, MP4, MOV, WMV, MKV, 3GP, MPEG, MPG, TS, MTS, M2TS, WEBM, ASF, VOB, M1V, M2V, F4V;<br/>
                            Max size: 1GB; Max duration: 5 hours.
                        </div>
                        <div id="ml-transcriber-upgrade">
                            Need more transcription quota? <a href="https://minuteslink.com" target="_blank" rel="noopener noreferrer" id="ml-transcriber-link">
                                Try&nbsp;MinutesLink&nbsp;→
                            </a>
                        </div>
                    </div>
                    <div id="ml-transcriber-transcription-output">
                        <div id="ml-transcriber-output-header">
                            <span id="ml-transcriber-output-title">Your Transcription</span>
                            <div id="ml-transcriber-output-actions">
                                <button id="ml-transcriber-copy-button" class="ml-action-button">
                                    <svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 1H4c-1.1 0-2 .9-2 2v14h2V3h11V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                    Copy
                                </button>
                                <button id="ml-transcriber-pdf-button" class="ml-action-button">
                                    <svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm4-6h4v2h-4v-2zm0-4h4v2h-4V10zm0 8h4v2h-4v-2z"/></svg>
                                    PDF
                                </button>
                            </div>
                        </div>
                        <div class="skeleton-loading">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                        </div>
                        <div id="ml-transcriber-transcription-content">
                            <!-- Transcription content will be appended here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles and template to Shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const mlTranscriberButton = this.shadowRoot.getElementById('ml-transcriber-button');
        const fileInput = this.shadowRoot.getElementById('ml-transcriber-input');
        const fileNameDisplay = this.shadowRoot.getElementById('ml-transcriber-file-name');
        const dropzone = this.shadowRoot.getElementById('ml-transcriber-dropzone');
        const transcriptionOutput = this.shadowRoot.getElementById('ml-transcriber-transcription-output');
        const skeletonLoading = this.shadowRoot.querySelector('.skeleton-loading');
        const transcriptionContent = this.shadowRoot.getElementById('ml-transcriber-transcription-content');
        const copyButton = this.shadowRoot.getElementById('ml-transcriber-copy-button');
        const pdfButton = this.shadowRoot.getElementById('ml-transcriber-pdf-button');

        let currentTranscriptLines = null;

        // Initial state for buttons (disabled)
        if (copyButton) copyButton.disabled = true;
        if (pdfButton) pdfButton.disabled = true;

        if (mlTranscriberButton) {
            mlTranscriberButton.addEventListener('click', function() {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    handleFile(file);
                }
            });
        }

        if (dropzone) {
            dropzone.addEventListener('dragover', function(e) {
                e.preventDefault();
                dropzone.style.borderColor = '#2468f2';
            });

            dropzone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                dropzone.style.borderColor = '#d2d6e1';
            });

            dropzone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropzone.style.borderColor = '#d2d6e1';

                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    handleFile(file);
                }
            });
        }

        const handleFile = async (file) => {
            const originalButtonHtml = mlTranscriberButton.innerHTML;

            // Disable action buttons during new transcription
            if (copyButton) copyButton.disabled = true;
            if (pdfButton) pdfButton.disabled = true;

            // Hide dropzone and show transcription output
            if (dropzone) {
                dropzone.classList.add('hidden');
            }

            if (transcriptionOutput) {
                transcriptionOutput.classList.add('visible');
                transcriptionOutput.classList.remove('scrollable');
                
                // Clear existing content
                const existingDynamicContent = transcriptionContent.querySelectorAll('.ml-transcript-section, p.no-transcription-message, .ml-error-message');
                existingDynamicContent.forEach(node => node.remove());

                // Show skeleton, hide content
                if (skeletonLoading) {
                    skeletonLoading.classList.add('visible');
                }
                if (transcriptionContent) {
                    transcriptionContent.classList.remove('visible');
                }
            }

            fileNameDisplay.textContent = '';
            mlTranscriberButton.disabled = true;
            mlTranscriberButton.innerHTML = `<svg width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="22" height="22" rx="4" fill="#ffffff00"/><path d="M12 4v8h3l-4 4-4-4h3V4h2Zm-8 14v-2h16v2H4Z" fill="#fff"/></svg> Uploading...`;

            if (file.size > 1073741824) {
                showErrorInOutput('File size exceeds 1GB limit');
                mlTranscriberButton.disabled = false;
                mlTranscriberButton.innerHTML = originalButtonHtml;
                if (skeletonLoading) {
                    skeletonLoading.classList.remove('visible');
                }
                if (transcriptionContent) {
                    transcriptionContent.classList.add('visible');
                }
                return;
            }

            fileNameDisplay.textContent = `Selected: ${file.name}`;

            try {
                const result = await uploadFile(file);
                if (result && result.transcript_lines) {
                    currentTranscriptLines = result.transcript_lines;
                    if (skeletonLoading) {
                        skeletonLoading.classList.remove('visible');
                    }
                    if (transcriptionContent) {
                        transcriptionContent.classList.add('visible');
                        transcriptionOutput.classList.add('scrollable');
                    }
                    renderTranscription(currentTranscriptLines);
                    if (copyButton) copyButton.disabled = false;
                    if (pdfButton) pdfButton.disabled = false;
                } else {
                    showErrorInOutput(`Transcription failed or empty.`);
                    if (skeletonLoading) {
                        skeletonLoading.classList.remove('visible');
                    }
                    if (transcriptionContent) {
                        transcriptionContent.classList.add('visible');
                    }
                }
            } catch (error) {
                showErrorInOutput(error.message);
                if (skeletonLoading) {
                    skeletonLoading.classList.remove('visible');
                }
                if (transcriptionContent) {
                    transcriptionContent.classList.add('visible');
                }
            } finally {
                mlTranscriberButton.disabled = false;
                mlTranscriberButton.innerHTML = originalButtonHtml;
            }
        };

        const uploadFile = async (file) => {
            try {
                console.log('Starting file upload...', {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });

                const formData = new FormData();
                formData.append('file', file);
                formData.append('language', 'ru');

                const API_URL = 'https://widget-transcriber-backend-production.up.railway.app/transcribe';
                
                console.log('Sending request to server...', {
                    url: API_URL,
                    method: 'POST',
                    formDataKeys: Array.from(formData.keys())
                });

                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });

                console.log('Server response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server error response:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorText
                    });
                    throw new Error(`Server error: ${response.status} ${response.statusText}\n${errorText}`);
                }

                const data = await response.json();
                console.log('Transcription data received:', {
                    hasData: !!data,
                    dataKeys: data ? Object.keys(data) : null
                });

                return data;
            } catch (error) {
                console.error('Error during file upload:', {
                    error: error.message,
                    stack: error.stack
                });
                throw error;
            }
        };

        const renderTranscription = (lines) => {
            if (!transcriptionContent) return;

            const existingContent = transcriptionContent.querySelectorAll('.ml-transcript-section, p.no-transcription-message, .ml-error-message');
            existingContent.forEach(node => node.remove());

            if (lines.length === 0) {
                const noTransText = document.createElement('p');
                noTransText.className = 'no-transcription-message';
                noTransText.style.cssText = 'text-align: center; color: #888; padding: 1rem 0;';
                noTransText.textContent = 'No transcription available.';
                transcriptionContent.appendChild(noTransText);
                return;
            }

            const fragment = document.createDocumentFragment();

            lines.map(line => {
                const speaker = line.speaker.replace('Speaker ', '');
                const timestamp = line.timestamp;
                const text = line.text;
                const speakerColor = getSpeakerColor(speaker);

                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'ml-transcript-section';
                sectionDiv.style.borderLeft = `4px solid ${speakerColor}`;

                sectionDiv.innerHTML = `
                    <div class="ml-speaker-header" style="color: ${speakerColor};">
                        ${line.speaker}
                        <span class="ml-timestamp">${timestamp}</span>
                    </div>
                    <div class="ml-transcript-text">${text}</div>
                `;
                fragment.appendChild(sectionDiv);
            });

            transcriptionContent.appendChild(fragment);
        };

        const showErrorInOutput = (message) => {
            if (transcriptionContent) {
                if (skeletonLoading) {
                    skeletonLoading.classList.remove('visible');
                }

                const existingContent = transcriptionContent.querySelectorAll('.ml-transcript-section, p.no-transcription-message, .ml-error-message');
                existingContent.forEach(node => node.remove());

                transcriptionContent.classList.add('visible');

                const errorContainer = document.createElement('div');
                errorContainer.className = 'ml-error-container';
                errorContainer.innerHTML = `
                    <div class="ml-error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>${message}</span>
                    </div>
                    <button class="ml-try-again-button">
                        <svg width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.75 8.25C15.75 12.3542 12.3542 15.75 8.25 15.75C4.14583 15.75 0.75 12.3542 0.75 8.25C0.75 4.14583 4.14583 0.75 8.25 0.75C10.5625 0.75 12.6875 1.6875 14.25 3.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8.25 0.75V3.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8.25 12.75V8.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12.75 8.25H8.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Try again
                    </button>
                `;

                const tryAgainButton = errorContainer.querySelector('.ml-try-again-button');
                tryAgainButton.addEventListener('click', function() {
                    if (fileInput) {
                        fileInput.value = '';
                    }
                    if (fileNameDisplay) {
                        fileNameDisplay.textContent = '';
                    }
                    if (copyButton) copyButton.disabled = true;
                    if (pdfButton) pdfButton.disabled = true;
                    errorContainer.remove();
                    if (transcriptionOutput) {
                        transcriptionOutput.classList.remove('visible');
                    }
                    if (dropzone) {
                        dropzone.classList.remove('hidden');
                    }
                    if (skeletonLoading) {
                        skeletonLoading.classList.remove('visible');
                    }
                    if (transcriptionContent) {
                        transcriptionContent.classList.remove('visible');
                    }
                });

                transcriptionContent.appendChild(errorContainer);
            }
        };

        if (copyButton) {
            copyButton.addEventListener('click', function() {
                if (!transcriptionContent) return;
                
                const header = "Made with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/\n\n";
                const footer = "\n\nMade with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/";
                
                const transcriptionSections = transcriptionContent.querySelectorAll('.ml-transcript-section');
                let textToCopy = header;
                transcriptionSections.forEach(section => {
                    const speakerHeader = section.querySelector('.ml-speaker-header');
                    const transcriptText = section.querySelector('.ml-transcript-text');
                    if (speakerHeader && transcriptText) {
                        const speakerName = speakerHeader.childNodes[0].textContent.trim();
                        const timestamp = speakerHeader.querySelector('.ml-timestamp').textContent.trim();
                        textToCopy += `${speakerName} [${timestamp}]\n${transcriptText.textContent.trim()}\n\n`;
                    }
                });
                textToCopy += footer;

                navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                    const originalHtml = copyButton.innerHTML;
                    copyButton.innerHTML = '<svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = originalHtml;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    showErrorInOutput('Failed to copy transcription.');
                });
            });
        }
    }
}

// Register web component
customElements.define('ml-transcriber', MLTranscriber);

// Function to get speaker color
function getSpeakerColor(speaker) {
    const colors = {
        'A': '#2196F3',
        'B': '#4CAF50',
        'C': '#FF9800',
        'D': '#9C27B0',
        'E': '#F44336',
        'F': '#00BCD4',
        'G': '#FFC107',
        'H': '#795548'
    };
    
    return colors[speaker] || '#607D8B';
}
