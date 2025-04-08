const crypto = require("crypto");
const { webcrypto } = require("crypto");
const fs = require("fs").promises; // Using promises for async file operations

// Generate a 2048-bit RSA key pair
function generateRSAKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
}

function generateAESKey() {
  return crypto.randomBytes(32);
}

// Encrypt the AES key with the RSA public key
function encryptAESKey(publicKey, aesKeyBuffer) {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKeyBuffer
  );
}

// Decrypt the AES key with the RSA private key
function decryptAESKey(privateKey, encryptedAesKey) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedAesKey
  );
}

(async () => {
  // Generate RSA key pair
  const { publicKey, privateKey } = generateRSAKeyPair();

  // Generate AES key
  const aesKey = generateAESKey();

  // Encrypt the AES key with the RSA public key
  const encryptedAesKey = encryptAESKey(publicKey, aesKey);
  console.log("Encrypted AES Key:", encryptedAesKey.toString("hex"));

  // Decrypt the AES key with the RSA private key
  const decryptedAesKey = decryptAESKey(privateKey, encryptedAesKey);
  console.log("Decrypted AES Key:", decryptedAesKey.toString("hex"));

  // Verify that the decrypted AES key matches the original
  if (!aesKey.equals(decryptedAesKey)) {
    throw new Error("Decrypted AES key does not match the original");
  }
})();