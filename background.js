// Background Service Worker for SimplePassFill
// Handles encryption/decryption, storage, and message routing

let masterKey = null; // Store master key in memory only while unlocked
let isUnlocked = false;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep the message channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case "setMasterPassword":
        await setMasterPassword(message.password);
        sendResponse({ success: true });
        break;

      case "unlock":
        const unlocked = await unlockVault(message.password);
        sendResponse({ success: unlocked });
        break;

      case "lock":
        lockVault();
        sendResponse({ success: true });
        break;

      case "isUnlocked":
        sendResponse({ unlocked: isUnlocked });
        break;

      case "addCredential":
        if (!isUnlocked) {
          sendResponse({ success: false, error: "Vault is locked" });
          return;
        }
        const added = await addCredential(
          message.origin,
          message.username,
          message.password
        );
        sendResponse({ success: added });
        break;

      case "getCredentials":
        if (!isUnlocked) {
          sendResponse({ success: false, error: "Vault is locked" });
          return;
        }
        const credentials = await getCredentials(message.origin);
        sendResponse({ success: true, credentials });
        break;

      case "getAllCredentials":
        if (!isUnlocked) {
          sendResponse({ success: false, error: "Vault is locked" });
          return;
        }
        const allCreds = await getAllCredentials();
        sendResponse({ success: true, credentials: allCreds });
        break;

      case "removeCredential":
        if (!isUnlocked) {
          sendResponse({ success: false, error: "Vault is locked" });
          return;
        }
        const removed = await removeCredential(message.id);
        sendResponse({ success: removed });
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("Background script error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Encryption/Decryption Functions using Web Crypto API

async function deriveKeyFromPassword(password, salt) {
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // 100k iterations for security
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded
  );

  // Return IV + encrypted data as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData, key) {
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Master Password Management

async function setMasterPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPassword(password, salt);

  // Store salt and a test encrypted value to verify password later
  const testData = await encrypt("test", key);

  await chrome.storage.local.set({
    salt: btoa(String.fromCharCode(...salt)),
    testData: testData,
    hasMasterPassword: true,
  });

  masterKey = key;
  isUnlocked = true;
  return true;
}

async function unlockVault(password) {
  const stored = await chrome.storage.local.get([
    "salt",
    "testData",
    "hasMasterPassword",
  ]);

  if (!stored.hasMasterPassword) {
    return false;
  }

  try {
    const salt = new Uint8Array(
      atob(stored.salt)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const key = await deriveKeyFromPassword(password, salt);

    // Verify password by decrypting test data
    await decrypt(stored.testData, key);

    masterKey = key;
    isUnlocked = true;
    return true;
  } catch (error) {
    return false; // Wrong password
  }
}

function lockVault() {
  masterKey = null;
  isUnlocked = false;
}

// Credential Management

async function addCredential(origin, username, password) {
  if (!masterKey) return false;

  const stored = await chrome.storage.local.get(["credentials"]);
  const credentials = stored.credentials || [];

  // Create credential object
  const credential = {
    id: Date.now().toString(), // Simple ID generation
    origin: origin,
    username: username,
    encryptedPassword: await encrypt(password, masterKey),
    createdAt: new Date().toISOString(),
  };

  credentials.push(credential);
  await chrome.storage.local.set({ credentials });
  return true;
}

async function getCredentials(origin) {
  if (!masterKey) return [];

  const stored = await chrome.storage.local.get(["credentials"]);
  const credentials = stored.credentials || [];

  // Filter by origin and decrypt passwords
  const matchingCreds = credentials.filter((cred) => cred.origin === origin);

  const decryptedCreds = await Promise.all(
    matchingCreds.map(async (cred) => ({
      id: cred.id,
      origin: cred.origin,
      username: cred.username,
      password: await decrypt(cred.encryptedPassword, masterKey),
    }))
  );

  return decryptedCreds;
}

async function getAllCredentials() {
  if (!masterKey) return [];

  const stored = await chrome.storage.local.get(["credentials"]);
  const credentials = stored.credentials || [];

  // Return credentials without decrypted passwords (for listing in popup)
  return credentials.map((cred) => ({
    id: cred.id,
    origin: cred.origin,
    username: cred.username,
    createdAt: cred.createdAt,
  }));
}

async function removeCredential(id) {
  const stored = await chrome.storage.local.get(["credentials"]);
  const credentials = stored.credentials || [];

  const filteredCredentials = credentials.filter((cred) => cred.id !== id);
  await chrome.storage.local.set({ credentials: filteredCredentials });
  return true;
}

// Auto-lock after 5 minutes of inactivity
let lockTimeout;

function resetLockTimeout() {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
  }
  if (isUnlocked) {
    lockTimeout = setTimeout(() => {
      lockVault();
      console.log("Vault auto-locked after inactivity");
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// Reset timeout on any message
chrome.runtime.onMessage.addListener(() => {
  resetLockTimeout();
});

console.log("SimplePassFill background script loaded");
