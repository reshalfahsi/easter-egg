import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';

const MODEL_ID = 'Xenova/vit-gpt2-image-captioning';
let captionerPromise;
let currentRequest = Promise.resolve();

async function getCaptioner(id) {
  if (!captionerPromise) {
    self.postMessage({ type: 'status', id, status: 'loading' });
    captionerPromise = pipeline('image-to-text', MODEL_ID, {
      dtype: 'q8',
      progress_callback: progress => self.postMessage({ type: 'progress', id, progress })
    }).catch(error => {
      captionerPromise = null;
      throw error;
    });
  }
  return captionerPromise;
}

async function captionImage({ id, image }) {
  try {
    const captioner = await getCaptioner(id);
    self.postMessage({ type: 'status', id, status: 'captioning' });
    const output = await captioner(image, { max_new_tokens: 48 });
    const caption = output && output[0] && output[0].generated_text;
    if (!caption || !caption.trim()) throw new Error('The model did not return a caption. Please try a different image.');
    self.postMessage({ type: 'caption', id, caption: caption.trim() });
  } catch (error) {
    self.postMessage({ type: 'error', id, message: error.message || 'Captioning failed. Check your connection and try again.' });
  }
}

self.onmessage = event => {
  if (event.data.type !== 'caption') return;
  currentRequest = currentRequest.then(() => captionImage(event.data));
};
