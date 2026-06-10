// ─── AnimatedNumber — Count-up animation for KPI values ──────────────────────
// Smoothly animates from old value to new value when data changes.

import React, { useEffect, useRef } from "react";
import { Animated, Text, TextStyle } from "react-native";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
    style?: TextStyle | TextStyle[];
    formatFn?: (n: number) => string;
}

export default function AnimatedNumber({
    value,
    duration = 800,
    suffix = "",
    prefix = "",
    style,
    formatFn,
}: AnimatedNumberProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [displayValue, setDisplayValue] = React.useState("0");
    const prevValue = useRef(0);

    useEffect(() => {
        const from = prevValue.current;
        animatedValue.setValue(from);

        Animated.timing(animatedValue, {
            toValue: value,
            duration,
            useNativeDriver: false,
        }).start();

        const listener = animatedValue.addListener(({ value: v }) => {
            const rounded = Math.round(v);
            const formatted = formatFn
                ? formatFn(rounded)
                : rounded.toLocaleString("fr-FR");
            setDisplayValue(formatted);
        });

        prevValue.current = value;

        return () => {
            animatedValue.removeListener(listener);
        };
    }, [value]);

    return (
        <Text style={style}>
            {prefix}{displayValue}{suffix}
        </Text>
    );
}
