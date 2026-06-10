// ─── AnimatedKPICard — Premium animated KPI component ─────────────────────────
// Renders a glassmorphic dashboard card with:
// - Count-up animated number
// - LinearGradient background and subtle glow borders
// - Live trend percentage with styling
// - Tiny MiniSparkline trend line
// - Haptic-like interaction feedback

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import AnimatedNumber from "./AnimatedNumber";
import MiniSparkline from "./MiniSparkline";

interface AnimatedKPICardProps {
    title: string;
    value: number;
    trend?: number;
    sparklineData?: number[];
    prefix?: string;
    suffix?: string;
    icon: string;
    color?: string;
    onPress?: () => void;
}

export default function AnimatedKPICard({
    title,
    value,
    trend,
    sparklineData,
    prefix = "",
    suffix = " DA",
    icon,
    color = Colors.accent.green,
    onPress,
}: AnimatedKPICardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    const isPositive = trend !== undefined && trend >= 0;
    const trendText = trend !== undefined ? `${isPositive ? "+" : ""}${trend}%` : null;

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            >
                <LinearGradient
                    colors={Colors.gradient.cardShine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                
                <View style={styles.cardHeader}>
                    <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
                        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <AnimatedNumber
                        value={value}
                        prefix={prefix}
                        suffix={suffix}
                        style={styles.value}
                    />

                    <View style={styles.cardFooter}>
                        {trend !== undefined && (
                            <View style={[
                                styles.trendBadge,
                                { backgroundColor: isPositive ? `${Colors.accent.green}15` : `${Colors.accent.red}15` }
                            ]}>
                                <MaterialCommunityIcons
                                    name={isPositive ? "arrow-up" : "arrow-down"}
                                    size={12}
                                    color={isPositive ? Colors.accent.green : Colors.accent.red}
                                />
                                <Text style={[
                                    styles.trendText,
                                    { color: isPositive ? Colors.accent.green : Colors.accent.red }
                                ]}>
                                    {trendText}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.subtitle}>vs hier</Text>
                    </View>
                </View>

                {sparklineData && sparklineData.length > 0 && (
                    <View style={styles.sparklineContainer}>
                        <MiniSparkline data={sparklineData} color={color} width={70} height={28} showDots={true} />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 165,
        height: 125,
        backgroundColor: Colors.bg.card,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: Colors.border.card,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    pressable: {
        flex: 1,
        padding: 12,
        justifyContent: "space-between",
    },
    pressed: {
        opacity: 0.9,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    iconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    title: {
        ...Typography.caption,
        color: Colors.text.secondary,
        fontWeight: "600",
        flex: 1,
    },
    cardBody: {
        flex: 1,
        justifyContent: "flex-end",
    },
    value: {
        ...Typography.h3,
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.text.primary,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
    },
    trendBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 6,
    },
    trendText: {
        fontSize: 10,
        fontWeight: "700",
        marginLeft: 2,
    },
    subtitle: {
        fontSize: 10,
        color: Colors.text.muted,
    },
    sparklineContainer: {
        position: "absolute",
        right: 12,
        top: 12,
    },
});
