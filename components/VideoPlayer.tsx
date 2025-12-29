import React, { useRef, useEffect, useState, useMemo } from 'react';
import { LyricSegment, AnimationType, BackgroundEffect, TransitionType } from '../types';
import { Maximize2, Minimize2, Play, Pause, SkipForward, SkipBack, X, Maximize, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  audioUrl: string | null;
  imageUrls: string[]; 
  lyrics: LyricSegment[];
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  onToggleExpand?: () => void;
  onTogglePlay?: () => void;
  onClose?: () => void; // New prop for explicit closing
  isExpanded?: boolean;
  globalOffset?: number;
  // backgroundEffect removed from props (it's inside lyrics now)
  backgroundEffect?: any; 
  transitionType?: TransitionType;
  smartTextEnabled?: boolean;
  hideControls?: boolean;
  selectedLyricId?: string | null;
  onLyricClick?: (id: string) => void;
  isVideoMode?: boolean; // New prop to enable video background
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  audioUrl,
  imageUrls,
  lyrics,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onToggleExpand,
  onTogglePlay,
  onClose,
  isExpanded = false,
  globalOffset = 0,
  transitionType = TransitionType.FADE,
  smartTextEnabled = true,
  hideControls = false,
  selectedLyricId,
  onLyricClick,
  isVideoMode = false
}) => {
  const mediaRef = useRef<HTMLMediaElement>(null); // Changed to generic media element
  const [showControls, setShowControls] = useState(false);
  const [duration, setLocalDuration] = useState(0);

  // Volume State
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // --- Background Transition Logic ---
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previousImageIndex, setPreviousImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine active image index based on time
  const calculatedIndex = useMemo(() => {
    if (imageUrls.length === 0) return -1;
    if (imageUrls.length === 1) return 0;
    const interval = 8; // seconds per image
    return Math.floor(currentTime / interval) % imageUrls.length;
  }, [currentTime, imageUrls.length]);

  useEffect(() => {
    if (calculatedIndex !== currentImageIndex && calculatedIndex !== -1) {
        setPreviousImageIndex(currentImageIndex);
        setCurrentImageIndex(calculatedIndex);
        setIsTransitioning(true);
        // Reset transition state after animation duration
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 1000); // Transition duration matches CSS
        return () => clearTimeout(timer);
    }
  }, [calculatedIndex, currentImageIndex]);


  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.play().catch(e => console.error("Play failed:", e));
      } else {
        mediaRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync volume state to audio element
  useEffect(() => {
      if (mediaRef.current) {
          mediaRef.current.volume = isMuted ? 0 : volume;
          mediaRef.current.muted = isMuted;
      }
  }, [volume, isMuted]);

  useEffect(() => {
    if (mediaRef.current) {
        // Reduced threshold to 0.2s to make seeking more responsive while avoiding feedback loops
        const diff = Math.abs(mediaRef.current.currentTime - currentTime);
        if (diff > 0.2) {
            mediaRef.current.currentTime = currentTime;
        }
    }
  }, [currentTime]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const media = e.currentTarget;
    setLocalDuration(media.duration);
    onDurationChange(media.duration);
    // Apply current volume state
    media.volume = isMuted ? 0 : volume;
    media.muted = isMuted;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
    onTimeUpdate(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Timing Adjustment ---
  const getAnimationOffset = (anim: AnimationType) => {
      switch(anim) {
          case AnimationType.STOMP: return 0.2;
          case AnimationType.ZOOM_IN: return 0.1;
          case AnimationType.LIGHT_SPEED: return 0.1;
          case AnimationType.KINETIC: return 0.1;
          case AnimationType.EVANGELION_TITLE: return 0.05;
          default: return 0;
      }
  };

  const activeLyrics = lyrics.filter(l => {
    const animOffset = getAnimationOffset(l.style.animation);
    const effectiveStart = l.startTime + globalOffset - animOffset;
    const effectiveEnd = l.endTime + globalOffset;
    return currentTime >= effectiveStart && currentTime <= effectiveEnd;
  });

  // Get current active effects set
  const activeEffects = useMemo(() => {
      const effects = new Set<BackgroundEffect>();
      activeLyrics.forEach(l => {
          // Add single legacy effect
          if (l.style.backgroundEffect && l.style.backgroundEffect !== BackgroundEffect.NONE) {
              effects.add(l.style.backgroundEffect);
          }
          // Add new array effects
          if (l.style.effects) {
              l.style.effects.forEach(e => {
                  if (e !== BackgroundEffect.NONE) effects.add(e);
              });
          }
      });
      return effects;
  }, [activeLyrics]);

  const getPositionClass = (pos: string) => {
    switch(pos) {
      case 'top': return 'top-[15%]';
      case 'bottom': return 'bottom-[20%]';
      default: return 'top-1/2 -translate-y-1/2';
    }
  };

  // Use container query units (cqw) for scaling text relative to the video container
  const getSizeStyle = (size: string, textLength: number): React.CSSProperties => {
    // Smart auto-sizing: Reduce size if text is long
    let effectiveSize = size;
    if (textLength > 12 && size === '6xl') effectiveSize = '4xl';
    else if (textLength > 20 && (size === '4xl' || size === '6xl')) effectiveSize = '2xl';
    
    // Values are percentage of Container Width (cqw)
    switch(effectiveSize) {
      case 'sm': return { fontSize: '4cqw' };
      case 'md': return { fontSize: '5cqw' };
      case 'lg': return { fontSize: '7cqw' };
      case 'xl': return { fontSize: '9cqw' };
      case '2xl': return { fontSize: '11cqw' };
      case '4xl': return { fontSize: '14cqw' };
      case '6xl': return { fontSize: '18cqw' };
      default: return { fontSize: '14cqw' };
    }
  };

  const getFontFamilyClass = (font: string) => {
    switch(font) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'display': return 'font-display';
      case 'handwriting': return 'font-handwriting';
      case 'pixel': return 'font-pixel';
      case 'mincho': return 'font-mincho';
      case 'horror': return 'font-horror';
      case 'retro': return 'font-retro';
      case 'futuristic': return 'font-futuristic';
      case 'comic': return 'font-comic';
      // New Fonts
      case 'zen-maru': return 'font-zen-maru';
      case 'dela-gothic': return 'font-dela-gothic';
      case 'hachi-maru': return 'font-hachi-maru';
      case 'yuji-syuku': return 'font-yuji-syuku';
      default: return 'font-sans';
    }
  };

  // Consolidated function to get background class
  // We prioritize motion effects here, filters are handled in renderVisuals
  const getMotionClass = (effects: Set<BackgroundEffect>) => {
      // Prioritize effects in order
      if (effects.has(BackgroundEffect.ZOOM_FAST)) return 'animate-bgZoomFast';
      if (effects.has(BackgroundEffect.ZOOM_SLOW)) return 'animate-bgZoom';
      if (effects.has(BackgroundEffect.SHAKE)) return 'animate-bgShake';
      if (effects.has(BackgroundEffect.SWAY)) return 'animate-bgSway';
      if (effects.has(BackgroundEffect.KEN_BURNS)) return 'animate-kenBurns';
      if (effects.has(BackgroundEffect.PAN_HORIZONTAL)) return 'animate-bgPan';
      if (effects.has(BackgroundEffect.ROTATE_SLOW)) return 'animate-bgRotate';
      if (effects.has(BackgroundEffect.PULSE_BEAT)) return 'animate-bgPulse';
      return '';
  };

  // Helper to determine filter classes
  const getFilterClasses = (effects: Set<BackgroundEffect>) => {
      let classes = '';
      if (effects.has(BackgroundEffect.BW_CONTRAST)) classes += ' grayscale contrast-125';
      if (effects.has(BackgroundEffect.SEPIA_DREAM)) classes += ' sepia brightness-90 contrast-85';
      if (effects.has(BackgroundEffect.VHS)) classes += ' sepia-[0.3] contrast-125 saturate-150';
      if (effects.has(BackgroundEffect.OLD_FILM)) classes += ' sepia-[0.5] contrast-110';
      if (effects.has(BackgroundEffect.INVERT)) classes += ' invert';
      if (effects.has(BackgroundEffect.GLITCH_ART)) classes += ' animate-bgGlitch';
      if (effects.has(BackgroundEffect.CHROMATIC)) classes += ' animate-chromatic';
      if (effects.has(BackgroundEffect.RAINBOW_HUE)) classes += ' animate-bgRainbow';
      if (effects.has(BackgroundEffect.STROBE)) classes += ' animate-bgStrobe';
      return classes;
  };

  const getTransitionClass = (type: TransitionType) => {
      switch(type) {
          case TransitionType.FADE: return 'opacity-0'; 
          case TransitionType.SLIDE_LEFT: return '-translate-x-full opacity-50';
          case TransitionType.ZOOM_FADE: return 'scale-150 opacity-0';
          case TransitionType.BLUR: return 'blur-xl opacity-0';
          case TransitionType.FLASH: return 'brightness-[3] opacity-0';
          default: return 'opacity-0';
      }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.player-controls')) return;
    if ((e.target as HTMLElement).closest('.lyric-text-element')) return; 

    if (onTogglePlay) {
      onTogglePlay();
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleExpand) onToggleExpand();
  };

  const renderSmartText = (text: string) => {
      if (!smartTextEnabled) return text;
      
      const parts = text.split(/([\u4e00-\u9faf\u3005-\u3007]+|[\u3040-\u309f]+|[\u30a0-\u30ff]+)/g).filter(Boolean);
      
      return parts.map((part, i) => {
          if (/[\u4e00-\u9faf\u3005-\u3007]/.test(part)) {
              return <span key={i} className="text-[1.25em] font-bold tracking-tight">{part}</span>;
          }
          if (/[\u3040-\u309f]/.test(part)) {
              return <span key={i} className="text-[0.85em] opacity-90 font-medium tracking-wide">{part}</span>;
          }
          if (/[\u30a0-\u30ff]/.test(part)) {
             return <span key={i} className="text-[1.0em] font-bold">{part}</span>;
          }
          return <span key={i}>{part}</span>;
      });
  };

  const renderStaggeredText = (text: string, style: any, baseAnimName: string, baseDelay: number = 0.05) => {
    const chars = text.split('');
    // [Vertical Fix] Added items-center justify-center content-center to enforce alignment in flex container
    return (
      <span className={`inline-flex flex-wrap ${style.vertical ? 'max-h-full items-center justify-center content-center' : 'justify-center'}`} style={{ gap: style.vertical ? '0.2em' : '0' }}>
        {chars.map((char, index) => {
           // Handle manual line break or AI inserted newline
           if (char === '\n') return <span key={index} className="basis-full h-0 block"></span>;

           let className = `inline-block opacity-0 fill-mode-forwards ${baseAnimName} `;
           
           if (smartTextEnabled) {
               if (/[\u4e00-\u9faf\u3005-\u3007]/.test(char)) className += "text-[1.2em] font-bold ";
               else if (/[\u3040-\u309f]/.test(char)) className += "text-[0.9em] opacity-90 ";
           }
           if (char === ' ') return <span key={index} className="w-2 md:w-4 inline-block">&nbsp;</span>;
            
           // Generate deterministic random values based on char code and index
           const seed = char.charCodeAt(0) + index * 113;
           const rndX = ((seed % 20) - 10) + 'px'; // -10 to 10
           const rndY = ((seed % 30) - 15) + 'px'; // -15 to 15
           const rndRot = ((seed % 10) - 5) + 'deg'; // -5 to 5
           const rndScale = 0.8 + (seed % 40) / 100; // 0.8 to 1.2
           
           return (
            <span 
              key={index} 
              className={className}
              style={{ 
                animationDelay: `${index * baseDelay}s`,
                whiteSpace: 'pre',
                // Pass random values to CSS
                ['--rnd-x' as any]: rndX,
                ['--rnd-y' as any]: rndY,
                ['--rnd-rot' as any]: rndRot,
                ['--rnd-scale' as any]: rndScale,
              }}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  const renderLyricText = (lyric: LyricSegment) => {
    const { text, style } = lyric;
    const duration = Math.max(0.5, lyric.endTime - lyric.startTime);

    if (style.animation === AnimationType.NEON_PULSE) {
      return <span className="animate-neonPulse whitespace-pre-wrap">{smartTextEnabled ? renderSmartText(text) : text}</span>;
    }
    if (style.animation === AnimationType.GLITCH) {
      return <span className="animate-glitch relative inline-block whitespace-pre-wrap">{smartTextEnabled ? renderSmartText(text) : text}</span>;
    }
    if (style.animation === AnimationType.REVEAL_MASK) {
       return <span className="animate-revealMask inline-block whitespace-pre-wrap">{smartTextEnabled ? renderSmartText(text) : text}</span>;
    }
    if (style.animation === AnimationType.KARAOKE_WIPE) {
       return (
        <span 
          className="bg-clip-text text-transparent bg-gradient-to-r from-current to-white/10 animate-karaokeWipe bg-[length:200%_100%] whitespace-pre-wrap"
          style={{ 
            backgroundImage: `linear-gradient(to right, ${style.color} 50%, rgba(255,255,255,0.1) 50%)`,
            animationDuration: `${duration}s`,
            WebkitBackgroundClip: 'text'
          }}
        >
          {smartTextEnabled ? renderSmartText(text) : text}
        </span>
       );
    }
    
    // EVANGELION SPECIAL
    if (style.animation === AnimationType.EVANGELION_TITLE) {
        // Force font to Mincho-like if not already
        const isMincho = style.fontFamily === 'mincho' || style.fontFamily === 'serif' || style.fontFamily === 'dela-gothic';
        const evaFont = isMincho ? '' : 'font-dela-gothic'; 
        return (
            <div className={`relative ${evaFont} tracking-tighter whitespace-pre-wrap`}>
                 <div className="absolute inset-0 transform scale-[1.02] blur-[1px] opacity-70 text-white mix-blend-overlay">
                    {text}
                 </div>
                 <span className="inline-block animate-evaImpact scale-y-110 origin-bottom">
                    {text}
                 </span>
            </div>
        );
    }

    if (style.animation === AnimationType.TYPE_CURSOR) {
        return (
            <span className="inline-flex items-center flex-wrap justify-center">
                {renderStaggeredText(text, style, 'animate-fadeIn', 0.08)}
                <span className="w-[0.5em] h-[1em] bg-current animate-cursorBlink ml-1 inline-block" />
            </span>
        );
    }

    switch (style.animation) {
      // Existing
      case AnimationType.SLIDE_UP: return renderStaggeredText(text, style, 'animate-aeSlideUp', 0.04);
      case AnimationType.TYPEWRITER: return renderStaggeredText(text, style, 'animate-fadeIn', 0.08);
      case AnimationType.SMOOTH_RISE: return renderStaggeredText(text, style, 'animate-aeSmoothRise', 0.06);
      case AnimationType.FADE_IN: return renderStaggeredText(text, style, 'animate-aeFadeDrift', 0.05);
      case AnimationType.BLUR_REVEAL: return renderStaggeredText(text, style, 'animate-aeBlurReveal', 0.08);
      case AnimationType.BOUNCE_IN: return renderStaggeredText(text, style, 'animate-bounceIn', 0.06);
      case AnimationType.CHAR_WAVE: return <span className={`inline-flex flex-wrap ${style.vertical ? 'max-h-full items-center justify-center content-center' : 'justify-center'}`}>{text.split('').map((char, index) => char === '\n' ? <span key={index} className="basis-full h-0 block"></span> : (<span key={index} className="animate-charWave" style={{ animationDelay: `${index * 0.1}s` }}>{char}</span>))}</span>;
      case AnimationType.STOMP: return renderStaggeredText(text, style, 'animate-stomp', 0.1);
      case AnimationType.LIGHT_SPEED: return renderStaggeredText(text, style, 'animate-lightSpeed', 0.03);
      case AnimationType.CINEMATIC: return renderStaggeredText(text, style, 'animate-cinematic', 0.15);
      case AnimationType.ROTATE_IN: return renderStaggeredText(text, style, 'animate-rotateIn', 0.05);
      case AnimationType.ZOOM_IN: return renderStaggeredText(text, style, 'animate-aeZoom', 0.05);
      case AnimationType.WORD_SPREAD: return <span className="inline-block animate-wordSpread whitespace-pre-wrap">{smartTextEnabled ? renderSmartText(text) : text}</span>;
      
      case AnimationType.ASSEMBLE: return renderStaggeredText(text, style, 'animate-assemble', 0.05);
      case AnimationType.LETTER_SLIDE: return renderStaggeredText(text, style, 'animate-letterSlide', 0.06);
      case AnimationType.KINETIC: return renderStaggeredText(text, style, 'animate-kinetic', 0.04);
      case AnimationType.PARTICLE: return renderStaggeredText(text, style, 'animate-particleGather', 0.02);
      
      // New 1-char Animations
      case AnimationType.ELASTIC_BOUNCE: return renderStaggeredText(text, style, 'animate-elasticBounce', 0.08);
      case AnimationType.FLIP_3D: return renderStaggeredText(text, style, 'animate-flip3D', 0.06);
      case AnimationType.GLOW_STAGGER: return renderStaggeredText(text, style, 'animate-glowStagger', 0.1);
      case AnimationType.LIQUID_WAVE: return <span className={`inline-flex flex-wrap ${style.vertical ? 'max-h-full items-center justify-center content-center' : 'justify-center'}`}>{text.split('').map((char, index) => char === '\n' ? <span key={index} className="basis-full h-0 block"></span> : (<span key={index} className="animate-liquidWave" style={{ animationDelay: `${index * 0.1}s` }}>{char}</span>))}</span>;
      
      // NEW ADDITIONS
      case AnimationType.GHOST_TRAIL: return renderStaggeredText(text, style, 'animate-ghostTrail', 0.08);
      case AnimationType.SIGNAL_DECODE: return renderStaggeredText(text, style, 'animate-signalDecode', 0.05);
      case AnimationType.FLASH_BANG: return renderStaggeredText(text, style, 'animate-flashBang', 0.02);
      case AnimationType.SLIT_SCAN: return renderStaggeredText(text, style, 'animate-slitScan', 0.06);
      case AnimationType.SINE_WAVE: return renderStaggeredText(text, style, 'animate-sineRise', 0.08);

      default: return renderStaggeredText(text, style, 'animate-fadeIn', 0.03);
    }
  };

  // --- Visuals Rendering with Transitions ---
  const renderVisuals = () => {
      // If video mode is enabled, we don't render image divs here (video element is handled separately)
      // UNLESS there is no video url, then show placeholder
      if (isVideoMode && audioUrl) {
         return null; // Video element is in the main return
      }

      if (!imageUrls || imageUrls.length === 0) {
          return (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 gap-2">
                <div className="animate-pulse bg-zinc-800 p-4 rounded-full">
                    <Maximize2 size={32} />
                </div>
                <p>メディアをアップロードしてください</p>
             </div>
          );
      }

      const getStyleForImage = (url: string, index: number) => {
          // Use 'contain' to ensure full image visibility without cropping, effectively adding black bars if aspect ratio differs.
          const baseStyle: React.CSSProperties = {
             backgroundImage: `url(${url})`,
             backgroundSize: 'contain', 
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat',
             // Force hardware acceleration to prevent flicker
             backfaceVisibility: 'hidden',
          };
          
          if (activeEffects.has(BackgroundEffect.PIXELATE)) {
               return { ...baseStyle, imageRendering: 'pixelated' as React.CSSProperties['imageRendering'] };
          }

          return baseStyle;
      };

      const motionClass = getMotionClass(activeEffects);
      const filterClasses = getFilterClasses(activeEffects);

      return (
        <div className="absolute inset-0 overflow-hidden bg-black">
           {isTransitioning && previousImageIndex >= 0 && (
             <div 
               className={`absolute inset-0 transition-all duration-1000 ease-in-out z-0 ${getTransitionClass(transitionType)} ${motionClass} ${filterClasses}`}
               style={getStyleForImage(imageUrls[previousImageIndex], previousImageIndex)}
             />
           )}
           {currentImageIndex >= 0 && (
             <div 
               className={`absolute inset-0 transition-all duration-1000 ease-in-out z-10 ${isTransitioning ? 'animate-in fade-in duration-1000' : ''} ${motionClass} ${filterClasses}`}
               style={getStyleForImage(imageUrls[currentImageIndex], currentImageIndex)}
             />
           )}
        </div>
      );
  };
  
  // Render overlays (glitch, noise etc) that sit ON TOP of either video or images
  const renderOverlays = () => {
      return (
           <div className="absolute inset-0 z-15 pointer-events-none">
                {activeEffects.has(BackgroundEffect.GLITCH_ART) && (
                    <div className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-50 mix-blend-color-dodge animate-bgGlitch2" style={{ backgroundImage: isVideoMode ? 'none' : `url(${imageUrls[currentImageIndex]})` }} />
                )}
                {activeEffects.has(BackgroundEffect.VHS) && (
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 animate-bgNoise mix-blend-overlay" />
                )}
                {activeEffects.has(BackgroundEffect.OLD_FILM) && (
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />
                )}
                {activeEffects.has(BackgroundEffect.PIXELATE) && (
                   <div className="absolute inset-0 backdrop-blur-[2px]" />
                )}
                {activeEffects.has(BackgroundEffect.VIGNETTE) && (
                   <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.8)_100%)]" />
                )}

                {/* --- Chaotic Effects --- */}
                {activeEffects.has(BackgroundEffect.NOISE_STORM) && (
                   <>
                     <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] animate-chaosNoise" />
                     <div className="absolute inset-0 bg-black/10 mix-blend-difference animate-chaosShift1" />
                     <div className="absolute inset-0 bg-white/20 mix-blend-screen animate-chaosFlash" />
                   </>
                )}
                
                {activeEffects.has(BackgroundEffect.TV_STATIC) && (
                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] animate-bgNoise mix-blend-screen" />
                )}

                {activeEffects.has(BackgroundEffect.THUNDER) && (
                    <div className="absolute inset-0 bg-white animate-thunderStrobe mix-blend-hard-light" />
                )}
                
                {activeEffects.has(BackgroundEffect.SPOTLIGHT) && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_10%,rgba(0,0,0,0.8)_80%)] animate-spotlight" />
                )}
                
                <div className={`absolute inset-0 bg-black/30 ${activeEffects.has(BackgroundEffect.DARKEN) ? 'bg-black/60' : ''}`} />
           </div>
      );
  }

  // --- Main Render Structure ---
  return (
    <div 
      className={`
         relative bg-zinc-950 flex items-center justify-center overflow-hidden
         ${isExpanded ? 'w-full h-full' : 'w-full h-full rounded-xl ring-1 ring-zinc-800 shadow-2xl'}
      `}
      onClick={handleContainerClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => !hideControls && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Kaisei+Tokumin:wght@400;700&family=Yusei+Magic&family=Creepster&family=Press+Start+2P&family=Orbitron:wght@500&family=Bangers&family=Zen+Maru+Gothic:wght@500;700&family=Dela+Gothic+One&family=Hachi+Maru+Pop&family=Yuji+Syuku&display=swap');
        
        /* Font Classes */
        .font-handwriting { font-family: 'Yusei Magic', sans-serif; }
        .font-pixel { font-family: 'DotGothic16', sans-serif; }
        .font-mincho { font-family: 'Kaisei Tokumin', serif; }
        .font-horror { font-family: 'Creepster', display; }
        .font-retro { font-family: 'Press Start 2P', display; }
        .font-futuristic { font-family: 'Orbitron', sans-serif; }
        .font-comic { font-family: 'Bangers', display; }
        /* New Fonts */
        .font-zen-maru { font-family: 'Zen Maru Gothic', sans-serif; }
        .font-dela-gothic { font-family: 'Dela Gothic One', display; }
        .font-hachi-maru { font-family: 'Hachi Maru Pop', cursive; }
        .font-yuji-syuku { font-family: 'Yuji Syuku', serif; }

        .fill-mode-forwards { animation-fill-mode: forwards; }

        /* Animation Keyframes */

        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-aeSlideUp { animation: aeSlideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-aeSmoothRise { animation: aeSmoothRise 0.8s ease-out forwards; }
        .animate-aeFadeDrift { animation: aeFadeDrift 1s ease-out forwards; }
        .animate-aeBlurReveal { animation: aeBlurReveal 0.6s ease-out forwards; }
        .animate-aeZoom { animation: aeZoom 0.4s ease-out forwards; }
        .animate-bounceIn { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-charWave { animation: charWave 1s ease-in-out infinite; }
        .animate-neonPulse { animation: neonPulse 1.5s ease-in-out infinite; }
        .animate-glitch { animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite; }
        .animate-karaokeWipe { animation: karaokeWipe linear forwards; }
        .animate-wordSpread { animation: wordSpread 0.8s ease-out forwards; }
        .animate-stomp { animation: stomp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-lightSpeed { animation: lightSpeed 0.5s ease-out forwards; }
        .animate-cinematic { animation: cinematic 2s ease-out forwards; }
        .animate-rotateIn { animation: rotateIn 0.6s ease-out forwards; }
        
        .animate-assemble { animation: assemble 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-letterSlide { animation: letterSlide 0.5s ease-out forwards; }
        .animate-kinetic { animation: kinetic 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards; }
        .animate-particleGather { animation: particleGather 0.8s ease-out forwards; }
        .animate-revealMask { animation: revealMask 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

        /* New Animations */
        .animate-elasticBounce { animation: elasticBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        .animate-flip3D { animation: flip3D 0.6s ease-out forwards; }
        .animate-cursorBlink { animation: cursorBlink 1s step-end infinite; }
        .animate-glowStagger { animation: glowStagger 0.8s ease-out forwards; }
        .animate-liquidWave { animation: liquidWave 2s ease-in-out infinite; }
        .animate-evaImpact { animation: evaImpact 0.2s cubic-bezier(0.1, 0.7, 0.1, 1) forwards; }

        /* --- NEW ANIMATION KEYFRAMES --- */
        
        .animate-ghostTrail { animation: ghostTrail 0.8s ease-out forwards; }
        @keyframes ghostTrail {
          0% { opacity: 0; transform: translateX(-20px) scale(0.8); filter: blur(10px); }
          50% { opacity: 0.5; transform: translateX(5px) scale(1.1); filter: blur(2px); }
          100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }

        .animate-signalDecode { animation: signalDecode 0.5s steps(10) forwards; }
        @keyframes signalDecode {
          0% { opacity: 0; color: #0f0; text-shadow: 0 0 10px #0f0; transform: scaleY(0.1); }
          50% { opacity: 1; color: #fff; text-shadow: none; transform: scaleY(1.5); }
          100% { opacity: 1; transform: scaleY(1); }
        }

        .animate-flashBang { animation: flashBang 0.2s ease-out forwards; }
        @keyframes flashBang {
          0% { opacity: 0; filter: brightness(10) blur(5px); transform: scale(1.2); }
          20% { opacity: 1; filter: brightness(5); }
          100% { opacity: 1; filter: brightness(1); transform: scale(1); }
        }

        .animate-slitScan { animation: slitScan 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes slitScan {
          0% { opacity: 0; transform: scaleY(0); transform-origin: center; filter: brightness(2); }
          100% { opacity: 1; transform: scaleY(1); transform-origin: center; filter: brightness(1); }
        }

        .animate-sineRise { animation: sineRise 0.8s ease-out forwards; }
        @keyframes sineRise {
          0% { opacity: 0; transform: translateY(20px); }
          50% { transform: translateY(-5px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* --- EXISTING KEYFRAMES --- */

        @keyframes elasticBounce {
            0% { transform: scale3d(0.3, 0.3, 0.3); opacity: 0; }
            20% { transform: scale3d(1.1, 1.1, 1.1); }
            40% { transform: scale3d(0.9, 0.9, 0.9); }
            60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); }
            80% { transform: scale3d(0.97, 0.97, 0.97); }
            100% { opacity: 1; transform: scale3d(1, 1, 1); }
        }

        @keyframes flip3D {
            0% { transform: perspective(400px) rotateY(90deg); opacity: 0; }
            100% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
        }

        @keyframes cursorBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        @keyframes glowStagger {
            0% { opacity: 0; text-shadow: 0 0 0 transparent; transform: scale(1.1); }
            50% { opacity: 1; text-shadow: 0 0 20px currentColor; transform: scale(1); }
            100% { opacity: 1; text-shadow: 0 0 0 transparent; }
        }

        @keyframes liquidWave {
            0%, 100% { transform: translateY(0) skewX(0); }
            25% { transform: translateY(-3px) skewX(-2deg); }
            75% { transform: translateY(3px) skewX(2deg); }
        }

        @keyframes evaImpact {
            0% { transform: scale(2); opacity: 0; filter: blur(4px); }
            100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }


        @keyframes assemble {
            0% { 
                opacity: 0; 
                transform: translate(var(--rnd-x, 20px), 50px) scale(1.5); 
                letter-spacing: 1em; 
                filter: blur(8px); 
            }
            50% { 
                opacity: 0.5; 
                transform: translate(calc(var(--rnd-x, 0px) * -0.5), -10px) scale(0.9); 
            }
            100% { 
                opacity: 1; 
                transform: translate(0) scale(1); 
                letter-spacing: normal; 
                filter: blur(0); 
            }
        }

        @keyframes letterSlide {
            0% { 
                opacity: 0; 
                transform: translateX(var(--rnd-x, -20px)); 
            }
            100% { 
                opacity: 1; 
                transform: translateX(0); 
            }
        }

        @keyframes kinetic {
            0% { 
                opacity: 0; 
                transform: scale(0.2) rotate(var(--rnd-rot, -90deg)); 
            }
            60% { 
                transform: scale(1.2) rotate(calc(var(--rnd-rot, 10deg) * -0.5)); 
            }
            100% { 
                opacity: 1; 
                transform: scale(1) rotate(0); 
            }
        }

        @keyframes particleGather {
            0% { 
                opacity: 0; 
                letter-spacing: 1em; 
                filter: blur(10px); 
                text-shadow: 10px 0 20px currentColor; 
                transform: scale(1.5) translate(var(--rnd-x, 0px), var(--rnd-y, 0px)); 
            }
            100% { 
                opacity: 1; 
                letter-spacing: normal; 
                filter: blur(0); 
                text-shadow: none; 
                transform: scale(1) translate(0,0); 
            }
        }

        @keyframes aeSlideUp { 
            0% { 
                opacity: 0; 
                transform: translateY(40px) translateX(var(--rnd-x, 0px)) scale(0.9); 
                filter: blur(10px); 
            } 
            100% { 
                opacity: 1; 
                transform: translateY(0) translateX(0) scale(1); 
                filter: blur(0); 
            } 
        }

        @keyframes aeSmoothRise { 
            0% { 
                opacity: 0; 
                transform: translateY(20px) rotateX(var(--rnd-rot, 20deg)); 
            } 
            100% { 
                opacity: 1; 
                transform: translateY(0) rotateX(0); 
            } 
        }

        @keyframes stomp { 
            0% { 
                opacity: 0; 
                transform: scale(3) rotate(var(--rnd-rot, 0deg)); 
            } 
            40% { 
                opacity: 1; 
                transform: scale(0.9); 
            } 
            60% { 
                transform: scale(1.05); 
            } 
            100% { 
                transform: scale(1); 
            } 
        }

        @keyframes revealMask {
            0% { clip-path: inset(0 100% 0 0); opacity: 0; transform: translateY(10px); }
            1% { opacity: 1; }
            100% { clip-path: inset(0 0 0 0); opacity: 1; transform: translateY(0); }
        }


        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes aeFadeDrift { 0% { opacity: 0; transform: translateY(10px); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes aeBlurReveal { 0% { opacity: 0; filter: blur(15px); transform: scale(1.1); letter-spacing: 0.1em; } 100% { opacity: 1; filter: blur(0); transform: scale(1); letter-spacing: normal; } }
        @keyframes aeZoom { 0% { opacity: 0; transform: scale(1.5); filter: blur(5px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes charWave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes neonPulse { 0%, 100% { text-shadow: 0 0 4px #fff, 0 0 10px currentColor, 0 0 20px currentColor; } 50% { text-shadow: 0 0 2px #fff, 0 0 5px currentColor, 0 0 10px currentColor; opacity: 0.8; } }
        @keyframes glitch { 0% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
        @keyframes karaokeWipe { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
        @keyframes wordSpread { 0% { opacity: 0; letter-spacing: -0.5em; filter: blur(5px); } 100% { opacity: 1; letter-spacing: normal; filter: blur(0); } }
        @keyframes lightSpeed { 0% { transform: translateX(100%) skewX(-30deg); opacity: 0; } 60% { transform: skewX(20deg); opacity: 1; } 80% { transform: skewX(-5deg); } 100% { transform: translate(0); } }
        @keyframes cinematic { 0% { opacity: 0; letter-spacing: 0.2em; filter: blur(5px); } 100% { opacity: 1; letter-spacing: normal; filter: blur(0); } }
        @keyframes rotateIn { 0% { opacity: 0; transform: rotate(-180deg) scale(0.5); } 100% { opacity: 1; transform: rotate(0) scale(1); } }

        @keyframes bgSway {
          0% { transform: scale(1.1) translate(0, 0); }
          50% { transform: scale(1.1) translate(10px, 0px); }
          100% { transform: scale(1.1) translate(0, 0); }
        }
        .animate-bgSway { animation: bgSway 24s linear infinite; }

        @keyframes bgZoom {
           0% { transform: scale(1); }
           100% { transform: scale(1.3); }
        }
        .animate-bgZoom { animation: bgZoom 30s linear infinite alternate; }

        @keyframes bgZoomFast {
           0% { transform: scale(1); }
           100% { transform: scale(1.8); }
        }
        .animate-bgZoomFast { animation: bgZoomFast 0.5s cubic-bezier(0.1, 0.7, 1.0, 0.1) infinite alternate; }

        @keyframes bgShake {
            0% { transform: translate(0,0); }
            10% { transform: translate(-5px, 5px); }
            20% { transform: translate(5px, -5px); }
            30% { transform: translate(-5px, -5px); }
            40% { transform: translate(5px, 5px); }
            100% { transform: translate(0,0); }
        }
        .animate-bgShake { animation: bgShake 0.2s linear infinite; }

        @keyframes bgPan {
           0% { transform: translateX(0); }
           50% { transform: translateX(-5%); }
           100% { transform: translateX(0); }
        }
        .animate-bgPan { animation: bgPan 20s ease-in-out infinite; }
        
        @keyframes kenBurns {
           0% { transform: scale(1.1) translate(0,0); }
           100% { transform: scale(1.2) translate(-2%, 2%); }
        }
        .animate-kenBurns { animation: kenBurns 20s ease-in-out infinite alternate; }

        @keyframes bgRotate {
            0% { transform: scale(1.2) rotate(0deg); }
            100% { transform: scale(1.2) rotate(5deg); }
        }
        .animate-bgRotate { animation: bgRotate 15s ease-in-out infinite alternate; }

        @keyframes bgGlitch {
           0% { transform: translate(0); filter: hue-rotate(0deg); }
           2% { transform: translate(-3px, 0); filter: hue-rotate(90deg); }
           4% { transform: translate(3px, 0); filter: hue-rotate(0deg); }
           6% { transform: translate(0); }
           98% { transform: translate(0); }
           99% { transform: translate(3px, 0); filter: invert(0.2); }
           100% { transform: translate(0); filter: invert(0); }
        }
        .animate-bgGlitch { animation: bgGlitch 3s infinite; }
        
        .animate-bgGlitch2 { animation: bgGlitch2 2s infinite linear; }
        @keyframes bgGlitch2 {
           0% { clip-path: inset(0 0 0 0); transform: translate(0); }
           5% { clip-path: inset(10% 0 80% 0); transform: translate(-5px, 5px); }
           10% { clip-path: inset(80% 0 5% 0); transform: translate(5px, -5px); }
           15% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }

        @keyframes bgPulse {
           0% { transform: scale(1); filter: brightness(1); }
           10% { transform: scale(1.02); filter: brightness(1.2); }
           20% { transform: scale(1); filter: brightness(1); }
        }
        .animate-bgPulse { animation: bgPulse 1s ease-out infinite; }
        
        @keyframes bgRainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
        .animate-bgRainbow { animation: bgRainbow 10s linear infinite; }
        
        @keyframes bgStrobe {
            0% { filter: brightness(1); }
            50% { filter: brightness(3); }
            100% { filter: brightness(1); }
        }
        .animate-bgStrobe { animation: bgStrobe 0.1s steps(2) infinite; }

        @keyframes bgNoise {
            0% { transform: translate(0,0); }
            10% { transform: translate(-5%,-5%); }
            20% { transform: translate(-10%,5%); }
            30% { transform: translate(5%,-10%); }
            40% { transform: translate(-5%,15%); }
            50% { transform: translate(-10%,5%); }
            60% { transform: translate(15%,0); }
            70% { transform: translate(0,10%); }
            80% { transform: translate(-15%,0); }
            90% { transform: translate(10%,5%); }
            100% { transform: translate(5%,0); }
        }
        .animate-bgNoise { animation: bgNoise 8s steps(10) infinite; }

        @keyframes chaosNoise {
           0% { transform: translate(0,0) scale(1.5); }
           10% { transform: translate(-10%, 10%) scale(1.6); }
           20% { transform: translate(10%, -10%) scale(1.5); }
           30% { transform: translate(-5%, 5%) scale(1.7); }
           40% { transform: translate(5%, -5%) scale(1.5); }
           50% { transform: translate(-10%, 10%) scale(1.6); }
           60% { transform: translate(10%, -10%) scale(1.5); }
           70% { transform: translate(-5%, 5%) scale(1.7); }
           80% { transform: translate(5%, -5%) scale(1.5); }
           90% { transform: translate(-10%, 10%) scale(1.6); }
           100% { transform: translate(0,0) scale(1.5); }
        }
        .animate-chaosNoise { animation: chaosNoise 0.29s steps(3) infinite; }

        @keyframes chaosShift1 {
           0% { transform: translate(0,0); opacity: 0; }
           2% { transform: translate(4px, 0); opacity: 1; }
           4% { transform: translate(-4px, 0); opacity: 0; }
           50% { transform: translate(0,0); opacity: 0; }
           52% { transform: translate(0, 4px); opacity: 1; }
           54% { transform: translate(0, -4px); opacity: 0; }
        }
        .animate-chaosShift1 { animation: chaosShift1 3.7s linear infinite; }

        @keyframes chaosFlash {
           0% { opacity: 0; }
           1% { opacity: 0.8; }
           2% { opacity: 0; }
           60% { opacity: 0; }
           61% { opacity: 0.5; }
           62% { opacity: 0; }
        }
        .animate-chaosFlash { animation: chaosFlash 2.3s linear infinite; }

        @keyframes thunderStrobe {
           0% { opacity: 0; filter: brightness(1); }
           1% { opacity: 1; filter: brightness(10); }
           2% { opacity: 1; filter: brightness(5); }
           3% { opacity: 0; }
           10% { opacity: 0; }
           11% { opacity: 0.8; filter: brightness(8); }
           12% { opacity: 0; }
        }
        .animate-thunderStrobe { animation: thunderStrobe 1.7s linear infinite; }

        @keyframes spotlight {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
        }
        .animate-spotlight { animation: spotlight 5s ease-in-out infinite alternate; background-size: 150% 150%; }

        @keyframes chromatic {
             0% { text-shadow: 2px 2px 0px #ff0000, -2px -2px 0px #00ff00; transform: translate(0); }
             10% { text-shadow: 2px -2px 0px #ff0000, -2px 2px 0px #00ff00; transform: translate(1px, 1px); }
             20% { text-shadow: -2px 2px 0px #ff0000, 2px -2px 0px #00ff00; transform: translate(-1px, -1px); }
             100% { text-shadow: 2px 2px 0px #ff0000, -2px -2px 0px #00ff00; transform: translate(0); }
        }
        .animate-chromatic { animation: chromatic 2s linear infinite; }

      `}</style>

      {/* Media Element (Audio or Video) */}
      {isVideoMode && audioUrl ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            key={audioUrl}
            src={audioUrl}
            className={`absolute inset-0 w-full h-full object-cover z-0 ${getMotionClass(activeEffects)} ${getFilterClasses(activeEffects)}`}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={onEnded}
            playsInline
            muted={isMuted} // Controlled via effect but safe default
          />
      ) : (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            key={audioUrl} 
            src={audioUrl || undefined}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={onEnded}
            playsInline
          />
      )}

      {/* 
          Main Screen Area (9:16)
          Added 'container-type: size' inline style to support cqw units for font sizing
      */}
      <div 
        className={`relative h-full aspect-[9/16] bg-black shadow-2xl overflow-hidden mx-auto ${isExpanded ? '' : 'rounded-lg'}`}
        style={{ containerType: 'size' }} 
      >
          
          {/* Visual Layer (Images) - ONLY if not video mode */}
          {!isVideoMode && renderVisuals()}
          
          {/* Overlays (Glitch, Noise, etc) - Applied to both Video and Image modes */}
          {renderOverlays()}
          
          {/* Lyric Overlay Layer - Now Interactive */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 p-[5cqw]`}>
            {activeLyrics.map((lyric) => {
                const isSelected = lyric.id === selectedLyricId;
                return (
                  <div
                    key={lyric.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onLyricClick) onLyricClick(lyric.id);
                    }}
                    className={`
                      absolute transition-all duration-300 lyric-text-element flex items-center justify-center
                      ${getPositionClass(lyric.style.position)}
                      ${getFontFamilyClass(lyric.style.fontFamily)}
                      ${lyric.style.vertical ? 'writing-vertical-rl text-orientation-upright h-[80%] max-w-[80%]' : 'w-full text-center'}
                      ${isSelected ? 'scale-105 z-50' : 'z-30'}
                    `}
                    style={{ 
                      // Apply scalable font size
                      ...getSizeStyle(lyric.style.fontSize, lyric.text.length),
                      color: lyric.style.color, 
                      textShadow: isSelected 
                          ? '0 0 20px rgba(20, 184, 166, 0.8), 2px 2px 4px rgba(0,0,0,0.8)' 
                          : '2px 2px 8px rgba(0,0,0,0.6), 0 0 30px rgba(0,0,0,0.3)',
                      writingMode: lyric.style.vertical ? 'vertical-rl' : 'horizontal-tb',
                      textOrientation: 'upright',
                      pointerEvents: 'auto', // Enable clicking
                      cursor: onLyricClick ? 'pointer' : 'default',
                      border: isSelected ? '1px dashed rgba(20, 184, 166, 0.5)' : 'none',
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(0,0,0,0.2)' : 'transparent',
                      // Natural line breaks
                      textWrap: 'balance', 
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      maxWidth: lyric.style.vertical ? 'none' : '90%'
                    }}
                  >
                    {renderLyricText(lyric)}
                  </div>
                );
            })}
          </div>

          {/* Controls Overlay (Inside 9:16 Area) - Show Always in Fullscreen/Expanded mode if not hidden */}
          {(showControls || isExpanded) && !hideControls && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-40 player-controls flex flex-col gap-2 transition-opacity">
               <input 
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-zinc-600 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
               />
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={onTogglePlay} 
                        className="text-white hover:text-indigo-400 transition-colors"
                      >
                         {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                      
                      {/* Added Volume Control Slider */}
                      <div className="flex items-center gap-2 group/vol">
                          <button onClick={toggleMute} className="text-zinc-300 hover:text-white">
                              {isMuted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                          </button>
                          <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05" 
                              value={isMuted ? 0 : volume} 
                              onChange={handleVolumeChange}
                              className="w-16 h-1 bg-zinc-600 rounded-full cursor-pointer accent-white opacity-0 group-hover/vol:opacity-100 transition-opacity duration-200"
                          />
                      </div>

                      <span className="text-xs font-mono text-zinc-300 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                  </div>
                  
                  {/* Custom Expand Button at bottom right (inside overlay) */}
                  {onToggleExpand && !isExpanded && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                      }}
                      className="p-2 text-zinc-400 hover:text-white transition-colors"
                      title="拡大"
                    >
                      <Maximize2 size={20} />
                    </button>
                  )}
               </div>
            </div>
          )}
          
          {/* Explicit Expand Button for Thumbnail Mode (Always visible at bottom left if controls hidden) */}
          {!isExpanded && !hideControls && !showControls && onToggleExpand && (
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand();
                  }}
                  className="absolute bottom-4 left-4 z-40 p-2 bg-black/40 hover:bg-black/60 text-white/80 rounded backdrop-blur-sm transition-all shadow-lg active:scale-90"
                  title="フルスクリーン表示"
              >
                  <Maximize size={16} /> 
              </button>
          )}
      </div>

      {/* Explicit Close Button for Mobile / Fullscreen (When Expanded) - Outside the 9:16 area but inside main container */}
      {isExpanded && onClose && !hideControls && (
         <button 
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            className="absolute top-4 right-4 z-50 p-3 bg-zinc-900/50 backdrop-blur-md text-white rounded-full border border-zinc-700/50 hover:bg-zinc-800 shadow-lg active:scale-95"
         >
             <X size={24} />
         </button>
      )}

      {/* Big Play Button Overlay (when paused) - also hidden in hideControls */}
      {!isPlaying && !showControls && audioUrl && !hideControls && (
         <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isExpanded ? 'z-50' : 'z-40'} bg-black/20`}>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg animate-[fadeIn_0.2s]">
               <Play size={32} className="text-white fill-white translate-x-1" />
            </div>
         </div>
      )}
    </div>
  );
};

export default VideoPlayer;