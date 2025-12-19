import express from 'express';
import { generateRestoration } from '../services/sogni.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Map to store active project SSE connections
const activeProjects = new Map();

// Helper function to send SSE messages
function sendSSEMessage(client, data) {
  if (!client || !client.writable) {
    return false;
  }
  
  try {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    return client.write(message);
  } catch (error) {
    console.error('Error sending SSE message:', error);
    return false;
  }
}

// Generate restoration endpoint
router.post('/generate', async (req, res) => {
  try {
    const {
      selectedModel,
      positivePrompt,
      width,
      height,
      guidance,
      inferenceSteps,
      contextImages,
      tokenType,
      outputFormat
    } = req.body;

    const localProjectId = `restore-${uuidv4()}`;
    
    console.log(`[RESTORE] Creating restoration project: ${localProjectId}`);

    const result = await generateRestoration({
      selectedModel: selectedModel || 'flux1-dev-kontext_fp8_scaled',
      positivePrompt: positivePrompt || 'Restore and repair this damaged photograph, remove scratches, tears, stains, and age-related damage, enhance details and colors while preserving the original character',
      width: width || 1024,
      height: height || 1024,
      guidance: guidance || 5.5,
      inferenceSteps: inferenceSteps || 24,
      contextImages: contextImages ? [new Uint8Array(contextImages)] : undefined,
      tokenType: tokenType || 'spark',
      outputFormat: outputFormat || 'jpg'
    });

    // Store project mapping
    activeProjects.set(localProjectId, {
      sdkProjectId: result.projectId,
      createdAt: Date.now()
    });

    res.json({
      projectId: localProjectId,
      sdkProjectId: result.projectId,
      status: 'processing'
    });
  } catch (error) {
    console.error('[RESTORE] Error generating restoration:', error);
    res.status(500).json({
      error: error.message || 'Failed to start restoration'
    });
  }
});

// SSE progress endpoint
router.get('/progress/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  console.log(`[RESTORE] SSE connection requested for project: ${projectId}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  sendSSEMessage(res, {
    type: 'connected',
    projectId
  });

  // Store connection
  if (!activeProjects.has(projectId)) {
    activeProjects.set(projectId, {
      connections: new Set(),
      sdkProjectId: null
    });
  }
  
  const projectData = activeProjects.get(projectId);
  projectData.connections.add(res);

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log(`[RESTORE] SSE client disconnected for project: ${projectId}`);
    if (projectData.connections) {
      projectData.connections.delete(res);
      if (projectData.connections.size === 0) {
        activeProjects.delete(projectId);
      }
    }
  });
});

// Cancel project endpoint
router.post('/cancel/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`[RESTORE] Cancelling project: ${projectId}`);
    
    // Clean up project data
    activeProjects.delete(projectId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[RESTORE] Error cancelling project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

