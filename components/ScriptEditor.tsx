import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Script } from '../types';
import { useHistory } from '../hooks/useHistory';
import { PlayIcon, VideoCameraIcon, DocumentTextIcon, UndoIcon, RedoIcon } from './icons/IconDefs';

interface ScriptEditorProps {
  script: Script;
  onSave: (updatedScript: Script) => void;
  onStartPrompting: (script: Script) => void;
  onStartRecording: (script: Script) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onSave, onStartPrompting, onStartRecording }) => {
  const { state: historyState, setState: setHistoryState, resetState, undo, redo, canUndo, canRedo } = useHistory({ 
      title: script.title, 
      content: script.content 
  });
  
  const [editorState, setEditorState] = useState(historyState);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // When history changes (e.g., undo/redo), update the live editor state
  useEffect(() => {
    setEditorState(historyState);
  }, [historyState]);
  
  // When the script prop changes (e.g., user selects a different script), reset everything
  useEffect(() => {
    resetState({ title: script.title, content: script.content });
  }, [script.id, script.title, script.content, resetState]);

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

  // Set up the auto-save interval and unmount-saver
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
    
    // Save when the component is unmounted (e.g., user navigates away)
    return () => {
      clearInterval(intervalId);
      save();
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Effect to clear the toast message after a delay
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000); // Toast visible for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
            <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition-colors">
                <DocumentTextIcon/>
                <span className="hidden sm:inline">Import</span>
            </label>
            <input id="file-upload" type="file" accept=".txt,.docx,.pdf" className="hidden" onChange={handleFileImport}/>
            
            <button onClick={undo} disabled={!canUndo} className="p-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><UndoIcon/></button>
            <button onClick={redo} disabled={!canRedo} className="p-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><RedoIcon/></button>

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
          className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 border border-dark-border"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ScriptEditor;