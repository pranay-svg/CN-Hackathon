"""
Cryptographic Module – HUMANITY-PROTOCOL
=========================================
Handles RSA-2048 key generation, signing, verification,
and encryption/decryption for the HP authentication protocol.
"""

import base64
import hashlib
import logging

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

log = logging.getLogger("HP-Crypto")


class CryptoModule:
    """
    Manages server-side RSA key pair and provides:
      - Server public key export (PEM)
      - Encrypting data for a client's public key (RSA-OAEP)
      - Verifying a client's RSA-PSS signature
    """

    def __init__(self):
        log.info("Generating server RSA-2048 key pair …")
        self._private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        self._public_key = self._private_key.public_key()
        log.info("Server key pair ready.")

    # ── Public key export ──────────────────────────────────────────────────
    def server_public_pem(self) -> str:
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()

    # ── Load a client's public key from PEM string ─────────────────────────
    @staticmethod
    def _load_pub(pem: str):
        return serialization.load_pem_public_key(
            pem.encode(), backend=default_backend()
        )

    # ── Encrypt plaintext for client (RSA-OAEP) ────────────────────────────
    def encrypt_for_client(self, plaintext: str, client_pub_pem: str) -> str:
        """
        Encrypt a message with the client's public key so that only their
        private key can decrypt it (RSA-OAEP with SHA-256).
        Returns base64-encoded ciphertext.
        """
        try:
            pub = self._load_pub(client_pub_pem)
            ciphertext = pub.encrypt(
                plaintext.encode(),
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            return base64.b64encode(ciphertext).decode()
        except Exception as exc:
            log.error(f"Encryption failed: {exc}")
            raise

    # ── Verify client's signature of the nonce ─────────────────────────────
    def verify_signature(self, nonce: str, signature_b64: str, client_pub_pem: str) -> bool:
        """
        Verify that the client signed the nonce with their private key.
        Uses RSA-PSS with SHA-256.
        Browser (Web Crypto API) signs with saltLength=32.
        PSS.AUTO auto-recovers the salt length from the signature itself.
        """
        try:
            pub = self._load_pub(client_pub_pem)
            sig = base64.b64decode(signature_b64)
            pub.verify(
                sig,
                nonce.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.AUTO   # ← AUTO detects browser's 32-byte salt
                ),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            log.warning("Signature verification failed – invalid signature")
            return False
        except Exception as exc:
            log.error(f"Signature verification error: {exc}")
            return False

    # ── SHA-256 utility ────────────────────────────────────────────────────
    @staticmethod
    def sha256(data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()
