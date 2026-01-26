/**
 * Download Routes
 * Proxies image downloads to add proper Content-Disposition headers
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/download
 * Proxies an image download with proper headers to trigger native OS download
 */
router.get('/', async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    if (!filename) {
      return res.status(400).json({ error: 'Filename parameter is required' });
    }

    console.log('[Download] Proxying download:', { url, filename });

    // Fetch the image from the source URL
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[Download] Failed to fetch image:', response.status, response.statusText);
      return res.status(response.status).json({
        error: `Failed to fetch image: ${response.statusText}`
      });
    }

    // Get content type from the source response, or default to image/png
    const contentType = response.headers.get('content-type') || 'image/png';

    // Set headers to trigger download with native OS dialog
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the image data to the client
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.send(buffer);
  } catch (error) {
    console.error('[Download] Download failed:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

export default router;
