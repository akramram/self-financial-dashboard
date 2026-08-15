import React from 'react';

interface AmountPreset {
  label: string;
  value: number;
}

interface AmountPresetsProps {
  presets?: AmountPreset[];
  currentValue: string;
  onChange: (value: string) => void;
}

const DEFAULT_PRESETS: AmountPreset[] = [
  { label: '10K', value: 10000 },
  { label: '25K', value: 25000 },
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '500K', value: 500000 },
];

export { DEFAULT_PRESETS };

export default function AmountPresets({ presets = DEFAULT_PRESETS, currentValue, onChange }: AmountPresetsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(String(preset.value))}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all duration-150 ${
            Number(currentValue) === preset.value
              ? 'bg-mint-600 text-white shadow-sm scale-105'
              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/[0.12] hover:scale-105 active:scale-95'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
