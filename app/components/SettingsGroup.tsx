'use client';

import { useState, useEffect } from 'react';
import { Info, ChevronDown, X } from 'lucide-react';

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
  forceValue?: any;
};

type SettingsGroupProps = {
  title: string;
  settings: Record<string, Setting>;
  initialPreferences: Record<string, any>;
  showUnsubscribeButtons?: boolean;
  groupType?: 'appearance' | 'default';
};

type MultiSelectProps = {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

function MultiSelect({ options, value, onChange, disabled }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (disabled) return;
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter(v => v !== option));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="px-3 py-2 text-sm bg-card text-foreground border border-border rounded-lg hover:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between gap-2 min-w-[200px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-muted-foreground">Select options...</span>
          ) : (
            value.map(option => (
              <span
                key={option}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary rounded text-xs"
              >
                {option}
                <X
                  className="w-3 h-3 cursor-pointer hover:opacity-80"
                  onClick={(e) => removeOption(option, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
            {options.map(option => {
              const isSelected = value.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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

/* -------------------------------
   Helpers for normalization + equality
   - ensures arrays are compared independent of order
   - coerces booleans to true/false
   - treats missing multi-select as []
---------------------------------*/
function normalizeValue(raw: any, setting: Setting) {
  if (setting.type === 'boolean') {
    return raw === true;
  }
  if (setting.type === 'multi-select') {
    if (!Array.isArray(raw)) return [];
    // create a deterministic representation (sorted)
    return [...raw].slice().sort();
  }
  // dropdown or others
  return raw === undefined || raw === null ? '' : raw;
}

function deepEqual(a: any, b: any) {
  // JSON stringify is fine because we normalize arrays to sorted and primitives are stable
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function applyThemeToBody(theme: string) {
  const themeMap: Record<string, string> = {
    'volcanic (dark)': 'theme-volcanic',
    'alien (dark)': 'theme-alien',
    'royalty (dark)': 'theme-royalty',
    'rose (dark)': 'theme-rose',
    'palewhite (light)': 'theme-palewhite',
  };

  const themeClass = themeMap[theme] || '';

  // Remove all theme classes
  document.body.classList.remove('theme-palewhite', 'theme-rose', 'theme-volcanic', 'theme-alien', 'theme-royalty');

  // Add new theme class if it exists
  if (themeClass) {
    document.body.classList.add(themeClass);
  }
}

export default function SettingsGroup({
  title,
  settings,
  initialPreferences,
  showUnsubscribeButtons = false,
  groupType = 'default'
}: SettingsGroupProps) {
  const [savedPreferences, setSavedPreferences] = useState<Record<string, any>>(initialPreferences);
  const [currentPreferences, setCurrentPreferences] = useState<Record<string, any>>(initialPreferences);
  const [saving, setSaving] = useState(false);

  // Keep savedPreferences in sync when parent/DB provides new initialPreferences.
  // Do NOT overwrite currentPreferences so in-progress edits are not clobbered.
  useEffect(() => {
    setSavedPreferences(initialPreferences);
  }, [JSON.stringify(initialPreferences)]);

  const updatePreference = (settingName: string, value: any) => {
    setCurrentPreferences({ ...currentPreferences, [settingName]: value });
  };

  const unsubscribeFromAll = (type: 'email' | 'in-app') => {
    const updates: Record<string, any> = {};

    Object.entries(settings).forEach(([, setting]) => {
      if (setting.type === 'multi-select' && !setting.disabled && setting.forceValue === undefined) {
        const currentValue = currentPreferences[setting.settingName];
        if (Array.isArray(currentValue)) {
          updates[setting.settingName] = currentValue.filter((v: string) => v !== type);
        }
      }
    });

    setCurrentPreferences({ ...currentPreferences, ...updates });
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

      // Apply theme immediately if this is the appearance group and theme changed
      if (groupType === 'appearance' && changes.theme) {
        applyThemeToBody(changes.theme);
      }

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        console.error('Failed to save preferences');
        setCurrentPreferences(savedPreferences); // Revert on error
        // Revert theme if it was changed
        if (groupType === 'appearance' && changes.theme) {
          applyThemeToBody(savedPreferences.theme);
        }
      } else {
        setSavedPreferences(currentPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setCurrentPreferences(savedPreferences); // Revert on error
      // Revert theme if appearance group
      if (groupType === 'appearance' && currentPreferences.theme !== savedPreferences.theme) {
        applyThemeToBody(savedPreferences.theme);
      }
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
      // Respect forced values when checking dependencies
      const currentValue = settingConfig.forceValue !== undefined
        ? settingConfig.forceValue
        : currentPreferences[settingConfig.settingName];

      // Convert to comparable format
      const current = settingConfig.type === 'boolean' ? currentValue === true : currentValue;
      const required = requiredValue;

      if (current !== required) return false;
    }

    return true;
  };

  // Compute hasChanges by iterating settings and comparing normalized saved vs current,
  // ignoring disabled/forced settings.
  const hasChanges = Object.entries(settings).some(([label, setting]) => {
    const isForced = setting.forceValue !== undefined;
    const isDisabled = IGNORE_DISABLED ? false : (setting.disabled || isForced || !checkDependency(setting.dependsOn));
    if (isDisabled) return false;

    const savedVal = normalizeValue(savedPreferences[setting.settingName], setting);
    const currentVal = normalizeValue(currentPreferences[setting.settingName], setting);

    return !deepEqual(savedVal, currentVal);
  });

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={discardChanges}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground bg-card rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Discard
            </button>
            <button
              onClick={applyChanges}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </div>

      {showUnsubscribeButtons && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => unsubscribeFromAll('email')}
            className="flex-1 px-4 py-3 text-sm font-medium text-primary-foreground bg-destructive rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Unsubscribe from All Emails
          </button>
          <button
            onClick={() => unsubscribeFromAll('in-app')}
            className="flex-1 px-4 py-3 text-sm font-medium text-primary-foreground bg-destructive rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Unsubscribe from All In-App Notifications
          </button>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(settings).map(([label, setting]) => {
          // If setting.forceValue is set, treat it as the effective value; also force disabled so user cannot change it.
          const isForced = setting.forceValue !== undefined;
          const isDisabled = IGNORE_DISABLED ? false : (setting.disabled || isForced || !checkDependency(setting.dependsOn));
          const currentValueFromState = currentPreferences[setting.settingName];
          const displayValue = isForced ? setting.forceValue : currentValueFromState;

          // Use normalized deep equality for per-setting indicator (and exclude disabled)
          const savedVal = normalizeValue(savedPreferences[setting.settingName], setting);
          const displayVal = normalizeValue(displayValue, setting);
          const hasChanged = !isDisabled && !deepEqual(savedVal, displayVal);

          return (
            <div
              key={setting.settingName}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-4 rounded-lg bg-card-accent/40 border ${
                hasChanged ? 'border-primary/50' : 'border-border'
              } ${isDisabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-card-foreground">{label}</span>
                {hasChanged && (
                  <span className="text-xs text-primary font-medium">•</span>
                )}
                {setting.info && (
                  <div className="group relative">
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    <div className="invisible group-hover:visible absolute left-0 top-6 z-10 w-64 p-2 text-xs bg-popover border border-border rounded-lg shadow-lg text-popover-foreground">
                      {setting.info}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {setting.type === 'boolean' && (
                  <button
                    onClick={() => {
                      if (isDisabled) return;
                      // guard to ensure forced settings can't be toggled
                      if (isForced) return;
                      updatePreference(setting.settingName, !currentValueFromState);
                    }}
                    disabled={isDisabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      displayValue ? 'bg-primary' : 'bg-muted'
                    } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-primary-foreground transition-transform ${
                        displayValue ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}

                {setting.type === 'dropdown' && (
                  <select
                    value={displayValue}
                    onChange={(e) => {
                      if (isDisabled) return;
                      const value = setting.settingName === 'historyRetention'
                        ? parseInt(e.target.value)
                        : e.target.value;
                      updatePreference(setting.settingName, value);
                    }}
                    disabled={isDisabled}
                    className="px-3 py-1.5 text-sm bg-card text-foreground border border-border rounded-lg hover:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <MultiSelect
                    options={setting.options}
                    value={Array.isArray(displayValue) ? displayValue : []}
                    onChange={(selected) => {
                      if (isDisabled) return;
                      updatePreference(setting.settingName, selected);
                    }}
                    disabled={isDisabled}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
