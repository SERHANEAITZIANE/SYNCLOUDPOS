// ─── SynCloud Gérant Design System — Colors ────────────────────────────────
// Centralized palette to ensure visual consistency across all screens.

export const Colors = {
    // ── Backgrounds ──────────────────────────────────────────────────
    bg: {
        primary: "#0a0f1e",        // Main screen background
        card: "#1e293b",           // Card surfaces
        elevated: "#263044",       // Elevated elements (modals, popovers)
        input: "#0f172a",          // Input fields, insets
        tabBar: "#0f172a",         // Tab bar background
    },

    // ── Brand Accent ──────────────────────────────────────────────────
    accent: {
        green: "#22c55e",          // Primary action, success, brand
        greenDark: "#16a34a",      // Gradient end, pressed state
        blue: "#3b82f6",           // Secondary actions, links, info
        blueDark: "#2563eb",       // Gradient end
        amber: "#f59e0b",          // Warnings, pending states
        amberDark: "#d97706",      // Gradient end
        red: "#ef4444",            // Errors, critical alerts, destructive
        redDark: "#dc2626",        // Gradient end
        purple: "#a855f7",         // Special features (clôture, premium)
        purpleDark: "#9333ea",     // Gradient end
        cyan: "#06b6d4",           // Informational highlights
        pink: "#ec4899",           // Delivery/driver features
    },

    // ── Text ──────────────────────────────────────────────────────────
    text: {
        primary: "#f8fafc",        // Headings, important values
        secondary: "#94a3b8",      // Body text, descriptions
        muted: "#64748b",          // Labels, hints, subtitles
        dim: "#475569",            // Disabled text, timestamps
        inverse: "#0f172a",        // Text on light backgrounds
    },

    // ── Borders & Dividers ────────────────────────────────────────────
    border: {
        subtle: "#334155",         // Dividers, separators
        card: "rgba(148,163,184,0.08)", // Card borders (near-invisible)
        focus: "#22c55e40",        // Focus rings
    },

    // ── Semantic Status ───────────────────────────────────────────────
    status: {
        success: "#22c55e",
        successBg: "#22c55e15",
        warning: "#f59e0b",
        warningBg: "#f59e0b15",
        error: "#ef4444",
        errorBg: "#ef444415",
        info: "#3b82f6",
        infoBg: "#3b82f615",
    },

    // ── Gradients (as tuples for LinearGradient) ──────────────────────
    gradient: {
        brand: ["#22c55e", "#10b981"] as [string, string],
        blue: ["#3b82f6", "#2563eb"] as [string, string],
        amber: ["#f59e0b", "#d97706"] as [string, string],
        red: ["#ef4444", "#dc2626"] as [string, string],
        purple: ["#a855f7", "#9333ea"] as [string, string],
        dark: ["#0f172a", "#1a1f3a"] as [string, string],
        cardShine: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"] as [string, string],
    },
};

// ── Helper: alpha overlay ─────────────────────────────────────────────────
export function withAlpha(hex: string, alpha: number): string {
    const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
    return hex + a;
}
