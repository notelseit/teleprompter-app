import React, { useState } from 'react';
import { Settings } from '../types';
import { SettingsIcon, MicOnIcon, MicOffIcon, ChevronDownIcon } from './icons/IconDefs';

interface ControlsProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
}

const ControlSlider: React.FC<{label: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (value: number) => void}> = ({ label, value, min, max, step, unit = '', onChange}) => (
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
            <span className="text-slate-200 text-sm font-mono w-14 text-center">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
        </div>
    </div>
);

const CollapsibleSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
    const [isSectionOpen, setIsSectionOpen] = useState(true);
    return (
        <div className="border-t border-dark-border first-of-type:border-none">
            <button onClick={() => setIsSectionOpen(!isSectionOpen)} className="flex justify-between items-center w-full py-4">
                <h4 className="text-base font-semibold text-slate-300">{title}</h4>
                <span className={`transform transition-transform duration-200 ${isSectionOpen ? '' : '-rotate-90'}`}>
                    <ChevronDownIcon />
                </span>
            </button>
            {isSectionOpen && (
                <div className="space-y-6 pb-4">
                    {children}
                </div>
            )}
        </div>
    );
};


const Controls: React.FC<ControlsProps> = ({ settings, onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-4 right-4 z-50 p-3 bg-dark-surface rounded-full text-white shadow-lg border border-dark-border">
        <SettingsIcon />
      </button>
      
      <div className={`fixed top-0 right-0 h-full w-80 bg-dark-surface shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-dark-border flex flex-col`}>
        <div className="p-4 pt-6">
            <h3 className="text-lg font-bold text-slate-100">Settings</h3>
        </div>

        <div className="flex-grow overflow-y-auto px-4">
            <CollapsibleSection title="Appearance">
                <ControlSlider 
                    label="Font Size"
                    value={settings.fontSize}
                    min={12} max={120} step={1}
                    unit="px"
                    onChange={(v) => onSettingsChange({ fontSize: v })}
                />
                <ControlSlider 
                    label="Line Spacing"
                    value={settings.lineSpacing}
                    min={1} max={3} step={0.1}
                    onChange={(v) => onSettingsChange({ lineSpacing: v })}
                />
                <div className="flex justify-between items-center">
                    <span className="text-slate-300">Mirror Mode</span>
                    <button onClick={() => onSettingsChange({ isMirrorMode: !settings.isMirrorMode })} className={`px-4 py-2 rounded-full text-sm ${settings.isMirrorMode ? 'bg-brand-blue text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {settings.isMirrorMode ? 'On' : 'Off'}
                    </button>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Scrolling">
                <ControlSlider 
                    label="Scroll Speed"
                    value={settings.scrollSpeed}
                    min={1} max={100} step={0.1}
                    onChange={(v) => onSettingsChange({ scrollSpeed: v })}
                />
                <div className="flex justify-between items-center">
                    <span className="text-slate-300">Voice Control</span>
                    <button onClick={() => onSettingsChange({ isVoiceControl: !settings.isVoiceControl })} className={`p-3 rounded-full ${settings.isVoiceControl ? 'bg-brand-blue text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {settings.isVoiceControl ? <MicOnIcon/> : <MicOffIcon/>}
                    </button>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Guide">
                <ControlSlider 
                    label="Guide Position"
                    value={settings.guidePosition}
                    min={10} max={90} step={1}
                    unit="%"
                    onChange={(v) => onSettingsChange({ guidePosition: v })}
                />
                <ControlSlider 
                    label="Guide Focus Zone"
                    value={settings.guideZoneSize}
                    min={1} max={50} step={1}
                    unit="%"
                    onChange={(v) => onSettingsChange({ guideZoneSize: v })}
                />
                <ControlSlider 
                    label="Auto-Center Strength"
                    value={settings.autoCenterSensitivity}
                    min={0} max={100} step={1}
                    unit="%"
                    onChange={(v) => onSettingsChange({ autoCenterSensitivity: v })}
                />
            </CollapsibleSection>
        </div>
        
        <div className="p-4 text-xs text-slate-500 text-center">
          TelePrompt Studio v1.0
        </div>
      </div>
    </>
  );
};

export default Controls;