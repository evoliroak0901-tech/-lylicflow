import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LyricSegment, AnimationType, BackgroundEffect, FontFamily } from '../types';
import { Trash2, Play, Pause, Edit3, X, RotateCcw, List as ListIcon, Sparkles, Loader2, MousePointerClick, SlidersHorizontal, Eye, EyeOff, ChevronUp, ChevronDown, MoveDown, Info, Type, MoveUp, ArrowDownToLine, AlignVerticalJustifyCenter, Wand2, Zap, Settings2, Grid2X2, SkipBack, CopyCheck } from 'lucide-react';
import { analyzeMoodAndStyle } from '../services/geminiService';

// Translation Maps
const ANIMATION_LABELS: Record<AnimationType, string> = {
  [AnimationType.FADE_IN]: 'フェードイン',
  [AnimationType.SLIDE_UP]: 'スライド（上）',
  [AnimationType.ZOOM_IN]: 'ズームイン',
  [AnimationType.NEON_PULSE]: 'ネオンパルス',
  [AnimationType.TYPEWRITER]: 'タイプライター',
  [AnimationType.GLITCH]: 'グリッチノイズ',
  [AnimationType.BLUR_REVEAL]: 'ブラー出現',
  [AnimationType.BOUNCE_IN]: 'バウンス',
  [AnimationType.KARAOKE_WIPE]: 'カラオケ風ワイプ',
  [AnimationType.CHAR_WAVE]: '文字ウェーブ',
  [AnimationType.WORD_SPREAD]: '単語拡散',
  [AnimationType.SMOOTH_RISE]: 'スムーズ上昇',
  [AnimationType.STOMP]: 'ストンプ（衝撃）',
  [AnimationType.CINEMATIC]: 'シネマティック',
  [AnimationType.LIGHT_SPEED]: 'ライトスピード',
  [AnimationType.ROTATE_IN]: '回転出現',
  [AnimationType.ASSEMBLE]: '文字集合',
  [AnimationType.LETTER_SLIDE]: 'レタースライド',
  [AnimationType.KINETIC]: 'キネティック回転',
  [AnimationType.PARTICLE]: '粒子集合',
  [AnimationType.REVEAL_MASK]: 'マスク出現',
  [AnimationType.ELASTIC_BOUNCE]: '弾力バウンス',
  [AnimationType.FLIP_3D]: '3D回転',
  [AnimationType.TYPE_CURSOR]: 'カーソル入力',
  [AnimationType.GLOW_STAGGER]: '光彩順次',
  [AnimationType.LIQUID_WAVE]: '液体ウェーブ',
  [AnimationType.EVANGELION_TITLE]: 'エヴァ風タイトル',
  [AnimationType.GHOST_TRAIL]: 'ゴースト残像',
  [AnimationType.SIGNAL_DECODE]: 'シグナル解読',
  [AnimationType.FLASH_BANG]: 'フラッシュ',
  [AnimationType.SLIT_SCAN]: 'スリットスキャン',
  [AnimationType.SINE_WAVE]: 'サインウェーブ'
};

const FONT_LABELS: Record<FontFamily, string> = {
  'sans': 'ゴシック (Sans)',
  'serif': '明朝 (Serif)',
  'mono': '等幅 (Mono)',
  'display': 'モダン (Display)',
  'handwriting': '手書き風',
  'pixel': 'ドット絵 (Pixel)',
  'mincho': '特太明朝',
  'horror': 'ホラー',
  'retro': 'レトロゲーム',
  'futuristic': '近未来SF',
  'comic': 'アメコミ風',
  'zen-maru': '丸ゴシック',
  'dela-gothic': '極太ゴシック',
  'hachi-maru': '80sポップ',
  'yuji-syuku': '習字（行書）'
};

const EFFECT_LABELS: Record<BackgroundEffect, string> = {
  [BackgroundEffect.NONE]: 'なし',
  [BackgroundEffect.KEN_BURNS]: 'ゆっくり拡大',
  [BackgroundEffect.SWAY]: 'ゆらぎ',
  [BackgroundEffect.ZOOM_SLOW]: 'ゆっくりズーム',
  [BackgroundEffect.ZOOM_FAST]: '急接近',
  [BackgroundEffect.PAN_HORIZONTAL]: 'パン移動',
  [BackgroundEffect.ROTATE_SLOW]: 'ゆっくり回転',
  [BackgroundEffect.SHAKE]: '振動',
  [BackgroundEffect.DARKEN]: '暗転',
  [BackgroundEffect.BW_CONTRAST]: '白黒コントラスト',
  [BackgroundEffect.SEPIA_DREAM]: 'セピア調',
  [BackgroundEffect.VIGNETTE]: '周辺減光',
  [BackgroundEffect.INVERT]: '色反転',
  [BackgroundEffect.RAINBOW_HUE]: '七色ゲーミング',
  [BackgroundEffect.GLITCH_ART]: 'RGBグリッチ',
  [BackgroundEffect.NOISE_STORM]: 'ノイズストーム',
  [BackgroundEffect.TV_STATIC]: '砂嵐',
  [BackgroundEffect.CHROMATIC]: '色収差',
  [BackgroundEffect.PULSE_BEAT]: 'パルスビート',
  [BackgroundEffect.STROBE]: 'ストロボ点滅',
  [BackgroundEffect.THUNDER]: '雷フラッシュ',
  [BackgroundEffect.SPOTLIGHT]: 'スポットライト',
  [BackgroundEffect.VHS]: 'VHSテープ風',
  [BackgroundEffect.OLD_FILM]: '古い映画風',
  [BackgroundEffect.PIXELATE]: 'モザイク'
};

interface TimelineEditorProps {
  lyrics: LyricSegment[];
  currentTime: number;
  duration: number;
  onUpdateLyric: (id: string, updates: Partial<LyricSegment>) => void;
  onDeleteLyric: (id: string) => void;
  onAddLyric: (text?: string, startTime?: number, endTime?: number) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onBulkUpdate: (updates: Partial<LyricSegment['style']>, targetIds?: string[]) => void;
  globalOffset: number;
  onGlobalOffsetChange: (offset: number) => void;
  referenceLyrics?: string;
  activeTab: 'insert' | 'adjust' | 'effects'; 
  setActiveTab: (tab: 'insert' | 'adjust' | 'effects') => void;
  selectedLyricId: string | null;
  setSelectedLyricId: (id: string | null) => void;
  isPreviewVisible?: boolean;
  setIsPreviewVisible?: (visible: boolean) => void;
  headerContent?: React.ReactNode;
  
  mode?: any; 
  onModeChange?: any;
  smartTextEnabled?: boolean;
  onToggleSmartText?: () => void;
  transitionType?: any;
  setTransitionType?: any;
  imageUrls?: any;
  onUpdateImage?: any;
  renderControlsOnly?: boolean;
  audioBuffer?: AudioBuffer | null;
}

const PPS = 120; 

const MOTION_EFFECTS = new Set([
    BackgroundEffect.ZOOM_SLOW, BackgroundEffect.ZOOM_FAST, BackgroundEffect.SWAY, 
    BackgroundEffect.SHAKE, BackgroundEffect.PAN_HORIZONTAL, BackgroundEffect.ROTATE_SLOW, 
    BackgroundEffect.PULSE_BEAT, BackgroundEffect.KEN_BURNS
]);

const FILTER_EFFECTS = new Set([
    BackgroundEffect.DARKEN, BackgroundEffect.VIGNETTE, BackgroundEffect.SEPIA_DREAM, 
    BackgroundEffect.BW_CONTRAST, BackgroundEffect.INVERT, BackgroundEffect.OLD_FILM, 
    BackgroundEffect.VHS
]);

const CHAOS_EFFECTS = new Set([
    BackgroundEffect.GLITCH_ART, BackgroundEffect.CHROMATIC, BackgroundEffect.RAINBOW_HUE,
    BackgroundEffect.STROBE, BackgroundEffect.THUNDER, BackgroundEffect.SPOTLIGHT,
    BackgroundEffect.NOISE_STORM, BackgroundEffect.TV_STATIC, BackgroundEffect.PIXELATE
]);

const TimelineEditor: React.FC<TimelineEditorProps> = ({
  lyrics,
  currentTime,
  duration,
  onUpdateLyric,
  onDeleteLyric,
  onAddLyric,
  onSeek,
  isPlaying,
  onTogglePlay,
  onBulkUpdate,
  referenceLyrics,
  selectedLyricId,
  setSelectedLyricId,
  activeTab,
  setActiveTab,
  headerContent,
  isPreviewVisible = true,
  setIsPreviewVisible
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const seekbarRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false); 
  const lastTimeRef = useRef(performance.now());
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Semi-Auto Modal
  const [showSemiAutoModal, setShowSemiAutoModal] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  // Track visual cursor position for XY pad (x: -1 to 1, y: -1 to 1)
  const [xyCursor, setXyCursor] = useState({ x: 0, y: 0 });

  // Bulk Edit Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
      vertical: 'unchanged', // 'unchanged' | 'on' | 'off'
      animation: 'unchanged',
      fontSize: 'unchanged',
      fontFamily: 'unchanged',
      color: '#ffffff',
      useColor: false,
      effectsMode: 'unchanged', // 'unchanged' | 'replace'
      effects: [] as BackgroundEffect[]
  });

  // Set of currently active "recording" effects
  const [activeRecordingEffects, setActiveRecordingEffects] = useState<Set<BackgroundEffect>>(new Set());

  // --- Sync scroll position with currentTime ---
  useEffect(() => {
    if (!isPlaying && timelineRef.current && activeTab === 'adjust') {
        const targetScroll = currentTime * PPS;
        if (Math.abs(timelineRef.current.scrollTop - targetScroll) > 5) {
            timelineRef.current.scrollTop = targetScroll;
        }
    }
  }, [currentTime, isPlaying, activeTab]);

  // Animation Loop for Smooth Playback Scrolling and Effect Recording
  useEffect(() => {
    let frameId: number;
    const loop = () => {
        const now = performance.now();
        const dt = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        if (isPlaying && timelineRef.current && activeTab === 'adjust') {
            isAutoScrolling.current = true;
            const currentScroll = timelineRef.current.scrollTop;
            const nextScroll = currentScroll + (dt * PPS);
            timelineRef.current.scrollTop = nextScroll;
            requestAnimationFrame(() => { isAutoScrolling.current = false; });
        }

        if (isPlaying && activeTab === 'effects' && activeRecordingEffects.size > 0) {
            const activeLyric = lyrics.find(l => 
                l.startTime >= 0 && currentTime >= l.startTime && currentTime <= l.endTime
            );

            if (activeLyric) {
                const existingEffects = new Set(activeLyric.style.effects || []);
                let needsUpdate = false;
                
                activeRecordingEffects.forEach(effect => {
                    if (!existingEffects.has(effect)) {
                        existingEffects.add(effect);
                        needsUpdate = true;
                    }
                });

                if (needsUpdate) {
                    onUpdateLyric(activeLyric.id, { 
                        style: { ...activeLyric.style, effects: Array.from(existingEffects) } 
                    });
                }
            }
        }
        frameId = requestAnimationFrame(loop);
    };
    
    lastTimeRef.current = performance.now();
    frameId = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, activeTab, activeRecordingEffects, lyrics, currentTime, onUpdateLyric]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (activeTab !== 'adjust') return;
      if (isPlaying) return; 
      if (isAutoScrolling.current) return;
      const scrollPos = e.currentTarget.scrollTop;
      const newTime = Math.max(0, scrollPos / PPS);
      onSeek(newTime);
  };

  const pendingLyrics = useMemo(() => lyrics.filter(l => l.startTime === -1), [lyrics]);
  const placedLyrics = useMemo(() => lyrics.filter(l => l.startTime >= 0).sort((a,b) => a.startTime - b.startTime), [lyrics]);
  
  const displayList = useMemo(() => [...placedLyrics, ...pendingLyrics], [placedLyrics, pendingLyrics]);
  const nextPending = pendingLyrics[0];

  useEffect(() => {
      if (activeTab === 'insert' && listRef.current) {
          const activeIndex = placedLyrics.length;
          const activeItem = listRef.current.children[activeIndex + 1] as HTMLElement; 
          if (activeItem) {
              activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [placedLyrics.length, activeTab]); 

  const handleTap = () => {
      if (nextPending) {
          onAddLyric(nextPending.text, currentTime);
      } else {
          onAddLyric("新規テキスト", currentTime);
      }
  };

  const handleAutoStyle = async () => {
      if (lyrics.length === 0) {
          alert("スタイルを適用するには、まず歌詞を作成してください。");
          return;
      }
      if (isAnalyzing) return;
      setIsAnalyzing(true);
      try {
          const { updatedLyrics } = await analyzeMoodAndStyle(lyrics, (status) => setAnalyzingStatus(status));
          updatedLyrics.forEach(l => {
              onUpdateLyric(l.id, { style: l.style });
          });
          alert("AIによるスタイル適用（フォント・アニメーション・色）が完了しました！\n演出は「演出」タブから追加してください。");
      } catch (e) {
          console.error(e);
          alert("AI分析中にエラーが発生しました。\nAPIキーの設定などを確認してください。");
      } finally {
          setIsAnalyzing(false);
          setAnalyzingStatus("");
      }
  };

  // --- SEMI-AUTO LOGIC ---
  const applySemiAutoStyle = (x: number, y: number) => {
      const targetIds = selectedLyricId ? [selectedLyricId] : lyrics.map(l => l.id);
      
      if (isSimpleMode) {
          onBulkUpdate({
              vertical: true,
              position: 'center',
              color: '#ffffff',
              fontFamily: 'mincho', 
              animation: AnimationType.FADE_IN,
              effects: [] 
          }, targetIds);
          return;
      }

      let animation: AnimationType = AnimationType.FADE_IN;
      let fontFamily: FontFamily = 'sans';
      let color: string = '#ffffff';

      // FONT LOGIC
      if (y > 0.5) { 
          fontFamily = x > 0 ? 'dela-gothic' : 'horror';
      } else if (y < -0.5) { 
          fontFamily = x > 0 ? 'handwriting' : 'mincho';
      } else { 
          fontFamily = x > 0 ? 'display' : 'sans';
      }

      // ANIMATION LOGIC
      if (y > 0.3) { 
          if (x > 0.3) animation = AnimationType.GLITCH;
          else if (x < -0.3) animation = AnimationType.STOMP;
          else animation = AnimationType.ZOOM_IN;
      } else if (y < -0.3) { 
          if (x > 0.3) animation = AnimationType.GLOW_STAGGER;
          else if (x < -0.3) animation = AnimationType.FADE_IN;
          else animation = AnimationType.SLIDE_UP;
      } else { 
          if (x > 0.3) animation = AnimationType.TYPEWRITER;
          else if (x < -0.3) animation = AnimationType.SMOOTH_RISE;
          else animation = AnimationType.FADE_IN;
      }

      // COLOR LOGIC
      if (y > 0.6) color = '#ef4444'; 
      else if (x > 0.6) color = '#a855f7'; 
      else if (y < -0.6 && x > 0.5) color = '#22d3ee'; 
      else color = '#ffffff';

      onBulkUpdate({
          vertical: false, 
          position: 'center',
          fontFamily,
          animation,
          color
      }, targetIds);
  };

  const handlePadClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const x = (clickX / rect.width) * 2 - 1; 
      const y = -((clickY / rect.height) * 2 - 1); 
      
      setXyCursor({ x, y });
      applySemiAutoStyle(x, y);
  };

  const toggleEffect = (effect: BackgroundEffect) => {
      setActiveRecordingEffects(prev => {
          const next = new Set(prev);
          if (next.has(effect)) {
              next.delete(effect);
          } else {
              next.add(effect);
          }
          return next;
      });
  };

  const handleShiftTime = (amount: number) => {
      if (!selectedLyricId) return;
      const lyric = lyrics.find(l => l.id === selectedLyricId);
      if (lyric && lyric.startTime >= 0) {
          const duration = lyric.endTime - lyric.startTime;
          const newStart = Math.max(0, lyric.startTime + amount);
          onUpdateLyric(lyric.id, { startTime: newStart, endTime: newStart + duration });
      }
  };

  const handleAdjustDuration = (amount: number) => {
      if (!selectedLyricId) return;
      const lyric = lyrics.find(l => l.id === selectedLyricId);
      if (lyric && lyric.startTime >= 0) {
          const newEnd = Math.max(lyric.startTime + 0.1, lyric.endTime + amount);
          onUpdateLyric(lyric.id, { endTime: newEnd });
      }
  };

  const handleExtendToCursor = () => {
      if (!selectedLyricId) return;
      const lyric = lyrics.find(l => l.id === selectedLyricId);
      if (lyric && lyric.startTime >= 0) {
          if (currentTime > lyric.startTime) {
               onUpdateLyric(lyric.id, { endTime: currentTime });
          } else {
              alert("終了時間は開始時間より後である必要があります");
          }
      }
  };

  const handleOpenBulkModal = () => {
      setBulkForm({
          vertical: 'unchanged',
          animation: 'unchanged',
          fontSize: 'unchanged',
          fontFamily: 'unchanged',
          color: '#ffffff',
          useColor: false,
          effectsMode: 'unchanged',
          effects: []
      });
      setShowBulkModal(true);
  };

  const applyBulkUpdate = () => {
      const updates: Partial<LyricSegment['style']> = {};
      
      if (bulkForm.vertical !== 'unchanged') {
          updates.vertical = bulkForm.vertical === 'on';
      }
      if (bulkForm.animation !== 'unchanged') {
          updates.animation = bulkForm.animation as AnimationType;
      }
      if (bulkForm.fontSize !== 'unchanged') {
          updates.fontSize = bulkForm.fontSize as any;
      }
      if (bulkForm.fontFamily !== 'unchanged') {
          updates.fontFamily = bulkForm.fontFamily as FontFamily;
      }
      if (bulkForm.useColor) {
          updates.color = bulkForm.color;
      }
      if (bulkForm.effectsMode === 'replace') {
          updates.effects = bulkForm.effects;
          updates.backgroundEffect = BackgroundEffect.NONE; // Clear legacy
      }
      
      onBulkUpdate(updates, undefined); // undefined targetIds means ALL lyrics
      setShowBulkModal(false);
  };

  const timelineItems = useMemo(() => {
      const items: (LyricSegment & { column: 0 | 1 })[] = [];
      let col0End = -1;
      let col1End = -1;

      placedLyrics.forEach(l => {
          if (l.startTime >= col0End - 0.1) { 
              items.push({ ...l, column: 0 });
              col0End = l.endTime;
          } else {
              items.push({ ...l, column: 1 });
              col1End = l.endTime;
          }
      });
      return items;
  }, [placedLyrics]);
  
  const effectCategories = {
      'モーション': [
          BackgroundEffect.ZOOM_SLOW, BackgroundEffect.ZOOM_FAST, BackgroundEffect.SWAY, 
          BackgroundEffect.SHAKE, BackgroundEffect.PAN_HORIZONTAL, BackgroundEffect.ROTATE_SLOW, 
          BackgroundEffect.PULSE_BEAT, BackgroundEffect.KEN_BURNS
      ],
      'フィルター': [
          BackgroundEffect.DARKEN, BackgroundEffect.VIGNETTE, BackgroundEffect.SEPIA_DREAM, 
          BackgroundEffect.BW_CONTRAST, BackgroundEffect.INVERT, BackgroundEffect.OLD_FILM, 
          BackgroundEffect.VHS
      ],
      'カオス・光': [
          BackgroundEffect.GLITCH_ART, BackgroundEffect.CHROMATIC, BackgroundEffect.RAINBOW_HUE,
          BackgroundEffect.STROBE, BackgroundEffect.THUNDER, BackgroundEffect.SPOTLIGHT,
          BackgroundEffect.NOISE_STORM, BackgroundEffect.TV_STATIC, BackgroundEffect.PIXELATE
      ]
  };

  const handleSeekDrag = (e: React.MouseEvent | React.TouchEvent) => {
      if (!seekbarRef.current || duration <= 0) return;
      
      const rect = seekbarRef.current.getBoundingClientRect();
      let clientX = 0;
      if ('touches' in e) clientX = e.touches[0].clientX;
      else clientX = (e as React.MouseEvent).clientX;
      
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      onSeek(percentage * duration);
  };

  const selectedLyric = useMemo(() => lyrics.find(l => l.id === selectedLyricId), [lyrics, selectedLyricId]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800 font-sans">
        
        {headerContent && (
             <div className="px-4 pt-3 pb-1 shrink-0 z-30">
                 {headerContent}
             </div>
        )}

        {/* Top Controls & VISUAL SEEKBAR */}
        <div className="flex flex-col gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
             
             {/* Enhanced Visual Timeline Track */}
             <div 
                className="relative h-6 w-full bg-zinc-800 rounded-lg overflow-hidden cursor-pointer group"
                ref={seekbarRef}
                onMouseDown={(e) => { setIsDraggingSeek(true); handleSeekDrag(e); }}
                onMouseMove={(e) => isDraggingSeek && handleSeekDrag(e)}
                onMouseUp={() => setIsDraggingSeek(false)}
                onMouseLeave={() => setIsDraggingSeek(false)}
                onTouchStart={(e) => { setIsDraggingSeek(true); handleSeekDrag(e); }}
                onTouchMove={(e) => isDraggingSeek && handleSeekDrag(e)}
                onTouchEnd={() => setIsDraggingSeek(false)}
             >
                 {/* Tracks Background Grid */}
                 <div className="absolute inset-0 flex flex-col opacity-20 pointer-events-none">
                     <div className="flex-1 border-b border-white/10"></div>
                     <div className="flex-1 border-b border-white/10"></div>
                     <div className="flex-1"></div>
                 </div>

                 {/* Effect Blocks */}
                 {placedLyrics.map(lyric => {
                     const startPct = (lyric.startTime / duration) * 100;
                     const widthPct = ((lyric.endTime - lyric.startTime) / duration) * 100;
                     
                     const effects = [
                         ...(lyric.style.effects || []), 
                         lyric.style.backgroundEffect !== 'none' ? lyric.style.backgroundEffect : null
                     ].filter(Boolean) as BackgroundEffect[];

                     const hasMotion = effects.some(e => MOTION_EFFECTS.has(e));
                     const hasFilter = effects.some(e => FILTER_EFFECTS.has(e));
                     const hasChaos = effects.some(e => CHAOS_EFFECTS.has(e));

                     return (
                         <div key={lyric.id} className="absolute inset-y-0" style={{ left: `${startPct}%`, width: `${widthPct}%` }}>
                             {hasMotion && <div className="absolute top-0 h-1/3 w-full bg-cyan-500/60 border-r border-black/20" />}
                             {hasFilter && <div className="absolute top-[33%] h-1/3 w-full bg-purple-500/60 border-r border-black/20" />}
                             {hasChaos && <div className="absolute top-[66%] h-1/3 w-full bg-red-500/60 border-r border-black/20" />}
                             <div className="absolute inset-0 hover:bg-white/10 transition-colors" />
                         </div>
                     );
                 })}

                 {/* Playhead */}
                 <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_10px_white]"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                 >
                    <div className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-full bg-white"></div>
                 </div>
             </div>

             <div className="flex items-center justify-between gap-4">
                 <div className="flex items-center gap-2 flex-1 min-w-0">
                     <button 
                        onClick={() => onSeek(0)}
                        className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        title="最初に戻る"
                     >
                         <SkipBack size={18} fill="currentColor" />
                     </button>
                     
                     <button 
                        onClick={onTogglePlay} 
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all shadow-lg ${isPlaying ? 'bg-zinc-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105'}`}
                     >
                         {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}
                     </button>
                     
                     <div className="flex flex-col shrink-0 text-left">
                         <span className="text-sm font-mono font-bold text-zinc-200 tracking-tight">
                            {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
                         </span>
                         <span className="text-[10px] text-zinc-500">
                             / {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
                         </span>
                     </div>
                 </div>

                 <div className="flex items-center gap-2 shrink-0">
                     {setIsPreviewVisible && (
                         <button 
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            className={`p-2 rounded-lg transition-colors ${!isPreviewVisible ? 'bg-red-900/30 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                             {isPreviewVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                         </button>
                     )}

                     <button
                        onClick={handleOpenBulkModal}
                        className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-2 border border-zinc-700 transition-colors"
                        title="全歌詞の一括編集"
                     >
                         <CopyCheck size={16} className="text-indigo-400"/>
                         <span className="text-xs font-bold hidden md:inline">一括編集</span>
                     </button>
                     
                     <button
                        onClick={() => setShowSemiAutoModal(true)}
                        className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center gap-2 border border-zinc-700 transition-colors"
                        title="セミオート演出"
                     >
                         <Grid2X2 size={16} className="text-cyan-400"/>
                         <span className="text-xs font-bold hidden md:inline">セミオート</span>
                     </button>

                     <button 
                        onClick={handleAutoStyle}
                        disabled={isAnalyzing}
                        className={`h-9 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95 ${isAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
                     >
                         {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                         <span className="text-xs font-bold hidden md:inline">{isAnalyzing ? analyzingStatus || '分析中...' : 'AIオート演出'}</span>
                     </button>
                 </div>
             </div>
             
             <div className="flex bg-zinc-800 p-1 rounded-lg self-start w-full sm:w-auto overflow-x-auto">
                 <button
                    onClick={() => setActiveTab('insert')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'insert' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                 >
                     <MousePointerClick size={14}/> TAP入力
                 </button>
                 <button
                    onClick={() => setActiveTab('adjust')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'adjust' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                 >
                     <SlidersHorizontal size={14}/> 微調整
                 </button>
                 <button
                    onClick={() => setActiveTab('effects')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'effects' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                 >
                     <Zap size={14}/> 演出
                 </button>
             </div>
        </div>
        
        {/* --- INSERT MODE --- */}
        {activeTab === 'insert' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-zinc-950" ref={listRef}>
                    <div className="h-4"></div> 
                    
                    {displayList.length > 0 ? displayList.map((lyric, i) => {
                        const isPlaced = lyric.startTime >= 0;
                        const isNext = !isPlaced && lyric.id === nextPending?.id;
                        
                        return (
                            <div key={lyric.id} className="relative mb-1 group">
                                <div 
                                    onClick={() => {
                                        setSelectedLyricId(lyric.id);
                                        setShowDetailModal(true);
                                    }}
                                    className={`
                                        relative px-3 py-2 rounded-lg border transition-all duration-300 flex flex-col justify-center z-10 cursor-pointer hover:bg-zinc-800
                                        ${isPlaced 
                                            ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-200 opacity-80' 
                                            : isNext
                                            ? 'bg-zinc-800 border-white/80 text-white shadow-md ring-1 ring-white/20'
                                            : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-center pointer-events-none">
                                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isNext ? 'text-indigo-400' : 'opacity-40'}`}>
                                            {isPlaced ? 'ADDED' : isNext ? 'NEXT' : 'PENDING'} #{i + 1}
                                        </span>
                                        {isPlaced && (
                                            <div className="flex items-center gap-2">
                                                {lyric.style.animation && <Sparkles size={10} className="text-indigo-300" />}
                                                <span className="text-[9px] font-mono bg-indigo-900/50 px-1.5 rounded text-indigo-300">
                                                    {lyric.startTime.toFixed(2)}s
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`font-bold leading-tight break-words mt-1 pr-8 whitespace-pre-wrap ${isNext ? 'text-lg' : 'text-sm'}`}>
                                        {lyric.text}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-4">
                            <ListIcon size={48} className="opacity-20"/>
                            <p>歌詞テキストがありません</p>
                            <p className="text-sm">上の「歌詞」ボタンから入力してください</p>
                        </div>
                    )}
                    
                    <div className="h-32"></div>
                </div>

                {/* TAP Area */}
                <div className="bg-zinc-950 border-t border-zinc-800 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4">
                     <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 px-1">
                         <span className="flex items-center gap-2"><ListIcon size={12}/> Queue: {placedLyrics.length} / {lyrics.length}</span>
                     </div>

                    <button
                        onPointerDown={handleTap}
                        className="w-full min-h-[6rem] h-auto py-4 px-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 transition-all border-2 border-indigo-500/30 active:border-indigo-400 flex flex-col items-center justify-center relative group overflow-hidden select-none active:scale-[0.98]"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                         
                         <div className="flex flex-col items-center gap-1 z-10 w-full px-2">
                             {nextPending && <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase group-hover:text-indigo-300">Tap to Place</span>}
                             <div className="text-xl md:text-2xl font-black text-white leading-tight text-center break-words w-full whitespace-pre-wrap">
                                 {nextPending ? nextPending.text : "新規テキスト"}
                             </div>
                         </div>
                    </button>
                </div>
            </div>
        )}

        {/* ... (Effects and Adjust tabs, Modal etc. remain same) ... */}
        {/* --- EFFECTS TAB --- */}
        {activeTab === 'effects' && (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto p-4">
                 <div className="space-y-6 pb-20">
                     {Object.entries(effectCategories).map(([category, effects]) => (
                         <div key={category}>
                             <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                 {category === 'モーション' && <Zap size={12} className="text-cyan-400"/>}
                                 {category === 'フィルター' && <Eye size={12} className="text-purple-400"/>}
                                 {category === 'カオス・光' && <Sparkles size={12} className="text-red-400"/>}
                                 {category}
                             </h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {effects.map((effect) => {
                                     const isActive = activeRecordingEffects.has(effect as BackgroundEffect);
                                     
                                     let activeClass = "";
                                     if (category === 'モーション') activeClass = 'bg-cyan-900/50 border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
                                     else if (category === 'フィルター') activeClass = 'bg-purple-900/50 border-purple-400 text-purple-100 shadow-[0_0_10px_rgba(192,132,252,0.3)]';
                                     else activeClass = 'bg-red-900/50 border-red-400 text-red-100 shadow-[0_0_10px_rgba(248,113,113,0.3)]';

                                     return (
                                         <button
                                             key={effect}
                                             onClick={() => toggleEffect(effect as BackgroundEffect)}
                                             className={`
                                                relative h-10 rounded-lg text-xs font-bold transition-all duration-200 border
                                                flex items-center justify-center overflow-hidden
                                                ${isActive 
                                                    ? activeClass + ' scale-[1.02]' 
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
                                                }
                                             `}
                                         >
                                             <span className="z-10 relative">{EFFECT_LABELS[effect as BackgroundEffect]}</span>
                                             {isActive && (
                                                 <div className="absolute inset-0 bg-white/10 animate-pulse" />
                                             )}
                                         </button>
                                     );
                                 })}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        )}

        {/* --- ADJUST MODE --- */}
        {activeTab === 'adjust' && (
            <div className="flex-1 flex relative min-h-0 bg-zinc-950">
                <div className="absolute left-0 right-14 top-1/2 -translate-y-[1px] h-[2px] bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    <div className="absolute left-0 -top-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-r-sm">
                        {currentTime.toFixed(2)}s
                    </div>
                </div>

                <div 
                    ref={timelineRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-700"
                    style={{ backgroundImage: 'linear-gradient(to bottom, #18181b 1px, transparent 1px)', backgroundSize: `100% ${PPS}px` }}
                >
                    <div className="relative w-full" style={{ height: (duration + 5) * PPS, paddingTop: '50%', paddingBottom: '50%', boxSizing: 'content-box' }}>
                        <div className="absolute top-0 left-0 right-0 h-full">
                            <div className="absolute top-0 left-0 w-12 h-full border-r border-zinc-800 z-10 bg-zinc-950/50 backdrop-blur-sm pointer-events-none">
                                {Array.from({ length: Math.ceil((duration || 60) + 10) }).map((_, i) => (
                                    <div key={i} className="absolute w-full border-t border-zinc-800 text-[10px] text-zinc-600 pl-2 flex items-start pt-1" style={{ top: i * PPS, height: PPS }}>
                                        {i}s
                                    </div>
                                ))}
                            </div>

                            <div className="absolute top-0 left-12 right-4 h-full">
                                {timelineItems.map((lyric) => {
                                    const isSelected = lyric.id === selectedLyricId;
                                    const height = Math.max(24, (lyric.endTime - lyric.startTime) * PPS);
                                    // Check if this lyric has effects
                                    const hasEffects = (lyric.style.effects && lyric.style.effects.length > 0) || (lyric.style.backgroundEffect && lyric.style.backgroundEffect !== 'none');
                                    
                                    return (
                                        <div
                                            key={lyric.id}
                                            onClick={(e) => { 
                                                e.stopPropagation();
                                                onSeek(lyric.startTime); 
                                                setSelectedLyricId(lyric.id); 
                                            }}
                                            className={`absolute rounded-md overflow-hidden transition-all cursor-pointer border flex flex-col group ${
                                                isSelected 
                                                ? 'bg-indigo-600/90 border-white shadow-[0_0_15px_rgba(99,102,241,0.5)] z-20' 
                                                : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 z-10 opacity-90'
                                            }`}
                                            style={{
                                                top: lyric.startTime * PPS,
                                                height: height,
                                                left: lyric.column === 0 ? '0%' : '52%',
                                                width: '46%'
                                            }}
                                        >
                                            <div className="flex-1 p-1.5 flex flex-col min-h-0 relative">
                                                <div className={`text-[10px] sm:text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                    {lyric.text}
                                                </div>
                                                <div className="flex items-center gap-1 mt-auto">
                                                    {lyric.style.vertical && <AlignVerticalJustifyCenter size={10} className={isSelected ? 'text-indigo-200' : 'text-zinc-400'} />}
                                                    {hasEffects && <Sparkles size={10} className={isSelected ? 'text-pink-200' : 'text-pink-500'} />}
                                                    <Type size={10} className={isSelected ? 'text-indigo-200' : 'text-zinc-500'} />
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLyricId(lyric.id); setShowDetailModal(true); }}
                                                    className={`absolute top-1 right-1 p-1 rounded hover:bg-black/30 transition-colors ${isSelected ? 'text-white' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}
                                                    title="詳細編集"
                                                >
                                                    <Info size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-14 bg-zinc-900 border-l border-zinc-800 flex flex-col items-center py-2 gap-2 shrink-0 z-20 shadow-[-5px_0_10px_rgba(0,0,0,0.2)] overflow-y-auto scrollbar-hide">
                     {/* ... (Existing adjust tools) ... */}
                     <div className="flex flex-col gap-1 items-center shrink-0">
                         <label className="text-[9px] text-zinc-500 font-bold mb-0.5 uppercase tracking-wider">位置</label>
                         <button 
                            disabled={!selectedLyricId}
                            onClick={() => handleShiftTime(-0.1)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${selectedLyricId ? 'bg-zinc-800 text-indigo-400 hover:bg-zinc-700 hover:text-white shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
                         >
                             <ChevronUp size={20} />
                         </button>
                         <button 
                            disabled={!selectedLyricId}
                            onClick={() => handleShiftTime(0.1)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${selectedLyricId ? 'bg-zinc-800 text-indigo-400 hover:bg-zinc-700 hover:text-white shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
                         >
                             <ChevronDown size={20} />
                         </button>
                     </div>

                     <div className="w-8 h-px bg-zinc-800 shrink-0"></div>

                     <div className="flex flex-col gap-1 items-center shrink-0">
                         <label className="text-[9px] text-zinc-500 font-bold mb-0.5 uppercase tracking-wider">長さ</label>
                         <button 
                            disabled={!selectedLyricId}
                            onClick={() => handleAdjustDuration(-0.1)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${selectedLyricId ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-500/30' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
                             title="短くする"
                         >
                             <MoveUp size={20} />
                         </button>
                         <button 
                            disabled={!selectedLyricId}
                            onClick={() => handleAdjustDuration(0.1)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${selectedLyricId ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-500/30' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
                            title="長くする"
                         >
                             <MoveDown size={20} />
                         </button>
                         <button 
                            disabled={!selectedLyricId}
                            onClick={handleExtendToCursor}
                            className={`mt-2 p-2 rounded-lg transition-all active:scale-95 ${selectedLyricId ? 'bg-zinc-800 text-pink-400 hover:bg-zinc-700 hover:text-white shadow-[0_0_10px_rgba(236,72,153,0.2)] border border-pink-500/30' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'}`}
                            title="ここまで"
                        >
                            <ArrowDownToLine size={20} />
                        </button>
                     </div>
                </div>
            </div>
        )}

        {/* ... (Modals remain same) ... */}
        {(selectedLyric && showDetailModal) && (
            <div className="absolute inset-x-0 bottom-0 z-50 bg-zinc-900 border-t border-zinc-700 shadow-2xl animate-[slideUp_0.2s_ease-out] flex flex-col max-h-[60vh]">
                {/* ... Detail Modal Content ... */}
                <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/50">
                    <h3 className="font-bold flex items-center gap-2 text-white text-sm"><Edit3 size={14} className="text-indigo-400"/> 詳細編集</h3>
                    <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={18}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {/* ... Fields ... */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">テキスト (※改行で分割表示されます)</label>
                        <textarea 
                            value={selectedLyric.text} 
                            onChange={(e) => onUpdateLyric(selectedLyric.id, { text: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-white focus:border-indigo-500 outline-none text-lg min-h-[5rem] resize-y"
                        />
                     </div>
                     <div className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg border border-zinc-800">
                        <input 
                            id="vertical-mode-toggle"
                            type="checkbox"
                            checked={selectedLyric.style.vertical || false}
                            onChange={(e) => onUpdateLyric(selectedLyric.id, { style: { ...selectedLyric.style, vertical: e.target.checked } })}
                            className="w-4 h-4 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="vertical-mode-toggle" className="text-sm font-bold text-white flex items-center gap-2 cursor-pointer select-none">
                            <AlignVerticalJustifyCenter size={16} /> 縦書きモード (Vertical Text)
                        </label>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">アニメーション</label>
                            <select 
                                value={selectedLyric.style.animation}
                                onChange={(e) => onUpdateLyric(selectedLyric.id, { style: { ...selectedLyric.style, animation: e.target.value as AnimationType } })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                            >
                                {Object.values(AnimationType).map(a => <option key={a} value={a}>{ANIMATION_LABELS[a]}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">サイズ</label>
                             <select 
                                value={selectedLyric.style.fontSize}
                                onChange={(e) => onUpdateLyric(selectedLyric.id, { style: { ...selectedLyric.style, fontSize: e.target.value as any } })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                            >
                                <option value="sm">小 (Small)</option>
                                <option value="md">中 (Medium)</option>
                                <option value="lg">大 (Large)</option>
                                <option value="xl">特大 (XL)</option>
                                <option value="2xl">極大 (2XL)</option>
                                <option value="4xl">巨大 (4XL)</option>
                                <option value="6xl">超巨大 (6XL)</option>
                            </select>
                         </div>
                     </div>
                     
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500">背景エフェクト（複数選択可 - Ctrl/Cmd押下）</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-zinc-800 p-2 rounded border border-zinc-700">
                             {Object.values(BackgroundEffect).filter(e => e !== 'none').map(e => {
                                 const isActive = (selectedLyric.style.effects || []).includes(e) || selectedLyric.style.backgroundEffect === e;
                                 return (
                                     <button
                                         key={e}
                                         onClick={() => {
                                             const currentEffects = new Set(selectedLyric.style.effects || []);
                                             if (selectedLyric.style.backgroundEffect && selectedLyric.style.backgroundEffect !== 'none') {
                                                 currentEffects.add(selectedLyric.style.backgroundEffect);
                                             }
                                             
                                             if (currentEffects.has(e)) currentEffects.delete(e);
                                             else currentEffects.add(e);
                                             
                                             onUpdateLyric(selectedLyric.id, {
                                                 style: {
                                                     ...selectedLyric.style,
                                                     effects: Array.from(currentEffects),
                                                     backgroundEffect: BackgroundEffect.NONE
                                                 }
                                             });
                                         }}
                                         className={`text-xs px-2 py-1.5 rounded text-left border ${isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-700 border-zinc-600 text-zinc-400'}`}
                                     >
                                         {EFFECT_LABELS[e]}
                                     </button>
                                 );
                             })}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">フォント</label>
                            <select 
                                value={selectedLyric.style.fontFamily}
                                onChange={(e) => onUpdateLyric(selectedLyric.id, { style: { ...selectedLyric.style, fontFamily: e.target.value as any } })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                            >
                                {Object.keys(FONT_LABELS).map((font) => (
                                    <option key={font} value={font}>{FONT_LABELS[font as FontFamily]}</option>
                                ))}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500">文字色</label>
                            <input 
                                type="color"
                                value={selectedLyric.style.color}
                                onChange={(e) => onUpdateLyric(selectedLyric.id, { style: { ...selectedLyric.style, color: e.target.value } })}
                                className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded p-1"
                            />
                         </div>
                     </div>
                     <button onClick={() => onDeleteLyric(selectedLyric.id)} className="w-full py-3 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 text-sm font-bold flex items-center justify-center gap-2">
                        <Trash2 size={16}/> この行を削除
                    </button>
                </div>
            </div>
        )}

        {/* --- BULK EDIT MODAL --- */}
        {showBulkModal && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s]" onClick={() => setShowBulkModal(false)}>
                {/* ... Bulk Edit Content (same as previous) ... */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <CopyCheck size={18} className="text-indigo-400"/>
                            一括編集
                        </h3>
                        <button onClick={() => setShowBulkModal(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-5">
                        <p className="text-xs text-zinc-400">
                            設定した項目を<span className="text-white font-bold">すべての歌詞ボックス</span>に適用します。<br/>
                            「（変更なし）」の項目は現在の設定が維持されます。
                        </p>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-zinc-500">縦書きモード</label>
                             <div className="flex bg-zinc-800 rounded-lg p-1">
                                 {['unchanged', 'on', 'off'].map(opt => (
                                     <button
                                         key={opt}
                                         onClick={() => setBulkForm({...bulkForm, vertical: opt as any})}
                                         className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${bulkForm.vertical === opt ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                     >
                                         {opt === 'unchanged' ? '(変更なし)' : opt === 'on' ? 'ON' : 'OFF'}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">アニメーション</label>
                                <select 
                                    value={bulkForm.animation}
                                    onChange={(e) => setBulkForm({...bulkForm, animation: e.target.value})}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                                >
                                    <option value="unchanged">(変更なし)</option>
                                    {Object.values(AnimationType).map(a => <option key={a} value={a}>{ANIMATION_LABELS[a]}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">サイズ</label>
                                <select 
                                    value={bulkForm.fontSize}
                                    onChange={(e) => setBulkForm({...bulkForm, fontSize: e.target.value})}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                                >
                                    <option value="unchanged">(変更なし)</option>
                                    <option value="sm">小 (Small)</option>
                                    <option value="md">中 (Medium)</option>
                                    <option value="lg">大 (Large)</option>
                                    <option value="xl">特大 (XL)</option>
                                    <option value="2xl">極大 (2XL)</option>
                                    <option value="4xl">巨大 (4XL)</option>
                                    <option value="6xl">超巨大 (6XL)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500">フォント</label>
                                <select 
                                    value={bulkForm.fontFamily}
                                    onChange={(e) => setBulkForm({...bulkForm, fontFamily: e.target.value})}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                                >
                                    <option value="unchanged">(変更なし)</option>
                                    {Object.keys(FONT_LABELS).map((font) => (
                                        <option key={font} value={font}>{FONT_LABELS[font as FontFamily]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={bulkForm.useColor} 
                                        onChange={(e) => setBulkForm({...bulkForm, useColor: e.target.checked})}
                                        className="rounded border-zinc-600 text-indigo-600"
                                    />
                                    色を変更
                                </label>
                                <input 
                                    type="color"
                                    value={bulkForm.color}
                                    disabled={!bulkForm.useColor}
                                    onChange={(e) => setBulkForm({...bulkForm, color: e.target.value})}
                                    className={`w-full h-10 bg-zinc-800 border border-zinc-700 rounded p-1 ${!bulkForm.useColor ? 'opacity-30 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                             <div className="flex items-center justify-between">
                                 <label className="text-xs font-bold text-zinc-500">背景エフェクト</label>
                                 <div className="flex bg-zinc-800 rounded-md p-0.5">
                                     <button onClick={() => setBulkForm({...bulkForm, effectsMode: 'unchanged'})} className={`text-[10px] px-2 py-1 rounded ${bulkForm.effectsMode === 'unchanged' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>維持</button>
                                     <button onClick={() => setBulkForm({...bulkForm, effectsMode: 'replace'})} className={`text-[10px] px-2 py-1 rounded ${bulkForm.effectsMode === 'replace' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>上書き</button>
                                 </div>
                             </div>
                             
                             {bulkForm.effectsMode === 'replace' && (
                                 <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-zinc-800 p-2 rounded border border-zinc-700 animate-[fadeIn_0.2s]">
                                     {Object.values(BackgroundEffect).filter(e => e !== 'none').map(e => {
                                         const isActive = bulkForm.effects.includes(e);
                                         return (
                                             <button
                                                 key={e}
                                                 onClick={() => {
                                                     const current = new Set(bulkForm.effects);
                                                     if (current.has(e)) current.delete(e);
                                                     else current.add(e);
                                                     setBulkForm({...bulkForm, effects: Array.from(current)});
                                                 }}
                                                 className={`text-xs px-2 py-1.5 rounded text-left border ${isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-700 border-zinc-600 text-zinc-400'}`}
                                             >
                                                 {EFFECT_LABELS[e]}
                                             </button>
                                         );
                                     })}
                                 </div>
                             )}
                        </div>

                        <button 
                            onClick={applyBulkUpdate}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4"
                        >
                            一括適用する
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- SEMI AUTO MODAL --- */}
        {showSemiAutoModal && (
            <div 
                className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s]"
                onClick={() => setShowSemiAutoModal(false)}
            >
                {/* ... Semi Auto Content (same as previous) ... */}
                <div 
                    className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Grid2X2 size={18} className="text-cyan-400"/>
                            セミオート演出（XYパッド）
                        </h3>
                        <button onClick={() => setShowSemiAutoModal(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 flex flex-col items-center gap-4">
                        <p className="text-xs text-zinc-400 text-center">
                            パッドをクリックすると、その雰囲気に合わせたフォント・アニメーション・色を<br/>
                            <span className="text-white font-bold">全歌詞（または選択中）</span>に適用します。
                        </p>

                        {/* XY PAD CONTAINER */}
                        <div className="relative w-64 h-64 bg-zinc-800 rounded-xl border-2 border-zinc-700 shadow-inner overflow-hidden group cursor-crosshair" onClick={handlePadClick}>
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                            
                            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-400 bg-zinc-900/50 px-1 rounded">激しい (Intense)</span>
                            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-cyan-400 bg-zinc-900/50 px-1 rounded">穏やか (Calm)</span>
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 bg-zinc-900/50 px-1 rounded writing-vertical-rl">シンプル (Simple)</span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-400 bg-zinc-900/50 px-1 rounded writing-vertical-rl">派手 (Flashy)</span>
                            
                            {/* Visual Cursor Dot */}
                            <div 
                                className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 z-20"
                                style={{ 
                                    left: `${(xyCursor.x + 1) / 2 * 100}%`, 
                                    top: `${(-xyCursor.y + 1) / 2 * 100}%`,
                                    opacity: (xyCursor.x === 0 && xyCursor.y === 0) ? 0.5 : 1
                                }} 
                            />

                            {isSimpleMode && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">シンプルモード有効中</span>
                                </div>
                            )}
                        </div>

                        {/* Simple Mode Toggle */}
                        <div className="w-full bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 flex items-center justify-between group cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => setIsSimpleMode(!isSimpleMode)}>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                    <Settings2 size={16} className={isSimpleMode ? "text-emerald-400" : "text-zinc-500"} />
                                    シンプルモード
                                </span>
                                <span className="text-[10px] text-zinc-400 mt-1">
                                    ONにすると、タップで「縦書き・中央・白・明朝体・フェード」を適用
                                </span>
                            </div>
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${isSimpleMode ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isSimpleMode ? 'left-5' : 'left-1'}`} />
                            </div>
                        </div>
                        
                        {isSimpleMode && (
                             <button 
                                onClick={() => applySemiAutoStyle(0, 0)} 
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                             >
                                 シンプルスタイルを適用
                             </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setShowSemiAutoModal(false)}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-t border-zinc-700 font-bold transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default TimelineEditor;