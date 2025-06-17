console.log('Virtual backgrounds script loaded');

// Style prompts dictionary (to avoid duplication)
// Each style contains specific visual instructions for AI image generation
// All prompts ensure the center area remains clear for webcam overlay
const STYLE_PROMPTS = {
  "modern-home-office": "Stylish home office with bookshelf, plant, and soft window light; clean desk, blurred depth of field, empty center for webcam",
  "business-professional": "Modern office background with clean lines, neutral blues and greys, subtle depth of field, soft natural light, unobtrusive décor behind speaker area",
  "photorealistic": "Realistic modern room with blurred background elements, cinematic lighting, soft shallow DOF, clear central area for subject",
  "futuristic-minimal": "Sleek, minimal white environment with soft blue ambient light, curved surfaces, subtle reflections, ideal focus space at center",
  "abstract-gradient": "Calming pastel gradient background with soft vignetting, clean center zone for face visibility, light visual texture around edges",
  "minimalist-plant": "Bright minimal space with white walls and green potted plants on sides, natural light, airy feel with centered empty zone",
  "funny-cartoon": "Colorful Pixar-style cartoon office with whimsical details on the sides, bold pastel tones, central area left empty for webcam overlay",
  "3d-clay-render": "Clay-style 3D render of an abstract room, soft overhead lighting, minimal shadows, symmetrical elements pushed to the sides",
  "vintage-retro": "Retro workspace with warm tones, analog textures, typewriter and rotary phone on the sides, faded film light leaks, centered blank space",
  "neon-cyberpunk": "Moody neon-lit tech background with magenta-cyan glow, side-lit panels, futuristic grid environment, clean center zone",
  "scenic-nature": "Lush outdoor setting with distant trees, soft fog or morning light, centered open area with nature details on sides",
  "minimalist-line-art": "Elegant black-and-white line art of a room with large windows or plants on the sides, large negative space in center for speaker",
  "watercolor-wash": "Artistic soft watercolor room with pale colors, paper texture, light brushwork on the sides, faded center left blank",
  "cozy-library": "Warm-toned room with bookshelves, soft lamp light, classic interior feel, clear center area",
  "tech-loft": "Industrial tech loft with exposed brick, LED strips, modern furniture, neutral tones and centered empty focus zone"
};

/**
 * Custom Web Component for generating virtual backgrounds
 * Handles user input, API communication, and image display
 */
class BgGenerator extends HTMLElement {
  constructor() {
    super();
    console.log('BgGenerator constructor called');
    
    // Create shadow DOM for component isolation
    this.root = this.attachShadow({mode: 'open'});
    
    // Component state management
    this.state = {
      prompt: "",           // Current user input text
      style: "funny-cartoon", // Selected visual style
      imageSrc: null,       // Generated image URL
      loading: false,       // Loading state for UI feedback
      lastPrompt: "",       // Previous prompt for regeneration
      isLoading: false,     // Alternative loading flag
      error: null          // Error state
    };

    // Internal properties for download animation
    this._isDownloading = false;  // Prevents multiple simultaneous downloads
    this._downloadTimer = null;   // Timer for download animation
  }

  /**
   * Lifecycle method called when component is added to DOM
   * Initializes the component and sets up event handling
   */
  connectedCallback() {
    console.log('BgGenerator connected to DOM');
    this.render();
    this.setupEventListeners();
  }

  /**
   * Renders the component UI based on current state
   * Creates the complete HTML structure with styles
   */
  render() {
    console.log('Rendering widget with state:', this.state);
    this.root.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;530&display=swap');

        /* Component host styling */
        :host {
          display: block;
          width: 100%;
          height: 100%;
          font-family: 'DM Sans', sans-serif;
          font-weight: 530;
        }

        /* Main container layout */
        .container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background-color: rgb(248, 250, 252);
          padding: 2rem 0;
          box-sizing: border-box;
        }

        /* Main heading */
        .main-heading {
          text-align: center;
          font-family: 'DM Sans', sans-serif;
          font-variation-settings: "wght" 700;
          font-weight: 700;
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          color: #1a202c;
          margin: 0 0 2rem 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        /* Input area container */
        .prompt-container {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        /* Main input bar with integrated controls */
        .prompt-bar {
          width: 100%;
          max-width: 960px;
          display: flex;
          align-items: center;
          height: 3.5rem;
          overflow: hidden;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          border: 1.5px solid #1673ff;
          border-radius: 9999px;
          background: #fff;
          padding: 0;
          box-sizing: border-box;
        }
        .prompt-bar .prompt-row {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .prompt-bar .style-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0;
          width: 50%;
          height: 100%;
        }
        
        /* Text input styling */
        .prompt-bar input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0 1.5rem;
          font-size: 1.1rem;
          color: #222;
          font-family: inherit;
          font-weight: 500;
          height: 100%;
          outline: none;
        }
        .prompt-bar input::placeholder {
          color: #7b8794;
          font-weight: 500;
        }
        
        /* Visual separator */
        .divider {
          width: 1px;
          height: 2rem;
          background: #e2e8f0;
          margin: 0 0.5rem;
        }
        
        /* Dropdown arrow icon */
        .select-icon {
          color: #b0b8c1 !important;
          font-size: 0.85rem !important;
          margin-left: 0.2rem !important;
          margin-right: 0 !important;
          pointer-events: none;
          user-select: none;
          line-height: 1;
        }
        
        /* Style selector dropdown */
        .prompt-bar select {
          border: none;
          background: transparent;
          font-size: 1.1rem;
          color: #111;
          font-family: inherit;
          font-weight: 500;
          height: 100%;
          padding: 0 1.7rem 0 0.5rem;
          outline: none;
          cursor: pointer;
          appearance: none;
          width: auto;
          min-width: 0;
          box-sizing: border-box;
          background-image: url('data:image/svg+xml;utf8,<svg fill="%23b0b8c1" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>');
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 1rem 1rem;
        }
        
        /* Primary action button */
        .prompt-bar button#create-button {
          background: #1673ff;
          color: #fff;
          border: none;
          border-radius: 0;
          height: 100%;
          padding: 0 2.2rem;
          font-size: 1.1rem;
          font-weight: 500;
          transition: background 0.2s, color 0.2s, opacity 0.2s;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .prompt-bar button#create-button:hover:not(:disabled) {
          background: #005ae0;
        }
        .prompt-bar button#create-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Image preview area */
        .preview-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 2rem;
          width: 100%;
          min-height: 0;
        }
        
        /* Zoom-style window frame */
        .zoom-window {
          position: relative;
          width: 100%;
          max-width: 960px;
          aspect-ratio: 16/9;
          background: #181c20;
          border-radius: 1.2rem;
          box-shadow: 0 10px 24px 0 rgba(0,0,0,0.10);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        /* Window header with traffic light dots */
        .zoom-header {
          height: 2.2rem;
          background: #23272b;
          display: flex;
          align-items: center;
          padding: 0 1.2rem;
          color: #fff;
          font-size: 1rem;
          font-weight: 500;
          border-top-left-radius: 1.2rem;
          border-top-right-radius: 1.2rem;
        }
        .zoom-header .dot {
          width: 0.7rem;
          height: 0.7rem;
          border-radius: 50%;
          margin-right: 0.4rem;
        }
        .dot-red { background: #f87171; }
        .dot-yellow { background: #fbbf24; }
        .dot-green { background: #34d399; }
        .zoom-header-title {
          margin-left: 0.7rem;
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
        }
        
        /* Main content area for image display */
        .zoom-content {
          flex: 1;
          display: flex;
          align-items: stretch;
          justify-content: center;
          background: #181c20;
          position: relative;
          overflow: hidden;
        }
        .zoom-content img {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: cover;
          border-radius: 0;
          box-shadow: none;
          display: block;
        }
        
        /* ================= LOADING OVERLAY ================= */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        /* Animated progress bar */
        .loader-track {
          position: relative;
          width: 100%;
          max-width: 500px;
          height: 6px;
          background: #333;
          overflow: hidden;
          border-radius: 3px;
        }
        .loader-bar {
          width: 25%;
          height: 100%;
          background: linear-gradient(90deg, #1673ff, #005ae0);
          border-radius: 9999px;
          transform: translateX(0);
          animation: loader-slide 3s ease-in-out infinite alternate; /* accelerated 2x */
        }
        @keyframes loader-slide {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(300%); } /* 25% * 3 = 75% path */
        }
        
        /* Bottom toolbar with meeting controls */
        .zoom-icons {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          background: rgba(30, 34, 40, 0.98);
          padding: 0.7rem 0;
          border-bottom-left-radius: 1.2rem;
          border-bottom-right-radius: 1.2rem;
        }
        .zoom-icon {
          width: 2.2rem;
          height: 2.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #23272b;
          border-radius: 0.5rem;
          color: #fff;
          font-size: 1.3rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.10);
        }
        
        /* Action buttons below preview */
        .zoom-controls {
          display: flex;
          justify-content: center;
          gap: 1.2rem;
          padding: 1.2rem 0 0 0;
        }
        .zoom-controls button {
          min-width: 120px;
          padding: 0.6rem 1.1rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 100px;
          border: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .zoom-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .zoom-controls #download-button {
          background: #1673ff;
          color: #fff;
          border: none;
        }
        .zoom-controls #download-button:hover:not(:disabled) {
          background: #005ae0;
        }
        .zoom-controls .regenerate {
          background: transparent;
          color: #1673ff;
          border: 2px solid #1673ff;
        }
        .zoom-controls .regenerate:hover:not(:disabled) {
          background: #eaf3ff;
          border-color: #005ae0;
          color: #005ae0;
        }

        /* Mobile responsive design */
        @media (max-width: 480px) {
          .container {
            padding: 0.5rem 0;
          }
          
          .main-heading {
            font-size: clamp(1.25rem, 6vw, 1.75rem);
            margin: 0 0 1rem 0;
          }
          
          .prompt-bar {
            flex-direction: column;
            height: auto;
            border-radius: 1.5rem;
            font-size: 0.97rem;
            padding: 0.5rem 0.2rem 0.7rem 0.2rem;
            gap: 0.5rem;
            border: none;
            box-shadow: none;
            background: transparent;
          }
          .prompt-bar .prompt-row {
            width: 100%;
            margin-bottom: 0.2rem;
          }
          .prompt-bar input {
            font-size: 1rem;
            padding: 0.7rem 1rem;
            height: 2.5rem;
            border-radius: 1.2rem;
            border: 1px solid #e2e8f0;
            background: #f7fafc;
            width: 100%;
            box-sizing: border-box;
          }
          .prompt-bar .style-row {
            width: 100%;
            margin-top: 0;
            display: grid;
            grid-template-columns: 1fr 110px;
            gap: 0;
          }
          .prompt-bar select {
            font-size: 1rem;
            padding: 0 0.7rem 0 1rem;
            height: 2.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 1.2rem 0 0 1.2rem;
            background: #fff;
            width: auto;
            min-width: 0;
            box-sizing: border-box;
            margin: 0;
            background-image: url('data:image/svg+xml;utf8,<svg fill="%23b0b8c1" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>');
            background-repeat: no-repeat;
            background-position: right 0.7rem center;
            background-size: 1rem 1rem;
            appearance: none;
          }
          .prompt-bar button#create-button {
            font-size: 1rem;
            padding: 0 1.1rem;
            height: 2.5rem;
            border-radius: 0 1.2rem 1.2rem 0;
            width: 110px;
            min-width: 0;
            box-sizing: border-box;
            margin: 0;
            margin-top: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .select-icon {
            display: none !important;
          }
          .preview-container {
            margin-top: 0.7rem;
          }
          .zoom-window {
            border-radius: 0.7rem;
            max-width: 100%;
            width: 100%;
            aspect-ratio: 9/16;
            min-width: 0;
          }
          .zoom-header, .zoom-icons {
            border-radius: 0.7rem 0.7rem 0 0;
          }
          .zoom-content img, .zoom-content .loading {
            border-radius: 0;
          }
          .zoom-controls {
            gap: 0.5rem;
            padding: 0.7rem 0 0 0;
          }
          .zoom-controls button {
            min-width: 80px;
            font-size: 0.97rem;
            padding: 0.45rem 0.7rem;
            border-radius: 1.5rem;
          }
        }
      </style>
      <div class="container">
        <h1 class="main-heading">Create your own background</h1>
        <div class="prompt-container">
          <div class="prompt-bar">
            <div class="prompt-row">
              <input type="text" placeholder="Describe your perfect backdrop…" value="${this.state.prompt}">
            </div>
            <div class="style-row">
              <select>
                <option value="modern-home-office" ${this.state.style === 'modern-home-office' ? 'selected' : ''}>Modern Home Office</option>
                <option value="business-professional" ${this.state.style === 'business-professional' ? 'selected' : ''}>Business Professional</option>
                <option value="photorealistic" ${this.state.style === 'photorealistic' ? 'selected' : ''}>Photorealistic</option>
                <option value="futuristic-minimal" ${this.state.style === 'futuristic-minimal' ? 'selected' : ''}>Futuristic Minimal</option>
                <option value="abstract-gradient" ${this.state.style === 'abstract-gradient' ? 'selected' : ''}>Abstract Gradient</option>
                <option value="minimalist-plant" ${this.state.style === 'minimalist-plant' ? 'selected' : ''}>Minimalist Plant</option>
                <option value="funny-cartoon" ${this.state.style === 'funny-cartoon' ? 'selected' : ''}>Funny Cartoon</option>
                <option value="3d-clay-render" ${this.state.style === '3d-clay-render' ? 'selected' : ''}>3D Clay Render</option>
                <option value="vintage-retro" ${this.state.style === 'vintage-retro' ? 'selected' : ''}>Vintage Retro</option>
                <option value="neon-cyberpunk" ${this.state.style === 'neon-cyberpunk' ? 'selected' : ''}>Neon Cyberpunk</option>
                <option value="scenic-nature" ${this.state.style === 'scenic-nature' ? 'selected' : ''}>Scenic Nature</option>
                <option value="minimalist-line-art" ${this.state.style === 'minimalist-line-art' ? 'selected' : ''}>Minimalist Line Art</option>
                <option value="watercolor-wash" ${this.state.style === 'watercolor-wash' ? 'selected' : ''}>Watercolor Wash</option>
                <option value="cozy-library" ${this.state.style === 'cozy-library' ? 'selected' : ''}>Cozy Library</option>
                <option value="tech-loft" ${this.state.style === 'tech-loft' ? 'selected' : ''}>Tech Loft</option>
              </select>
              <button id="create-button" ${!this.state.prompt ? 'disabled' : ''}>Create</button>
            </div>
          </div>
        </div>
        <div class="preview-container">
          <div class="zoom-window">
            <div class="zoom-header">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
              <span class="zoom-header-title">Online Meeting</span>
            </div>
            <div class="zoom-content">
              ${this.state.loading
                ? `<div class="loading-overlay"><div class="loading-text">Generating</div><div class="loader-track"><div class="loader-bar"></div></div></div>`
                : this.state.imageSrc
                  ? `<img src="${this.state.imageSrc}" alt="Generated background">`
                  : `<img src="https://cdn.prod.website-files.com/66b28e0f6bb6fd9735a480d7/6772ab0ab66e3dddbed47d31_2f7bf56a-7c86-4ea0-bb38-aeda95c0c9b3.png" alt="Preview" />`
              }
            </div>
            <div class="zoom-icons">
              <span class="zoom-icon" title="Mute">🎤</span>
              <span class="zoom-icon" title="Video">🎥</span>
              <span class="zoom-icon" title="Participants">👥</span>
              <span class="zoom-icon" title="Chat">💬</span>
              <span class="zoom-icon" title="Share Screen">🖥️</span>
              <span class="zoom-icon" title="Reactions">👍</span>
              <span class="zoom-icon" title="More">⋯</span>
            </div>
          </div>
          <div class="zoom-controls">
            <button class="regenerate" id="regenerate-button" ${!this.state.imageSrc ? 'disabled' : ''}>Regenerate</button>
            <button id="download-button" ${!this.state.imageSrc ? 'disabled' : ''}>Download</button>
          </div>
        </div>
      </div>
    `;

    // Update button states after rendering
    const regenerateButton = this.root.querySelector('#regenerate-button');
    const downloadButton = this.root.querySelector('#download-button');
    
    if (regenerateButton) {
      regenerateButton.disabled = !this.state.imageSrc;
    }
    if (downloadButton) {
      downloadButton.disabled = !this.state.imageSrc;
    }
  }

  /**
   * Sets up event listeners for user interactions
   * Uses event delegation for better performance
   */
  setupEventListeners() {
    console.log('Setting up event listeners');
    
    // DELEGATION: button clicks - handles all button interactions
    this.root.addEventListener('click', (e) => {
      const target = e.target;
      console.log('Click target:', target);

      if (target.id === 'create-button') {
        console.log('Create button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.generate();
      } else if (target.id === 'regenerate-button') {
        console.log('Regenerate button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.regenerate();
      } else if (target.id === 'download-button') {
        console.log('Download button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.download();
      }
    });

    // DELEGATION: input text changes - updates prompt state in real-time
    this.root.addEventListener('input', (e) => {
      const target = e.target;
      if (target && target.tagName === 'INPUT') {
        console.log('Input changed:', target.value);
        this.state.prompt = target.value;
        const createButton = this.root.querySelector('#create-button');
        if (createButton) createButton.disabled = !this.state.prompt;
      }
    });

    // DELEGATION: Enter key in input - triggers generation on Enter press
    this.root.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && target.tagName === 'INPUT' && e.key === 'Enter') {
        console.log('Enter pressed in input');
        e.preventDefault();
        e.stopPropagation();
        this.generate();
      }
    });

    // DELEGATION: select changes - updates selected style
    this.root.addEventListener('change', (e) => {
      const target = e.target;
      if (target && target.tagName === 'SELECT') {
        console.log('Style changed:', target.value);
        this.state.style = target.value;
      }
    });
  }

  /**
   * Composes the final prompt for AI image generation
   * Combines user input with style-specific instructions
   * @param {string} userPrompt - User's description
   * @param {string} stylePrompt - Style-specific visual instructions
   * @returns {string} Complete prompt for AI generation
   */
  composePrompt(userPrompt, stylePrompt) {
    return `generate a background for zoom meeting; Apply style: ${stylePrompt}.\nUser requirements: on the picture must be ${userPrompt}. MANDATORY RULE: keep the entire vertical middle third totally blank; place every element strictly at the extreme left or right, angled toward the center.`;
  }

  /**
   * Generates a new background image based on user input
   * Handles API communication and state management
   */
  async generate() {
    console.log('Generate called with prompt:', this.state.prompt);
    if (!this.state.prompt || this.state.loading) {
      console.log('Generation skipped: no prompt or loading');
      return;
    }
    
    // Save current prompt for generation
    const currentPrompt = this.state.prompt;
    this.state.lastPrompt = currentPrompt;
    
    // Clear prompt and reset state
    this.state.prompt = "";
    this.state.loading = true;
    this.state.imageSrc = null;
    this.render();

    // Get style prompt based on selected style
    const stylePrompt = STYLE_PROMPTS[this.state.style] || STYLE_PROMPTS['photorealistic'];

    const fullPrompt = this.composePrompt(currentPrompt, stylePrompt);
    try {
      console.log('Sending request to API...');
      const response = await fetch('https://widget-backrounds-generator-backend-production.up.railway.app/api/generate-img', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          force: true
        })
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.error || 'Failed to generate image');
      }

      const data = await response.json();
      console.log('Response data:', data);
      if (data.error) throw new Error(data.error);
      
      this.state.imageSrc = data.url;
    } catch (error) {
      console.error('Generation error:', error);
      alert(error.message || 'Generation error. Please try again.');
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  /**
   * Regenerates the last background with the same prompt
   * Useful for getting variations of the same concept
   */
  async regenerate() {
    console.log('Regenerate called with last prompt:', this.state.lastPrompt);
    if (!this.state.lastPrompt || this.state.loading) {
      console.log('Regeneration skipped: no last prompt or loading');
      return;
    }
    
    // Use last prompt for regeneration
    const currentPrompt = this.state.lastPrompt;
    
    // Reset state
    this.state.loading = true;
    this.state.imageSrc = null;
    this.render();

    // Get style prompt based on selected style
    const stylePromptRe = STYLE_PROMPTS[this.state.style] || STYLE_PROMPTS['photorealistic'];
    const fullPromptRe = this.composePrompt(currentPrompt, stylePromptRe);

    try {
      console.log('Sending regenerate request to API...');
      const response = await fetch('https://widget-backrounds-generator-backend-production.up.railway.app/api/generate-img', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: fullPromptRe,
          force: true
        })
      });

      console.log('Regenerate response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.error || 'Failed to regenerate image');
      }

      const data = await response.json();
      console.log('Regenerate response data:', data);
      if (data.error) throw new Error(data.error);
      
      this.state.imageSrc = data.url;
    } catch (error) {
      console.error('Regeneration error:', error);
      alert(error.message || 'Regeneration error. Please try again.');
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  /**
   * Downloads the generated background image
   * Handles file download with visual feedback
   */
  async download() {
    if (!this.state.imageSrc) return;
    const downloadBtn = this.root.querySelector('#download-button');
    if (this._isDownloading || !downloadBtn) return;

    // fix current width to avoid jumps
    const btnWidth = downloadBtn.offsetWidth;
    downloadBtn.style.width = `${btnWidth}px`;

    // show static text with three dots
    this._isDownloading = true;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';

    try {
      const resp = await fetch('https://widget-backrounds-generator-backend-production.up.railway.app/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: this.state.imageSrc })
      });
      if (!resp.ok) throw new Error('failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zoom-background.jpg';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download image');
    } finally {
      // finish download state
      if (this._downloadTimer) clearInterval(this._downloadTimer);
      this._downloadTimer = null;
      this._isDownloading = false;
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download';
        downloadBtn.style.width = '';
      }
    }
  }
}

// Register the custom element if not already registered
if (!customElements.get('bg-generator')) {
  console.log('Registering custom element');
  customElements.define('bg-generator', BgGenerator);
} else {
  console.log('Custom element already registered');
} 
