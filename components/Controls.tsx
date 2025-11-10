import React, { useState } from 'react';
import { Settings } from '../types';
import { SettingsIcon, MicOnIcon, MicOffIcon } from './icons/IconDefs';

interface ControlsProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
}

const ControlSlider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void}> = ({ label, value, min, max, step, onChange}) => (
    <div className="flex flex-col space-y-2">
        <label className="text-sm text-slate-400">{label}</label>
        <div className="flex items-center space-x-2">
            <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-blue"
            />
            <span className="text-slate-200 text-sm font-mono w-12 text-center">{value.toFixed(step < 1 ? 1 : 0)}</span>
        </div>
    </div>
);


const Controls: React.FC<ControlsProps> = ({ settings, onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-4 right-4 z-50 p-3 bg-dark-surface rounded-full text-white shadow-lg border border-dark-border">
        <SettingsIcon />
      </button>
      
      <div className={`fixed top-0 right-0 h-full w-80 bg-dark-surface shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} p-4 pt-20 border-l border-dark-border`}>
        <h3 className="text-lg font-bold mb-6 text-slate-100">Settings</h3>
        
        <div className="space-y-6">
            <ControlSlider 
                label="Scroll Speed"
                value={settings.scrollSpeed}
                min={1} max={100} step={0.1}
                onChange={(v) => onSettingsChange({ scrollSpeed: v })}
            />
            <ControlSlider 
                label="Font Size"
                value={settings.fontSize}
                min={12} max={120} step={1}
                onChange={(v) => onSettingsChange({ fontSize: v })}
            />
            <ControlSlider 
                label="Line Spacing"
                value={settings.lineSpacing}
                min={1} max={3} step={0.1}
                onChange={(v) => onSettingsChange({ lineSpacing: v })}
            />
            
            <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                <span className="text-slate-300">Mirror Mode</span>
                 <button onClick={() => onSettingsChange({ isMirrorMode: !settings.isMirrorMode })} className={`px-4 py-2 rounded-full text-sm ${settings.isMirrorMode ? 'bg-brand-blue text-white' : 'bg-slate-600 text-slate-300'}`}>
                    {settings.isMirrorMode ? 'On' : 'Off'}
                </button>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-300">Voice Control</span>
                <button onClick={() => onSettingsChange({ isVoiceControl: !settings.isVoiceControl })} className={`p-3 rounded-full ${settings.isVoiceControl ? 'bg-brand-blue text-white' : 'bg-slate-600 text-slate-300'}`}>
                    {settings.isVoiceControl ? <MicOnIcon/> : <MicOffIcon/>}
                </button>
            </div>
        </div>
        
        <div className="absolute bottom-4 left-4 text-xs text-slate-500">
          TelePrompt Studio v1.0
        </div>
      </div>
    </>
  );
};

export default Controls;