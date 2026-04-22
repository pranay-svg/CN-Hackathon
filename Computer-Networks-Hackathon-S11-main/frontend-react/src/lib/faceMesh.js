/**
 * faceMesh.js
 * MediaPipe FaceMesh wrapper with EAR, yaw, pitch, liveness computation.
 * Returns a controller object used by the BiometricPanel component.
 */

// MediaPipe landmark indices
const LM = {
    EYE_L_TOP: 159, EYE_L_BOT: 145,
    EYE_R_TOP: 386, EYE_R_BOT: 374,
    EYE_L_OUT: 33, EYE_L_IN: 133,
    EYE_R_OUT: 263, EYE_R_IN: 362,
    NOSE_TIP: 1,
    LEFT_FACE: 234, RIGHT_FACE: 454,
    LIP_L: 61, LIP_R: 291,
    LIP_T: 13, LIP_B: 14,
};

const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

function dist(lm, a, b) {
    return Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
}

function calcEAR(lm) {
    const lv = dist(lm, LM.EYE_L_TOP, LM.EYE_L_BOT);
    const lh = dist(lm, LM.EYE_L_OUT, LM.EYE_L_IN);
    const rv = dist(lm, LM.EYE_R_TOP, LM.EYE_R_BOT);
    const rh = dist(lm, LM.EYE_R_OUT, LM.EYE_R_IN);
    if (lh < 1e-6 || rh < 1e-6) return null;
    return (lv / lh + rv / rh) / 2;
}

function calcYaw(lm) {
    const noseX = lm[LM.NOSE_TIP].x;
    const leftX = lm[LM.LEFT_FACE].x;
    const rightX = lm[LM.RIGHT_FACE].x;
    const total = rightX - leftX;
    if (total < 0.01) return 0;
    return ((noseX - leftX) / total - 0.5) * 2;
}

function calcPitch(lm) {
    const noseY = lm[LM.NOSE_TIP].y;
    const topY = lm[LM.EYE_L_TOP].y;
    const botY = lm[LM.LIP_B].y;
    const h = botY - topY;
    if (h < 0.01) return 0;
    return ((noseY - topY) / h - 0.4) * 2;
}

function std(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

export function createFaceMeshController() {
    let faceMesh = null;
    let camera = null;
    let videoEl = null;
    let canvasEl = null;
    let ctx = null;
    let onMetricsUpdate = null;
    let isCapturing = false;

    let earBuf = [];
    let noseXBuf = [];
    let collectedLandmarks = [];
    let collectedFrames = [];

    function computeLiveness() {
        const earStd = std(earBuf);
        const noseStd = std(noseXBuf);
        const score = Math.min(earStd / 0.015, 1.0) * 0.6 +
            Math.min(noseStd / 0.008, 1.0) * 0.4;
        return Math.max(0, Math.min(1, score));
    }

    function drawOverlay(lm) {
        const w = canvasEl.width;
        const h = canvasEl.height;
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);

        // Face oval
        ctx.beginPath();
        FACE_OVAL.forEach((i, idx) => {
            const x = lm[i].x * w;
            const y = lm[i].y * h;
            idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(108,99,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Eye dots
        [[LM.EYE_L_TOP, LM.EYE_L_BOT, LM.EYE_L_OUT, LM.EYE_L_IN],
        [LM.EYE_R_TOP, LM.EYE_R_BOT, LM.EYE_R_OUT, LM.EYE_R_IN]].forEach(pts => {
            const cx = pts.reduce((s, i) => s + lm[i].x, 0) / pts.length * w;
            const cy = pts.reduce((s, i) => s + lm[i].y, 0) / pts.length * h;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,212,255,0.65)';
            ctx.fill();
        });

        // Nose tip
        ctx.beginPath();
        ctx.arc(lm[LM.NOSE_TIP].x * w, lm[LM.NOSE_TIP].y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(108,99,255,0.85)';
        ctx.fill();

        // Lip line
        ctx.beginPath();
        ctx.moveTo(lm[LM.LIP_L].x * w, lm[LM.LIP_L].y * h);
        ctx.lineTo(lm[LM.LIP_R].x * w, lm[LM.LIP_R].y * h);
        ctx.strokeStyle = 'rgba(255,107,107,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    function onResults(results) {
        if (!results.multiFaceLandmarks?.length) {
            ctx?.clearRect(0, 0, canvasEl?.width || 0, canvasEl?.height || 0);
            onMetricsUpdate?.({ ear: null, yaw: null, pitch: null, liveness: 0, faceFound: false });
            return;
        }

        const lm = results.multiFaceLandmarks[0];
        drawOverlay(lm);

        const ear = calcEAR(lm);
        const yaw = calcYaw(lm);
        const pitch = calcPitch(lm);

        if (ear !== null) {
            earBuf.push(ear);
            if (earBuf.length > 30) earBuf.shift();
        }
        noseXBuf.push(lm[LM.NOSE_TIP].x);
        if (noseXBuf.length > 30) noseXBuf.shift();

        const liveness = computeLiveness();
        onMetricsUpdate?.({ ear, yaw, pitch, liveness, faceFound: true });

        if (isCapturing && collectedLandmarks.length < 60) {
            collectedLandmarks.push(lm.map(p => ({ x: p.x, y: p.y, z: p.z })));
            const tmp = document.createElement('canvas');
            tmp.width = videoEl.videoWidth || 320;
            tmp.height = videoEl.videoHeight || 240;
            tmp.getContext('2d').drawImage(videoEl, 0, 0, tmp.width, tmp.height);
            collectedFrames.push(tmp.toDataURL('image/jpeg', 0.5).split(',')[1]);
        }
    }

    return {
        async start(video, canvas, metricsCallback) {
            videoEl = video;
            canvasEl = canvas;
            ctx = canvas.getContext('2d');
            onMetricsUpdate = metricsCallback;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user', frameRate: 30 },
                audio: false,
            });
            video.srcObject = stream;
            await new Promise(r => (video.onloadedmetadata = r));
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            faceMesh = new FaceMesh({
                locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
            });
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.6,
            });
            faceMesh.onResults(onResults);

            camera = new Camera(video, {
                onFrame: async () => { await faceMesh.send({ image: video }); },
                width: 640,
                height: 480,
            });
            camera.start();
        },

        startCapture() {
            collectedLandmarks = [];
            collectedFrames = [];
            earBuf = [];
            noseXBuf = [];
            isCapturing = true;
        },

        stopCapture() {
            isCapturing = false;
            return { landmarks: collectedLandmarks, frames: collectedFrames };
        },

        async stop() {
            isCapturing = false;
            camera?.stop();
            camera = null;
            await faceMesh?.close();
            faceMesh = null;
            videoEl?.srcObject?.getTracks().forEach(t => t.stop());
            if (videoEl) videoEl.srcObject = null;
        },
    };
}
