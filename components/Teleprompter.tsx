// Fix: Implement the Teleprompter component to resolve import errors and provide core functionality.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Script, Settings } from '../types';
import { PlayIcon, PauseIcon, StopIcon, MirrorIcon, ZoomInIcon, ZoomOutIcon, LineSpacingIncreaseIcon, LineSpacingDecreaseIcon, EditIcon } from './icons/IconDefs';

interface TeleprompterProps {
  script: Script;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  onSaveScript: (updatedScript: Script) => void;
}

const Teleprompter: React.FC<TeleprompterProps> = ({ script, settings, onClose, onSettingsChange, onSaveScript }) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(script.content);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const lastTimestampRef = useRef<number>(0);

  // Refs for state and props to prevent stale closures in callbacks
  const scrollSpeedRef = useRef(settings.scrollSpeed);
  const isScrollingRef = useRef(isScrolling);
  const isEditingRef = useRef(isEditing);
  const settingsRef = useRef(settings);

  useEffect(() => {
    scrollSpeedRef.current = settings.scrollSpeed;
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    isScrollingRef.current = isScrolling;
  }, [isScrolling]);
  
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Time-based scrolling logic for maximum smoothness
  const scroll = useCallback((timestamp: number) => {
    if (!scrollContainerRef.current) return;
    
    if (lastTimestampRef.current === 0) {
      lastTimestampRef.current = timestamp;
    }
    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;
    
    // Calculate scroll distance based on elapsed time for frame-rate independence
    const scrollAmount = (scrollSpeedRef.current * deltaTime) / 1000;
    scrollPositionRef.current += scrollAmount;
    
    scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop < scrollHeight - clientHeight - 1) { // 1px buffer for float precision
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else {
      setIsScrolling(false);
      // Snap to the end precisely
      scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, []);

  useEffect(() => {
    if (isScrolling) {
      // Reset timestamp when starting a new scroll session
      lastTimestampRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScrolling, scroll]);

  // Dynamic line highlighting using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.getAttribute('data-index') || '-1', 10);
                    setActiveLineIndex(index);
                }
            });
        },
        {
            root: scrollContainerRef.current,
            rootMargin: "-50% 0px -50% 0px", // Creates a horizontal line in the middle of the viewport
            threshold: 0
        }
    );
    
    const currentLineRefs = lineRefs.current;
    currentLineRefs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentLineRefs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
        observer.disconnect();
    };
  }, [script.content]); // Rerun when script content changes


  const handlePlayPause = useCallback(() => {
    if (isEditingRef.current) return; // Don't play/pause when editor is open
    setIsScrolling(prev => !prev);
  }, []);

  const handleStop = useCallback(() => {
    setIsScrolling(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollPositionRef.current = 0;
    }
  }, []);
  
  const handleScrollChange = useCallback((delta: number) => {
    if (!scrollContainerRef.current) return;
    // Use refs to access the latest state without being in the dependency array
    if (isScrollingRef.current) {
        const newSpeed = Math.max(1, Math.min(100, settingsRef.current.scrollSpeed + (delta * 0.5)));
        // Directly update the ref for immediate effect in the animation loop
        scrollSpeedRef.current = newSpeed;
        // Propagate the change up to persist it and keep the UI (slider) in sync
        onSettingsChange({ scrollSpeed: newSpeed });
    } else {
        scrollContainerRef.current.scrollTop += delta * 20;
        scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, [onSettingsChange]);
  
  const handleFontSizeChange = useCallback((delta: number) => {
    const newSize = Math.max(12, Math.min(120, settings.fontSize + delta));
    onSettingsChange({ fontSize: newSize });
  }, [onSettingsChange, settings.fontSize]);
  
  const handleLineSpacingChange = useCallback((delta: number) => {
    const currentSpacing = Math.round(settings.lineSpacing * 10) / 10;
    const newSpacing = Math.max(1, Math.min(3, currentSpacing + delta));
    onSettingsChange({ lineSpacing: newSpacing });
  }, [onSettingsChange, settings.lineSpacing]);

  // Script editing handlers
  const handleOpenEditor = useCallback(() => {
    setIsScrolling(false);
    setEditText(script.content);
    setIsEditing(true);
  }, [script.content]);

  const handleSaveEdit = useCallback(() => {
    onSaveScript({ ...script, content: editText });
    setIsEditing(false);
  }, [onSaveScript, script, editText]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)) {
            return;
        }

        let handled = true;
        switch (e.key.toLowerCase()) {
            case ' ':
                handlePlayPause();
                break;
            case 's':
                handleStop();
                break;
            case 'm':
                onSettingsChange({ isMirrorMode: !settingsRef.current.isMirrorMode });
                break;
            case 'arrowup':
                handleScrollChange(-1);
                break;
            case 'arrowdown':
                handleScrollChange(1);
                break;
            default:
                handled = false;
        }

        if (handled) {
            e.preventDefault();
        }
    };
    
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        handleScrollChange(delta);
    };

    const container = scrollContainerRef.current;
    window.addEventListener('keydown', handleKeyDown);
    container?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        container?.removeEventListener('wheel', handleWheel);
    };
  // The dependencies are memoized callbacks and stable props, preventing re-runs
  }, [handlePlayPause, handleStop, handleScrollChange, onSettingsChange]);
  

  const formattedContent = script.content.split('\n').map((line, index) => {
    const isActive = index === activeLineIndex;
    const lineClasses = [
        "transition-all duration-300 ease-in-out",
        isActive ? "text-brand-blue font-semibold scale-105" : "text-white opacity-70"
    ].join(" ");

    return (
        <p key={index} ref={el => lineRefs.current[index] = el} data-index={index} className={lineClasses}>
            {line || '\u00A0'}
        </p>
    );
  });

  const textStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineSpacing,
  };
  
  const scrollContainerClasses = [
    "flex-grow",
    "overflow-y-scroll",
    "transition-transform", "duration-300",
    settings.isMirrorMode ? "transform -scale-x-100" : ""
  ].join(" ");

  const textContainerClasses = [
    "prose", "prose-xl", "max-w-none", "text-center",
    settings.isMirrorMode ? "transform -scale-x-100" : ""
  ].join(" ");

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white overflow-hidden" onClick={handlePlayPause}>
      <div 
        ref={scrollContainerRef}
        className={scrollContainerClasses}
        style={textStyle}
      >
        <div style={{ height: '50vh' }}></div> 
        <div className={textContainerClasses}>
          {formattedContent}
        </div>
        <div style={{ height: '50vh' }}></div>
      </div>
      
      {/* Real-time settings */}
      <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2">
        <div className="flex items-center gap-1 bg-dark-surface/50 backdrop-blur-sm p-1 rounded-lg border border-dark-border">
          <button onClick={e => {e.stopPropagation(); handleFontSizeChange(-2)}} className="p-2 text-white rounded-md hover:bg-slate-700 transition-colors" aria-label="Zoom Out"><ZoomOutIcon/></button>
          <button onClick={e => {e.stopPropagation(); handleFontSizeChange(2)}} className="p-2 text-white rounded-md hover:bg-slate-700 transition-colors" aria-label="Zoom In"><ZoomInIcon/></button>
        </div>
        <div className="flex items-center gap-1 bg-dark-surface/50 backdrop-blur-sm p-1 rounded-lg border border-dark-border">
          <button onClick={e => {e.stopPropagation(); handleLineSpacingChange(-0.1)}} className="p-2 text-white rounded-md hover:bg-slate-700 transition-colors"><LineSpacingDecreaseIcon/></button>
          <button onClick={e => {e.stopPropagation(); handleLineSpacingChange(0.1)}} className="p-2 text-white rounded-md hover:bg-slate-700 transition-colors"><LineSpacingIncreaseIcon/></button>
        </div>
        <div className="flex items-center gap-1 bg-dark-surface/50 backdrop-blur-sm p-1 rounded-lg border border-dark-border">
          <button onClick={e => {e.stopPropagation(); handleOpenEditor()}} className="p-2 text-white rounded-md hover:bg-slate-700 transition-colors"><EditIcon/></button>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-dark-surface p-2 rounded-full shadow-lg border border-dark-border">
        <button onClick={e => {e.stopPropagation(); handlePlayPause()}} className="p-3 text-white rounded-full hover:bg-slate-700">
          {isScrolling ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={e => {e.stopPropagation(); handleStop()}} className="p-3 text-white rounded-full hover:bg-slate-700">
          <StopIcon />
        </button>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onSettingsChange({ isMirrorMode: !settings.isMirrorMode })}} className={`absolute bottom-4 right-4 z-30 p-3 rounded-full shadow-lg border border-dark-border transition-colors ${settings.isMirrorMode ? 'bg-brand-blue text-white' : 'bg-dark-surface text-slate-300'}`}>
        <MirrorIcon />
      </button>

      {/* Script Editor Modal */}
      {isEditing && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
            <div className="bg-dark-surface p-6 rounded-lg w-full max-w-2xl shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-slate-100">Edit Script</h3>
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-96 bg-dark-bg p-4 rounded-md border border-dark-border text-slate-200 resize-none focus:ring-brand-blue focus:border-brand-blue"
                />
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-600 rounded-md hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-brand-blue rounded-md hover:bg-brand-blue-light transition-colors">Save Changes</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Teleprompter;