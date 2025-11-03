// Content Script for SimplePassFill
// Detects login forms and handles auto-filling credentials

console.log("SimplePassFill content script loaded");

// Listen for messages from popup and background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillCredentials") {
    fillLoginForm(message.username, message.password);
    sendResponse({ success: true });
  }
});

// Auto-detect login forms and offer to fill them
function detectLoginForms() {
  const forms = document.querySelectorAll("form");
  const loginForms = [];

  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input");
    let hasUsername = false;
    let hasPassword = false;

    inputs.forEach((input) => {
      const type = input.type.toLowerCase();
      const name = input.name.toLowerCase();
      const id = input.id.toLowerCase();
      const placeholder = input.placeholder.toLowerCase();

      // Detect username fields
      if (type === "text" || type === "email") {
        if (
          name.includes("user") ||
          name.includes("email") ||
          name.includes("login") ||
          id.includes("user") ||
          id.includes("email") ||
          id.includes("login") ||
          placeholder.includes("user") ||
          placeholder.includes("email") ||
          placeholder.includes("login")
        ) {
          hasUsername = true;
        }
      }
      // Detect password fields
      if (type === "password") {
        hasPassword = true;
      }
    });

    // If form has both username and password fields, it's likely a login form
    if (hasUsername && hasPassword) {
      loginForms.push(form);
    }
  });

  return loginForms;
}

// Get login form fields
function getLoginFormFields(form) {
  const inputs = form.querySelectorAll("input");
  let usernameField = null;
  let passwordField = null;

  inputs.forEach((input) => {
    const type = input.type.toLowerCase();
    const name = input.name.toLowerCase();
    const id = input.id.toLowerCase();
    const placeholder = input.placeholder.toLowerCase();

    // Find username field (prioritize email, then username, then text)
    if (!usernameField && (type === "email" || type === "text")) {
      if (
        name.includes("email") ||
        id.includes("email") ||
        placeholder.includes("email")
      ) {
        usernameField = input;
      } else if (
        name.includes("user") ||
        name.includes("login") ||
        id.includes("user") ||
        id.includes("login") ||
        placeholder.includes("user") ||
        placeholder.includes("login")
      ) {
        usernameField = input;
      } else if (type === "text" && !usernameField) {
        // Fallback to first text input if no specific username field found
        usernameField = input;
      }
    }

    // Find password field (use first password input)
    if (!passwordField && type === "password") {
      passwordField = input;
    }
  });

  return { usernameField, passwordField };
}

// Fill login form with provided credentials
function fillLoginForm(username, password) {
  const loginForms = detectLoginForms();

  if (loginForms.length === 0) {
    console.log("No login forms detected");
    return false;
  }

  // Use the first login form found
  const form = loginForms[0];
  const { usernameField, passwordField } = getLoginFormFields(form);

  if (!usernameField || !passwordField) {
    console.log("Could not find username or password fields");
    return false;
  }

  // Fill the fields
  try {
    // Clear existing values
    usernameField.value = "";
    passwordField.value = "";

    // Fill with new values
    usernameField.value = username;
    passwordField.value = password;

    // Trigger input events to ensure the page recognizes the filled values
    triggerInputEvents(usernameField, username);
    triggerInputEvents(passwordField, password);

    // Focus on submit button or password field
    const submitButton = form.querySelector(
      'input[type="submit"], button[type="submit"], button:not([type])'
    );
    if (submitButton) {
      submitButton.focus();
    } else {
      passwordField.focus();
    }

    console.log("Successfully filled login form");
    return true;
  } catch (error) {
    console.error("Error filling login form:", error);
    return false;
  }
}

// Trigger proper input events for React and other frameworks
function triggerInputEvents(element, value) {
  // Create and dispatch events that modern web frameworks expect
  const events = [
    new Event("input", { bubbles: true }),
    new Event("change", { bubbles: true }),
    new KeyboardEvent("keydown", { bubbles: true }),
    new KeyboardEvent("keyup", { bubbles: true }),
  ];

  events.forEach((event) => {
    element.dispatchEvent(event);
  });

  // For React and other frameworks that use property descriptors
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  nativeInputValueSetter.call(element, value);

  // Dispatch additional input event after setting value
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

// Auto-offer to fill forms when page loads
function autoOfferFill() {
  const loginForms = detectLoginForms();

  if (loginForms.length > 0) {
    // Get current origin
    const origin = `${window.location.protocol}//${window.location.hostname}`;

    // Ask background script if we have credentials for this site
    chrome.runtime.sendMessage(
      {
        action: "getCredentials",
        origin: origin,
      },
      (response) => {
        if (response && response.success && response.credentials.length > 0) {
          // Show subtle notification that credentials are available
          showAutoFillNotification(response.credentials[0]);
        }
      }
    );
  }
}

// Show a subtle notification that auto-fill is available
function showAutoFillNotification(credential) {
  // Check if notification already exists
  if (document.getElementById("simplepassfill-notification")) {
    return;
  }

  const notification = document.createElement("div");
  notification.id = "simplepassfill-notification";
  notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #007bff;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        cursor: pointer;
        transition: all 0.3s ease;
        max-width: 300px;
    `;

  notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>🔑</span>
            <span>Fill login for ${credential.username}?</span>
            <button id="fill-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-left: 8px;">Fill</button>
            <button id="close-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; margin-left: 4px;">×</button>
        </div>
    `;

  // Add click handlers
  notification.querySelector("#fill-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage(
      {
        action: "getCredentials",
        origin: `${window.location.protocol}//${window.location.hostname}`,
      },
      (response) => {
        if (response && response.success && response.credentials.length > 0) {
          fillLoginForm(
            response.credentials[0].username,
            response.credentials[0].password
          );
        }
      }
    );
    notification.remove();
  });

  notification.querySelector("#close-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    notification.remove();
  });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);

  document.body.appendChild(notification);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(autoOfferFill, 1000); // Wait a bit for dynamic forms
  });
} else {
  setTimeout(autoOfferFill, 1000);
}

// Also check for dynamically added forms
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;

  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          if (node.tagName === "FORM" || node.querySelector("form")) {
            shouldCheck = true;
          }
        }
      });
    }
  });
  if (shouldCheck) {
    setTimeout(autoOfferFill, 500);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Keyboard shortcut for manual fill (Ctrl+Shift+F)
// document.addEventListener("keydown", (e) => {
//   if (e.ctrlKey && e.shiftKey && e.key === "F") {
//     e.preventDefault();

//     const origin = `${window.location.protocol}//${window.location.hostname}`;
//     chrome.runtime.sendMessage(
//       {
//         action: "getCredentials",
//         origin: origin,
//       },
//       (response) => {
//         if (response && response.success && response.credentials.length > 0) {
//           fillLoginForm(
//             response.credentials[0].username,
//             response.credentials[0].password
//           );
//         } else {
//           console.log("No credentials found for this site");
//         }
//       }
//     );
//   }
// });

console.log("SimplePassFill content script initialized");
