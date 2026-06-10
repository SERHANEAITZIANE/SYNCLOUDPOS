// ─── HapticButton — Touchable wrapper with haptic-like vibration feedback ───
// Uses React Native's built-in Vibration API to simulate haptic feedback
// without introducing external library dependencies.

import React from "react";
import { TouchableOpacity, Vibration, TouchableOpacityProps, Platform } from "react-native";

interface HapticButtonProps extends TouchableOpacityProps {
    vibrationDuration?: number;
}

export default function HapticButton({
    children,
    vibrationDuration = 10,
    onPress,
    activeOpacity = 0.7,
    ...props
}: HapticButtonProps) {
    const handlePress = (e: any) => {
        // Trigger a tiny vibration pulse
        if (Platform.OS === "android") {
            Vibration.vibrate(vibrationDuration);
        } else if (Platform.OS === "ios") {
            // iOS supports Haptic Engine, but Vibration.vibrate is a fallback.
            // On iOS, vibrate(10) vibrates for a default short duration.
            Vibration.vibrate(10);
        }

        if (onPress) {
            onPress(e);
        }
    };

    return (
        <TouchableOpacity
            {...props}
            activeOpacity={activeOpacity}
            onPress={handlePress}
        >
            {children}
        </TouchableOpacity>
    );
}
