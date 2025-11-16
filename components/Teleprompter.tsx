// Fix: Implement the Teleprompter component to resolve import errors and provide core functionality.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Script, Settings } from '../types';
import { PlayIcon, PauseIcon, StopIcon, MirrorIcon, ZoomInIcon, ZoomOutIcon, LineSpacingIncreaseIcon, LineSpacingDecreaseIcon, EditIcon, UndoIcon } from './icons/IconDefs';

interface TeleprompterProps {
  script: Script;
  settings: Settings;
  onClose: () => void;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  onSaveScript: (updatedScript: Script) => void;
}

const TriangleMarkerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-brand-blue drop-shadow-lg">
      <path d="M8 5v14l11-7z" />
    </svg>
);

const Teleprompter: React.FC<TeleprompterProps> = ({ script, settings, onClose, onSettingsChange, onSaveScript }) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeLineIndices, setActiveLineIndices] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(script.content);
  const [isSpeedIndicatorVisible, setIsSpeedIndicatorVisible] = useState(false);
  const [isDraggingGuide, setIsDraggingGuide] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const teleprompterRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const speedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for state and props to prevent stale closures in callbacks
  const scrollSpeedRef = useRef(settings.scrollSpeed);
  const isScrollingRef = useRef(isScrolling);
  const isEditingRef = useRef(isEditing);
  const settingsRef = useRef(settings);
  const activeLineIndicesRef = useRef(activeLineIndices);

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

  useEffect(() => {
    activeLineIndicesRef.current = activeLineIndices;
  }, [activeLineIndices]);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | undefined;
    if (isScrolling) {
      timerId = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isScrolling]);

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

    // Auto-centering adjustment logic to keep active line near the guide
    const activeLines = Array.from(activeLineIndicesRef.current)
      .map(index => lineRefs.current[index])
      .filter((el): el is HTMLParagraphElement => el !== null);

    if (activeLines.length > 0 && scrollContainerRef.current) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        
        // Calculate the average vertical center of all active lines relative to the container
        const avgLineVCenterInContainer = activeLines.reduce((sum, el) => {
            const lineRect = el.getBoundingClientRect();
            // Center of the line: line top relative to container + half of line height
            return sum + (lineRect.top - containerRect.top + lineRect.height / 2);
        }, 0) / activeLines.length;
        
        // Target Y is the guide's percentage position within the container height
        const targetY = containerRect.height * (settingsRef.current.guidePosition / 100);
        
        const error = avgLineVCenterInContainer - targetY;
        
        // Apply a gentle, frame-rate independent correction based on sensitivity setting.
        const baseCorrectionFactor = 0.004; // This represents max strength at 100%
        const sensitivityMultiplier = (settingsRef.current.autoCenterSensitivity || 50) / 100;
        const correctionFactor = baseCorrectionFactor * sensitivityMultiplier;
        const correction = error * correctionFactor * deltaTime;
        
        scrollPositionRef.current += correction;
    }
    
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

  // Dynamic line highlighting using IntersectionObserver, linked to guide position
  useEffect(() => {
    const halfZone = settings.guideZoneSize / 2;
    const topMargin = -(settings.guidePosition - halfZone);
    const bottomMargin = -(100 - (settings.guidePosition + halfZone));

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                const index = parseInt(entry.target.getAttribute('data-index') || '-1', 10);
                if (index === -1) return;

                setActiveLineIndices(prevIndices => {
                    const newIndices = new Set(prevIndices);
                    if (entry.isIntersecting) {
                        newIndices.add(index);
                    } else {
                        newIndices.delete(index);
                    }
                    return newIndices;
                });
            });
        },
        {
            root: scrollContainerRef.current,
            rootMargin: `${topMargin}% 0px ${bottomMargin}% 0px`, // Creates a horizontal band based on the guide
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
  }, [script.content, settings.guidePosition, settings.guideZoneSize]);


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
    setElapsedTime(0);
  }, []);
  
  const handleScrollChange = useCallback((delta: number) => {
    if (!scrollContainerRef.current) return;
    if (isScrollingRef.current) {
        const newSpeed = Math.max(1, Math.min(100, settingsRef.current.scrollSpeed + (delta * 0.5)));
        scrollSpeedRef.current = newSpeed;
        onSettingsChange({ scrollSpeed: newSpeed });

        // Show speed indicator
        setIsSpeedIndicatorVisible(true);
        if (speedIndicatorTimeoutRef.current) {
            clearTimeout(speedIndicatorTimeoutRef.current);
        }
        speedIndicatorTimeoutRef.current = setTimeout(() => {
            setIsSpeedIndicatorVisible(false);
        }, 1500); // Hide after 1.5 seconds
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

  const handleResetTimer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setElapsedTime(0);
  }, []);

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

  const handleGuideMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingGuide(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!teleprompterRef.current) return;
        
        const rect = teleprompterRef.current.getBoundingClientRect();
        const newY = e.clientY - rect.top;
        let newPosition = (newY / rect.height) * 100;
        
        newPosition = Math.max(10, Math.min(90, newPosition));

        onSettingsChange({ guidePosition: Math.round(newPosition) });
    };

    const handleMouseUp = () => {
        setIsDraggingGuide(false);
    };

    if (isDraggingGuide) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ns-resize';
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
    };
  }, [isDraggingGuide, onSettingsChange]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement).tagName)) {
            return;
        }

        let handled = true;

        if (e.ctrlKey || e.metaKey) {
            // Font Size Controls: Ctrl/Cmd + Plus/Minus
            if (e.key === '=' || e.key === '+') {
                handleFontSizeChange(2);
            } else if (e.key === '-') {
                handleFontSizeChange(-2);
            } else {
                handled = false;
            }
        } else if (e.altKey) {
            // Line Spacing Controls: Alt + Up/Down
            if (e.key === 'ArrowUp') {
                handleLineSpacingChange(0.1);
            } else if (e.key === 'ArrowDown') {
                handleLineSpacingChange(-0.1);
            } else {
                handled = false;
            }
        } else {
            // Standard Controls
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
        if (speedIndicatorTimeoutRef.current) {
            clearTimeout(speedIndicatorTimeoutRef.current);
        }
    };
  }, [handlePlayPause, handleStop, handleScrollChange, onSettingsChange, handleFontSizeChange, handleLineSpacingChange]);
  

  const formattedContent = script.content.split('\n').map((line, index) => {
    const isActive = activeLineIndices.has(index);
    const lineClasses = [
        "transition-all duration-300 ease-in-out",
        isActive ? "text-yellow-300 font-bold opacity-100" : "text-white opacity-70"
    ].join(" ");

    return (
        <p key={index} ref={el => lineRefs.current[index] = el} data-index={index} className={lineClasses}>
            {line || '\u00A0'}
        </p>
    );
  });

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

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

  const teleprompterContainerClasses = [
    "relative w-full h-full flex flex-col text-white overflow-hidden",
    "border-4 transition-all duration-300 ease-in-out",
    settings.isMirrorMode ? "bg-slate-900 border-brand-blue/75" : "bg-black border-transparent",
  ].join(" ");

  return (
    <div ref={teleprompterRef} className={teleprompterContainerClasses} onClick={handlePlayPause}>
      {/* Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-dark-surface/60 backdrop-blur-sm p-1 rounded-full border border-dark-border shadow-lg">
          <span className="text-white font-mono tabular-nums px-3 py-1 text-lg">
              {formatTime(elapsedTime)}
          </span>
          <button onClick={handleResetTimer} className="p-2 text-white rounded-full hover:bg-slate-700 transition-colors" aria-label="Reset Timer">
              <UndoIcon />
          </button>
      </div>
        
      <div
          className="absolute left-2 z-20 cursor-ns-resize flex items-center h-6"
          style={{ top: `calc(${settings.guidePosition}% - 12px)` }}
          onMouseDown={handleGuideMouseDown}
          aria-hidden="true"
      >
          <TriangleMarkerIcon />
      </div>
      <div
          className="absolute right-2 z-20 cursor-ns-resize flex items-center h-6 transform -scale-x-100"
          style={{ top: `calc(${settings.guidePosition}% - 12px)` }}
          onMouseDown={handleGuideMouseDown}
          aria-hidden="true"
      >
          <TriangleMarkerIcon />
      </div>
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

      {/* Speed Indicator */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-2xl font-mono transition-opacity duration-300 pointer-events-none z-50 ${isSpeedIndicatorVisible ? 'opacity-100' : 'opacity-0'}`}>
          Speed: {settings.scrollSpeed.toFixed(1)}
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