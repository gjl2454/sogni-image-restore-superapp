import { v4 as uuidv4 } from 'uuid';
import process from 'process';

let SogniClient;

let globalSogniClient = null;
let clientCreationPromise = null;
let sogniUsername = null;
let sogniEnv = null;
let sogniUrls = null;
let password = null;

const SOGNI_HOSTS = {
  local: {
    api: 'https://api-local.sogni.ai',
    socket: 'wss://socket-local.sogni.ai',
    rest: 'https://api-local.sogni.ai'
  },
  staging: {
    api: 'https://api-staging.sogni.ai',
    socket: 'wss://socket-staging.sogni.ai',
    rest: 'https://api-staging.sogni.ai'
  },
  production: {
    api: 'https://api.sogni.ai',
    socket: 'wss://socket.sogni.ai',
    rest: 'https://api.sogni.ai'
  }
};

const getSogniUrls = (env) => {
  if (!SOGNI_HOSTS[env]) {
    console.warn(`Unknown Sogni environment: ${env}, falling back to production`);
    return SOGNI_HOSTS.production;
  }
  return SOGNI_HOSTS[env];
};

async function getOrCreateGlobalSogniClient() {
  if (globalSogniClient && globalSogniClient.account.currentAccount?.isAuthenticated) {
    return globalSogniClient;
  }
  
  if (clientCreationPromise) {
    return await clientCreationPromise;
  }
  
  clientCreationPromise = (async () => {
    try {
      if (!sogniUsername || !password) {
        sogniEnv = process.env.SOGNI_ENV || 'production';
        sogniUsername = process.env.SOGNI_USERNAME;
        password = process.env.SOGNI_PASSWORD;
        sogniUrls = getSogniUrls(sogniEnv);
        
        if (!sogniUsername || !password) {
          throw new Error('Sogni credentials not configured - check SOGNI_USERNAME and SOGNI_PASSWORD');
        }
      }
      
      const clientAppId = `restoration-demo-${uuidv4()}`;
      console.log(`[GLOBAL] Creating new global Sogni client with app ID: ${clientAppId}`);
  
      if (!SogniClient) {
        const sogniModule = await import('@sogni-ai/sogni-client');
        SogniClient = sogniModule.SogniClient;
      }
  
      const client = await SogniClient.createInstance({
        appId: clientAppId,
        network: 'fast',
        restEndpoint: sogniUrls.rest,
        socketEndpoint: sogniUrls.socket,
        testnet: sogniEnv === 'local' || sogniEnv === 'staging'
      });
  
      try {
        console.log(`[GLOBAL] Authenticating global client...`);
        await client.account.login(sogniUsername, password, false);
        console.log(`[GLOBAL] Successfully authenticated global client: ${clientAppId}`);
      } catch (error) {
        console.error(`[GLOBAL] Authentication failed for global client:`, error);
        throw error;
      }
  
      globalSogniClient = client;
      return globalSogniClient;
    } catch (error) {
      console.error(`[GLOBAL] Failed to create global client:`, error);
      throw error;
    } finally {
      clientCreationPromise = null;
    }
  })();
  
  return await clientCreationPromise;
}

export async function generateRestoration(params) {
  const client = await getOrCreateGlobalSogniClient();
  
  const isQwenImageEdit = params.selectedModel === 'qwen_image_edit_2511_fp8_lightning';
  
  const projectOptions = {
    type: 'image',
    modelId: params.selectedModel || 'qwen_image_edit_2511_fp8_lightning',
    positivePrompt: params.positivePrompt || 'Restore and repair this damaged photograph, remove scratches, tears, stains, and age-related damage, enhance details and colors while preserving the original character',
    sizePreset: 'custom',
    width: params.width,
    height: params.height,
    steps: params.inferenceSteps || 5,
    guidance: params.guidance || 1,
    numberOfMedia: 1,
    numberOfPreviews: 0,
    disableNSFWFilter: true, // Qwen Image Edit is not NSFW-aware
    outputFormat: params.outputFormat || 'jpg',
    tokenType: params.tokenType || 'spark',
  };
  
  // For Qwen Image Edit Lightning, don't specify sampler/scheduler - server provides defaults
  // Only add these for other models if needed
  if (!isQwenImageEdit && params.scheduler) {
    projectOptions.scheduler = params.scheduler;
    projectOptions.timeStepSpacing = params.timeStepSpacing || 'Karras';
  }
  
  if (isQwenImageEdit && params.contextImages && Array.isArray(params.contextImages)) {
    const contextImagesData = params.contextImages.map(img => {
      return img instanceof Uint8Array ? img : new Uint8Array(img);
    });
    projectOptions.contextImages = contextImagesData;
  }
  
  const project = await client.projects.create(projectOptions);
  
  return {
    projectId: project.id,
    status: 'processing'
  };
}

export { getOrCreateGlobalSogniClient };

