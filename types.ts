
export interface Script {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface Settings {
  scrollSpeed: number;
  fontSize: number;
  lineSpacing: number;
  isMirrorMode: boolean;
  isVoiceControl: boolean;
}

export type AppView = 'list' | 'edit' | 'prompt' | 'record';
