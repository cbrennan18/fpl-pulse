// src/utils/retryFetch.js

export async function retryFetch(fetchFn, args = [], retries = 3, delay = 500, globalDelay = 100) {
  let attempt = 0;

  // Global delay before first attempt
  if (globalDelay > 0) {
    await new Promise(res => setTimeout(res, globalDelay));
  }

  while (attempt < retries) {
    try {
      return await fetchFn(...args);
    } catch (err) {
      attempt++;
      console.warn(`Fetch failed (attempt ${attempt}):`, err.message);
      if (attempt >= retries) throw err;
      await new Promise(res => setTimeout(res, delay * attempt)); // Exponential backoff
    }
  }
}