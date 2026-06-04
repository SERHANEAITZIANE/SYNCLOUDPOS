import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, StyleSheet,
    ActivityIndicator, RefreshControl, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

interface Message {
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    "quel est l'état de ma trésorerie aujourd'hui?",
    "quels sont les clients qui me doivent le plus?",
    "quels produits sont en rupture de stock?",
    "donne moi un résumé de mes ventes aujourd'hui",
    "kif rani nkassab lyoum?",
    "analyse la santé de mon stock",
];

export default function AiAdvisorScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            text: "Bonjour ! Je suis votre conseiller d'affaires IA. Je peux analyser vos ventes, stock, dettes et trésorerie. Posez-moi n'importe quelle question sur votre entreprise.\n\nواش تبي تعرف على حال مؤسستك؟ اسألني بكل ثقة!",
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);

    const sendMessage = useCallback(async (text?: string) => {
        const msgText = text || inputText.trim();
        if (!msgText || sending) return;

        const userMsg: Message = { role: "user", text: msgText, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setSending(true);

        try {
            // Build conversation history for context
            const history = messages.map(m => ({ role: m.role, text: m.text }));

            const response = await apiFetch("/voice-assistant", {
                method: "POST",
                body: JSON.stringify({
                    queryText: msgText,
                    language: "french",
                    detailedMode: true,
                    history,
                }),
            });

            const assistantMsg: Message = {
                role: "assistant",
                text: response.text || response.response || "Je n'ai pas pu obtenir de réponse.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: "assistant",
                text: `⚠️ Erreur: ${e.message || "Connexion impossible à l'IA"}`,
                timestamp: new Date(),
            }]);
        } finally {
            setSending(false);
        }
    }, [inputText, sending, messages]);

    const scrollRef = React.useRef<ScrollView>(null);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#0f172a" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.aiAvatar}>
                        <Ionicons name="sparkles" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Conseiller IA</Text>
                        <Text style={styles.headerSubtitle}>Gemini • Analyse temps réel</Text>
                    </View>
                </View>
            </View>

            {/* Quick prompts */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRow}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
                {QUICK_PROMPTS.map((p, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.quickBtn}
                        onPress={() => sendMessage(p)}
                        disabled={sending}
                    >
                        <Text style={styles.quickBtnText}>{p}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Messages */}
            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bubble,
                            msg.role === "user" ? styles.userBubble : styles.aiBubble,
                        ]}
                    >
                        {msg.role === "assistant" && (
                            <View style={styles.aiBadge}>
                                <Ionicons name="sparkles" size={12} color="#a855f7" />
                                <Text style={styles.aiBadgeText}>Gemini AI</Text>
                            </View>
                        )}
                        <Text style={[
                            styles.bubbleText,
                            msg.role === "user" ? styles.userText : styles.aiText,
                        ]}>
                            {msg.text}
                        </Text>
                        <Text style={styles.timestamp}>
                            {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                    </View>
                ))}
                {sending && (
                    <View style={[styles.bubble, styles.aiBubble]}>
                        <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={12} color="#a855f7" />
                            <Text style={styles.aiBadgeText}>Gemini AI</Text>
                        </View>
                        <View style={styles.typingDots}>
                            <View style={[styles.dot, { opacity: 0.4 }]} />
                            <View style={[styles.dot, { opacity: 0.7 }]} />
                            <View style={[styles.dot, { opacity: 1.0 }]} />
                            <Text style={styles.typingText}>  Analyse en cours...</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Posez votre question..."
                    placeholderTextColor="#475569"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    onSubmitEditing={() => sendMessage()}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={() => sendMessage()}
                    disabled={!inputText.trim() || sending}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 16, paddingTop: 20,
        borderBottomWidth: 1, borderBottomColor: "#1e293b",
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    aiAvatar: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "#a855f7",
        justifyContent: "center", alignItems: "center",
    },
    headerTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
    headerSubtitle: { color: "#64748b", fontSize: 12 },

    quickRow: { maxHeight: 44, marginVertical: 8 },
    quickBtn: {
        backgroundColor: "#1e293b",
        borderWidth: 1, borderColor: "#334155",
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    },
    quickBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },

    bubble: {
        maxWidth: "85%", borderRadius: 16, padding: 12, gap: 4,
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: "#22c55e",
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: "flex-start",
        backgroundColor: "#1e293b",
        borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: "#334155",
    },
    aiBadge: {
        flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4,
    },
    aiBadgeText: { color: "#a855f7", fontSize: 10, fontWeight: "800" },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    userText: { color: "#fff", fontWeight: "600" },
    aiText: { color: "#e2e8f0" },
    timestamp: { color: "#64748b", fontSize: 10, alignSelf: "flex-end", marginTop: 2 },

    typingDots: { flexDirection: "row", alignItems: "center", gap: 4 },
    typingText: { color: "#64748b", fontSize: 13, fontStyle: "italic" },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#a855f7" },

    inputBar: {
        flexDirection: "row", alignItems: "flex-end",
        padding: 12, gap: 8,
        backgroundColor: "#1e293b",
        borderTopWidth: 1, borderTopColor: "#334155",
    },
    input: {
        flex: 1, backgroundColor: "#0f172a",
        borderWidth: 1, borderColor: "#334155",
        borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
        color: "#f8fafc", fontSize: 14, maxHeight: 100,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: "#a855f7",
        justifyContent: "center", alignItems: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
});
