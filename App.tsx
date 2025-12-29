import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Download, Music, Image as ImageIcon, Loader2, CircleHelp, X, Edit3, FileText, Maximize, Palette, Gamepad2, Video, Check, Trash2, MonitorPlay, Sparkles, BoxSelect, PaintBucket, ChevronDown, ChevronUp, Layers, ScreenShare, Maximize2, ClipboardPaste, Wand2, RotateCcw, GripHorizontal, Eraser, History, Film } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import TimelineEditor from './components/TimelineEditor';
import { generateLyricsFromVideo } from './services/geminiService';
import { LyricSegment, AnimationType, BackgroundEffect, TransitionType } from './types';
import { saveMedia, saveLyrics, loadProjectData, clearProjectData, ProjectState } from './services/storageService';

// Helper to create a solid color image data URL
const createSolidColorImage = (color: string, width = 1920, height = 1080): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL('image/jpeg', 0.8);
};

// Helper to clean lyrics text (remove section headers and specific characters)
const cleanLyricsText = (text: string) => {
    return text
        // Remove the specific dash character requested by user (U+2E3B THREE-EM DASH and similar)
        .replace(/⸻/g, '')
        .replace(/─/g, '')
        .replace(/━/g, '')
        // Remove standard brackets content (e.g., [Verse 1], [Chorus])
        .replace(/\[.*?\]/g, '')
        // Remove Japanese brackets content (e.g., 【Aメロ】)
        .replace(/【.*?】/g, '')
        // Remove angle brackets content (e.g., <Sabi>)
        .replace(/<.*?>/g, '')
        // Remove empty lines created by removals
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .join('\n');
};

function App() {
  // New State structure
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideoMode, setIsVideoMode] = useState(false);
  
  const [imageFiles, setImageFiles] = useState<Blob[]>([]); 
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  const [lyrics, setLyrics] = useState<LyricSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [globalOffset, setGlobalOffset] = useState(-0.15); 
  
  // Visual Settings
  const [transitionType, setTransitionType] = useState<TransitionType>(TransitionType.FADE);
  const [smartTextEnabled, setSmartTextEnabled] = useState(true);

  // Modals / Modes
  const [editorMode, setEditorMode] = useState<'list' | 'manual'>('manual');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [isCleanMode, setIsCleanMode] = useState(false); 
  const [referenceLyrics, setReferenceLyrics] = useState("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false); 
  
  // Header Collapse State
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Resizable Preview State
  const [previewHeight, setPreviewHeight] = useState(320); // Default height in pixels
  const isResizing = useRef(false);

  // Lifted State for Timeline/Adjust Interaction
  const [activeTab, setActiveTab] = useState<'insert' | 'adjust' | 'effects'>('insert');
  const [selectedLyricId, setSelectedLyricId] = useState<string | null>(null);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  
  // Preview Visibility State
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Restore Logic
  const [isRestoring, setIsRestoring] = useState(true);
  const [pendingRestoreData, setPendingRestoreData] = useState<ProjectState | null>(null);
  
  // Refs for file inputs
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    const checkSavedData = async () => {
        try {
            const data = await loadProjectData();
            // If data exists, DO NOT restore immediately. Store it in pending state.
            if (data && (data.audioBlob || data.lyrics.length > 0)) {
                console.log("Found saved project data.");
                setPendingRestoreData(data);
            }
        } catch (e) {
            console.error("Error checking saved data", e);
        } finally {
            // Always finish "restoring" phase immediately so UI loads empty
            setIsRestoring(false);
        }
    };
    checkSavedData();
  }, []);

  const handleRestoreSession = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!pendingRestoreData) return;
      
      setGenerationStatus("データを復元中...");
      setPendingRestoreData(null); // Clear prompt immediately

      try {
          const data = pendingRestoreData;
          
          // Audio/Video
          if (data.audioBlob) {
              const restoredFile = new File([data.audioBlob], data.audioName || "restored_media", { type: data.audioBlob.type });
              setMediaFile(restoredFile);
              setMediaUrl(URL.createObjectURL(restoredFile));
              setIsVideoMode(restoredFile.type.startsWith('video/'));
          }

          // Images
          if (data.imageBlobs && data.imageBlobs.length > 0) {
              setImageFiles(data.imageBlobs);
              const urls = data.imageBlobs.map(b => URL.createObjectURL(b));
              setImageUrls(urls);
          }

          // Lyrics
          if (data.lyrics) {
              setLyrics(data.lyrics);
          }
          
      } catch (e) {
          console.error("Restore failed", e);
          alert("復元に失敗しました。");
      } finally {
          setGenerationStatus(null);
      }
  };

  const handleDiscardSession = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      
      // 1. Immediate UI Feedback: Close the toast
      setPendingRestoreData(null);

      // 2. Background cleanup
      try {
          await clearProjectData();
      } catch (err) {
          console.warn("Background clear failed", err);
      }
  };

  // Optimize persistence: Only save lyrics/text changes in the frequent loop.
  // Media is saved only on upload.
  const persistLyrics = useCallback(async (ls: LyricSegment[]) => {
      if (isRestoring) return;
      await saveLyrics(ls);
  }, [isRestoring]);

  useEffect(() => {
      if (isRestoring) return;
      // Skip initial load empty save
      if (lyrics.length === 0 && !mediaFile) return;

      const timer = setTimeout(() => {
          persistLyrics(lyrics);
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
  }, [lyrics, persistLyrics, isRestoring, mediaFile]);

  // Sync reference text only on initial open if empty, OR if manual sync is needed
  useEffect(() => {
      if (isLyricsModalOpen && referenceLyrics === "" && lyrics.length > 0) {
          // If no reference text but we have lyrics (e.g. from restoration), populate it
          const pendingText = lyrics
              .map(l => l.text)
              .join('\n');
          if (pendingText) {
             setReferenceLyrics(pendingText);
          }
      }
  }, [isLyricsModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          setIsCleanMode(false);
          setIsPreviewFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Resize Logic ---
  const startResizing = (e: React.PointerEvent) => {
      isResizing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
  };

  const handleResizeMove = (e: React.PointerEvent) => {
      if (!isResizing.current) return;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, e.clientY - 60)); 
      setPreviewHeight(newHeight);
  };

  const stopResizing = (e: React.PointerEvent) => {
      isResizing.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
  };

  // --- Audio / Image Handlers ---
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPendingRestoreData(null); // Clear restore prompt if user starts new
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      
      const isVideo = file.type.startsWith('video/');
      setIsVideoMode(isVideo);

      setLyrics([]); 
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Save media immediately and separately
      saveMedia(file, imageFiles);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
          setPendingRestoreData(null); // Clear restore prompt if user starts new
          const newFiles = Array.from(files) as File[];
          const nextFiles = [...imageFiles, ...newFiles];
          setImageFiles(nextFiles);
          const newUrls = newFiles.map(f => URL.createObjectURL(f));
          setImageUrls(prev => [...prev, ...newUrls]);
          
          // Save media immediately and separately
          saveMedia(mediaFile, nextFiles);
      }
  };

  const handleAddSolidColor = async () => {
      const blackDataUrl = createSolidColorImage('#000000');
      const res = await fetch(blackDataUrl);
      const blob = await res.blob();
      const nextFiles = [...imageFiles, blob];
      setImageFiles(nextFiles);
      setImageUrls(prev => [...prev, blackDataUrl]);
      
      // Save media
      saveMedia(mediaFile, nextFiles);
  };

  const handleUpdateImage = (index: number, newUrl: string) => {
      setImageUrls(prev => {
          const next = [...prev];
          if (index >= 0 && index < next.length) {
              next[index] = newUrl;
          }
          return next;
      });
  };

  // --- Manual Clear Handlers ---
  const handleClearMedia = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("メディアファイルを削除しますか？\n（歌詞データは残ります）")) return;
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      setMediaFile(null);
      setMediaUrl(null);
      setIsVideoMode(false);
      saveMedia(null, imageFiles);
  };

  const handleClearImages = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("画像を全て削除しますか？")) return;
      setImageFiles([]);
      setImageUrls([]);
      saveMedia(mediaFile, []);
  };

  const handleClearTimelineLyrics = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("タイムライン上の歌詞ボックスを全て削除しますか？\n（入力したテキストデータは残ります）")) return;
      setLyrics([]);
      // saveLyrics is handled by useEffect
  };
  
  const handleClearReferenceText = () => {
      if (window.confirm("入力エリアのテキストを全て消去しますか？")) {
          setReferenceLyrics("");
      }
  };

  // --- Reset Project (Clear all data by deleting items and overwriting DB) ---
  const handleResetProject = async () => {
      if (!window.confirm("【完全リセット】\n現在のプロジェクトを全て消去して初期状態に戻しますか？\n（この操作は元に戻せません。現在の作業は完全に削除されます）")) {
          return;
      }
      
      try {
          setIsPlaying(false);
          // 1. Clear IndexedDB
          await clearProjectData();
          
          // 2. Force Reload to ensure clean slate (mimics App Update)
          window.location.reload();

      } catch (e) {
          console.error("Reset failed", e);
          alert("リセット処理中にエラーが発生しました。");
      }
  };

  // --- AI AUTO GENERATION ---
  const handleAutoGenerateLyrics = async () => {
      if (!mediaFile) {
          alert("まずは音楽・動画ファイルをアップロードしてください。");
          return;
      }
      
      let textToSync = lyrics.map(l => l.text).join('\n').trim();
      if (!textToSync && referenceLyrics.trim()) {
          textToSync = referenceLyrics;
      }
      
      const hasText = textToSync.length > 0;
      
      const confirmMsg = hasText 
          ? "【歌詞同期モード】\n現在のテキストを使用して、AIでタイミングを自動同期します。\n（既存のタイミング情報は上書きされます）"
          : "【自動書き起こしモード】\nテキストが見つかりません。AIが音声から歌詞を書き起こします。\n（既存の歌詞は上書きされます）";

      if (lyrics.length > 0 && !window.confirm(confirmMsg)) {
          return;
      }

      setGenerationStatus("AI準備中...");
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
          setIsPlaying(false);
          
          const result = await generateLyricsFromVideo(
              mediaFile, 
              textToSync, // Pass the gathered text explicitly
              null, // Removed audioBuffer usage
              (status) => setGenerationStatus(status)
          );
          
          if (!result || result.length === 0) {
              throw new Error("AIが歌詞を生成できませんでした。音声が短すぎるか、無音の可能性があります。");
          }

          setLyrics(result);
          
          // Sync generated lyrics to text box (User request)
          const rawText = result.map(l => l.text).join('\n');
          setReferenceLyrics(rawText);

          setActiveTab('adjust');
          saveLyrics(result);
          
          alert("生成完了！\n「微調整」タブでタイミングを確認してください。");
      } catch (e: any) {
          console.error("Generate error:", e);
          alert("生成エラー: " + (e.message || "不明なエラーが発生しました。時間を置いて再試行してください。"));
      } finally {
          setGenerationStatus(null);
      }
  };

  const updateLyric = (id: string, updates: Partial<LyricSegment>) => {
    setLyrics(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLyric = (id: string) => {
    setLyrics(prev => prev.filter(l => l.id !== id));
  };

  const addLyric = (text?: string, startTime?: number, endTime?: number) => {
    const start = startTime !== undefined ? startTime : currentTime;
    const end = endTime !== undefined ? endTime : start + 3;
    const pendingLyric = lyrics.find(l => l.startTime === -1);
    
    setLyrics(prev => {
        const placedLyrics = prev.filter(l => l.startTime >= 0).sort((a, b) => a.startTime - b.startTime);
        const lastLyric = placedLyrics.length > 0 ? placedLyrics[placedLyrics.length - 1] : null;

        const updatedLyrics = prev.map(l => {
             if (lastLyric && l.id === lastLyric.id && l.endTime > start) {
                 return { ...l, endTime: start };
             }
             return l;
        });

        if (pendingLyric && text === pendingLyric.text) {
             return updatedLyrics.map(l => l.id === pendingLyric.id ? { ...l, startTime: start, endTime: end } : l);
        } else {
            const newLyric: LyricSegment = {
                id: Date.now().toString(),
                text: text || "新規歌詞",
                startTime: start,
                endTime: end,
                style: {
                    animation: AnimationType.SLIDE_UP,
                    color: '#ffffff',
                    fontSize: '4xl',
                    position: 'center',
                    fontFamily: 'display',
                    backgroundEffect: BackgroundEffect.NONE
                }
            };
            return [...updatedLyrics, newLyric].sort((a, b) => {
                if (a.startTime === -1) return 1;
                if (b.startTime === -1) return -1;
                return a.startTime - b.startTime;
            });
        }
    });
  };

  const handleBulkUpdate = (styleUpdates: Partial<LyricSegment['style']>, targetIds?: string[]) => {
    setLyrics(prev => prev.map(l => {
      if (targetIds && !targetIds.includes(l.id)) {
        return l;
      }
      return {
        ...l,
        style: { ...l.style, ...styleUpdates }
      };
    }));
  };

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleLyricClick = (id: string) => {
      setSelectedLyricId(id);
  };

  const handlePasteLyrics = async () => {
      try {
          const text = await navigator.clipboard.readText();
          setReferenceLyrics(cleanLyricsText(text));
          setIsEditingLyrics(false); 
      } catch (err) {
          alert("クリップボードへのアクセスが許可されていません。\n鉛筆ボタンから手動で貼り付けてください。");
          setIsEditingLyrics(true); 
      }
  };

  const handleSaveReferenceLyrics = () => {
      const cleaned = cleanLyricsText(referenceLyrics);
      const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l !== '');
      const newPendingLyrics: LyricSegment[] = lines.map((text, i) => ({
          id: `pending-${Date.now()}-${i}`,
          text: text,
          startTime: -1,
          endTime: -1,
          style: {
            animation: AnimationType.SLIDE_UP,
            color: '#ffffff',
            fontSize: '4xl',
            position: 'center',
            fontFamily: 'display'
          }
      }));
      
      setLyrics(prev => {
          const placed = prev.filter(l => l.startTime >= 0);
          return [...placed, ...newPendingLyrics];
      });
      setReferenceLyrics(cleaned);
      setIsLyricsModalOpen(false);
  };
  
  const handleScreenRecord = async () => {
     if (!navigator.mediaDevices?.getDisplayMedia) {
         alert("お使いのブラウザは画面録画に対応していないようです。");
         setIsCleanMode(true);
         return;
     }

     try {
         const stream = await navigator.mediaDevices.getDisplayMedia({
             video: { displaySurface: 'browser' },
             audio: true 
         });
         const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
         const chunks: Blob[] = [];

         mediaRecorder.ondataavailable = (e) => {
             if (e.data.size > 0) chunks.push(e.data);
         };

         mediaRecorder.onstop = () => {
             const blob = new Blob(chunks, { type: 'video/webm' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `lyricflow-export-${Date.now()}.webm`;
             a.click();
             setIsCleanMode(false); 
             stream.getTracks().forEach(track => track.stop());
         };
         mediaRecorder.start();
         setIsCleanMode(true);
         stream.getVideoTracks()[0].onended = () => { mediaRecorder.stop(); };
     } catch (err) { console.error("Error starting screen record:", err); }
  };

  if (isRestoring) {
      return (
          <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={48} />
              <p className="text-zinc-400 font-mono text-sm animate-pulse">初期化中...</p>
          </div>
      );
  }

  // --- FULLSCREEN OVERLAY ---
  if (isCleanMode || isPreviewFullScreen) {
      return (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col animate-[fadeIn_0.2s_ease-out]">
           <div className="flex-1 relative">
               <VideoPlayer
                  audioUrl={mediaUrl}
                  imageUrls={imageUrls}
                  lyrics={lyrics.filter(l => l.startTime >= 0)} 
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onEnded={() => setIsPlaying(false)}
                  onToggleExpand={() => { setIsCleanMode(false); setIsPreviewFullScreen(false); }} 
                  onTogglePlay={handleTogglePlay}
                  onClose={() => { setIsCleanMode(false); setIsPreviewFullScreen(false); }}
                  isExpanded={true}
                  globalOffset={globalOffset}
                  transitionType={transitionType}
                  smartTextEnabled={smartTextEnabled}
                  hideControls={isCleanMode} 
                  selectedLyricId={selectedLyricId}
                  onLyricClick={handleLyricClick}
                  isVideoMode={isVideoMode}
               />
           </div>
        </div>
      );
  }

  // --- File Inputs ---
  const FileInputs = (
      <div className="flex flex-col gap-2 w-full transition-all">
            <button 
                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                className={`flex items-center justify-between w-full px-4 py-2 rounded-lg border transition-all ${isHeaderExpanded ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
            >
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
                    <Layers size={16} />
                    <span>メディア・素材を追加</span>
                    {!isHeaderExpanded && (
                       <div className="flex items-center gap-1 ml-2 opacity-50">
                           {mediaUrl && (isVideoMode ? <Film size={12} className="text-indigo-400" /> : <Music size={12} className="text-indigo-400" />)}
                           {imageUrls.length > 0 && <ImageIcon size={12} className="text-pink-400" />}
                           {lyrics.length > 0 && <FileText size={12} className="text-emerald-400" />}
                       </div>
                    )}
                </div>
                {isHeaderExpanded ? <ChevronUp size={16} className="text-zinc-500"/> : <ChevronDown size={16} className="text-zinc-500"/>}
            </button>

            {isHeaderExpanded && (
                <div className="flex flex-col gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 animate-[slideDown_0.2s_ease-out]">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Media Upload Group (Music or Video) */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => mediaInputRef.current?.click()}
                                className={`h-10 px-3 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all border shrink-0 ${mediaFile ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
                                title={mediaFile ? mediaFile.name : "音楽/動画を選択"}
                            >
                                {isVideoMode ? <Film size={18} /> : <Music size={18} />}
                                <span className="text-xs font-bold whitespace-nowrap max-w-[100px] truncate">{mediaFile ? mediaFile.name : '動画・音声'}</span>
                            </button>
                            {mediaFile && (
                                <button onClick={handleClearMedia} className="h-10 px-2 flex items-center justify-center bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded-lg border border-zinc-700 transition-colors" title="メディアを削除">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <input ref={mediaInputRef} type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.webm,audio/*,video/*" onChange={handleMediaUpload} style={{ display: 'none' }} />
                        </div>

                        {/* Image Upload Group */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className={`h-10 px-3 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all border shrink-0 ${imageFiles.length > 0 ? 'bg-pink-900/20 border-pink-500/50 text-pink-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
                                title="背景画像を選択"
                                disabled={isVideoMode} // Disable if video mode is on? Or allow overlay? Let's allow for now but maybe UI hint?
                            >
                                <ImageIcon size={18} />
                                <span className="text-xs font-bold whitespace-nowrap">画像 {imageFiles.length > 0 ? `(${imageFiles.length})` : ''}</span>
                            </button>
                             {imageFiles.length > 0 && (
                                <button onClick={handleClearImages} className="h-10 px-2 flex items-center justify-center bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded-lg border border-zinc-700 transition-colors" title="画像を全て削除">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                        </div>

                        <button onClick={handleAddSolidColor} disabled={isVideoMode} className={`h-10 px-3 flex items-center justify-center gap-2 rounded-lg border transition-colors shrink-0 ${isVideoMode ? 'opacity-30 bg-zinc-900 border-zinc-800' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}>
                            <PaintBucket size={18} />
                        </button>

                        <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                        
                        {/* Lyrics Group */}
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsLyricsModalOpen(true)} className={`h-10 px-3 flex items-center justify-center gap-2 rounded-lg border transition-colors shrink-0 ${lyrics.some(l => l.startTime === -1) ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`} title="歌詞テキスト入力">
                                <FileText size={18} />
                                <span className="text-xs font-bold whitespace-nowrap">歌詞</span>
                            </button>
                             {lyrics.length > 0 && (
                                <button onClick={handleClearTimelineLyrics} className="h-10 px-3 flex items-center justify-center gap-1 bg-red-900/30 border-red-500/30 text-red-300 hover:bg-red-900/50 hover:text-white rounded-lg border transition-colors shadow-sm" title="タイムラインの歌詞ボックスを全て削除">
                                    <Trash2 size={14} />
                                    <span className="text-[10px] font-bold">歌詞全削除</span>
                                </button>
                            )}
                        </div>
                        
                        <button onClick={handleAutoGenerateLyrics} className="h-10 px-3 flex items-center justify-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/20 transition-all active:scale-95 shrink-0 ml-auto" title="AIで歌詞を自動生成または同期">
                            <Wand2 size={16} />
                            <span className="text-xs font-bold whitespace-nowrap">AI自動生成</span>
                        </button>
                    </div>
                    {imageUrls.length > 0 && !isVideoMode && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {imageUrls.map((url, i) => (
                            <div key={i} className="relative group shrink-0 w-12 h-12 rounded-md border border-zinc-800 overflow-hidden bg-zinc-900">
                                <img src={url} className="w-full h-full object-cover" alt="" />
                            </div>
                        ))}
                        </div>
                    )}
                    {isVideoMode && (
                        <div className="text-xs text-indigo-300 bg-indigo-900/20 p-2 rounded flex items-center gap-2">
                            <Film size={14} />
                            <span>動画モード有効: 背景として動画を再生します（静止画は無効化されます）</span>
                        </div>
                    )}
                </div>
            )}
      </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white flex flex-col overflow-hidden font-sans relative">
      
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between px-4 z-20 shrink-0 gap-4">
        <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Music className="text-white" size={14} />
            </div>
            <h1 className="font-display font-bold text-base tracking-tight">LyricFlow</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleResetProject} 
            className="group relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all duration-100 active:scale-90 active:bg-red-500/20 active:text-red-400 border border-transparent hover:border-zinc-700 active:border-red-500/50 flex items-center justify-center" 
            title="プロジェクトをリセット（再読み込み）"
          >
            <RotateCcw size={18} className="group-active:-rotate-180 transition-transform duration-300" />
          </button>
          <button onClick={() => setIsPreviewFullScreen(true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors hidden sm:block" title="プレビューを全画面表示"><Maximize2 size={18} /></button>
          <button onClick={() => { if(!mediaUrl) { alert("まずはメディアを追加してください"); return; } handleScreenRecord(); }} className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 hover:border-red-500/50 rounded-lg transition-colors group" title="PC画面録画 / レコーディングモード">
             {navigator.mediaDevices?.getDisplayMedia ? <ScreenShare size={14} /> : <MonitorPlay size={14} className="group-hover:animate-pulse" />}
             <span className="text-xs font-bold">REC</span>
          </button>
        </div>
      </header>
      
      {/* (Rest of component remains mostly similar, ensuring FileInputs is used) */}
      
      {/* Generation Status Overlay */}
      {generationStatus && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center gap-6 animate-[fadeIn_0.2s]">
              <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={24} />
              </div>
              <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">AI生成中...</h3>
                  <p className="text-zinc-400 font-mono text-sm">{generationStatus}</p>
              </div>
          </div>
      )}

      {/* RESTORE PROMPT (Toast) */}
      {pendingRestoreData && (
          <div className="fixed bottom-4 right-4 z-[90] bg-zinc-900 border border-indigo-500/50 rounded-xl p-4 shadow-2xl animate-[slideUp_0.3s_ease-out] flex flex-col gap-3 max-w-sm">
             <div className="flex items-start gap-3">
                 <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                     <History size={20} className="text-indigo-400" />
                 </div>
                 <div>
                     <h4 className="font-bold text-white text-sm">作業を復元しますか？</h4>
                     <p className="text-xs text-zinc-400 mt-1">前回保存されたセッションデータが見つかりました。</p>
                     {pendingRestoreData.audioName && <p className="text-[10px] font-mono text-zinc-500 mt-1 truncate max-w-[200px]">{pendingRestoreData.audioName}</p>}
                 </div>
             </div>
             <div className="flex gap-2 mt-1">
                 <button onClick={handleDiscardSession} className="flex-1 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                     いいえ
                 </button>
                 <button onClick={handleRestoreSession} className="flex-[2] py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-colors">
                     はい
                 </button>
             </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* VIDEO PLAYER AREA with DRAG RESIZE */}
        {editorMode === 'manual' && mediaUrl && (
           <div 
             className={`shrink-0 w-full bg-zinc-950 relative border-b border-zinc-800 shadow-2xl z-0 transition-[opacity] duration-300 flex flex-col ${isPreviewVisible ? 'opacity-100' : 'h-0 overflow-hidden border-none opacity-0'}`}
             style={{ height: isPreviewVisible ? previewHeight : 0 }}
           >
              <div className="flex-1 relative overflow-hidden">
                <VideoPlayer
                    audioUrl={mediaUrl}
                    imageUrls={imageUrls}
                    lyrics={lyrics.filter(l => l.startTime >= 0)}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                    onEnded={() => setIsPlaying(false)}
                    onToggleExpand={() => setIsPreviewFullScreen(true)} 
                    onTogglePlay={handleTogglePlay}
                    isExpanded={false}
                    globalOffset={globalOffset}
                    transitionType={transitionType}
                    smartTextEnabled={smartTextEnabled}
                    hideControls={true} 
                    selectedLyricId={selectedLyricId}
                    onLyricClick={handleLyricClick}
                    isVideoMode={isVideoMode}
                />
              </div>

              {/* Resize Handle */}
              {isPreviewVisible && (
                  <div 
                    className="h-4 w-full bg-zinc-900 border-t border-zinc-800 hover:bg-zinc-800 cursor-row-resize flex items-center justify-center shrink-0 z-20 group transition-colors"
                    onPointerDown={startResizing}
                    onPointerMove={handleResizeMove}
                    onPointerUp={stopResizing}
                    onPointerLeave={stopResizing} // Ensure drag stops if mouse leaves
                  >
                      <GripHorizontal size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                  </div>
              )}
           </div>
        )}

        {/* TIMELINE EDITOR AREA */}
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
            <TimelineEditor
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                onUpdateLyric={updateLyric}
                onDeleteLyric={deleteLyric}
                onAddLyric={(text, start, end) => addLyric(text, start, end)}
                onSeek={(t) => setCurrentTime(t)}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onBulkUpdate={handleBulkUpdate}
                globalOffset={globalOffset}
                onGlobalOffsetChange={setGlobalOffset}
                
                headerContent={FileInputs}
                mode={editorMode}
                onModeChange={setEditorMode}
                smartTextEnabled={smartTextEnabled}
                onToggleSmartText={() => setSmartTextEnabled(!smartTextEnabled)}
                referenceLyrics={""} 
                imageUrls={imageUrls}
                onUpdateImage={handleUpdateImage}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedLyricId={selectedLyricId}
                setSelectedLyricId={setSelectedLyricId}
                isPreviewVisible={isPreviewVisible}
                setIsPreviewVisible={setIsPreviewVisible}
            />
        </div>
      </main>

      {/* Lyrics Input Modal */}
      {isLyricsModalOpen && (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
             <div className="flex items-center gap-2 text-white">
                <FileText className="text-indigo-500" size={24}/>
                <h2 className="text-lg font-bold">歌詞テキスト入力</h2>
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={handleClearReferenceText} className="p-2 bg-zinc-800 hover:bg-red-900/20 text-zinc-400 hover:text-red-400 rounded-full transition-colors" title="テキストを消去"><Eraser size={18}/></button>
                 {!isEditingLyrics && <button onClick={() => setIsEditingLyrics(true)} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"><Edit3 size={18} /></button>}
                 <button onClick={handleSaveReferenceLyrics} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">完了</button>
             </div>
          </div>
          <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full relative">
            <p className="text-sm text-zinc-400 mb-2">ここに歌詞を貼り付けてください。現在の「待機中」リストは上書きされます。</p>
            {!isEditingLyrics && (
                <div className="flex-1 flex flex-col gap-4 relative">
                    <div onClick={() => setIsEditingLyrics(true)} className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-zinc-200 text-lg leading-relaxed font-mono overflow-y-auto cursor-text hover:border-zinc-700 transition-colors">
                        {referenceLyrics ? <pre className="whitespace-pre-wrap font-sans">{referenceLyrics}</pre> : <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4"><p>テキストがありません</p></div>}
                    </div>
                    <button onClick={handlePasteLyrics} className="absolute bottom-6 right-6 flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full shadow-lg shadow-indigo-900/50 transition-all active:scale-95"><ClipboardPaste size={20} /><span>ペースト</span></button>
                </div>
            )}
            {isEditingLyrics && (
                <div className="flex-1 relative w-full">
                    <textarea 
                        className="w-full h-full bg-zinc-900 border border-indigo-500/50 rounded-xl p-6 text-zinc-200 text-lg leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono" 
                        placeholder="歌詞を貼り付け..." 
                        value={referenceLyrics} 
                        onChange={(e) => setReferenceLyrics(e.target.value)} 
                        autoFocus 
                    />
                    {referenceLyrics && (
                        <button 
                            onClick={() => setReferenceLyrics('')}
                            className="absolute top-4 right-4 p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all"
                            title="テキストをクリア"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {isTutorialOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative animate-[fadeIn_0.3s_ease-out]">
             <button onClick={() => setIsTutorialOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">使い方ガイド <CircleHelp className="text-indigo-500" size={20}/></h2>
             <ul className="space-y-6 text-zinc-300">
               <li className="flex gap-4"><div className="bg-zinc-800 p-3 rounded-xl h-fit shrink-0"><Music size={20} className="text-zinc-400"/></div><div><span className="font-bold text-white block mb-1">1. 楽曲と画像をアップロード</span><p className="text-sm text-zinc-400">リスト上部のボタンからファイルを選択します。</p></div></li>
               <li className="flex gap-4"><div className="bg-indigo-900/30 p-3 rounded-xl h-fit shrink-0"><FileText size={20} className="text-indigo-400"/></div><div><span className="font-bold text-white block mb-1">2. 歌詞の準備</span><p className="text-sm text-zinc-400">テキストを入力し、リズムパッドでタップしてタイミングを合わせます。</p></div></li>
               <li className="flex gap-4"><div className="bg-red-900/20 p-3 rounded-xl h-fit shrink-0"><Video size={20} className="text-red-400"/></div><div><span className="font-bold text-white block mb-1">3. 録画して保存</span><p className="text-sm text-zinc-400">「RECモード」を押して、OBSなどの画面録画ソフトでキャプチャしてください。</p></div></li>
             </ul>
             <button onClick={() => setIsTutorialOpen(false)} className="w-full mt-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">作成を始める</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;