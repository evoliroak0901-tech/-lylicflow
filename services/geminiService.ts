import { LyricSegment, AnimationType, BackgroundEffect } from '../types';

// --- Main Logic ---

const fileToGenerativePart = async (
  file: File,
  onProgress: (status: string) => void
): Promise<{ inlineData: { data: string; mimeType: string } }> => {

  onProgress("データをエンコード中...");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      if (!base64Data) {
        reject(new Error("Failed to read file data"));
        return;
      }
      const base64Content = base64Data.split(',')[1];

      // Fix common mime-types for API compatibility
      let mimeType = file.type;
      if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';

      resolve({
        inlineData: {
          data: base64Content,
          mimeType: mimeType,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateLyricsFromVideo = async (
  mediaFile: File,
  referenceLyrics?: string,
  preDecodedAudio?: AudioBuffer | null,
  onProgress: (status: string) => void = () => { }
): Promise<LyricSegment[]> => {
  try {
    onProgress("ファイル準備中...");

    // Simply upload the raw file. Gemini Flash 2.0 handles MP3/WAV/AAC natively and robustly.
    const mediaPart = await fileToGenerativePart(mediaFile, onProgress);

    onProgress("AIが楽曲を聴取・同期中...");

    let prompt = "";

    // ユーザーの意図に合わせてプロンプトを分岐
    if (referenceLyrics && referenceLyrics.trim().length > 0) {
      // --- ALIGNMENT MODE (強制同期モード) ---
      prompt = `
      You are an expert audio synchronizer.
      
      Task: Synchronize the provided "REFERENCE_TEXT" to the audio audio track.
      
      Requirements:
      1. Use the "REFERENCE_TEXT" exactly line by line. Do not skip lines.
      2. Listen to the audio and find the Start Time and End Time for each line.
      3. If a line is very long, insert a '\\n' character at a natural pause (Bunsetsu) to split it visually, but keep it as one object.
      4. Assign a Visual Style (animation, font, color) based on the mood of that specific part.

      REFERENCE_TEXT:
      """
      ${referenceLyrics}
      """

      Return JSON object with "lyrics" array.
      `;
    } else {
      // --- TRANSCRIPTION MODE (書き起こしモード) ---
      prompt = `
      You are an expert transcriber.

      Task: Transcribe the lyrics from the audio.
      
      Requirements:
      1. Listen to the vocals and write down the text.
      2. Provide Start Time and End Time.
      3. Assign Visual Style (animation, font, color) based on the mood.
      4. If a line is long, insert '\\n' for readability.

      Return JSON object with "lyrics" array.
      `;
    }

    const response = await fetch('/api/generate-lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaPart, prompt, referenceLyrics })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const parsed = await response.json();

    onProgress("タイムライン構築中...");

    const validateEnum = (val: string, enumObj: any, defaultVal: any) => {
      if (!val) return defaultVal;
      const normalized = val.toLowerCase().replace(/-/g, '').replace(/_/g, '');
      const match = Object.values(enumObj).find((e: any) =>
        e.toLowerCase().replace(/-/g, '').replace(/_/g, '') === normalized
      );
      return match || val;
    };

    const rawLyrics = (parsed.lyrics || []).map((l: any, index: number) => {
      const rawStyle = l.style || {};
      return {
        id: `generated-${index}-${Date.now()}`,
        text: l.text,
        startTime: typeof l.startTime === 'number' ? l.startTime : 0,
        endTime: typeof l.endTime === 'number' ? l.endTime : 0,
        style: {
          animation: validateEnum(rawStyle.animation, AnimationType, AnimationType.SLIDE_UP),
          color: rawStyle.color || '#ffffff',
          fontSize: rawStyle.fontSize || '4xl',
          position: 'center',
          fontFamily: rawStyle.fontFamily || 'display',
          backgroundEffect: BackgroundEffect.NONE,
          effects: [],
          vertical: false
        }
      };
    });

    // --- Post-processing: Remove Overlaps & Invalid Segments ---
    rawLyrics.sort((a: any, b: any) => a.startTime - b.startTime);

    const validLyrics: LyricSegment[] = [];

    for (let i = 0; i < rawLyrics.length; i++) {
      const current = rawLyrics[i];
      if (current.endTime <= current.startTime) continue;
      if (i < rawLyrics.length - 1) {
        const next = rawLyrics[i + 1];
        if (current.endTime > next.startTime) {
          current.endTime = next.startTime;
        }
      }
      validLyrics.push(current);
    }

    return validLyrics;

  } catch (error) {
    console.error("Error generating lyrics:", error);
    throw error;
  }
};

export const analyzeMoodAndStyle = async (
  lyrics: LyricSegment[],
  onProgress: (status: string) => void
): Promise<{
  updatedLyrics: LyricSegment[]
}> => {
  if (!lyrics || lyrics.length === 0) return { updatedLyrics: [] };

  const simplifiedLyrics = lyrics.map((l, i) => ({
    id: l.id,
    text: l.text,
    duration: l.endTime - l.startTime
  }));

  const prompt = `
    Role: Professional Music Video Director.
    Task: Assign Kinetic Typography styles (Animation, Font, Color) for EACH line based on the mood.
    
    **INSTRUCTIONS**:
    1. **Font**: MUST Select strictly from: ['sans', 'serif', 'mincho', 'dela-gothic', 'yuji-syuku', 'horror', 'pixel', 'handwriting', 'zen-maru', 'hachi-maru'].
    2. **Animation**: Choose dynamic animation based on text meaning/intensity.
    3. **Color**: Match the emotion.
    
    Return JSON with "styles": Array of { id, animation, font, color }.
    `;

  onProgress("AIが楽曲ムードとテキスト演出を分析中...");

  try {
    const response = await fetch('/api/analyze-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: simplifiedLyrics, prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const styleMap = new Map<string, any>(result.styles?.map((s: any) => [s.id, s]) || []);

    const updatedLyrics = lyrics.map(l => {
      const aiStyle = styleMap.get(l.id);
      if (!aiStyle) return l;

      return {
        ...l,
        style: {
          ...l.style,
          animation: aiStyle.animation as AnimationType,
          fontFamily: aiStyle.font,
          color: aiStyle.color,
          effects: l.style.effects || [],
          backgroundEffect: BackgroundEffect.NONE
        }
      };
    });

    return { updatedLyrics };
  } catch (e) {
    console.error("Analyze error", e);
    return { updatedLyrics: lyrics };
  }
};