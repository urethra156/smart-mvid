import { Scene, MoodPreset } from '../types';

/**
 * Generates a high-quality cinematic procedural video preview using HTML5 Canvas
 * and MediaRecorder in the browser. This allows users to preview scenes as animated
 * video files without relying on paid cloud video generation APIs.
 */
export async function generateProceduralSceneVideo(
  scene: Scene,
  overallMood: string = 'Cinematic',
  durationSeconds: number = 5,
  onProgress?: (status: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (onProgress) onProgress('Initializing procedural video rendering engine...');

      const width = 1280;
      const height = 720;
      const fps = 30;
      const totalFrames = fps * durationSeconds;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context is not supported in this browser.');
      }

      // Check MediaRecorder support
      const stream = canvas.captureStream(fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 5000000, // 5 Mbps high quality
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        if (onProgress) onProgress('Procedural video generated successfully!');
        resolve(videoUrl);
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        reject(new Error('Procedural video rendering failed in browser MediaRecorder.'));
      };

      mediaRecorder.start();

      // Mood-based color palettes
      const moodLower = overallMood.toLowerCase();
      let primaryColor = '#4f46e5'; // Indigo
      let secondaryColor = '#06b6d4'; // Cyan
      let accentColor = '#f59e0b'; // Amber
      let particleCount = 60;

      if (moodLower.includes('dark') || moodLower.includes('metal') || moodLower.includes('intense')) {
        primaryColor = '#881337'; // Rose dark
        secondaryColor = '#e11d48'; // Red
        accentColor = '#fbbf24'; // Amber
      } else if (moodLower.includes('cyber') || moodLower.includes('futuristic') || moodLower.includes('neon')) {
        primaryColor = '#3b0764'; // Purple dark
        secondaryColor = '#06b6d4'; // Cyan
        accentColor = '#ec4899'; // Pink
      } else if (moodLower.includes('dreamy') || moodLower.includes('surreal') || moodLower.includes('ambient')) {
        primaryColor = '#1e1b4b'; // Deep Indigo
        secondaryColor = '#818cf8'; // Soft purple
        accentColor = '#38bdf8'; // Sky blue
      } else if (moodLower.includes('energetic') || moodLower.includes('vibrant') || moodLower.includes('pop')) {
        primaryColor = '#be185d'; // Pink
        secondaryColor = '#f97316'; // Orange
        accentColor = '#facc15'; // Yellow
      }

      // Initialize particles
      const particles: Array<{
        x: number;
        y: number;
        radius: number;
        vx: number;
        vy: number;
        alpha: number;
        color: string;
      }> = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 3 + 1,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          alpha: Math.random() * 0.7 + 0.3,
          color: Math.random() > 0.5 ? secondaryColor : accentColor,
        });
      }

      let currentFrame = 0;
      const lyricsText = Array.isArray(scene.correspondingLyrics)
        ? scene.correspondingLyrics.map((l) => l.text).join(' • ')
        : (scene.correspondingLyrics || '');

      function renderFrame() {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        const t = currentFrame / totalFrames; // 0.0 to 1.0 progress
        const zoom = 1.0 + t * 0.08; // Subtle slow push-in zoom

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        // Center zoom transform
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-width / 2, -height / 2);

        // 1. Deep atmospheric background gradient
        const bgGrad = ctx.createRadialGradient(
          width / 2 + Math.sin(t * Math.PI * 2) * 80,
          height / 2 + Math.cos(t * Math.PI * 2) * 50,
          50,
          width / 2,
          height / 2,
          width * 0.8
        );
        bgGrad.addColorStop(0, primaryColor);
        bgGrad.addColorStop(0.6, '#0f172a');
        bgGrad.addColorStop(1, '#020617');

        ctx.fillStyle = bgGrad;
        ctx.fillRect(-50, -50, width + 100, height + 100);

        // 2. Light flare and volumetric atmospheric rays
        const flareX = width * 0.3 + Math.sin(t * Math.PI) * (width * 0.4);
        const flareY = height * 0.35 + Math.cos(t * Math.PI) * (height * 0.1);
        const flareGrad = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 350);
        flareGrad.addColorStop(0, `${secondaryColor}88`);
        flareGrad.addColorStop(0.4, `${primaryColor}33`);
        flareGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = flareGrad;
        ctx.fillRect(-50, -50, width + 100, height + 100);

        // 3. Floating particle system
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * (0.6 + Math.sin(t * Math.PI * 4 + p.radius) * 0.4);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // 4. Cinematic Letterbox / Framing grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(60, 45, width - 120, height - 90);

        // Corner crosshairs
        const drawCrosshair = (cx: number, cy: number) => {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 10, cy);
          ctx.lineTo(cx + 10, cy);
          ctx.moveTo(cx, cy - 10);
          ctx.lineTo(cx, cy + 10);
          ctx.stroke();
        };

        drawCrosshair(80, 65);
        drawCrosshair(width - 80, 65);
        drawCrosshair(80, height - 65);
        drawCrosshair(width - 80, height - 65);

        // 5. Scene Typography & Visual Information
        ctx.restore(); // Restore standard un-zoomed coordinate space for crisp overlays

        // Header overlay
        ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
        ctx.fillRect(0, 0, width, 55);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`SCENE ${String(scene.sceneNumber).padStart(2, '0')} // MOTION SIMULATION PREVIEW`, 60, 35);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`MOOD: ${overallMood.toUpperCase()}  |  ${scene.cameraAngle || 'CINEMATIC SHOT'}`, width - 60, 35);
        ctx.textAlign = 'left';

        // Scene Description & Action center box
        const boxWidth = width - 160;
        const boxX = 80;
        const boxY = height / 2 - 80;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, 160, 12);
        ctx.fill();
        ctx.stroke();

        // Scene description title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px sans-serif';
        const descText = scene.description.length > 120 ? scene.description.substring(0, 117) + '...' : scene.description;
        ctx.fillText(descText, boxX + 30, boxY + 45);

        // VEO / Visual Prompt subtitle
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 15px sans-serif';
        const promptSnippet = scene.veoPrompt.length > 150 ? scene.veoPrompt.substring(0, 147) + '...' : scene.veoPrompt;
        ctx.fillText(`Prompt: "${promptSnippet}"`, boxX + 30, boxY + 80);

        // Dynamic visual progress bar inside scene box
        const barWidth = boxWidth - 60;
        const barX = boxX + 30;
        const barY = boxY + 115;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barWidth, 6);

        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(barX, barY, barWidth * t, 6);

        // 6. Lyrics Subtitle Footer (if present)
        if (lyricsText) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
          ctx.fillRect(0, height - 70, width, 70);

          ctx.fillStyle = '#fef08a'; // Bright lyrics yellow
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`♪ ${lyricsText} ♪`, width / 2, height - 28);
          ctx.textAlign = 'left';
        }

        // Advance to next frame
        currentFrame++;
        if (onProgress && currentFrame % 15 === 0) {
          const percent = Math.round((currentFrame / totalFrames) * 100);
          onProgress(`Rendering motion preview: ${percent}%...`);
        }

        requestAnimationFrame(renderFrame);
      }

      renderFrame();
    } catch (err: any) {
      console.error('Procedural video generation error:', err);
      reject(err);
    }
  });
}
