# Frame

A responsive, browser-based image captioning app. Frame runs the `Xenova/vit-gpt2-image-captioning` image-to-text model in a web worker using Transformers.js and ONNX Runtime Web, loaded from a pinned jsDelivr CDN release. Image files stay in the browser; model files are downloaded from Hugging Face on first use and cached by the browser for future sessions.

## Run locally

```sh
npm install
npm run dev
```

The first caption may take longer while the runtime and model download. Use `npm run build` to create a production build or `npm run preview` to inspect it locally. A network connection is required for the runtime and the initial model download.

Supported formats: JPEG, PNG, WEBP, GIF, and BMP. Maximum file size: 15 MB.
