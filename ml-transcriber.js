// MinutesLink Transcriber Web Component (fixed version)
// Drop‑in JS file: import once on the page, then use <ml-transcriber></ml-transcriber>

class MLTranscriber extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cleanupFns = [];
  }

  // ===== lifecycle hooks =====
  connectedCallback() {
    this.render();
    this.initEventListeners();
  }

  disconnectedCallback() {
    // remove all listeners to avoid leaks if the element is detached
    this._cleanupFns.forEach((fn) => fn());
  }

  // ===== render shadow DOM =====
  render() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      /* icon font for error state */
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #19223d;
      }
      /* --- container & boxes (unchanged) --- */
      #ml-transcriber-container{width:100%;height:100%;text-align:center;margin:0}
      #ml-transcriber-upload-box{width:100%;height:100%;margin:0;border-radius:1.5rem;background:#fff;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05);border:1px solid #ededf2;padding:1.5rem 1rem;box-sizing:border-box;overflow-y:auto;position:relative}
      #ml-transcriber-dropzone{width:100%;height:100%;border:2px dashed #d2d6e1;border-radius:1rem;padding:1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:140px;background:#fafbfc;box-sizing:border-box}
      #ml-transcriber-dropzone.dragover{border-color:#2468f2;background:#f0f4ff}
      #ml-transcriber-button{background:#2468f2;color:#fff;border-radius:.75rem;padding:.75rem 2rem;font-size:1rem;font-weight:600;display:flex;align-items:center;gap:.5rem;border:none;cursor:pointer;transition:background .2s}
      #ml-transcriber-button:hover{background:#245ee2}
      #ml-transcriber-button:active{background:#1a49a3}
      #ml-transcriber-input{display:none}
      #ml-transcriber-drag-text{margin-top:1rem;font-size:1rem;color:#b4bacb}
      #ml-transcriber-file-name{margin-top:.5rem;font-size:.875rem;color:#4b5563}
      #ml-transcriber-formats{margin-top:1rem;font-size:.875rem;color:#b4bacb}
      #ml-transcriber-upgrade{margin-top:.5rem;font-size:.875rem}
      #ml-transcriber-link{color:#2468f2;font-weight:600;text-decoration:none}
      #ml-transcriber-link:hover{text-decoration:underline}
      /* output panel */
      #ml-transcriber-transcription-output{display:none;position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;background:#fff;border-radius:1.5rem;box-shadow:none;overflow:hidden;box-sizing:border-box}
      #ml-transcriber-output-header{display:flex;justify-content:space-between;align-items:center;padding:1rem;border-bottom:1px solid #ededf2;position:sticky;top:0;background:#fff;z-index:1}
      #ml-transcriber-output-title{font-size:1.25rem;font-weight:600;color:#19223d}
      #ml-transcriber-output-actions{display:flex;gap:.5rem}
      .ml-action-button{background:#e0e6f6;color:#2468f2;border-radius:.5rem;padding:.5rem 1rem;font-size:.875rem;font-weight:600;display:flex;align-items:center;gap:.25rem;border:none;cursor:pointer;transition:background .2s,color .2s}
      .ml-action-button:hover{background:#d2d6e1;color:#1a49a3}
      .ml-action-button:disabled{opacity:.6;cursor:not-allowed}
      /* transcript */
      #ml-transcriber-transcription-content{height:calc(100% - 3.5rem);overflow-y:auto;padding:1rem 1.5rem 1.5rem;box-sizing:border-box}
      .ml-transcript-section{padding:1rem;margin-bottom:1rem;background:#f8f9fa;border-left:4px solid transparent;border-radius:.5rem;transition:transform .3s,box-shadow .3s}
      .ml-transcript-section:hover{transform:translateX(5px);box-shadow:0 2px 8px rgba(0,0,0,.1)}
      .ml-speaker-header{font-weight:700;margin-bottom:.5rem;display:flex;justify-content:space-between;font-size:.95rem}
      .ml-timestamp{color:#666;font-size:.85em;font-weight:400}
      .ml-transcript-text{line-height:1.6;margin:0;color:#333;font-size:.9rem}
      /* skeleton */
      .skeleton-loading{padding:20px;display:none}
      .skeleton-loading:not(.hidden){display:block}
      .skeleton-line{height:20px;background:#f0f0f0;margin-bottom:12px;border-radius:4px;position:relative;overflow:hidden}
      .skeleton-line::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(255,255,255,0)0%,rgba(255,255,255,.8)50%,rgba(255,255,255,0)100%);animation:shimmer 1.5s infinite}
      @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
      /* error */
      .ml-error-container{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;padding:2rem;text-align:center}
      .ml-error-message{display:flex;align-items:center;gap:.75rem;color:#dc2626;font-size:1.125rem;font-weight:500}
      .ml-try-again-button{display:flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;background:#2468f2;color:#fff;border:none;border-radius:.5rem;font-size:1rem;font-weight:500;cursor:pointer;transition:background .2s}
      .ml-try-again-button:hover{background:#1d4ed8}
    `;

    const template = document.createElement('template');
    template.innerHTML = this.getTemplateHTML();

    this.shadowRoot.append(style, template.content.cloneNode(true));

    // easier access to frequently used nodes
    this.$ = (sel) => this.shadowRoot.getElementById(sel);
  }

  // ===== template HTML =====
  getTemplateHTML() {
    return `
      <div id="ml-transcriber-container">
        <div id="ml-transcriber-upload-box">
          <div id="ml-transcriber-dropzone">
            <label>
              <button id="ml-transcriber-button">
                <svg width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="22" height="22" rx="4" fill="#ffffff00"/><path d="M12 4v8h3l-4 4-4-4h3V4h2Zm-8 14v-2h16v2H4Z" fill="#fff"/></svg>
                Choose files
              </button>
              <input id="ml-transcriber-input" type="file" class="hidden" />
            </label>
            <div id="ml-transcriber-drag-text">or drag and drop your file here</div>
            <div id="ml-transcriber-file-name"></div>
            <div id="ml-transcriber-formats">
              Supported Formats: WAV, MP3, M4A, CAF, AIFF, AAC, OGG, WMA, ... FLV, MP4, MOV, WMV<br />Max size: 1GB; Max duration: 5 hours.
            </div>
            <div id="ml-transcriber-upgrade">
              Need more transcription quota? <a href="https://minuteslink.com" target="_blank" rel="noopener noreferrer" id="ml-transcriber-link">Try MinutesLink →</a>
            </div>
          </div>
          <div id="ml-transcriber-transcription-output">
            <div id="ml-transcriber-output-header">
              <span id="ml-transcriber-output-title">Your Transcription</span>
              <div id="ml-transcriber-output-actions">
                <button id="ml-transcriber-copy-button" class="ml-action-button" disabled>
                  <svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 1H4c-1.1 0-2 .9-2 2v14h2V3h11V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  Copy
                </button>
                <button id="ml-transcriber-pdf-button" class="ml-action-button" disabled>
                  <svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm4-6h4v2h-4v-2zm0-4h4v2h-4V10zm0 8h4v2h-4v-2z"/></svg>
                  PDF
                </button>
              </div>
            </div>
            <div class="skeleton-loading" id="ml-skeleton">
              ${'<div class="skeleton-line"></div>'.repeat(15)}
            </div>
            <div id="ml-transcriber-transcription-content"></div>
          </div>
        </div>
      </div>`;
  }

  // ===== event listeners & logic =====
  initEventListeners() {
    const dropzone = this.$('ml-transcriber-dropzone');
    const fileInput = this.$('ml-transcriber-input');
    const button = this.$('ml-transcriber-button');

    // helper add listener and store cleanup
    const on = (el, evt, fn) => {
      el.addEventListener(evt, fn);
      this._cleanupFns.push(() => el.removeEventListener(evt, fn));
    };

    on(button, 'click', () => fileInput.click());
    on(fileInput, 'change', (e) => e.target.files.length && this.handleFile(e.target.files[0]));

    // drag & drop
    ['dragover', 'dragenter'].forEach((ev) => on(dropzone, ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }));
    ['dragleave', 'dragend', 'drop'].forEach((ev) => on(dropzone, ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }));
    on(dropzone, 'drop', (e) => e.dataTransfer.files.length && this.handleFile(e.dataTransfer.files[0]));

    // copy & pdf buttons
    on(this.$('ml-transcriber-copy-button'), 'click', () => this.copyTranscript());
    on(this.$('ml-transcriber-pdf-button'), 'click', () => this.downloadPDF());
  }

  // ===== core helpers =====
  async handleFile(file) {
    const fileNameDisplay = this.$('ml-transcriber-file-name');
    const dropzone = this.$('ml-transcriber-dropzone');
    const output = this.$('ml-transcriber-transcription-output');
    const skeleton = this.$('ml-skeleton');
    const content = this.$('ml-transcriber-transcription-content');
    const copyBtn = this.$('ml-transcriber-copy-button');
    const pdfBtn = this.$('ml-transcriber-pdf-button');

    // simple client‑side size & extension check
    const MAX_SIZE = 1_073_741_824; // 1GB
    const allowedExt = /\.(wav|mp3|m4a|caf|aiff|aac|ogg|wma|amr|ape|flac|alac|mp2|mp4|mov|webm|avi|flv|wmv|mkv)$/i;
    if (file.size > MAX_SIZE) return this.showError('File exceeds 1GB limit');
    if (!allowedExt.test(file.name)) return this.showError('Unsupported file format');

    fileNameDisplay.textContent = `Selected: ${file.name}`;

    // UI states
    dropzone.style.display = 'none';
    output.style.display = 'block';
    content.innerHTML = '';
    skeleton.classList.remove('hidden');
    copyBtn.disabled = pdfBtn.disabled = true;

    try {
      const data = await this.uploadFile(file);
      if (!data || !data.transcript_lines) throw new Error('Empty transcription');

      this._currentLines = data.transcript_lines;
      this.renderTranscription(data.transcript_lines);
      copyBtn.disabled = pdfBtn.disabled = false;
    } catch (err) {
      this.showError(err.message || 'Transcription failed');
    } finally {
      skeleton.classList.add('hidden');
    }
  }

  async uploadFile(file) {
    const API = 'https://widget-transcriber-backend-production.up.railway.app/transcribe';
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(API, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return res.json();
  }

  renderTranscription(lines) {
    const content = this.$('ml-transcriber-transcription-content');
    content.innerHTML = '';
    content.scrollTop = 0;

    const frag = document.createDocumentFragment();
    lines.forEach((line) => {
      const section = document.createElement('div');
      section.className = 'ml-transcript-section';
      const spk = line.speaker.replace('Speaker ', '');
      const clr = getSpeakerColor(spk);
      section.style.borderLeftColor = clr;
      section.innerHTML = `
        <div class="ml-speaker-header" style="color:${clr};">
          ${line.speaker}
          <span class="ml-timestamp">${line.timestamp}</span>
        </div>
        <div class="ml-transcript-text">${line.text}</div>`;
      frag.appendChild(section);
    });
    content.appendChild(frag);
  }

  copyTranscript() {
    if (!this._currentLines) return;
    const header = 'Made with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/\n\n';
    const footer = '\n\nMade with MinutesLink AI note taker: records online meetings, makes the most accurate transcriptions and call summaries. https://minuteslink.com/';
    const body = this._currentLines
      .map((l) => `${l.speaker} [${l.timestamp}]\n${l.text}`)
      .join('\n\n');

    navigator.clipboard.writeText(header + body + footer).then(() => {
      const btn = this.$('ml-transcriber-copy-button');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => (btn.innerHTML = original), 2000);
    }).catch(() => this.showError('Failed to copy'));
  }

  async downloadPDF() {
    if (!this._currentLines) return;
    const API = 'https://widget-transcriber-backend-production.up.railway.app/generate-pdf';
    const payload = {
      transcript_lines: this._currentLines,
      header: 'MinutesLink transcript https://minuteslink.com',
      footer: 'Generated by MinutesLink'
    };

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transcript.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.showError(err.message);
    }
  }

  showError(msg) {
    const content = this.$('ml-transcriber-transcription-content');
    const skeleton = this.$('ml-skeleton');
    skeleton.classList.add('hidden');
    content.innerHTML = `
      <div class="ml-error-container">
        <div class="ml-error-message"><i class="fas fa-exclamation-circle"></i><span>${msg}</span></div>
        <button class="ml-try-again-button">Try again</button>
      </div>`;
    content.querySelector('button').addEventListener('click', () => location.reload());
  }
}

// register element once per page
if (!customElements.get('ml-transcriber')) customElements.define('ml-transcriber', MLTranscriber);

// ===== helper: deterministic color =====
function getSpeakerColor(id) {
  const preset = {
    'A': '#2196F3', 'B': '#4CAF50', 'C': '#FF9800', 'D': '#9C27B0',
    'E': '#F44336', 'F': '#00BCD4', 'G': '#FFC107', 'H': '#795548'
  };
  if (preset[id]) return preset[id];
  // fallback: hash‑based HSL
  let hash = 0; [...id].forEach((c) => hash = c.charCodeAt(0) + ((hash << 5) - hash));
  const h = hash % 360; return `hsl(${h},70%,50%)`;
}
