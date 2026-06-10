// ─── SkeletonLoader — Pulsing placeholder for loading states ──────────────────
// Replaces ActivityIndicator with content-shaped skeleton animations.

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: Colors.border.subtle,
                    opacity,
                },
                style,
            ]}
        />
    );
}

// ── Pre-built skeleton layouts ───────────────────────────────────────────────

export function DashboardSkeleton() {
    return (
        <View style={styles.container}>
            {/* Hero header skeleton */}
            <View style={styles.heroSkeleton}>
                <SkeletonBox width={180} height={28} />
                <SkeletonBox width={220} height={14} style={{ marginTop: 8 }} />
            </View>

            {/* Health score skeleton */}
            <View style={styles.healthSkeleton}>
                <SkeletonBox width={90} height={90} borderRadius={45} />
                <View style={{ flex: 1, gap: 8, marginLeft: 16 }}>
                    <SkeletonBox height={8} />
                    <SkeletonBox height={8} />
                    <SkeletonBox height={8} />
                    <SkeletonBox height={8} />
                    <SkeletonBox height={8} />
                </View>
            </View>

            {/* KPI cards skeleton */}
            <View style={styles.kpiRowSkeleton}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={styles.kpiCardSkeleton}>
                        <SkeletonBox width={28} height={28} borderRadius={8} />
                        <SkeletonBox width="80%" height={20} style={{ marginTop: 12 }} />
                        <SkeletonBox width="60%" height={12} style={{ marginTop: 6 }} />
                        <SkeletonBox width={50} height={16} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>

            {/* Treasury skeleton */}
            <View style={styles.sectionSkeleton}>
                <SkeletonBox width={160} height={10} style={{ marginBottom: 12 }} />
                <SkeletonBox height={60} borderRadius={16} />
            </View>

            {/* Activity skeleton */}
            <View style={styles.sectionSkeleton}>
                <SkeletonBox width={140} height={10} style={{ marginBottom: 12 }} />
                {[1, 2, 3].map(i => (
                    <View key={i} style={styles.activityRowSkeleton}>
                        <SkeletonBox width={36} height={36} borderRadius={10} />
                        <View style={{ flex: 1, marginLeft: 10, gap: 6 }}>
                            <SkeletonBox width="70%" height={12} />
                            <SkeletonBox width="40%" height={10} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <View style={{ padding: 16, gap: 12 }}>
            {Array.from({ length: rows }).map((_, i) => (
                <View key={i} style={styles.listRowSkeleton}>
                    <SkeletonBox width={40} height={40} borderRadius={12} />
                    <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                        <SkeletonBox width="60%" height={14} />
                        <SkeletonBox width="40%" height={10} />
                    </View>
                    <SkeletonBox width={60} height={14} />
                </View>
            ))}
        </View>
    );
}

export { SkeletonBox };

export default function SkeletonLoader({ type = "list", rows = 5 }: { type?: "dashboard" | "list"; rows?: number }) {
    if (type === "dashboard") {
        return <DashboardSkeleton />;
    }
    return <ListSkeleton rows={rows} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
        padding: 16,
    },
    heroSkeleton: {
        paddingTop: 20,
        paddingBottom: 16,
    },
    healthSkeleton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.bg.card,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
    },
    kpiRowSkeleton: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16,
    },
    kpiCardSkeleton: {
        width: "47%" as any,
        backgroundColor: Colors.bg.card,
        borderRadius: 16,
        padding: 16,
    },
    sectionSkeleton: {
        marginTop: 16,
    },
    activityRowSkeleton: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    listRowSkeleton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.bg.card,
        borderRadius: 14,
        padding: 14,
    },
});
