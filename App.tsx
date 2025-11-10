import React, { useState, useCallback } from 'react';
import { AppView, Script, Settings } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DEFAULT_SETTINGS } from './constants';
import ScriptEditor from './components/ScriptEditor';
import Teleprompter from './components/Teleprompter';
import Recorder from './components/Recorder';
import Controls from './components/Controls';
import { BackIcon, PlusIcon, TrashIcon, DocumentTextIcon } from './components/icons/IconDefs';

const App: React.FC = () => {
  const [scripts, setScripts] = useLocalStorage<Script[]>('teleprompt-scripts', []);
  const [settings, setSettings] = useLocalStorage<Settings>('teleprompt-settings', DEFAULT_SETTINGS);
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [activeScript, setActiveScript] = useState<Script | null>(null);

  const handleCreateNewScript = () => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      title: 'Untitled Script',
      content: '',
      createdAt: Date.now(),
    };
    setScripts(prev => [newScript, ...prev]);
    setActiveScript(newScript);
    setCurrentView('edit');
  };

  const handleSelectScript = (script: Script) => {
    setActiveScript(script);
    setCurrentView('edit');
  };

  const handleSaveScript = useCallback((updatedScript: Script) => {
    setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
    // If the active script is being updated, refresh its state
    if (activeScript && activeScript.id === updatedScript.id) {
        setActiveScript(updatedScript);
    }
  }, [setScripts, activeScript]);
  
  const handleDeleteScript = (scriptId: string) => {
    if (window.confirm("Are you sure you want to delete this script?")) {
        setScripts(prev => prev.filter(s => s.id !== scriptId));
    }
  };

  const handleStartPrompting = (script: Script) => {
    handleSaveScript(script);
    setActiveScript(script);
    setCurrentView('prompt');
  };
  
  const handleStartRecording = (script: Script) => {
    handleSaveScript(script);
    setActiveScript(script);
    setCurrentView('record');
  };
  
  const handleCloseSession = () => {
    // Return to the editor of the current script after a session
    setCurrentView(activeScript ? 'edit' : 'list');
  };
  
  const handleBackToList = () => {
    setActiveScript(null);
    setCurrentView('list');
  };

  const handleSettingsChange = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const renderHeader = () => {
    if (currentView === 'list') {
      return (
        <div className="flex justify-between items-center p-4 border-b border-dark-border">
          <h1 className="text-xl font-bold text-slate-100">TelePrompt Studio</h1>
          <button onClick={handleCreateNewScript} className="p-2 bg-brand-blue rounded-full text-white">
            <PlusIcon />
          </button>
        </div>
      );
    }

    if(currentView === 'edit' || currentView === 'prompt' || currentView === 'record') {
        const backAction = currentView === 'edit' ? handleBackToList : handleCloseSession;
        return (
             <div className="flex justify-between items-center p-4 bg-dark-surface text-slate-200 fixed top-0 left-0 w-full z-30">
                <button onClick={backAction} className="p-2 rounded-full hover:bg-slate-700">
                    <BackIcon />
                </button>
                <h2 className="text-lg font-semibold truncate flex-1 mx-4">{activeScript?.title}</h2>
                { (currentView === 'prompt' || currentView === 'record') && <Controls settings={settings} onSettingsChange={handleSettingsChange}/>}
            </div>
        )
    }
    return null;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'edit':
        return activeScript && <ScriptEditor script={activeScript} onSave={handleSaveScript} onStartPrompting={handleStartPrompting} onStartRecording={handleStartRecording} />;
      case 'prompt':
        return activeScript && <div className="pt-16 h-full"><Teleprompter script={activeScript} settings={settings} onClose={handleCloseSession} onSettingsChange={handleSettingsChange} onSaveScript={handleSaveScript} /></div>;
      case 'record':
        return activeScript && <div className="pt-16 h-full"><Recorder script={activeScript} settings={settings} onClose={handleCloseSession} onSettingsChange={handleSettingsChange} onSaveScript={handleSaveScript} /></div>;
      case 'list':
      default:
        return (
          <div className="p-4">
            {scripts.length === 0 ? (
                <div className="text-center py-20">
                    <DocumentTextIcon />
                    <p className="mt-4 text-slate-400">No scripts yet.</p>
                    <p className="text-slate-500">Create a new script to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {scripts.map(script => (
                       <div key={script.id} className="bg-dark-surface p-4 rounded-lg flex justify-between items-center group">
                            <div onClick={() => handleSelectScript(script)} className="cursor-pointer flex-grow">
                                <h3 className="font-semibold text-slate-100 group-hover:text-brand-blue-light transition-colors">{script.title}</h3>
                                <p className="text-sm text-slate-400 truncate max-w-xs">{script.content || "Empty script"}</p>
                            </div>
                            <button onClick={() => handleDeleteScript(script.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-dark-bg font-sans flex flex-col max-w-4xl mx-auto">
        {renderHeader()}
        <main className="flex-grow overflow-auto">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;