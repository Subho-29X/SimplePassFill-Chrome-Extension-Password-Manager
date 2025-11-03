# SimplePassFill - Chrome Extension Password Manager

A secure, minimal password manager Chrome extension built with Manifest V3. SimplePassFill encrypts your passwords using Web Crypto API and stores them locally while providing convenient auto-fill functionality.

## 🔐 Security Features

- **AES-GCM Encryption**: Passwords encrypted with 256-bit AES in GCM mode
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-256
- **Master Key in Memory**: Master key never stored on disk, only in memory while unlocked
- **Auto-lock**: Vault automatically locks after 5 minutes of inactivity
- **Local Storage**: All data stored locally using chrome.storage.local

## 🚀 Features

- **Master Password Protection**: Secure vault with master password
- **Auto-fill Detection**: Automatically detects login forms on websites
- **Manual Fill**: Fill credentials via popup or keyboard shortcut (Ctrl+Shift+F)
- **Credential Management**: Add, list, and remove saved credentials
- **Current Site Integration**: Auto-populate credentials for current website
- **Visual Notifications**: Subtle notifications when credentials are available

## 📁 Project Structure

```
SimplePassFill/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js           # Service worker (encryption, storage, messaging)
├── content.js             # Content script (form detection, auto-fill)
├── popup.html             # Popup interface structure
├── popup.css              # Popup styling
├── popup.js               # Popup logic and UI interactions
├── icons/                 # Extension icons (you'll need to add these)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## 🛠️ Installation

### Developer Installation (Unpacked Extension)

1. **Clone or Download** this repository to your local machine
2. **Create Icons** (optional but recommended):

   - Create an `icons` folder in the project directory
   - Add icon files: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Or remove the icon references from `manifest.json`

3. **Load Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the SimplePassFill folder

4. **Pin Extension** (recommended):
   - Click the extensions icon (puzzle piece) in Chrome toolbar
   - Find SimplePassFill and click the pin icon

## 📖 Usage

### First Time Setup

1. Click the SimplePassFill icon in your Chrome toolbar
2. Create a master password (minimum 8 characters)
3. Your secure vault is now ready!

### Adding Credentials

1. Navigate to a login page
2. Click the SimplePassFill icon
3. The current site should be auto-populated in the "Add New Credential" form
4. Enter username and password
5. Click "Add Credential"

### Auto-filling Credentials

**Method 1: Popup**

1. Navigate to a login page
2. Click the SimplePassFill icon
3. Click "Fill Login" for the current site

**Method 2: Auto-detection**

- When you visit a site with saved credentials, a notification will appear
- Click "Fill" to auto-fill the login form

**Method 3: Keyboard Shortcut**

- Press `Ctrl+Shift+F` on any login page to auto-fill saved credentials

### Managing Credentials

1. Click the SimplePassFill icon
2. View all saved credentials in the "Saved Credentials" section
3. Click the "×" button to remove a credential
4. Use "Lock Vault" to secure your passwords

## 🔒 Security Notes

### For Demo Use Only

This extension is designed as a demonstration and learning tool. For production use, consider:

- Additional security audits
- More robust error handling
- Enhanced user authentication options
- Backup and sync capabilities
- Security headers and CSP improvements

### What's Encrypted

- ✅ Passwords (AES-GCM with PBKDF2)
- ❌ Usernames (stored in plaintext for display)
- ❌ Website origins (stored in plaintext for matching)

### Master Password Tips

- Use a strong, unique master password
- Don't reuse your master password elsewhere
- The extension auto-locks after 5 minutes of inactivity
- Master password is required each time Chrome restarts

## 🛠️ Development

### Code Structure

**Background Script (`background.js`)**

- Service worker handling encryption/decryption
- Manages secure storage and credential operations
- Handles messages from popup and content scripts

**Content Script (`content.js`)**

- Detects login forms on web pages
- Handles auto-fill functionality
- Shows subtle notifications when credentials are available

**Popup (`popup.html/js/css`)**

- User interface for vault management
- Master password setup and unlock
- Credential management (add/remove/list)

### Key Functions

- `deriveKeyFromPassword()`: PBKDF2 key derivation
- `encrypt()/decrypt()`: AES-GCM encryption
- `detectLoginForms()`: Form detection algorithm
- `fillLoginForm()`: Auto-fill implementation

## 🐛 Troubleshooting

### Extension Not Working

1. Check that Developer mode is enabled
2. Reload the extension in `chrome://extensions/`
3. Check browser console for errors

### Auto-fill Not Working

1. Ensure the site has saved credentials
2. Try the manual keyboard shortcut `Ctrl+Shift+F`
3. Some sites may block auto-fill due to security policies

### Forgot Master Password

Unfortunately, there's no password recovery. You'll need to:

1. Remove and reinstall the extension
2. This will delete all saved credentials
3. Set up a new master password

## 📝 Technical Details

### Permissions Used

- `storage`: Local credential storage
- `activeTab`: Access current tab for auto-fill
- `tabs`: Query active tabs
- `host_permissions`: Access all HTTP/HTTPS sites for auto-fill

### Storage Format

```javascript
{
  "hasMasterPassword": true,
  "salt": "base64-encoded-salt",
  "testData": "encrypted-test-string",
  "credentials": [
    {
      "id": "timestamp",
      "origin": "https://example.com",
      "username": "user@example.com",
      "encryptedPassword": "base64-encrypted-password",
      "createdAt": "ISO-date-string"
    }
  ]
}
```

### Encryption Details

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 (100,000 iterations, SHA-256)
- **IV**: 96-bit random IV per encryption
- **Salt**: 128-bit random salt for key derivation

## 📄 License

This project is provided as-is for educational and demonstration purposes. Feel free to modify and extend for your own use.

## 🤝 Contributing

This is a demonstration project, but improvements are welcome! Feel free to:

- Report issues
- Suggest enhancements
- Submit pull requests
- Use as a learning resource

---

**⚠️ Disclaimer**: This extension is for demonstration purposes. For production use, additional security measures and thorough testing are recommended.
