import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Script, Settings } from '../types';
import Teleprompter from './Teleprompter';
import { RecordIcon, StopIcon, MicOnIcon, MicOffIcon, CameraSwitchIcon } from './icons/IconDefs';

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(false);

  // Effect 1: Enumerate devices and select the initial camera
  useEffect(() => {
    const getDevices = async () => {
      try {
        // We need to request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(cameras);
        if (cameras.length > 0) {
          // Prefer a front-facing camera if available
          const frontCamera = cameras.find(d => d.label.toLowerCase().includes('front'));
          setSelectedVideoDeviceId(frontCamera?.deviceId || cameras[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
        alert("Could not access camera/microphone. Please check permissions.");
        onClose();
      }
    };
    getDevices();
  }, [onClose]);

  // Effect 2: Start or restart the camera stream when the selected device changes
  useEffect(() => {
    if (!selectedVideoDeviceId) return;

    // Clean up the old stream before starting a new one
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideoDeviceId } },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setVideoStream(stream);
        // Ensure the new audio track respects the current mute state
        stream.getAudioTracks().forEach(track => (track.enabled = !isMuted));
      } catch (err) {
        console.error("Error starting camera:", err);
      }
    };

    startCamera();

    // The main cleanup for when the component unmounts
    return () => {
      videoStream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoDeviceId]);


  // Effect to handle the recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const startRecording = () => {
    if (!videoStream) return;
    setElapsedTime(0); // Reset timer
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
  
  const handleToggleMute = useCallback(() => {
    if (!videoStream) return;
    const newMutedState = !isMuted;
    videoStream.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState;
    });
    setIsMuted(newMutedState);
  }, [videoStream, isMuted]);

  const handleSwitchCamera = useCallback(() => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex(device => device.deviceId === selectedVideoDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedVideoDeviceId(videoDevices[nextIndex].deviceId);
  }, [videoDevices, selectedVideoDeviceId]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover"></video>
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-30">
        <Teleprompter script={script} settings={settings} onClose={onClose} onSettingsChange={onSettingsChange} onSaveScript={onSaveScript}/>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
        {(isRecording || elapsedTime > 0) && (
            <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-1 rounded-full text-lg font-mono tabular-nums shadow-lg">
                {formatTime(elapsedTime)}
            </div>
        )}
        <div className="flex items-center gap-4">
            <button
                onClick={handleToggleMute}
                className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-800 shadow-lg transition-transform hover:scale-110"
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
                {isMuted ? <MicOffIcon /> : <MicOnIcon />}
            </button>
            <button onClick={toggleRecording} className={`p-3 bg-white rounded-full text-red-500 shadow-lg transition-transform hover:scale-110 ${isRecording ? 'animate-pulse' : ''}`}>
                {isRecording ? <StopIcon /> : <RecordIcon />}
            </button>
            {videoDevices.length > 1 && (
                <button
                    onClick={handleSwitchCamera}
                    className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-800 shadow-lg transition-transform hover:scale-110"
                    aria-label="Switch camera"
                >
                    <CameraSwitchIcon />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Recorder;