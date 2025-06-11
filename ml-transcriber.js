function getSpeakerColor(speaker) {
    // Predefined colors for better visual distinction
    const colors = {
        'A': '#2196F3', // Blue
        'B': '#4CAF50', // Green
        'C': '#FF9800', // Orange
        'D': '#9C27B0', // Purple
        'E': '#F44336', // Red
        'F': '#00BCD4', // Cyan
        'G': '#FFC107', // Amber
        'H': '#795548'  // Brown
    };
    
    return colors[speaker] || '#607D8B'; // Default gray if speaker not in predefined colors
}

document.addEventListener('DOMContentLoaded', function() {
    const mlTranscriberButton = document.getElementById('ml-transcriber-button');
    const fileInput = document.getElementById('ml-transcriber-input');
    const fileNameDisplay = document.getElementById('ml-transcriber-file-name');
    const dropzone = document.getElementById('ml-transcriber-dropzone');
    const transcriptionOutput = document.getElementById('ml-transcriber-transcription-output');
    const skeletonLoading = document.querySelector('.skeleton-loading');
    const transcriptionContent = document.getElementById('ml-transcriber-transcription-content');
    const copyButton = document.getElementById('ml-transcriber-copy-button');
    const pdfButton = document.getElementById('ml-transcriber-pdf-button');

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

    async function handleFile(file) {
        const originalButtonHtml = mlTranscriberButton.innerHTML;

        // Disable action buttons during new transcription
        if (copyButton) copyButton.disabled = true;
        if (pdfButton) pdfButton.disabled = true;

        if (transcriptionOutput) {
            transcriptionOutput.style.display = 'block';
            // Clear content of transcription output area, but keep the header and skeleton
            const existingDynamicContent = transcriptionOutput.querySelectorAll('.ml-transcript-section, p.no-transcription-message, .ml-error-message');
            existingDynamicContent.forEach(node => node.remove());

            if (skeletonLoading) {
                skeletonLoading.style.display = 'block';
                skeletonLoading.classList.remove('hidden');
            }
            if (transcriptionContent) {
                transcriptionContent.style.display = 'none';
            }
        }

        fileNameDisplay.textContent = '';
        mlTranscriberButton.disabled = true;
        mlTranscriberButton.innerHTML = `<svg width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="22" height="22" rx="4" fill="#ffffff00"/><path d="M12 4v8h3l-4 4-4-4h3V4h2Zm-8 14v-2h16v2H4Z" fill="#fff"/></svg> Uploading...`;

        if (file.size > 1073741824) {
            showErrorInOutput('File size exceeds 1GB limit');
            mlTranscriberButton.disabled = false;
            mlTranscriberButton.innerHTML = originalButtonHtml;
            return;
        }

        fileNameDisplay.textContent = `Selected: ${file.name}`;

        try {
            const result = await uploadFile(file);
            if (result && result.transcript_lines) {
                currentTranscriptLines = result.transcript_lines;
                // Скрываем скелетон
                if (skeletonLoading) {
                    skeletonLoading.style.display = 'none';
                    skeletonLoading.classList.add('hidden');
                }
                // Показываем контент и рендерим транскрипцию
                if (transcriptionContent) {
                    transcriptionContent.style.display = 'block';
                }
                renderTranscription(currentTranscriptLines);
                // Включаем кнопки действий после успешной транскрипции
                if (copyButton) copyButton.disabled = false;
                if (pdfButton) pdfButton.disabled = false;
            } else {
                showErrorInOutput(`Transcription failed or empty.`);
            }
        } catch (error) {
            showErrorInOutput(error.message);
        } finally {
            mlTranscriberButton.disabled = false;
            mlTranscriberButton.innerHTML = originalButtonHtml;
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Transcription failed');
            }

            return data;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    // Function to render the transcription in the output container
    function renderTranscription(lines) {
        if (!transcriptionContent) return;

        // Remove any existing transcription content, but keep header and skeleton loader
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
    }

    // Function to display errors within the transcription output container
    function showErrorInOutput(message) {
        if (transcriptionContent) {
            // Скрываем скелетон
            if (skeletonLoading) {
                skeletonLoading.style.display = 'none';
                skeletonLoading.classList.add('hidden');
            }

            // Скрываем область загрузки
            const uploadBox = document.getElementById('ml-transcriber-upload-box');
            if (uploadBox) {
                uploadBox.style.display = 'none';
            }

            // Показываем контейнер для ошибки
            if (transcriptionOutput) {
                transcriptionOutput.style.display = 'block';
            }

            // Очищаем существующий контент
            const existingContent = transcriptionContent.querySelectorAll('.ml-transcript-section, p.no-transcription-message, .ml-error-message');
            existingContent.forEach(node => node.remove());

            // Показываем контент для ошибки
            transcriptionContent.style.display = 'block';

            // Create error container
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

            // Add click handler for Try again button
            const tryAgainButton = errorContainer.querySelector('.ml-try-again-button');
            tryAgainButton.addEventListener('click', function() {
                // Reset file input
                if (fileInput) {
                    fileInput.value = '';
                }
                // Reset file name display
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = '';
                }
                // Reset buttons
                if (copyButton) copyButton.disabled = true;
                if (pdfButton) pdfButton.disabled = true;
                // Show upload box again
                if (uploadBox) {
                    uploadBox.style.display = 'block';
                }
                // Hide transcription output area
                if (transcriptionOutput) {
                    transcriptionOutput.style.display = 'none';
                }
                // Reset skeleton loading
                if (skeletonLoading) {
                    skeletonLoading.style.display = 'none';
                    skeletonLoading.classList.add('hidden');
                }
                // Reset transcription content
                if (transcriptionContent) {
                    transcriptionContent.style.display = 'none';
                }
            });

            transcriptionContent.appendChild(errorContainer);
        }
    }

    // --- Event listener for Copy button ---
    if (copyButton) {
        copyButton.addEventListener('click', function() {
            if (!transcriptionContent) return;
            
            const header = "Made with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/\n\n";
            const footer = "\n\nMade with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/";
            
            // Собираем полную информацию о транскрипции
            const transcriptionSections = transcriptionContent.querySelectorAll('.ml-transcript-section');
            let textToCopy = header;
            transcriptionSections.forEach(section => {
                const speakerHeader = section.querySelector('.ml-speaker-header');
                const transcriptText = section.querySelector('.ml-transcript-text');
                if (speakerHeader && transcriptText) {
                    // Получаем только имя спикера (без таймкода)
                    const speakerName = speakerHeader.childNodes[0].textContent.trim();
                    // Получаем таймкод
                    const timestamp = speakerHeader.querySelector('.ml-timestamp').textContent.trim();
                    // Формируем строку
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

    // --- Event listener for PDF button ---
    if (pdfButton) {
        pdfButton.addEventListener('click', async function() {
            if (!currentTranscriptLines || currentTranscriptLines.length === 0) {
                showErrorInOutput('No transcript available to generate PDF.');
                return;
            }

            const originalHtml = pdfButton.innerHTML;
            pdfButton.disabled = true;
            pdfButton.innerHTML = '<svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 5h10v2H7V5zm0 14V9h10v10H7zm2-8h6v2H9v-2zm0 4h6v2H9v-2z"/></svg> Generating PDF...';

            try {
                // Добавляем заголовок и футер к данным для PDF
                const pdfData = {
                    header: "Made with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/",
                    footer: "Made with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/",
                    transcript_lines: currentTranscriptLines
                };

                const response = await fetch('http://localhost:8000/generate-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pdfData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'PDF generation failed');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transcript.pdf';
                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('PDF generation error:', error);
                showErrorInOutput('Failed to generate PDF: ' + error.message);
            } finally {
                pdfButton.disabled = false;
                pdfButton.innerHTML = originalHtml;
            }
        });
    }
});