/**
 * cryptoClient.js
 * Browser-side RSA operations via Web Crypto API.
 */

let _keyPair = null;

export async function generateKeyPair() {
    _keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-PSS',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: 'SHA-256',
        },
        true,
        ['sign', 'verify']
    );
    return _keyPair;
}

export async function exportPublicKeyPEM(key) {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    const lines = b64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export async function signNonce(nonce) {
    if (!_keyPair) throw new Error('Key pair not generated');
    const enc = new TextEncoder();
    const sig = await window.crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        _keyPair.privateKey,
        enc.encode(nonce)
    );
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function sha256(str) {
    const enc = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function deviceFingerprint() {
    const raw = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'x',
        navigator.deviceMemory || 'x',
    ].join('|');
    return sha256(raw);
}

export function getKeyPair() {
    return _keyPair;
}
