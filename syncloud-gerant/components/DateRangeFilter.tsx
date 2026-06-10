// ─── DateRangeFilter — Custom Dark-themed calendar range picker ──────────────
// Pure React Native implementation — no external datetimepicker dependencies needed.
// Provides preset buttons and a premium calendar grid modal for custom ranges.

import React, { useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    FlatList, Dimensions, Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { Typography } from "../theme/typography";
import { subDays, startOfMonth, endOfMonth, format, isBefore, isAfter, addMonths, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

export type DateRange = {
    from: Date;
    to: Date;
    key: string;
};

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

const PRESETS = [
    { label: "Aujourd'hui", key: "today", getRange: () => ({ from: new Date(), to: new Date() }) },
    { label: "7 jours", key: "7days", getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: "30 jours", key: "30days", getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: "Ce Mois", key: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
];

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [tempFrom, setTempFrom] = useState<Date | null>(value.from);
    const [tempTo, setTempTo] = useState<Date | null>(value.to);

    const handlePresetPress = (key: string, getRange: () => { from: Date; to: Date }) => {
        const range = getRange();
        onChange({ ...range, key });
    };

    const handleCustomPress = () => {
        setTempFrom(value.from);
        setTempTo(value.to);
        setModalVisible(true);
    };

    const handleDayPress = (day: Date) => {
        if (!tempFrom || (tempFrom && tempTo)) {
            setTempFrom(day);
            setTempTo(null);
        } else if (tempFrom && !tempTo) {
            if (isBefore(day, tempFrom)) {
                setTempFrom(day);
            } else {
                setTempTo(day);
            }
        }
    };

    const handleSave = () => {
        if (tempFrom) {
            onChange({
                from: tempFrom,
                to: tempTo || tempFrom,
                key: "custom"
            });
        }
        setModalVisible(false);
    };

    // Calendar helper calculations
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const renderDay = (day: Date) => {
        const isCurrentMonthDay = day.getMonth() === currentMonth.getMonth();
        const isSelectedStart = tempFrom && isSameDay(day, tempFrom);
        const isSelectedEnd = tempTo && isSameDay(day, tempTo);
        const isWithinRange = tempFrom && tempTo && isAfter(day, tempFrom) && isBefore(day, tempTo);

        return (
            <TouchableOpacity
                key={day.toISOString()}
                style={[
                    styles.dayCell,
                    !isCurrentMonthDay && styles.disabledDayCell,
                    isWithinRange && styles.rangeDayCell,
                    isSelectedStart && styles.startDayCell,
                    isSelectedEnd && styles.endDayCell,
                ]}
                onPress={() => handleDayPress(day)}
            >
                <Text style={[
                    styles.dayText,
                    !isCurrentMonthDay && styles.disabledDayText,
                    (isSelectedStart || isSelectedEnd) && styles.selectedDayText,
                    isWithinRange && styles.rangeDayText
                ]}>
                    {day.getDate()}
                </Text>
            </TouchableOpacity>
        );
    };

    const formattedRange = () => {
        if (value.key !== "custom") {
            const preset = PRESETS.find(p => p.key === value.key);
            return preset ? preset.label : "Filtre";
        }
        return `${format(value.from, "dd MMM", { locale: fr })} - ${format(value.to, "dd MMM", { locale: fr })}`;
    };

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {PRESETS.map((p) => {
                    const isActive = value.key === p.key;
                    return (
                        <TouchableOpacity
                            key={p.key}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => handlePresetPress(p.key, p.getRange)}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity
                    style={[styles.chip, value.key === "custom" && styles.chipActive]}
                    onPress={handleCustomPress}
                >
                    <Ionicons name="calendar-outline" size={14} color={value.key === "custom" ? "#fff" : Colors.text.secondary} />
                    <Text style={[styles.chipText, value.key === "custom" && styles.chipTextActive, { marginLeft: 4 }]}>
                        {value.key === "custom" ? formattedRange() : "Personnalisé..."}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Custom Range Calendar Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choisir une période</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Calendar Month Header */}
                        <View style={styles.calendarMonthHeader}>
                            <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
                            </TouchableOpacity>
                            <Text style={styles.monthLabel}>
                                {format(currentMonth, "MMMM yyyy", { locale: fr })}
                            </Text>
                            <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <Ionicons name="chevron-forward" size={20} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday Labels */}
                        <View style={styles.weekdayRow}>
                            {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((w) => (
                                <Text key={w} style={styles.weekdayText}>{w}</Text>
                            ))}
                        </View>

                        {/* Days Grid */}
                        <View style={styles.daysGrid}>
                            {days.map(renderDay)}
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <View style={styles.selectionPreview}>
                                <Text style={styles.previewLabel}>Période sélectionnée :</Text>
                                <Text style={styles.previewValue}>
                                    {tempFrom ? format(tempFrom, "dd/MM/yyyy") : "--/--/----"}
                                    {" au "}
                                    {tempTo ? format(tempTo, "dd/MM/yyyy") : (tempFrom ? format(tempFrom, "dd/MM/yyyy") : "--/--/----")}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>Appliquer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}



const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    scrollContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: Colors.bg.card,
        borderWidth: 1,
        borderColor: Colors.border.card,
        flexDirection: "row",
        alignItems: "center",
    },
    chipActive: {
        backgroundColor: Colors.accent.green,
        borderColor: Colors.accent.green,
    },
    chipText: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.secondary,
    },
    chipTextActive: {
        color: "#ffffff",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.bg.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border.card,
        width: "100%",
        maxWidth: 340,
        padding: 20,
        gap: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.text.primary,
    },
    calendarMonthHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    monthLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text.primary,
        textTransform: "capitalize",
    },
    weekdayRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 12,
    },
    weekdayText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        width: 38,
        textAlign: "center",
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        rowGap: 8,
        marginTop: 8,
    },
    dayCell: {
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    disabledDayCell: {
        opacity: 0.3,
    },
    dayText: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.primary,
    },
    disabledDayText: {
        color: Colors.text.muted,
    },
    selectedDayText: {
        color: "#ffffff",
        fontWeight: "bold",
    },
    startDayCell: {
        backgroundColor: Colors.accent.green,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    endDayCell: {
        backgroundColor: Colors.accent.green,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },
    rangeDayCell: {
        backgroundColor: `${Colors.accent.green}25`,
        borderRadius: 0,
    },
    rangeDayText: {
        color: Colors.accent.green,
        fontWeight: "700",
    },
    modalActions: {
        marginTop: 12,
        gap: 12,
    },
    selectionPreview: {
        backgroundColor: Colors.bg.primary,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    previewLabel: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "700",
    },
    previewValue: {
        fontSize: 12,
        color: Colors.text.primary,
        fontWeight: "600",
        marginTop: 2,
    },
    saveBtn: {
        backgroundColor: Colors.accent.green,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    saveBtnText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "bold",
    },
});
