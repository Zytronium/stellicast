'use client';
import StarMapCore, { type PickedCoords } from './StarMapCore';

interface StarMapPickerProps {
    value?: PickedCoords | null;
    onChange?: (coords: PickedCoords | null) => void;
    previewName?: string;
    /** Height of the embedded map; defaults to 420px */
    height?: number | string;
}

export default function StarMapPicker({
                                          value,
                                          onChange,
                                          previewName,
                                          height = 660,
                                      }: StarMapPickerProps) {
    return (
        <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height }}>
            <StarMapCore
                mode="pick"
                pickedCoords={value}
                onPick={onChange}
                previewName={previewName}
                className="absolute inset-0"
            />
        </div>
    );
}
