import express from 'express';
import { SogniClient } from '@sogni-ai/sogni-client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Store user sessions (in production, use Redis or a proper session store)
const userSessions = new Map();

// Helper to get Sogni URLs based on environment
function getSogniUrls() {
  const env = process.env.SOGNI_ENV || 'production';
  
  console.log('[AUTH] Using Sogni environment:', env);
  
  if (env === 'staging') {
    return {
      rest: 'https://api-staging.sogni.ai',
      socket: 'wss://socket-staging.sogni.ai'
    };
  }
  
  // Use production by default
  return {
    rest: 'https://api.sogni.ai',
    socket: 'wss://socket.sogni.ai'
  };
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    
    console.log('[AUTH] Login request received', { username, hasPassword: !!password, remember });
    
    if (!username || !password) {
      console.log('[AUTH] Missing credentials');
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 400
      });
    }

    const sogniUrls = getSogniUrls();
    const appId = `restoration-web-${uuidv4()}`;
    
    console.log(`[AUTH] Creating client for user: ${username}`, { 
      appId, 
      restEndpoint: sogniUrls.rest,
      socketEndpoint: sogniUrls.socket
    });
    
    let client;
    try {
      client = await SogniClient.createInstance({
        appId,
        network: 'fast',
        restEndpoint: sogniUrls.rest,
        socketEndpoint: sogniUrls.socket,
        testnet: process.env.SOGNI_ENV === 'staging' || process.env.SOGNI_ENV === 'local'
        // Note: removed authType: 'cookies' - not needed for server-side auth
      });
      console.log('[AUTH] Client created successfully');
    } catch (clientError) {
      console.error('[AUTH] Failed to create client:', clientError);
      throw new Error(`Failed to create Sogni client: ${clientError.message}`);
    }
    
    // Log password details for debugging (length only, not the actual password)
    console.log('[AUTH] Password info:', {
      length: password.length,
      hasSpaces: password.includes(' '),
      startsWithSpace: password.startsWith(' '),
      endsWithSpace: password.endsWith(' ')
    });

    // Attempt login
    console.log('[AUTH] Attempting login...');
    try {
      await client.account.login(username, password, remember || false);
      console.log('[AUTH] Login successful');
    } catch (loginError) {
      console.error('[AUTH] Login failed:', loginError);
      console.error('[AUTH] Login error details:', {
        name: loginError?.name,
        message: loginError?.message,
        code: loginError?.code,
        payload: loginError?.payload,
        errorCode: loginError?.payload?.errorCode,
        stack: loginError?.stack
      });
      
      // Extract error code and message
      const errorCode = loginError?.payload?.errorCode || loginError?.code || 401;
      const errorMessage = loginError?.message || loginError?.payload?.message || 'Invalid username or password';
      
      return res.status(errorCode === 105 || errorCode === 128 ? 401 : 500).json({
        error: errorMessage,
        code: errorCode
      });
    }
    
    const account = client.account.currentAccount;
    
    // SDK has typo: isAuthenicated (missing 't')
    const isAuthenticated = account?.isAuthenicated || account?.isAuthenticated;
    
    if (!account || !isAuthenticated) {
      return res.status(401).json({
        error: 'Invalid username or password',
        code: 105
      });
    }

    // Create session
    const sessionId = uuidv4();
    userSessions.set(sessionId, {
      client,
      username: account.username,
      email: account.email,
      createdAt: Date.now()
    });

    // Set session cookie
    res.cookie('sogni-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    });

    res.json({
      success: true,
      user: {
        username: account.username,
        email: account.email
      }
    });

  } catch (error) {
    // This catch block should only handle unexpected errors
    // Login errors are already handled in the try block above
    console.error('[AUTH] Unexpected error:', error);
    console.error('[AUTH] Error stack:', error?.stack);
    console.error('[AUTH] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      payload: error?.payload
    });
    
    const errorCode = error?.payload?.errorCode || error?.code || 500;
    const errorMessage = error?.message || 'Login failed';
    
    // Ensure we always send JSON
    if (!res.headersSent) {
      res.status(errorCode === 105 || errorCode === 128 ? 401 : 500).json({
        error: errorMessage,
        code: errorCode
      });
    }
  }
});

// Check auth status
router.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies['sogni-session'];
    
    if (!sessionId) {
      return res.status(401).json({
        authenticated: false
      });
    }

    const session = userSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({
        authenticated: false
      });
    }

    const account = session.client.account.currentAccount;
    
    // SDK has typo: isAuthenicated (missing 't')
    const isAuthenticated = account?.isAuthenicated || account?.isAuthenticated;
    
    if (!account || !isAuthenticated) {
      userSessions.delete(sessionId);
      return res.status(401).json({
        authenticated: false
      });
    }

    res.json({
      authenticated: true,
      user: {
        username: account.username,
        email: account.email
      }
    });

  } catch (error) {
    console.error('[AUTH] Check auth error:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
      code: 500
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies['sogni-session'];
    
    if (sessionId) {
      const session = userSessions.get(sessionId);
      if (session && session.client) {
        try {
          await session.client.account.logout();
        } catch (error) {
          console.error('[AUTH] Logout error:', error);
        }
      }
      userSessions.delete(sessionId);
    }

    res.clearCookie('sogni-session');
    res.json({ success: true });

  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 500
    });
  }
});

export default router;
