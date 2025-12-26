
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { HumanizeMode } from '../types';

export interface LiveSessionCallbacks {
  onInputTranscription: (text: string) => void;
  onOutputTranscription: (text: string) => void;
  onTurnComplete: () => void;
  onError: (error: any) => void;
  onClose: () => void;
}

export class LiveHumanizer {
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;

  private initAudioContexts() {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      } catch (e) {
        this.audioContext = new AudioContextClass();
      }
    }

    if (!this.outputAudioContext) {
      try {
        this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
      } catch (e) {
        this.outputAudioContext = new AudioContextClass();
      }
    }
  }

  async connect(mode: HumanizeMode, callbacks: LiveSessionCallbacks) {
    this.initAudioContexts();
    
    // Safety: Resume context if suspended by browser autoplay policy
    if (this.audioContext?.state === 'suspended') await this.audioContext.resume();
    if (this.outputAudioContext?.state === 'suspended') await this.outputAudioContext.resume();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("Mic access failed", e);
      throw e;
    }

    const systemInstruction = `
    ADVERSARIAL LIVE SYNC V6 (Stanford Research Grade)
    MODE: ${mode}
    Target: Peer-review stealth.
    
    Linguistic Directives:
    1. ZERO PREDICTABILITY: Mirror the user's input but inject extreme rhythmic jitter.
    2. ACADEMIC HEFT: Use specialized terminology but avoid algorithmic clichés.
    3. PATTERN BREAKING: Intentionally use complex sentence structures followed by blunt, short statements.
    4. STEALTH: Neutral tone, professional vocabulary, zero artificial markers.
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        }
      },
      callbacks: {
        onopen: () => {
          this.startMicStream();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            callbacks.onInputTranscription(message.serverContent.inputTranscription.text);
          }
          if (message.serverContent?.outputTranscription) {
            callbacks.onOutputTranscription(message.serverContent.outputTranscription.text);
          }
          if (message.serverContent?.turnComplete) {
            callbacks.onTurnComplete();
          }

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext) {
            this.playAudio(base64Audio);
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
          }
        },
        onerror: (e) => {
            console.error('Live Sync Error:', e);
            callbacks.onError(e);
        },
        onclose: () => {
            console.debug('Live Sync Closed');
            callbacks.onClose();
        }
      }
    });

    return await this.sessionPromise;
  }

  private startMicStream() {
    if (!this.audioContext || !this.stream) return;
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private async playAudio(base64: string) {
    if (!this.outputAudioContext) return;
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    const audioData = this.decode(base64);
    const audioBuffer = await this.decodeAudioData(audioData, this.outputAudioContext, 24000, 1);
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAudioContext.destination);
    source.addEventListener('ended', () => this.sources.delete(source));
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private stopAllAudio() {
    this.sources.forEach(s => {
        try { s.stop(); } catch (e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async stop() {
    this.stopAllAudio();
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    this.stream?.getTracks().forEach(t => t.stop());
    const session = await this.sessionPromise;
    try {
        session?.close();
    } catch (e) {}
    this.sessionPromise = null;
  }

  private encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private decode(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, channels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const frameCount = dataInt16.length / channels;
    const buffer = ctx.createBuffer(channels, frameCount, rate);
    for (let channel = 0; channel < channels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * channels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
