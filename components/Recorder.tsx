import React, { useState, useRef, useEffect } from 'react';
import { Script, Settings } from '../types';
import Teleprompter from './Teleprompter';
import { RecordIcon, StopIcon } from './icons/IconDefs';

interface RecorderProps {
  script: Script;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  onSaveScript: (updatedScript: Script) => void;
}

const Recorder: React.FC<RecorderProps> = ({ script, settings, onClose, onSettingsChange, onSaveScript }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' },
            audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setVideoStream(stream);
      } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access camera. Please check permissions.");
        onClose();
      }
    };
    startCamera();

    return () => {
      videoStream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = () => {
    if (!videoStream) return;
    setIsRecording(true);
    const recordedChunks: Blob[] = [];
    mediaRecorderRef.current = new MediaRecorder(videoStream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `${script.title.replace(/\s/g, '_')}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover"></video>
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-30">
        <Teleprompter script={script} settings={settings} onClose={onClose} onSettingsChange={onSettingsChange} onSaveScript={onSaveScript}/>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button onClick={toggleRecording} className="p-3 bg-white rounded-full text-red-500 shadow-lg animate-pulse-if-recording">
          {isRecording ? <StopIcon /> : <RecordIcon />}
        </button>
      </div>
    </div>
  );
};

export default Recorder;