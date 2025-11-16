import React, { useState, useEffect, useRef } from 'react';
import { Script, Settings } from '../types';
import { useHistory } from '../hooks/useHistory';
import { PlayIcon, VideoCameraIcon, DocumentTextIcon, UndoIcon, RedoIcon, EyeIcon, MirrorIcon } from './icons/IconDefs';

interface ScriptEditorProps {
  script: Script;
  settings: Settings;
  onSave: (updatedScript: Script) => void;
  onStartPrompting: (script: Script) => void;
  onStartRecording: (script: Script) => void;
  onDirtyStateChange: (isDirty: boolean) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, settings, onSave, onStartPrompting, onStartRecording, onDirtyStateChange }) => {
  const { state: historyState, setState: setHistoryState, resetState, undo, redo, canUndo, canRedo } = useHistory({ 
      title: script.title, 
      content: script.content 
  });
  
  const [editorState, setEditorState] = useState(historyState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewMirrored, setIsPreviewMirrored] = useState(false);

  // When history changes (e.g., undo/redo), update the live editor state
  useEffect(() => {
    setEditorState(historyState);
  }, [historyState]);
  
  // When the script prop changes (e.g., user selects a different script), reset everything
  useEffect(() => {
    resetState({ title: script.title, content: script.content });
  }, [script.id, script.title, script.content, resetState]);

  // Track if there are unsaved changes and notify the parent component.
  useEffect(() => {
    const hasUnsavedChanges = editorState.title !== script.title || editorState.content !== script.content;
    setIsDirty(hasUnsavedChanges);
    onDirtyStateChange(hasUnsavedChanges);
  }, [editorState, script.title, script.content, onDirtyStateChange]);

  // Debounce editor changes before committing them to the history stack
  useEffect(() => {
    const handler = setTimeout(() => {
        setHistoryState(editorState);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [editorState, setHistoryState]);

  // Create a ref to hold the latest state and props for auto-saving
  const autoSaveRef = useRef({ onSave, script, editorState });
  useEffect(() => {
    // Keep the ref updated with the latest state and props on every render
    autoSaveRef.current = { onSave, script, editorState };
  });

  // Set up the auto-save interval
  useEffect(() => {
    const save = () => {
      const { onSave: currentOnSave, script: currentScript, editorState: currentEditorState } = autoSaveRef.current;
      // Only save if there are actual changes from the script's last saved state
      if (currentEditorState.title !== currentScript.title || currentEditorState.content !== currentScript.content) {
        currentOnSave({ ...currentScript, ...currentEditorState });
        setToastMessage("Script auto-saved!");
      }
    };

    // Save periodically every 30 seconds
    const intervalId = setInterval(save, 30000);
    
    // Cleanup interval on unmount.
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Effect to manage toast visibility and animation
  useEffect(() => {
    if (toastMessage) {
      setIsToastVisible(true);
      const visibilityTimer = setTimeout(() => {
        setIsToastVisible(false);
      }, 2500); // Start fading out after 2.5s
      const messageTimer = setTimeout(() => {
        setToastMessage(null);
      }, 3000); // Remove from DOM after 3s total
      return () => {
        clearTimeout(visibilityTimer);
        clearTimeout(messageTimer);
      };
    }
  }, [toastMessage]);

  // Handle browser-level navigation (close tab, reload)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // Required for modern browsers to show the prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleSave = () => {
    onSave({ ...script, ...editorState });
  };
  
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if(file.type === "text/plain") {
        const text = await file.text();
        const newTitle = (!editorState.title || editorState.title === "Untitled Script") 
          ? file.name.replace('.txt', '') 
          : editorState.title;
        setEditorState({ title: newTitle, content: text });
    } else {
        alert("Only .txt files are supported for now.");
    }
    event.target.value = ''; // Reset file input
  };
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="p-4 md:p-8 flex flex-col h-full bg-dark-bg">
        <div className="flex-grow flex gap-8 overflow-hidden">
            {/* Editor Column */}
            <div className="flex flex-col flex-1 min-w-0 h-full">
                <input
                    type="text"
                    value={editorState.title}
                    onChange={(e) => setEditorState(prev => ({...prev, title: e.target.value}))}
                    onBlur={handleSave}
                    placeholder="Script Title"
                    className="bg-transparent text-2xl md:text-4xl font-bold border-none focus:ring-0 p-2 mb-4 text-slate-100"
                />
                <textarea
                    value={editorState.content}
                    onChange={(e) => setEditorState(prev => ({...prev, content: e.target.value}))}
                    onBlur={handleSave}
                    placeholder="Start writing your script here..."
                    className="flex-grow bg-dark-surface p-4 rounded-lg border border-dark-border text-slate-200 resize-none focus:ring-brand-blue focus:border-brand-blue w-full text-lg"
                />
            </div>

            {/* Preview Column */}
            {showPreview && (
            <div className="hidden md:flex flex-col flex-1 min-w-0 h-full">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-slate-100">Preview</span>
                    <button 
                        onClick={() => setIsPreviewMirrored(!isPreviewMirrored)} 
                        className={`p-2 rounded-md transition-colors ${isPreviewMirrored ? 'bg-brand-blue text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        aria-label="Toggle mirror preview"
                    >
                        <MirrorIcon />
                    </button>
                </div>
                <div 
                className={`flex-grow bg-black rounded-lg border border-dark-border overflow-y-auto p-4 transition-transform duration-300 ${isPreviewMirrored ? 'transform -scale-x-100' : ''}`}
                style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineSpacing,
                }}
                >
                <div className={`text-white text-center transition-transform duration-300 ${isPreviewMirrored ? 'transform -scale-x-100' : ''}`}>
                    {editorState.content.split('\n').map((line, index) => (
                    <p key={index}>{line || '\u00A0'}</p>
                    ))}
                </div>
                </div>
            </div>
            )}
        </div>


      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
            <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition-colors">
                <DocumentTextIcon/>
                <span className="hidden sm:inline">Import</span>
            </label>
            <input id="file-upload" type="file" accept=".txt" className="hidden" onChange={handleFileImport}/>
            
            <button onClick={undo} disabled={!canUndo} className="p-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><UndoIcon/></button>
            <button onClick={redo} disabled={!canRedo} className="p-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><RedoIcon/></button>
            
            <button onClick={() => setShowPreview(!showPreview)} className={`hidden md:block p-2 rounded-md transition-colors ${showPreview ? 'bg-brand-blue text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`} aria-label="Toggle preview">
                <EyeIcon />
            </button>

            <p className="text-xs text-slate-500 hidden md:block">.txt supported</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onStartPrompting({ ...script, ...editorState })} className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors">
            <PlayIcon />
            <span>Prompt</span>
          </button>
          <button onClick={() => onStartRecording({ ...script, ...editorState })} className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-light transition-colors">
            <VideoCameraIcon />
            <span>Record</span>
          </button>
        </div>
      </div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 border border-dark-border transition-opacity duration-500 ${isToastVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ScriptEditor;