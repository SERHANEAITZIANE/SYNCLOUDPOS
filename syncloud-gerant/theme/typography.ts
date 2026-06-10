// ─── SynCloud Gérant Design System — Typography ─────────────────────────────
// Consistent text styles used across all screens.

import { TextStyle, Platform } from "react-native";
import { Colors } from "./colors";

const fontFamily = Platform.OS === "ios" ? "System" : "Roboto";

export const Typography = {
    // ── Display (Dashboard hero) ──────────────────────────────────────
    displayLg: {
        fontSize: 32,
        fontWeight: "900",
        color: Colors.text.primary,
        letterSpacing: -0.5,
        fontFamily,
    } as TextStyle,

    displayMd: {
        fontSize: 28,
        fontWeight: "900",
        color: Colors.text.primary,
        letterSpacing: -0.5,
        fontFamily,
    } as TextStyle,

    // ── Headings ──────────────────────────────────────────────────────
    h1: {
        fontSize: 22,
        fontWeight: "900",
        color: Colors.text.primary,
        fontFamily,
    } as TextStyle,

    h2: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.text.primary,
        fontFamily,
    } as TextStyle,

    h3: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.text.primary,
        fontFamily,
    } as TextStyle,

    // ── Body ──────────────────────────────────────────────────────────
    body: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text.secondary,
        lineHeight: 20,
        fontFamily,
    } as TextStyle,

    bodySmall: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.text.secondary,
        lineHeight: 17,
        fontFamily,
    } as TextStyle,

    // ── Labels & Captions ─────────────────────────────────────────────
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
        letterSpacing: 2,
        textTransform: "uppercase",
        fontFamily,
    } as TextStyle,

    caption: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.text.dim,
        fontFamily,
    } as TextStyle,

    // ── Values (KPI numbers) ──────────────────────────────────────────
    kpiLarge: {
        fontSize: 26,
        fontWeight: "900",
        color: Colors.text.primary,
        lineHeight: 28,
        fontFamily,
    } as TextStyle,

    kpiMedium: {
        fontSize: 18,
        fontWeight: "900",
        color: Colors.text.primary,
        fontFamily,
    } as TextStyle,

    kpiSmall: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.text.primary,
        fontFamily,
    } as TextStyle,

    // ── Badges & Tags ─────────────────────────────────────────────────
    badge: {
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.5,
        fontFamily,
    } as TextStyle,

    // ── Section Title ─────────────────────────────────────────────────
    sectionTitle: {
        color: Colors.text.muted,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingHorizontal: 16,
        marginTop: 24,
        marginBottom: 10,
        fontFamily,
    } as TextStyle,
};
