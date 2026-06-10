// ─── MiniSparkline — Pure RN View-based sparkline chart ──────────────────────
// Renders a tiny 7-point trend line using absolute-positioned dots and lines.
// No external SVG dependency needed.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";

interface MiniSparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    showDots?: boolean;
}

export default function MiniSparkline({
    data,
    width = 60,
    height = 24,
    color = Colors.accent.green,
    showDots = true,
}: MiniSparklineProps) {
    if (!data || data.length < 2) {
        return <View style={{ width, height }} />;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 4;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    // Compute points
    const points = data.map((v, i) => ({
        x: padding + (i / (data.length - 1)) * innerW,
        y: padding + innerH - ((v - min) / range) * innerH,
    }));

    // Build line segments between consecutive points
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        segments.push(
            <View
                key={`seg-${i}`}
                style={{
                    position: "absolute",
                    left: p1.x,
                    top: p1.y - 1,
                    width: len,
                    height: 2,
                    backgroundColor: color,
                    borderRadius: 1,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: "left center",
                    opacity: 0.8,
                }}
            />
        );
    }

    return (
        <View style={{ width, height, position: "relative" }}>
            {segments}
            {/* Area fill — simplified gradient effect */}
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: padding,
                    right: padding,
                    height: innerH * 0.6,
                    backgroundColor: color,
                    opacity: 0.06,
                    borderRadius: 4,
                }}
            />
            {/* Dots */}
            {showDots && points.map((p, i) => (
                <View
                    key={`dot-${i}`}
                    style={{
                        position: "absolute",
                        left: p.x - (i === points.length - 1 ? 3 : 1.5),
                        top: p.y - (i === points.length - 1 ? 3 : 1.5),
                        width: i === points.length - 1 ? 6 : 3,
                        height: i === points.length - 1 ? 6 : 3,
                        borderRadius: i === points.length - 1 ? 3 : 1.5,
                        backgroundColor: i === points.length - 1 ? color : `${color}80`,
                    }}
                />
            ))}
        </View>
    );
}
