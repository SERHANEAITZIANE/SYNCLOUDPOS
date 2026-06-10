// ─── ClientTypeFilter — Horizontal selection chips for client segment filtering ───
// Allows switching between: Tous, Particulier (RETAIL), Grossiste (WHOLESALE), Revendeur (RESELLER).

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../theme/colors";

export type ClientType = "" | "RETAIL" | "WHOLESALE" | "RESELLER";

interface ClientTypeFilterProps {
    value: ClientType;
    onChange: (type: ClientType) => void;
}

const CLIENT_TYPES: { label: string; value: ClientType }[] = [
    { label: "Tous", value: "" },
    { label: "Particulier", value: "RETAIL" },
    { label: "Grossiste", value: "WHOLESALE" },
    { label: "Revendeur", value: "RESELLER" },
];

export default function ClientTypeFilter({ value, onChange }: ClientTypeFilterProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Type Client :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {CLIENT_TYPES.map((type) => {
                    const isActive = value === type.value;
                    return (
                        <TouchableOpacity
                            key={type.value}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => onChange(type.value)}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        marginRight: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    chipsRow: {
        gap: 6,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.bg.card,
        borderWidth: 1,
        borderColor: Colors.border.card,
    },
    chipActive: {
        backgroundColor: Colors.accent.blue,
        borderColor: Colors.accent.blue,
    },
    chipText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.secondary,
    },
    chipTextActive: {
        color: "#ffffff",
    },
});
