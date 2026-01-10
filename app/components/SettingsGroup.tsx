'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

// Set to true to ignore disabled settings for testing
const IGNORE_DISABLED = false;

type SettingType = 'boolean' | 'dropdown' | 'multi-select';

type Setting = {
  options: string[];
  type: SettingType;
  settingName: string;
  disabled?: boolean;
  info?: string;
  dependsOn?: Record<string, boolean | string>;
};

type SettingsGroupProps = {
  title: string;
  settings: Record<string, Setting>;
  initialPreferences: Record<string, any>;
};

function formatHistoryRetention(value: string): string {
  const num = parseInt(value);
  if (num === -1) return 'Never';
  if (num === 1) return '1 Day';
  if (num === 3) return '3 Days';
  if (num === 7) return '1 Week';
  if (num === 14) return '2 Weeks';
  if (num === 30) return '1 Month';
  if (num === 90) return '3 Months';
  if (num === 180) return '6 Months';
  if (num === 270) return '9 Months';
  if (num === 365) return '1 Year';
  if (num === 1095) return '3 Years';
  if (num === 1825) return '5 Years';
  return value;
}

export default function SettingsGroup({ title, settings, initialPreferences }: SettingsGroupProps) {
  const [savedPreferences, setSavedPreferences] = useState<Record<string, any>>(initialPreferences);
  const [currentPreferences, setCurrentPreferences] = useState<Record<string, any>>(initialPreferences);
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(savedPreferences) !== JSON.stringify(currentPreferences);

  const updatePreference = (settingName: string, value: any) => {
    setCurrentPreferences({ ...currentPreferences, [settingName]: value });
  };

  const applyChanges = async () => {
    setSaving(true);
    try {
      const changes = Object.keys(currentPreferences).reduce((acc, key) => {
        if (currentPreferences[key] !== savedPreferences[key]) {
          acc[key] = currentPreferences[key];
        }
        return acc;
      }, {} as Record<string, any>);

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        console.error('Failed to save preferences');
        setCurrentPreferences(savedPreferences); // Revert on error
      } else {
        setSavedPreferences(currentPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setCurrentPreferences(savedPreferences); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setCurrentPreferences(savedPreferences);
  };

  const checkDependency = (dependsOn?: Record<string, boolean | string>): boolean => {
    if (!dependsOn) return true;

    for (const [settingLabel, requiredValue] of Object.entries(dependsOn)) {
      const setting = Object.entries(settings).find(([label]) => label === settingLabel);
      if (!setting) return false;

      const [, settingConfig] = setting;
      const currentValue = currentPreferences[settingConfig.settingName];

      // Convert to comparable format
      const current = settingConfig.type === 'boolean' ? currentValue === true : currentValue;
      const required = requiredValue;

      if (current !== required) return false;
    }

    return true;
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={discardChanges}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-gray-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Discard
            </button>
            <button
              onClick={applyChanges}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([label, setting]) => {
          const isDisabled = IGNORE_DISABLED ? false : (setting.disabled || !checkDependency(setting.dependsOn));
          const currentValue = currentPreferences[setting.settingName];
          const hasChanged = savedPreferences[setting.settingName] !== currentValue;

          return (
            <div
              key={setting.settingName}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-4 rounded-lg bg-gradient-darker border ${
                hasChanged ? 'border-blue-600/50' : 'border-zinc-800'
              } ${isDisabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-white">{label}</span>
                {hasChanged && (
                  <span className="text-xs text-blue-400 font-medium">•</span>
                )}
                {setting.info && (
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="invisible group-hover:visible absolute left-0 top-6 z-10 w-64 p-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg text-gray-300">
                      {setting.info}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {setting.type === 'boolean' && (
                  <button
                    onClick={() => !isDisabled && updatePreference(setting.settingName, !currentValue)}
                    disabled={isDisabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      currentValue ? 'bg-blue-600' : 'bg-zinc-700'
                    } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        currentValue ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}

                {setting.type === 'dropdown' && (
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      const value = setting.settingName === 'historyRetention'
                        ? parseInt(e.target.value)
                        : e.target.value;
                      updatePreference(setting.settingName, value);
                    }}
                    disabled={isDisabled}
                    className="px-3 py-1.5 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {setting.options.map((option) => (
                      <option key={option} value={option}>
                        {setting.settingName === 'historyRetention'
                          ? formatHistoryRetention(option)
                          : option}
                      </option>
                    ))}
                  </select>
                )}

                {setting.type === 'multi-select' && (
                  <select
                    multiple
                    value={Array.isArray(currentValue) ? currentValue : []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      updatePreference(setting.settingName, selected);
                    }}
                    disabled={isDisabled}
                    className="px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[80px]"
                  >
                    {setting.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
