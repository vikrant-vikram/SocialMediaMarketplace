const socket = io();

const usernameInput = document.getElementById("username");
const recipientInput = document.getElementById("recipient");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = "";
let chatPartner = "";

const sharedKeyHex = [
  0x67a25ddc, 0x998b98cb, 0x8d18475d, 0x858120b7,
  0x8e7e51ca, 0xa84aff33, 0x396f0aca, 0xe7b11fd2
].map(n => n.toString(16)).join('');

// AES Functions

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

async function importKey(hex) {
  const rawKey = hexToArrayBuffer(hex);
  return await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptMessage(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    encryptedMessage: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
  };
}

async function decryptMessage(key, encryptedArray, ivArray) {
  try {
    const encryptedData = new Uint8Array(encryptedArray);
    const iv = new Uint8Array(ivArray);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    return "[Decryption Error]";
  }
}

const aesKeyPromise = importKey(sharedKeyHex);

// Join Chat
function joinChat() {
  currentUser = usernameInput.value.trim();
  chatPartner = recipientInput.value.trim();

  if (currentUser && chatPartner) {
    messagesDiv.innerHTML = ""; // clear previous messages
    socket.emit("join", { username: currentUser, withUser: chatPartner });
  }
}

usernameInput.addEventListener("change", joinChat);
recipientInput.addEventListener("change", joinChat);

// Send Message
sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!currentUser || !chatPartner || !message) return;

  const aesKey = await aesKeyPromise;
  const { encryptedMessage, iv } = await encryptMessage(aesKey, message);

  socket.emit("chat message", {
    sender: currentUser,
    recipient: chatPartner,
    encryptedMessage,
    iv,
  });

  messageInput.value = ""; // Clear input field after sending
});

// Display Messages
socket.on("chat message", async (data) => {
  const aesKey = await aesKeyPromise;
  const decrypted = await decryptMessage(aesKey, data.encryptedMessage, data.iv);

  // Show only if it's for the current conversation
  if (
    (data.sender === currentUser && data.recipient === chatPartner) ||
    (data.sender === chatPartner && data.recipient === currentUser)
  ) {
    const isSender = data.sender === currentUser;
    addMessageToChat(data.sender, decrypted, isSender);
  }
});

// Escape HTML to prevent XSS
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Add message to chat window with animation
function addMessageToChat(sender, message, isSender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", isSender ? "message-right" : "message-left");

  const safeSender = escapeHTML(sender);
  const safeMessage = escapeHTML(message);

  msgDiv.innerHTML = `<strong>${safeSender}</strong>: ${safeMessage}`;
  messagesDiv.appendChild(msgDiv);

  gsap.from(msgDiv, {
    opacity: 0,
    y: -30,
    duration: 0.5,
    ease: "power2.out"
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the latest message
}

// Handle logout
logoutBtn.addEventListener("click", () => {
  // Implement the logic to handle logout (e.g., redirect to login page)
  window.location.href = '/logout'; // This is just a placeholder; adjust as needed
});