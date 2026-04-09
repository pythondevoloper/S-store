import React, { useEffect, useRef, useState } from 'react';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, MoveHorizontal, Star, Video, VideoOff, Zap } from 'lucide-react';

interface SEyeControlProps {
  isActive: boolean;
  onToggle: () => void;
  onFavorite: (productId: string) => void;
  onWowEffect: (productId: string) => void;
  focusedProductId: string | null;
}

const SEyeControl: React.FC<SEyeControlProps> = ({ isActive, onToggle, onFavorite, onWowEffect, focusedProductId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [headYaw, setHeadYaw] = useState(0); // -1 to 1 (left to right)
  const [headPitch, setHeadPitch] = useState(0); // -1 to 1 (up to down)
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [emotion, setEmotion] = useState<'neutral' | 'wow'>('neutral');
  const [wowTriggeredFor, setWowTriggeredFor] = useState<string | null>(null);
  const [blinkStartTime, setBlinkStartTime] = useState<number | null>(null);
  const [blinkProgress, setBlinkProgress] = useState(0);

  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      return;
    }

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results: Results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // --- Head Yaw (Rotation) ---
        // Using nose tip (1) and ears (234, 454) or similar
        const nose = landmarks[1];
        const leftFace = landmarks[234];
        const rightFace = landmarks[454];
        
        // Simple yaw estimation based on nose position relative to face edges
        const faceWidth = rightFace.x - leftFace.x;
        const noseRelativeX = (nose.x - leftFace.x) / faceWidth;
        const yaw = (noseRelativeX - 0.5) * 2; // -1 (left) to 1 (right)
        setHeadYaw(yaw);

        // --- Head Pitch (Tilt) ---
        const forehead = landmarks[10];
        const chin = landmarks[152];
        const faceHeight = chin.y - forehead.y;
        const noseRelativeY = (nose.y - forehead.y) / faceHeight;
        const pitch = (noseRelativeY - 0.45) * 4; // Normalized and scaled for sensitivity
        setHeadPitch(Math.max(-1, Math.min(1, pitch)));

        // --- Eye Closure (Blink) ---
        // Left eye: 159 (top), 145 (bottom)
        // Right eye: 386 (top), 374 (bottom)
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];

        const leftDist = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightDist = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        
        // Threshold for closed eyes (normalized distance)
        const threshold = 0.015; 
        const closed = leftDist < threshold && rightDist < threshold;
        setIsEyesClosed(closed);

        // --- Emotion Detection (Wow Effect) ---
        // Mouth corners: 61, 291
        // Mouth top/bottom: 13, 14
        const mouthLeft = landmarks[61];
        const mouthRight = landmarks[291];
        const mouthTop = landmarks[13];
        const mouthBottom = landmarks[14];
        
        const mouthWidth = Math.sqrt(Math.pow(mouthRight.x - mouthLeft.x, 2) + Math.pow(mouthRight.y - mouthLeft.y, 2));
        const mouthHeight = Math.sqrt(Math.pow(mouthBottom.x - mouthTop.x, 2) + Math.pow(mouthBottom.y - mouthTop.y, 2));
        
        const mouthRatio = mouthWidth / faceWidth;
        const openRatio = mouthHeight / faceHeight;

        // Smile detection (wide mouth) or Surprise detection (open mouth)
        if (mouthRatio > 0.45 || openRatio > 0.12) {
          setEmotion('wow');
        } else {
          setEmotion('neutral');
        }
      } else {
        setHeadYaw(0);
        setIsEyesClosed(false);
      }
    });

    faceMeshRef.current = faceMesh;

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current! });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start().then(() => setIsCameraReady(true));
      cameraRef.current = camera;
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (faceMeshRef.current) faceMeshRef.current.close();
    };
  }, [isActive]);

  // Handle Head Movement -> Scrolling
  useEffect(() => {
    if (!isActive) return;
    
    const scrollSpeed = 30;
    const threshold = 0.3;
    
    const interval = setInterval(() => {
      // Horizontal Scrolling (Yaw)
      if (Math.abs(headYaw) > threshold) {
        const direction = headYaw > 0 ? 1 : -1;
        window.scrollBy({
          left: direction * scrollSpeed,
          behavior: 'auto'
        });
        
        const main = document.querySelector('main');
        if (main) {
          const currentTransform = main.style.transform || 'translateX(0px)';
          const match = currentTransform.match(/translateX\(([-\d.]+)px\)/);
          const currentX = match ? parseFloat(match[1]) : 0;
          const newX = Math.max(Math.min(currentX - (direction * 10), 100), -100);
          main.style.transform = `translateX(${newX}px)`;
          main.style.transition = 'transform 0.1s ease-out';
        }
      } else {
        const main = document.querySelector('main');
        if (main && Math.abs(headPitch) <= threshold) {
          main.style.transform = 'translateX(0px)';
          main.style.transition = 'transform 0.5s ease-out';
        }
      }

      // Vertical Scrolling (Pitch)
      if (Math.abs(headPitch) > threshold) {
        const direction = headPitch > 0 ? 1 : -1;
        window.scrollBy({
          top: direction * scrollSpeed,
          behavior: 'auto'
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, headYaw, headPitch]);

  // Handle Wow Effect -> Discount
  useEffect(() => {
    if (!isActive || !focusedProductId) return;

    if (emotion === 'wow' && wowTriggeredFor !== focusedProductId) {
      onWowEffect(focusedProductId);
      setWowTriggeredFor(focusedProductId);
      
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }
  }, [isActive, emotion, focusedProductId, wowTriggeredFor, onWowEffect]);

  // Reset wow triggered when product changes significantly
  useEffect(() => {
    if (!focusedProductId) {
      setWowTriggeredFor(null);
    }
  }, [focusedProductId]);

  // Handle Blink -> Favorite
  useEffect(() => {
    if (!isActive) return;

    if (isEyesClosed) {
      if (!blinkStartTime) {
        setBlinkStartTime(Date.now());
      } else {
        const elapsed = Date.now() - blinkStartTime;
        const progress = Math.min((elapsed / 2000) * 100, 100);
        setBlinkProgress(progress);

        if (elapsed >= 2000 && focusedProductId) {
          onFavorite(focusedProductId);
          setBlinkStartTime(null); // Reset after success
          setBlinkProgress(0);
          
          // Haptic feedback simulation
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      }
    } else {
      setBlinkStartTime(null);
      setBlinkProgress(0);
    }
  }, [isActive, isEyesClosed, blinkStartTime, focusedProductId, onFavorite]);

  return (
    <div className="fixed bottom-8 left-8 z-[200] flex flex-col items-start gap-4">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            className="relative w-48 h-36 bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover opacity-40 grayscale"
              autoPlay
              playsInline
              muted
            />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/50">S-EYE Active</span>
                </div>
                <div className="flex gap-1">
                  {emotion === 'wow' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-brand-accent p-1 rounded-full"
                    >
                      <Zap className="w-3 h-3 text-brand-bg fill-current" />
                    </motion.div>
                  )}
                  {isEyesClosed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-emerald-500 p-1 rounded-full"
                    >
                      <Star className="w-3 h-3 text-white fill-current" />
                    </motion.div>
                  )}
                </div>
              </div>

              {emotion === 'wow' && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-brand-accent/20 border border-brand-accent/50 px-2 py-1 rounded-lg"
                >
                  <p className="text-[8px] font-black text-brand-accent uppercase tracking-tighter">Wow Effect Detected!</p>
                  <p className="text-[6px] text-white/70 uppercase">5% Discount Unlocked</p>
                </motion.div>
              )}

              <div className="space-y-2">
              <div className="flex gap-2 items-end h-16">
                {/* Yaw Indicator */}
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative self-end mb-1">
                  <motion.div 
                    className="absolute top-0 bottom-0 bg-brand-accent w-1/2"
                    animate={{ 
                      left: headYaw > 0 ? '50%' : `${50 + (headYaw * 50)}%`,
                      width: `${Math.abs(headYaw * 50)}%`
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                </div>

                {/* Pitch Indicator */}
                <div className="w-1 h-full bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div 
                    className="absolute left-0 right-0 bg-brand-accent h-1/2"
                    animate={{ 
                      top: headPitch > 0 ? '50%' : `${50 + (headPitch * 50)}%`,
                      height: `${Math.abs(headPitch * 50)}%`
                    }}
                  />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
                </div>
              </div>

                {/* Blink Progress */}
                {blinkProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[6px] font-black uppercase text-brand-accent">Favoriting...</span>
                      <span className="text-[6px] font-black text-white">{Math.floor(blinkProgress)}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        style={{ width: `${blinkProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scanning Effect */}
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-px bg-brand-accent/30 shadow-[0_0_10px_rgba(0,212,255,0.5)] z-20"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggle}
        className={`p-4 rounded-2xl border transition-all flex items-center gap-3 group ${
          isActive 
            ? 'bg-brand-accent border-brand-accent text-brand-bg shadow-[0_0_30px_rgba(0,212,255,0.4)]' 
            : 'bg-black/50 backdrop-blur-xl border-white/10 text-white hover:border-brand-accent/50'
        }`}
      >
        <div className="relative">
          {isActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-gray-500" />}
          {isActive && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
            />
          )}
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">S-EYE Control</p>
          <p className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">Webcam Navigation</p>
        </div>
      </button>
    </div>
  );
};

export default SEyeControl;
