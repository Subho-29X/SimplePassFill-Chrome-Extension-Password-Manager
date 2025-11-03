// Popup JavaScript for SimplePassFill
// Handles UI interactions and communication with background script

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loaded");
  await initializePopup();
});

// DOM Elements
const setupSection = document.getElementById("setupSection");
const unlockSection = document.getElementById("unlockSection");
const mainSection = document.getElementById("mainSection");
const loading = document.getElementById("loading");
const lockStatus = document.getElementById("lockStatus");

// Forms and inputs
const setupForm = document.getElementById("setupForm");
const setupPassword = document.getElementById("setupPassword");
const confirmPassword = document.getElementById("confirmPassword");
const unlockForm = document.getElementById("unlockForm");
const unlockPassword = document.getElementById("unlockPassword");
const unlockError = document.getElementById("unlockError");
const addCredentialForm = document.getElementById("addCredentialForm");
const lockBtn = document.getElementById("lockBtn");

// Credential management
const currentSiteSection = document.getElementById("currentSiteSection");
const currentSiteUrl = document.getElementById("currentSiteUrl");
const fillCurrentSite = document.getElementById("fillCurrentSite");
const credentialsList = document.getElementById("credentialsList");
const noCredentials = document.getElementById("noCredentials");

let currentTab = null;

// Initialize popup based on vault state
async function initializePopup() {
  showLoading(true);

  try {
    // Get current tab for auto-fill functionality
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    // Check if master password is set
    const stored = await chrome.storage.local.get(["hasMasterPassword"]);

    if (!stored.hasMasterPassword) {
      showSetupSection();
    } else {
      // Check if vault is unlocked
      const response = await sendMessage({ action: "isUnlocked" });
      if (response.unlocked) {
        await showMainSection();
      } else {
        showUnlockSection();
      }
    }
  } catch (error) {
    console.error("Error initializing popup:", error);
    showMessage("Error initializing extension", true);
  }

  showLoading(false);
}

// UI State Management
function showSetupSection() {
  hideAllSections();
  setupSection.classList.remove("hidden");
  lockStatus.textContent = "Setup Required";
  lockStatus.className = "status-locked";
}

function showUnlockSection() {
  hideAllSections();
  unlockSection.classList.remove("hidden");
  lockStatus.textContent = "Locked";
  lockStatus.className = "status-locked";
  unlockPassword.focus();
}

async function showMainSection() {
  hideAllSections();
  mainSection.classList.remove("hidden");
  lockStatus.textContent = "Unlocked";
  lockStatus.className = "status-unlocked";

  await loadCredentials();
  setupCurrentSite();
}

function hideAllSections() {
  setupSection.classList.add("hidden");
  unlockSection.classList.add("hidden");
  mainSection.classList.add("hidden");
}

function showLoading(show) {
  if (show) {
    loading.classList.remove("hidden");
  } else {
    loading.classList.add("hidden");
  }
}

// Message handling
async function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function showMessage(text, isError = false) {
  const message = document.getElementById("message");
  const messageText = document.getElementById("messageText");

  messageText.textContent = text;
  message.className = isError ? "message error" : "message";
  message.classList.remove("hidden");

  setTimeout(() => {
    message.classList.add("hidden");
  }, 3000);
}

// Setup Master Password
setupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = setupPassword.value;
  const confirm = confirmPassword.value;

  if (password !== confirm) {
    showMessage("Passwords do not match", true);
    return;
  }

  if (password.length < 8) {
    showMessage("Password must be at least 8 characters", true);
    return;
  }

  showLoading(true);

  try {
    const response = await sendMessage({
      action: "setMasterPassword",
      password: password,
    });

    if (response.success) {
      showMessage("Master password created successfully");
      await showMainSection();
    } else {
      showMessage("Error creating master password", true);
    }
  } catch (error) {
    console.error("Error setting master password:", error);
    showMessage("Error creating master password", true);
  }

  showLoading(false);
});

// Unlock Vault
unlockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = unlockPassword.value;
  showLoading(true);

  try {
    const response = await sendMessage({
      action: "unlock",
      password: password,
    });

    if (response.success) {
      unlockError.classList.add("hidden");
      await showMainSection();
    } else {
      unlockError.classList.remove("hidden");
      unlockPassword.value = "";
      unlockPassword.focus();
    }
  } catch (error) {
    console.error("Error unlocking vault:", error);
    showMessage("Error unlocking vault", true);
  }

  showLoading(false);
});

// Lock Vault
lockBtn.addEventListener("click", async () => {
  try {
    await sendMessage({ action: "lock" });
    showUnlockSection();
    showMessage("Vault locked");
  } catch (error) {
    console.error("Error locking vault:", error);
    showMessage("Error locking vault", true);
  }
});

// Add Credential
addCredentialForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const origin = document.getElementById("siteOrigin").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    // Normalize origin URL
    const url = new URL(origin);
    const normalizedOrigin = `${url.protocol}//${url.hostname}`;

    const response = await sendMessage({
      action: "addCredential",
      origin: normalizedOrigin,
      username: username,
      password: password,
    });

    if (response.success) {
      showMessage("Credential added successfully");
      addCredentialForm.reset();
      await loadCredentials();
    } else {
      showMessage(response.error || "Error adding credential", true);
    }
  } catch (error) {
    console.error("Error adding credential:", error);
    showMessage("Invalid URL or error adding credential", true);
  }
});

// Load and display credentials
async function loadCredentials() {
  try {
    const response = await sendMessage({ action: "getAllCredentials" });

    if (response.success) {
      displayCredentials(response.credentials);
    } else {
      showMessage(response.error || "Error loading credentials", true);
    }
  } catch (error) {
    console.error("Error loading credentials:", error);
    showMessage("Error loading credentials", true);
  }
}

function displayCredentials(credentials) {
  credentialsList.innerHTML = "";

  if (credentials.length === 0) {
    noCredentials.classList.remove("hidden");
    return;
  }

  noCredentials.classList.add("hidden");

  credentials.forEach((credential) => {
    const item = createCredentialItem(credential);
    credentialsList.appendChild(item);
  });
}

function createCredentialItem(credential) {
  const item = document.createElement("div");
  item.className = "credential-item";

  const info = document.createElement("div");
  info.className = "credential-info";

  const origin = document.createElement("div");
  origin.className = "credential-origin";
  origin.textContent = credential.origin;

  const username = document.createElement("div");
  username.className = "credential-username";
  username.textContent = credential.username;

  info.appendChild(origin);
  info.appendChild(username);

  const actions = document.createElement("div");
  actions.className = "credential-actions";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-danger";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove credential";
  removeBtn.addEventListener("click", () => removeCredential(credential.id));

  actions.appendChild(removeBtn);

  item.appendChild(info);
  item.appendChild(actions);

  return item;
}

async function removeCredential(id) {
  if (!confirm("Are you sure you want to remove this credential?")) {
    return;
  }

  try {
    const response = await sendMessage({
      action: "removeCredential",
      id: id,
    });

    if (response.success) {
      showMessage("Credential removed");
      await loadCredentials();
    } else {
      showMessage(response.error || "Error removing credential", true);
    }
  } catch (error) {
    console.error("Error removing credential:", error);
    showMessage("Error removing credential", true);
  }
}

// Current site auto-fill setup
function setupCurrentSite() {
  if (!currentTab || !currentTab.url) {
    currentSiteSection.classList.add("hidden");
    return;
  }

  try {
    const url = new URL(currentTab.url);

    // Skip chrome:// and extension pages
    if (url.protocol === "chrome:" || url.protocol === "chrome-extension:") {
      currentSiteSection.classList.add("hidden");
      return;
    }

    const origin = `${url.protocol}//${url.hostname}`;
    currentSiteUrl.textContent = origin;
    currentSiteSection.classList.remove("hidden");

    // Set up auto-fill button
    fillCurrentSite.addEventListener("click", async () => {
      await fillCurrentSiteCredentials(origin);
    });

    // Auto-populate add credential form with current site
    document.getElementById("siteOrigin").value = origin;
  } catch (error) {
    console.error("Error setting up current site:", error);
    currentSiteSection.classList.add("hidden");
  }
}

async function fillCurrentSiteCredentials(origin) {
  try {
    const response = await sendMessage({
      action: "getCredentials",
      origin: origin,
    });

    if (response.success && response.credentials.length > 0) {
      // Use the first credential if multiple exist
      const credential = response.credentials[0];

      // Send message to content script to fill the form
      chrome.tabs.sendMessage(currentTab.id, {
        action: "fillCredentials",
        username: credential.username,
        password: credential.password,
      });

      showMessage("Credentials filled");
      window.close(); // Close popup after filling
    } else {
      showMessage("No credentials found for this site", true);
    }
  } catch (error) {
    console.error("Error filling credentials:", error);
    showMessage("Error filling credentials", true);
  }
}

// Handle Enter key in password fields
setupPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") confirmPassword.focus();
});

confirmPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") setupForm.dispatchEvent(new Event("submit"));
});

unlockPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") unlockForm.dispatchEvent(new Event("submit"));
});

console.log("Popup script loaded");
