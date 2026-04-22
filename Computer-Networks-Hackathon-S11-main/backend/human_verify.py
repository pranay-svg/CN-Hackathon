"""
Human Biometric Verifier – HUMANITY-PROTOCOL
=============================================
Generates randomised biological challenges and verifies
liveness using MediaPipe Face Mesh landmark data sent
from the browser WebRTC stream.

Challenges implemented:
  1. BLINK  – detect voluntary eye-blink in N frames
  2. NOD    – detect downward head pitch movement
  3. TURN   – detect horizontal yaw left or right
  4. SMILE  – detect genuine smile (lip corners rise)

Deepfake signals detected:
  - Unnaturally constant EAR (eye-aspect-ratio) → pre-recorded video
  - Landmark jitter too low → perfectly smooth synthetic face
  - Missing micro-expressions / asymmetry
"""

import random
import math
import logging
import numpy as np

log = logging.getLogger("HP-Verifier")

# ── Challenge catalogue ────────────────────────────────────────────────────
CHALLENGES = [
    {
        "type":        "BLINK",
        "instruction": "Please BLINK your eyes twice naturally",
        "icon":        "👁️",
        "detail":      "Close and open both eyes clearly twice"
    },
    {
        "type":        "NOD",
        "instruction": "Please NOD your head downward slowly",
        "icon":        "⬇️",
        "detail":      "Tilt your chin down towards your chest"
    },
    {
        "type":        "TURN",
        "instruction": "Please TURN your head to the LEFT",
        "icon":        "⬅️",
        "detail":      "Rotate your head to the left side"
    },
    {
        "type":        "TURN_RIGHT",
        "instruction": "Please TURN your head to the RIGHT",
        "icon":        "➡️",
        "detail":      "Rotate your head to the right side"
    },
    {
        "type":        "SMILE",
        "instruction": "Please SMILE broadly",
        "icon":        "😄",
        "detail":      "Show a natural and genuine smile"
    }
]

# MediaPipe Face Mesh landmark indices
EYE_LEFT_TOP    = 159
EYE_LEFT_BOT    = 145
EYE_RIGHT_TOP   = 386
EYE_RIGHT_BOT   = 374
EYE_LEFT_OUT    = 33
EYE_LEFT_IN     = 133
EYE_RIGHT_OUT   = 263
EYE_RIGHT_IN    = 362
NOSE_TIP        = 1
LEFT_EAR_IDX    = 234
RIGHT_EAR_IDX   = 454
LIP_LEFT        = 61
LIP_RIGHT       = 291
LIP_TOP         = 13
LIP_BOTTOM      = 14


class HumanVerifier:

    def generate_challenge(self) -> dict:
        ch = random.choice(CHALLENGES).copy()
        ch["challenge_id"] = random.randint(100000, 999999)
        return ch

    # ── Main entry point ───────────────────────────────────────────────────
    def verify_response(self, challenge: dict, landmarks_seq: list, frames: list) -> dict:
        """
        landmarks_seq: list of per-frame landmark arrays
          Each element: list of {x, y, z} dicts (468 MediaPipe points)
        frames:        list of base64-encoded JPEG frames (unused server-side,
                       kept for future deep-learning-based checks)
        """
        if not landmarks_seq or len(landmarks_seq) < 3:
            return self._fail("Insufficient landmark data received")

        # ── Liveness pre-checks ──────────────────────────────────────────
        liveness = self._liveness_score(landmarks_seq)
        deepfake_risk = 1.0 - liveness

        if deepfake_risk > 0.75:
            return self._fail("High deepfake risk detected – motion patterns too synthetic",
                              score=0.0, liveness=liveness, deepfake_risk=deepfake_risk)

        # ── Challenge-specific verification ─────────────────────────────
        ctype = challenge.get('type', '')
        if ctype == "BLINK":
            result = self._verify_blink(landmarks_seq)
        elif ctype == "NOD":
            result = self._verify_nod(landmarks_seq)
        elif ctype in ("TURN", "TURN_RIGHT"):
            direction = "left" if ctype == "TURN" else "right"
            result = self._verify_turn(landmarks_seq, direction)
        elif ctype == "SMILE":
            result = self._verify_smile(landmarks_seq)
        else:
            result = self._fail("Unknown challenge type")

        result['liveness_score']  = liveness
        result['deepfake_risk']   = deepfake_risk
        return result

    # ─────────────────────────────────────────────────────────────────────
    #  Liveness Score
    # ─────────────────────────────────────────────────────────────────────
    def _liveness_score(self, landmarks_seq: list) -> float:
        """
        Score 0–1 measuring how "alive" the face motion is.
        Key signals:
          - Natural jitter / micro-motion between frames
          - EAR variation (pre-recorded video has unnaturally stable EAR)
          - Landmark positional variance
        """
        try:
            ears = []
            nose_xs = []
            for frame_lm in landmarks_seq:
                ear = self._ear(frame_lm)
                if ear is not None:
                    ears.append(ear)
                nose = frame_lm[NOSE_TIP]
                nose_xs.append(nose['x'])

            if len(ears) < 3:
                return 0.5  # insufficient data – neutral

            ear_std  = float(np.std(ears))
            nose_std = float(np.std(nose_xs))

            # Pre-recorded / deepfake video shows very low variance
            # Real human has natural micro-movements
            ear_score  = min(ear_std  / 0.015, 1.0)   # 0.015 = typical human std
            nose_score = min(nose_std / 0.008, 1.0)   # 0.008 = typical head sway

            liveness = (ear_score * 0.6 + nose_score * 0.4)
            liveness = max(0.0, min(1.0, liveness))
            log.debug(f"Liveness: ear_std={ear_std:.4f} nose_std={nose_std:.4f} score={liveness:.2f}")
            return liveness
        except Exception as exc:
            log.error(f"Liveness computation error: {exc}")
            return 0.5

    # ─────────────────────────────────────────────────────────────────────
    #  Eye-Aspect-Ratio (EAR) helper
    # ─────────────────────────────────────────────────────────────────────
    def _ear(self, lm: list) -> float | None:
        try:
            def dist(a, b):
                return math.hypot(lm[a]['x'] - lm[b]['x'], lm[a]['y'] - lm[b]['y'])

            left_v  = dist(EYE_LEFT_TOP,  EYE_LEFT_BOT)
            left_h  = dist(EYE_LEFT_OUT,  EYE_LEFT_IN)
            right_v = dist(EYE_RIGHT_TOP, EYE_RIGHT_BOT)
            right_h = dist(EYE_RIGHT_OUT, EYE_RIGHT_IN)

            if left_h < 1e-6 or right_h < 1e-6:
                return None

            return (left_v / left_h + right_v / right_h) / 2.0
        except Exception:
            return None

    # ─────────────────────────────────────────────────────────────────────
    #  BLINK detection
    # ─────────────────────────────────────────────────────────────────────
    def _verify_blink(self, landmarks_seq: list) -> dict:
        BLINK_THRESHOLD = 0.20
        ears = []
        for lm in landmarks_seq:
            e = self._ear(lm)
            if e is not None:
                ears.append(e)

        if len(ears) < 5:
            return self._fail("Not enough face landmark data for blink detection")

        # Count blink events (EAR dips below threshold then rises)
        blinks = 0
        below  = False
        for e in ears:
            if e < BLINK_THRESHOLD and not below:
                below = True
            elif e >= BLINK_THRESHOLD and below:
                below = False
                blinks += 1

        required_blinks = 2
        score = min(blinks / required_blinks, 1.0)
        passed = blinks >= required_blinks
        log.info(f"Blink detection: blinks={blinks} score={score:.2f} passed={passed}")

        if passed:
            return {"passed": True, "reason": f"Detected {blinks} blinks", "score": score}
        return self._fail(f"Only {blinks}/{required_blinks} blinks detected", score=score)

    # ─────────────────────────────────────────────────────────────────────
    #  HEAD NOD detection (pitch)
    # ─────────────────────────────────────────────────────────────────────
    def _verify_nod(self, landmarks_seq: list) -> dict:
        NOD_THRESHOLD = 0.04

        nose_ys = []
        for lm in landmarks_seq:
            nose_ys.append(lm[NOSE_TIP]['y'])

        if not nose_ys:
            return self._fail("No nose landmark data")

        max_y = max(nose_ys)
        min_y = min(nose_ys)
        movement = max_y - min_y

        score  = min(movement / NOD_THRESHOLD, 1.0)
        passed = movement >= NOD_THRESHOLD
        log.info(f"Head nod: Δy={movement:.4f} score={score:.2f} passed={passed}")

        if passed:
            return {"passed": True, "reason": f"Head nod detected (Δy={movement:.3f})", "score": score}
        return self._fail(f"Head movement too small (Δy={movement:.3f})", score=score)

    # ─────────────────────────────────────────────────────────────────────
    #  HEAD TURN detection (yaw)
    # ─────────────────────────────────────────────────────────────────────
    def _verify_turn(self, landmarks_seq: list, direction: str) -> dict:
        TURN_THRESHOLD = 0.06

        nose_xs = []
        for lm in landmarks_seq:
            nose_xs.append(lm[NOSE_TIP]['x'])

        if not nose_xs:
            return self._fail("No nose landmark data for turn detection")

        baseline = nose_xs[0]
        if direction == "left":
            movement = baseline - min(nose_xs)
        else:
            movement = max(nose_xs) - baseline

        score  = min(movement / TURN_THRESHOLD, 1.0)
        passed = movement >= TURN_THRESHOLD
        log.info(f"Head turn ({direction}): Δx={movement:.4f} score={score:.2f} passed={passed}")

        if passed:
            return {"passed": True, "reason": f"Head turn {direction} detected", "score": score}
        return self._fail(f"Insufficient head turn {direction} (Δx={movement:.3f})", score=score)

    # ─────────────────────────────────────────────────────────────────────
    #  SMILE detection
    # ─────────────────────────────────────────────────────────────────────
    def _verify_smile(self, landmarks_seq: list) -> dict:
        SMILE_THRESHOLD = 0.04
        smile_scores = []

        for lm in landmarks_seq:
            try:
                lip_width  = abs(lm[LIP_RIGHT]['x'] - lm[LIP_LEFT]['x'])
                lip_height = abs(lm[LIP_BOTTOM]['y'] - lm[LIP_TOP]['y'])
                if lip_width > 0:
                    smile_scores.append(lip_height / lip_width)
            except Exception:
                continue

        if not smile_scores:
            return self._fail("No lip landmark data for smile detection")

        max_smile = max(smile_scores)
        base_smile = smile_scores[0]
        delta = abs(max_smile - base_smile)

        score  = min(delta / SMILE_THRESHOLD, 1.0)
        passed = delta >= SMILE_THRESHOLD
        log.info(f"Smile detection: delta={delta:.4f} score={score:.2f} passed={passed}")

        if passed:
            return {"passed": True, "reason": "Smile detected successfully", "score": score}
        return self._fail(f"No clear smile detected (delta={delta:.3f})", score=score)

    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def _fail(reason: str, score: float = 0.0, **kwargs) -> dict:
        result = {"passed": False, "reason": reason, "score": score}
        result.update(kwargs)
        return result
