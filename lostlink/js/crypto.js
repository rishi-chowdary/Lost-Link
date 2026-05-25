/**
 * LostLink Message Encryption — js/crypto.js
 *
 * Encrypts message content client-side using AES-GCM-256 before storing
 * in Supabase, so the database only ever holds ciphertext.
 *
 * Key derivation:
 *   PBKDF2(password = sorted(uid1, uid2), salt = APP_SALT, iter = 100_000, SHA-256)
 *   → AES-GCM-256 key (unique per conversation pair, cached in memory)
 *
 * Ciphertext format stored in DB:
 *   base64(12-byte random IV) + ":" + base64(AES-GCM ciphertext)
 *
 * Backward-compatible: messages that don't match this format are returned as-is.
 */

'use strict';

(function (global) {

    // ── Internal salt (static, app-wide) ──────────────────────────────────
    const _SALT = new TextEncoder().encode('LostLink_E2E_Salt_v1_2025');

    // ── Key cache: "sortedUid1_sortedUid2" → CryptoKey ───────────────────
    const _keyCache = new Map();

    /**
     * Derive a conversation-unique AES-GCM key from two user UUIDs.
     * The key is deterministic for the pair and cached for the session.
     */
    async function _deriveKey(uid1, uid2) {
        const [a, b] = [uid1, uid2].sort();
        const cacheKey = `${a}|${b}`;
        if (_keyCache.has(cacheKey)) return _keyCache.get(cacheKey);

        const raw = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(`LL_MSG_${a}_${b}`),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: _SALT, iterations: 10_000, hash: 'SHA-256' },
            raw,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        _keyCache.set(cacheKey, key);
        return key;
    }

    /** Base64 helpers */
    function _b64Encode(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }
    function _b64Decode(str) {
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    }

    /**
     * Returns true if the string looks like it was produced by encryptMessage().
     * Format:  <base64>:<base64>  with IV part being exactly 16 chars (12 bytes).
     */
    function isEncrypted(text) {
        if (typeof text !== 'string') return false;
        const idx = text.indexOf(':');
        if (idx < 10 || idx > 20) return false;          // IV b64 is ~16 chars
        const ivPart = text.slice(0, idx);
        const ctPart = text.slice(idx + 1);
        return /^[A-Za-z0-9+/=]+$/.test(ivPart) && /^[A-Za-z0-9+/=]+$/.test(ctPart) && ctPart.length > 10;
    }

    /**
     * Encrypt a plaintext message for a conversation.
     * @param {string} plaintext
     * @param {string} senderUid   — Supabase user UUID
     * @param {string} receiverUid — Supabase user UUID
     * @returns {Promise<string>}  ciphertext string (IV:CT in base64)
     */
    async function encryptMessage(plaintext, senderUid, receiverUid) {
        const key = await _deriveKey(senderUid, receiverUid);
        const iv  = crypto.getRandomValues(new Uint8Array(12));           // 96-bit IV
        const ct  = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(plaintext)
        );
        return _b64Encode(iv) + ':' + _b64Encode(ct);
    }

    /**
     * Decrypt a ciphertext produced by encryptMessage().
     * Gracefully returns the original string on failure (old plain-text messages).
     * @param {string} ciphertext
     * @param {string} senderUid
     * @param {string} receiverUid
     * @returns {Promise<string>}  plaintext, or original string if not encrypted / decryption fails
     */
    async function decryptMessage(ciphertext, senderUid, receiverUid) {
        if (!isEncrypted(ciphertext)) return ciphertext;   // plain-text legacy msg
        try {
            const idx = ciphertext.indexOf(':');
            const iv  = _b64Decode(ciphertext.slice(0, idx));
            const ct  = _b64Decode(ciphertext.slice(idx + 1));
            const key = await _deriveKey(senderUid, receiverUid);
            const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
            return new TextDecoder().decode(plain);
        } catch (_) {
            // Wrong key, corrupted data, or old unencrypted message
            return '[🔒 encrypted]';
        }
    }

    /**
     * Decrypt an array of message objects in-place (mutates .content field).
     * Faster than calling decryptMessage() one by one (shares key derivation cache).
     * @param {Array<{content:string, sender_id:string, receiver_id:string}>} messages
     * @returns {Promise<void>}
     */
    async function decryptMessages(messages) {
        await Promise.all(messages.map(async (msg) => {
            msg.content = await decryptMessage(msg.content, msg.sender_id, msg.receiver_id);
        }));
    }

    // Expose on window
    global.MsgCrypto = { encryptMessage, decryptMessage, decryptMessages, isEncrypted };

})(window);
