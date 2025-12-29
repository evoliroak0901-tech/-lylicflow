
export interface LyricSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  style: LyricStyle;
}

export interface LyricStyle {
  animation: AnimationType;
  color: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  position: 'top' | 'center' | 'bottom';
  fontFamily: FontFamily;
  vertical?: boolean;
  // Changed from single value to array to support multiple concurrent effects
  effects?: BackgroundEffect[]; 
  /** @deprecated use effects array instead */
  backgroundEffect?: BackgroundEffect; 
}

export type FontFamily = 
  | 'sans' 
  | 'serif' 
  | 'mono' 
  | 'display' 
  | 'handwriting' 
  | 'pixel' 
  | 'mincho'
  | 'horror'
  | 'retro'
  | 'futuristic'
  | 'comic'
  | 'zen-maru'
  | 'dela-gothic'
  | 'hachi-maru'
  | 'yuji-syuku';

export enum AnimationType {
  FADE_IN = 'fade-in',
  SLIDE_UP = 'slide-up',
  ZOOM_IN = 'zoom-in',
  NEON_PULSE = 'neon-pulse',
  TYPEWRITER = 'typewriter',
  GLITCH = 'glitch',
  BLUR_REVEAL = 'blur-reveal',
  BOUNCE_IN = 'bounce-in',
  KARAOKE_WIPE = 'karaoke-wipe',
  CHAR_WAVE = 'char-wave',
  WORD_SPREAD = 'word-spread',
  SMOOTH_RISE = 'smooth-rise',
  STOMP = 'stomp',
  CINEMATIC = 'cinematic',
  LIGHT_SPEED = 'light-speed',
  ROTATE_IN = 'rotate-in',
  ASSEMBLE = 'text-assemble',
  LETTER_SLIDE = 'letter-slide',
  KINETIC = 'kinetic',
  PARTICLE = 'particle',
  REVEAL_MASK = 'reveal-mask',
  ELASTIC_BOUNCE = 'elastic-bounce',
  FLIP_3D = 'flip-3d',
  TYPE_CURSOR = 'type-cursor',
  GLOW_STAGGER = 'glow-stagger',
  LIQUID_WAVE = 'liquid-wave',
  EVANGELION_TITLE = 'evangelion-title',
  // New Animations
  GHOST_TRAIL = 'ghost-trail',
  SIGNAL_DECODE = 'signal-decode',
  FLASH_BANG = 'flash-bang',
  SLIT_SCAN = 'slit-scan',
  SINE_WAVE = 'sine-wave'
}

// Visual Effects for Background Images
export enum BackgroundEffect {
  NONE = 'none',
  // Cinematic / Camera
  KEN_BURNS = 'ken-burns',      // ケンバーンズ（ゆっくり拡大移動）
  SWAY = 'sway',                // 揺れ
  ZOOM_SLOW = 'zoom-slow',      // Added
  ZOOM_FAST = 'zoom-fast',      // 急接近 (New)
  PAN_HORIZONTAL = 'pan-horizontal', // Added
  ROTATE_SLOW = 'rotate-slow',  // Added
  SHAKE = 'shake',              // 振動 (New)
  
  // Filters / Color
  DARKEN = 'darken',            // 暗くする
  BW_CONTRAST = 'bw-contrast',  // 白黒コントラスト
  SEPIA_DREAM = 'sepia-dream',  // セピア
  VIGNETTE = 'vignette',        // Added
  INVERT = 'invert',            // 反転
  RAINBOW_HUE = 'rainbow-hue',  // 七色変化
  
  // Glitch / Chaos
  GLITCH_ART = 'glitch-art',    // RGBグリッチ
  NOISE_STORM = 'noise-storm',  // ノイズ＋激しい揺れ
  TV_STATIC = 'tv-static',      // 砂嵐 (New)
  CHROMATIC = 'chromatic',      // 色収差 (New)
  
  // Light / Particle
  PULSE_BEAT = 'pulse-beat',    // ビートに合わせて拡大
  STROBE = 'strobe',            // ストロボ点滅
  THUNDER = 'thunder',          // 雷フラッシュ
  SPOTLIGHT = 'spotlight',      // スポットライト (New)
  
  // Retro
  VHS = 'vhs-tape',             // VHS風
  OLD_FILM = 'old-film',        // 古い映画
  PIXELATE = 'pixelate'         // モザイク
}

export enum TransitionType {
  NONE = 'none',
  FADE = 'fade',
  SLIDE_LEFT = 'slide-left',
  ZOOM_FADE = 'zoom-fade',
  BLUR = 'blur',
  FLASH = 'flash'
}

export interface VideoMetadata {
  name: string;
  duration: number;
  url: string;
  file: File | null;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}