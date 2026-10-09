import React, { Component } from 'react';
import './App.css';

const icon = (name, size) => {
  const common = { width: size || 20, height: size || 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  const paths = {
    spark: <g><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></g>,
    upload: <g><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></g>,
    image: <g><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></g>,
    copy: <g><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></g>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <g><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2"/></g>,
    arrow: <path d="M7 17 17 7M7 7h10v10"/>,
    close: <path d="m18 6-12 12M6 6l12 12"/>
  };
  return <svg {...common}>{paths[name]}</svg>;
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { imageUrl: '', fileName: '', caption: '', details: null, dragging: false, copied: false, error: '', modelStatus: 'idle', progress: null };
    this.fileInput = null;
    this.currentFile = null;
    this.requestId = 0;
    this.worker = null;
  }

  componentDidMount() {
    this.worker = new Worker(new URL('./caption.worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = event => {
      const message = event.data;
      if (message.id !== this.requestId) return;
      if (message.type === 'progress') this.setState({ modelStatus: 'loading', progress: message.progress });
      if (message.type === 'status') this.setState({ modelStatus: message.status });
      if (message.type === 'caption') this.setState({ caption: message.caption, modelStatus: 'ready', progress: null, error: '' });
      if (message.type === 'error') this.setState({ modelStatus: 'error', progress: null, error: message.message });
    };
    this.worker.onerror = () => this.setState({ modelStatus: 'error', progress: null, error: 'The captioning model could not start. Check your connection and try again.' });
  }

  componentWillUnmount() {
    if (this.worker) this.worker.terminate();
    if (this.state.imageUrl) URL.revokeObjectURL(this.state.imageUrl);
  }

  handleFiles = files => {
    const file = files && files[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp|gif|bmp)$/)) {
      this.setState({ error: 'That file type is not supported. Try a JPG, PNG, WEBP, GIF, or BMP.' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      this.setState({ error: 'This image is larger than 15 MB. Choose a smaller file to continue.' });
      return;
    }
    this.currentFile = file;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (this.state.imageUrl) URL.revokeObjectURL(this.state.imageUrl);
      const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const details = { size, dimensions: `${img.naturalWidth} × ${img.naturalHeight}` };
      const id = ++this.requestId;
      this.setState({ imageUrl: url, fileName: file.name, caption: '', details, copied: false, error: '', modelStatus: 'loading', progress: null });
      this.worker.postMessage({ type: 'caption', id, image: url });
    };
    img.onerror = () => { URL.revokeObjectURL(url); this.setState({ error: 'We could not read that image. Please try another file.' }); };
    img.src = url;
  };

  copyCaption = () => {
    const done = () => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(this.state.caption).then(done);
    else {
      const el = document.createElement('textarea'); el.value = this.state.caption; document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); done(); } catch (e) { this.setState({ error: 'Copy is unavailable in this browser.' }); }
      document.body.removeChild(el);
    }
  };

  clearImage = () => {
    this.requestId += 1;
    this.currentFile = null;
    if (this.state.imageUrl) URL.revokeObjectURL(this.state.imageUrl);
    this.setState({ imageUrl: '', fileName: '', caption: '', details: null, error: '', modelStatus: 'idle', progress: null });
    if (this.fileInput) this.fileInput.value = '';
  };

  render() {
    const { imageUrl, fileName, caption, details, dragging, copied, error, modelStatus, progress } = this.state;
    const statusText = caption ? 'Ready' : modelStatus === 'loading' ? `Loading model${progress && progress.progress != null ? ` · ${Math.round(progress.progress)}%` : ''}` : modelStatus === 'captioning' ? 'Writing caption' : modelStatus === 'error' ? 'Needs a retry' : imageUrl ? 'Starting up' : 'Waiting for image';
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#home" aria-label="Frame home"><span className="brand-mark">{icon('spark', 19)}</span><span>frame<span className="brand-dot">.</span></span></a>
          <div className="topbar-note"><span className="privacy-dot" /> Your images stay on your device</div>
          <a className="topbar-link" href="#how-it-works">How it works {icon('arrow', 15)}</a>
        </header>

        <main id="home">
          <section className="hero">
            <div className="eyebrow"><span className="eyebrow-line" /> A little more context <span className="eyebrow-line" /></div>
            <h1>Every picture has<br /><span>a story.</span></h1>
            <p className="hero-copy">Give your images words. Get an AI caption in seconds, right in your browser.</p>
          </section>

          <section className="workspace" aria-label="Image captioning workspace">
            <div className={`upload-card ${dragging ? 'is-dragging' : ''} ${imageUrl ? 'has-image' : ''}`}
              onDragOver={e => { e.preventDefault(); this.setState({ dragging: true }); }}
              onDragLeave={e => { e.preventDefault(); this.setState({ dragging: false }); }}
              onDrop={e => { e.preventDefault(); this.setState({ dragging: false }); this.handleFiles(e.dataTransfer.files); }}>
              {imageUrl ? <div className="preview-wrap"><img className="preview-image" src={imageUrl} alt={`Preview of ${fileName}`} /><button className="remove-image" onClick={this.clearImage} aria-label="Remove image">{icon('close', 16)}</button><div className="preview-label">{icon('image', 15)} Image preview</div></div> :
                <div className="upload-empty"><div className="upload-icon">{icon('upload', 24)}</div><h2>Start with a photo</h2><p>Drop an image here, or choose one from your device.</p><button className="choose-button" onClick={() => this.fileInput.click()}>Choose an image <span>↗</span></button><span className="file-hint">JPG, PNG, WEBP, GIF · up to 15 MB</span></div>}
              <input ref={el => { this.fileInput = el; }} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" className="visually-hidden" onChange={e => this.handleFiles(e.target.files)} />
            </div>

            <div className={`result-card ${caption ? 'result-ready' : ''}`} aria-live="polite">
              <div className="result-top"><div><div className="result-kicker">YOUR AI CAPTION</div><h2>{caption ? 'A fresh perspective' : modelStatus === 'loading' || modelStatus === 'captioning' ? 'Finding the right words' : 'Your words, found'}</h2></div><span className={`status-pill ${caption ? 'status-ready' : ''}`}><span />{statusText}</span></div>
              {caption ? <><div className="caption-content"><span className="quote-mark">“</span><p>{caption}</p></div><div className="result-meta"><div className="file-info"><span className="file-chip">{icon('image', 15)}</span><span><strong>{fileName}</strong><small>{details.dimensions} · {details.size}</small></span></div><button className="copy-button" onClick={this.copyCaption}>{icon(copied ? 'check' : 'copy', 16)} {copied ? 'Copied!' : 'Copy caption'}</button></div><button className="try-again" onClick={() => this.fileInput.click()}>{icon('refresh', 15)} Try another image</button></> : <div className="result-placeholder"><div className={`placeholder-art ${modelStatus === 'loading' || modelStatus === 'captioning' ? 'is-processing' : ''}`}><span className="art-star star-one">✳</span><span className="art-sun" /><span className="art-hill hill-back" /><span className="art-hill hill-front" /><span className="art-star star-two">✦</span></div><p>{modelStatus === 'loading' ? <>Downloading the captioning model…<br />It will be cached for next time.</> : modelStatus === 'captioning' ? <>Looking at your image and<br />writing a caption…</> : error ? 'Try again or choose another image.' : <>Upload an image and your<br />caption will appear here.</>}</p>{modelStatus === 'error' && imageUrl && <button className="try-again" onClick={() => this.handleFiles([this.currentFile])}>{icon('refresh', 15)} Try caption again</button>}</div>}
              {error && <div className="error-message" role="alert">{error}</div>}
            </div>
          </section>

          <section className="how-section" id="how-it-works"><div className="how-heading"><span>AS SIMPLE AS IT SHOULD BE</span><h2>Three steps. One good caption.</h2></div><div className="steps"><article className="step"><span className="step-num">01</span><div><h3>Pick your image</h3><p>Choose a photo from your device. JPG, PNG, WEBP, and more.</p></div></article><article className="step"><span className="step-num">02</span><div><h3>We find the words</h3><p>An AI model writes a caption right in your browser.</p></div></article><article className="step"><span className="step-num">03</span><div><h3>Make it yours</h3><p>Copy your caption and share it wherever the story goes.</p></div></article></div></section>
          <p className="privacy-note"><span className="privacy-dot" /> Private by design <span className="privacy-divider">·</span> No uploads. No account. Just a little magic.</p>
        </main>

        <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">{icon('spark', 16)}</span><span>frame<span className="brand-dot">.</span></span></a><span>See your images in a new light.</span><span className="footer-right">Made for the moments worth sharing <span>✳</span></span></footer>
      </div>
    );
  }
}

export default App;
