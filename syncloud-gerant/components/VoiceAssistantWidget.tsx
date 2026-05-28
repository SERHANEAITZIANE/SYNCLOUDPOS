import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Animated, ScrollView,
    Platform, Alert, Clipboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, API_BASE } from "../lib/api";

interface VoiceAssistantWidgetProps {
    active?: boolean;
}

type LangType = "darija" | "arabic" | "french";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

const quickQueries = {
    darija: [
        { label: "💰 شحال دخلنا اليوم؟", query: "شحال دخلنا اليوم؟ واش هو رقم المعاملات؟" },
        { label: "🔑 واش كاين في الكاسة؟", query: "واش كاين في الكاسة حاليا؟" },
        { label: "📦 واش السلعة اللي خصات؟", query: "واش السلعة اللي خصات؟ وشنو هي السلعة القليلة في المخزن؟" },
        { label: "👥 شكون اللي عليه الدين بزاف؟", query: "شكون اللي عليه الدين بزاف؟" },
    ],
    arabic: [
        { label: "💰 كم دخلنا اليوم؟", query: "كم دخلنا اليوم؟ وما هو رقم المعاملات؟" },
        { label: "🔑 ماذا يوجد في الصندوق؟", query: "ماذا يوجد في الصندوق حالياً؟" },
        { label: "📦 ما هي السلعة الناقصة؟", query: "ما هي السلعة الناقصة؟ وما هي السلع القليلة في المخزن؟" },
        { label: "👥 من عليه ديون كثيرة؟", query: "من هم العملاء الذين لديهم ديون كثيرة؟" },
    ],
    french: [
        { label: "📊 Rapport du jour", query: "Combien a-t-on encaissé aujourd'hui et quel est le chiffre d'affaires ?" },
        { label: "📦 Ruptures de Stock", query: "Quels produits sont en rupture de stock actuellement ?" },
        { label: "👥 Solde Clients", query: "Quels sont nos plus grands clients débiteurs ?" },
        { label: "💸 Bilan Trésorerie & Dépenses", query: "Résume-moi l'état de la caisse et les dépenses du mois" },
    ]
};

const localization = {
    darija: {
        title: "المساعد الصوتي للمدير",
        statusLoading: "الذكاء الاصطناعي راه يحلل في قاعدة البيانات...",
        statusSpeaking: "جاري قراءة التقرير صوتياً...",
        statusListening: "🎙️ إستماع: إضغط على ميكروفون لوحة المفاتيح لتتكلم !",
        statusRecording: "🎙️ راني نسمع: اهدر درك، واضغط باش تحبس وتسأل !",
        statusIdle: "اسأل سؤال ولا خير تقرير سريع من التحت",
        suggestionTitle: "تقارير سريعة :",
        placeholder: "اسأل المساعد الذكي عن أي شيء في المحل...",
        welcome: "مرحباً يا مدير، كيفاش نقدر نعاونك اليوم؟",
        stopSpeak: "احبس القراءة",
        noReport: "الحاصيل، ما قدرتش نجيب التقرير.",
        errorMsg: "كاين خلل في الاتصال بمساعد الذكاء الاصطناعي.",
        micAlertTitle: "التحدث الصوتي",
        micAlertDesc: "🎙️ لتتكلم، الرجاء الضغط على زر الميكروفون الموجود أسفل لوحة مفاتيح هاتفك!"
    },
    arabic: {
        title: "المساعد الصوتي للمدير",
        statusLoading: "الذكاء الاصطناعي يقوم بتحليل قاعدة البيانات...",
        statusSpeaking: "جاري قراءة التقرير صوتياً...",
        statusListening: "🎙️ إستماع: إضغط على ميكروفون لوحة المفاتيح لتتكلم !",
        statusRecording: "🎙️ جاري الاستماع: تحدث الآن، واضغط لإيقاف التسجيل !",
        statusIdle: "اطرح سؤالاً أو اختر تقريراً سريعاً من الأسفل",
        suggestionTitle: "تقارير سريعة :",
        placeholder: "اسأل المساعد الذكي عن أي شيء في المحل...",
        welcome: "مرحباً بك يا مدير، كيف يمكنني مساعدتك اليوم؟",
        stopSpeak: "إيقاف القراءة",
        noReport: "عذراً، لم أتمكن من الحصول على التقرير.",
        errorMsg: "حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي.",
        micAlertTitle: "التحدث الصوتي",
        micAlertDesc: "🎙️ لتتكلم، الرجاء الضغط على زر الميكروفون الموجود أسفل لوحة مفاتيح هاتفك!"
    },
    french: {
        title: "Assistant Vocal Gérant",
        statusLoading: "L'assistant IA analyse les bases de données...",
        statusSpeaking: "Vocalisation du rapport en cours...",
        statusListening: "🎙️ Écoute active : Touchez le micro du clavier pour parler !",
        statusRecording: "🎙️ Écoute active : Parlez maintenant, puis touchez pour envoyer !",
        statusIdle: "Posez une question ou sélectionnez un rapport",
        suggestionTitle: "RAPPORTS RAPIDES :",
        placeholder: "Posez une question à l'ERP (Ex: chiffre d'affaires)",
        welcome: "Bonjour directeur, comment puis-je vous aider aujourd'hui ?",
        stopSpeak: "Arrêter la lecture",
        noReport: "Désolé, je n'ai pas pu obtenir le rapport.",
        errorMsg: "Une erreur est survenue lors de la connexion à l'assistant AI.",
        micAlertTitle: "Dictée Vocale",
        micAlertDesc: "🎙️ Pour parler, touchez le bouton Micro (icône Dictée) situé sur le clavier de votre téléphone !"
    }
};

export default function VoiceAssistantWidget({ active = true }: VoiceAssistantWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [language, setLanguage] = useState<LangType>("french");
    const [loading, setLoading] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [muted, setMuted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [detailedMode, setDetailedMode] = useState(false);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);

    // AI configurations cached locally
    const [aiProvider, setAiProvider] = useState<string | null>(null);
    const [aiModel, setAiModel] = useState<string | null>(null);

    // References
    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Soundwave animations
    const pulse1 = useRef(new Animated.Value(1)).current;
    const pulse2 = useRef(new Animated.Value(1)).current;
    const pulse3 = useRef(new Animated.Value(1)).current;

    // Load AI configurations from AsyncStorage on open
    useEffect(() => {
        if (isOpen) {
            const loadAiConfig = async () => {
                try {
                    const provider = await AsyncStorage.getItem("setting_aiProvider");
                    const model = await AsyncStorage.getItem("setting_aiModel");
                    if (provider) setAiProvider(provider);
                    if (model) setAiModel(model);
                } catch (e) {
                    console.warn("Failed to load local AI settings:", e);
                }
            };
            loadAiConfig();
        }
    }, [isOpen]);

    // Trigger looping pulse animations when loading, speaking, or recording voice
    useEffect(() => {
        if (loading || speaking || isRecording) {
            const startPulse = (anim: Animated.Value, delay: number) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 2.2,
                            duration: 1200,
                            useNativeDriver: true,
                            delay
                        }),
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true
                        })
                    ])
                ).start();
            };

            startPulse(pulse1, 0);
            startPulse(pulse2, 400);
            startPulse(pulse3, 800);
        } else {
            pulse1.setValue(1);
            pulse2.setValue(1);
            pulse3.setValue(1);
        }
    }, [loading, speaking, isRecording]);

    // Native voice recording handlers using expo-av
    const startRecording = async () => {
        try {
            await handleStopSpeech();
            
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== "granted") {
                Alert.alert("Permission requise", "L'accès au microphone est nécessaire pour utiliser l'assistant vocal.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecordingInstance(recording);
            setIsRecording(true);
        } catch (err) {
            console.error("Failed to start recording:", err);
            Alert.alert("Erreur", "Impossible de démarrer l'enregistrement vocal.");
        }
    };

    const stopRecording = async () => {
        if (!recordingInstance) return;
        try {
            setIsRecording(false);
            await recordingInstance.stopAndUnloadAsync();
            const uri = recordingInstance.getURI();
            setRecordingInstance(null);

            // Re-configure audio mode back to playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            if (uri) {
                await handleAudioSubmit(uri);
            }
        } catch (err) {
            console.error("Failed to stop recording:", err);
        }
    };

    const handleAudioSubmit = async (audioUri: string) => {
        setLoading(true);
        setIsListening(false);
        await handleStopSpeech();

        try {
            const apiHistory = messages.map(m => ({
                role: m.role === "assistant" ? "model" as const : "user" as const,
                content: m.content
            }));

            const formData = new FormData();
            
            const filename = audioUri.split("/").pop() || "recording.m4a";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `audio/${match[1]}` : `audio/m4a`;

            // Append audio file standard for React Native
            formData.append("audio", {
                uri: Platform.OS === "android" ? audioUri : audioUri.replace("file://", ""),
                name: filename,
                type,
            } as any);

            formData.append("language", language);
            formData.append("detailedMode", String(detailedMode));
            formData.append("history", JSON.stringify(apiHistory));
            if (aiProvider) formData.append("aiProvider", aiProvider);
            if (aiModel) formData.append("aiModel", aiModel);

            const token = await AsyncStorage.getItem("auth_tokens");
            const parsedTokens = token ? JSON.parse(token) : {};

            const response = await fetch(`${API_BASE}/voice-assistant`, {
                method: "POST",
                headers: {
                    ...(parsedTokens.accessToken ? { "Authorization": `Bearer ${parsedTokens.accessToken}` } : {}),
                },
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.text) {
                const transcribedQuery = result.queryText || "🎙️ [Message vocal]";
                setMessages(prev => [
                    ...prev,
                    { role: "user", content: transcribedQuery },
                    { role: "assistant", content: result.text }
                ]);
                speakText(result.text);
            } else {
                setMessages(prev => [
                    ...prev,
                    { role: "assistant", content: result.text || localization[language].noReport }
                ]);
                if (result.text) speakText(result.text);
            }
        } catch (error: any) {
            console.error("Failed to process audio:", error);
            setMessages(prev => [...prev, { role: "assistant", content: localization[language].errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    // Handle vocal speech output via server-side Cloud TTS (Azure ar-DZ-AminaNeural for Darja)
    const speakText = async (text: string) => {
        if (muted) return;
        
        try {
            // Stop any currently playing audio
            await handleStopSpeech();
            setSpeaking(true);

            // Strip markdown for clean TTS
            const cleanedText = text.replace(/[*#_\\\-]/g, "").trim();
            if (!cleanedText) {
                setSpeaking(false);
                return;
            }

            // Request audio from our server TTS endpoint
            const token = await AsyncStorage.getItem("auth_tokens");
            const parsedTokens = token ? JSON.parse(token) : {};

            const response = await fetch(`${API_BASE}/tts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(parsedTokens.accessToken ? { "Authorization": `Bearer ${parsedTokens.accessToken}` } : {}),
                },
                body: JSON.stringify({ text: cleanedText, language }),
            });

            if (!response.ok) {
                console.warn("Server TTS failed, status:", response.status);
                setSpeaking(false);
                return;
            }

            // Convert response to blob/base64 for playback
            const audioBlob = await response.blob();
            const reader = new FileReader();
            
            reader.onloadend = async () => {
                try {
                    const base64Data = (reader.result as string)?.split(",")[1];
                    if (!base64Data) {
                        setSpeaking(false);
                        return;
                    }

                    // Write to temp file for expo-av playback
                    const FileSystem = require("expo-file-system");
                    const fileUri = FileSystem.cacheDirectory + "tts_audio_" + Date.now() + ".mp3";
                    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    // Configure audio mode for playback
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                    });

                    // Load and play the audio
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: fileUri },
                        { shouldPlay: true, volume: 1.0 }
                    );
                    soundRef.current = sound;

                    sound.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            setSpeaking(false);
                            sound.unloadAsync();
                            soundRef.current = null;
                            // Clean up temp file
                            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
                        }
                    });
                } catch (playErr) {
                    console.error("Audio playback error:", playErr);
                    setSpeaking(false);
                }
            };

            reader.onerror = () => {
                console.error("FileReader error");
                setSpeaking(false);
            };

            reader.readAsDataURL(audioBlob);
        } catch (e) {
            console.error("Cloud TTS error:", e);
            setSpeaking(false);
        }
    };

    const handleStopSpeech = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
        } catch (e) {
            // Silence errors during stop
        }
        setSpeaking(false);
    };

    // Autofocus keyboard and play welcome audio greeting upon modal load
    useEffect(() => {
        if (isOpen) {
            // Set welcome message in history
            const welcomeText = localization[language].welcome;
            setMessages([{ role: "assistant", content: welcomeText }]);

            // Focus text input after a brief delay to let modal slide open
            setTimeout(() => {
                inputRef.current?.focus();
                setIsListening(true);
            }, 600);
            
            setTimeout(() => {
                speakText(welcomeText);
            }, 900);
        } else {
            setIsListening(false);
            handleStopSpeech();
        }
    }, [isOpen]);

    // Re-trigger welcome when language changes
    const changeLanguage = (newLang: LangType) => {
        setLanguage(newLang);
        if (isOpen) {
            const welcomeText = localization[newLang].welcome;
            setMessages([{ role: "assistant", content: welcomeText }]);
            speakText(welcomeText);
            inputRef.current?.focus();
        }
    };

    const handleQuerySubmit = async (queryText: string) => {
        if (!queryText.trim()) return;
        
        // Add user query to chat history
        const userMsg = { role: "user" as const, content: queryText };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setQuery(""); // Clear input form

        setLoading(true);
        setIsListening(false);
        await handleStopSpeech();

        try {
            // Map our messages to custom API history schema
            const apiHistory = messages.map(m => ({
                role: m.role === "assistant" ? "model" as const : "user" as const,
                content: m.content
            }));

            // POST request to our secure mobile voice-assistant endpoint
            const result = await apiFetch("/voice-assistant", {
                method: "POST",
                body: JSON.stringify({ 
                    queryText, 
                    language,
                    history: apiHistory,
                    detailedMode,
                    aiProvider,
                    aiModel
                })
            });

            if (result.success && result.text) {
                setMessages(prev => [...prev, { role: "assistant", content: result.text }]);
                // Automatically vocalize the response
                speakText(result.text);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: localization[language].noReport }]);
            }
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", content: localization[language].errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        Clipboard.setString(text);
        Alert.alert("Copié", "Texte copié dans le presse-papiers !");
    };

    if (!active) return null;

    const isAr = language === "darija" || language === "arabic";
    const activeLoc = localization[language];

    return (
        <>
            {/* Floating Mic Trigger Button */}
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setIsOpen(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="mic" size={26} color="#fff" />
                <View style={styles.badgePulse} />
            </TouchableOpacity>

            {/* Vocal Assistant Modal Drawer */}
            <Modal
                visible={isOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    handleStopSpeech();
                    setIsOpen(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    {/* Backdrop dismiss click */}
                    <TouchableOpacity
                        style={styles.backdropDismiss}
                        activeOpacity={1}
                        onPress={() => {
                            handleStopSpeech();
                            setIsOpen(false);
                        }}
                    />

                    {/* Drawer Content */}
                    <View style={styles.drawerCard}>
                        {/* Drag indicator bar */}
                        <View style={styles.dragBar} />

                        {/* Top controls header */}
                        <View style={[styles.drawerHeader, isAr && styles.rtlRow]}>
                            <View style={[styles.headerTitleWrap, isAr && styles.rtlRow]}>
                                <Ionicons name="sparkles" size={18} color="#22c55e" />
                                <Text style={styles.headerTitle}>{activeLoc.title}</Text>
                            </View>
                            
                            <View style={styles.headerActions}>
                                {/* Mute Toggle */}
                                <TouchableOpacity
                                    style={[styles.actionBtn, muted && styles.actionBtnActive]}
                                    onPress={() => {
                                        if (!muted) handleStopSpeech();
                                        setMuted(!muted);
                                    }}
                                >
                                    <Ionicons
                                        name={muted ? "volume-mute-outline" : "volume-high-outline"}
                                        size={20}
                                        color={muted ? "#ef4444" : "#94a3b8"}
                                    />
                                </TouchableOpacity>

                                {/* Close Button */}
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => {
                                        handleStopSpeech();
                                        setIsOpen(false);
                                    }}
                                >
                                    <Ionicons name="close" size={22} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Language Selection bar */}
                        <View style={styles.langBar}>
                            <TouchableOpacity
                                style={[styles.langTab, language === "darija" && styles.langTabActive]}
                                onPress={() => changeLanguage("darija")}
                            >
                                <Text style={[styles.langText, language === "darija" && styles.langTextActive]}>
                                    الدارجة (Darija)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.langTab, language === "arabic" && styles.langTabActive]}
                                onPress={() => changeLanguage("arabic")}
                            >
                                <Text style={[styles.langText, language === "arabic" && styles.langTabActive]}>
                                    العربية (Fusha)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.langTab, language === "french" && styles.langTabActive]}
                                onPress={() => changeLanguage("french")}
                            >
                                <Text style={[styles.langText, language === "french" && styles.langTextActive]}>
                                    Français
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Detailed Mode Toggle bar */}
                        <View style={[styles.controlSubBar, isAr && styles.rtlRow]}>
                            <TouchableOpacity
                                style={[styles.detailedToggle, detailedMode && styles.detailedToggleActive]}
                                onPress={() => setDetailedMode(!detailedMode)}
                            >
                                <Ionicons 
                                    name={detailedMode ? "analytics" : "mic-outline"} 
                                    size={16} 
                                    color={detailedMode ? "#22c55e" : "#94a3b8"} 
                                />
                                <Text style={[styles.detailedToggleText, detailedMode && styles.detailedToggleTextActive]}>
                                    {detailedMode ? "Mode Détaillé (Texte / Analyses)" : "Mode Spoken (Vocal / Court)"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Soundwave Animation Node Panel */}
                        <View style={styles.soundwavePanel}>
                            <View style={styles.micCircleContainer}>
                                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse3 }], opacity: pulse3.interpolate({ inputRange: [1, 2.2], outputRange: [0.6, 0] }) }]} />
                                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse2 }], opacity: pulse2.interpolate({ inputRange: [1, 2.2], outputRange: [0.6, 0] }) }]} />
                                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse1 }], opacity: pulse1.interpolate({ inputRange: [1, 2.2], outputRange: [0.6, 0] }) }]} />
                                
                                <TouchableOpacity
                                    style={[
                                        styles.micBigCircle, 
                                        (loading || speaking || isRecording) && styles.micBigCircleActive,
                                        isRecording && { backgroundColor: "#ef4444" } // Red background while actively recording voice
                                    ]}
                                    onPress={() => {
                                        if (speaking) {
                                            handleStopSpeech();
                                        } else if (isRecording) {
                                            stopRecording();
                                        } else if (query.trim()) {
                                            handleQuerySubmit(query);
                                        } else {
                                            startRecording();
                                        }
                                    }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="large" />
                                    ) : (
                                        <Ionicons
                                            name={speaking || isRecording ? "square" : "mic"}
                                            size={32}
                                            color="#fff"
                                        />
                                    )}
                                </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.assistantStatusText}>
                                {loading ? activeLoc.statusLoading :
                                 speaking ? activeLoc.statusSpeaking :
                                 isRecording ? activeLoc.statusRecording :
                                 isListening ? activeLoc.statusListening :
                                 activeLoc.statusIdle}
                            </Text>
                        </View>

                        {/* Suggested quick report pills */}
                        <View style={styles.suggestionSection}>
                            <Text style={[styles.suggestionTitle, isAr && styles.rtlText]}>
                                {activeLoc.suggestionTitle}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[styles.suggestionScroll, isAr && styles.rtlRow]}
                            >
                                {quickQueries[language].map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.suggestionPill}
                                        onPress={() => {
                                            handleQuerySubmit(item.query);
                                        }}
                                        disabled={loading}
                                    >
                                        <Text style={styles.suggestionText}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Transcript Response details panel */}
                        <ScrollView 
                            style={styles.responseContainer} 
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ref={scrollRef}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                    <View 
                                        key={index} 
                                        style={[
                                            isUser ? styles.userBubble : styles.aiBubble,
                                            isAr && (isUser ? styles.rtlAlignSelf : styles.rtlAlignSelfLeft)
                                        ]}
                                    >
                                        <Text style={[
                                            isUser ? styles.userQueryText : styles.aiText,
                                            isAr && styles.rtlText
                                        ]}>
                                            {msg.content}
                                        </Text>

                                        {!isUser && (
                                            <View style={[styles.aiMessageActions, isAr && styles.rtlRow]}>
                                                <TouchableOpacity
                                                    style={styles.aiActionMiniBtn}
                                                    onPress={() => copyToClipboard(msg.content)}
                                                >
                                                    <Ionicons name="copy-outline" size={13} color="#94a3b8" />
                                                    <Text style={styles.aiActionMiniText}>Copier</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.aiActionMiniBtn}
                                                    onPress={() => speakText(msg.content)}
                                                >
                                                    <Ionicons name="volume-medium-outline" size={13} color="#94a3b8" />
                                                    <Text style={styles.aiActionMiniText}>Parler</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* TextInput Fallback form */}
                        <View style={[styles.inputForm, isAr && styles.rtlRow]}>
                            <TextInput
                                ref={inputRef}
                                style={[styles.textInput, isAr && styles.rtlText]}
                                value={query}
                                onChangeText={(txt) => {
                                    setQuery(txt);
                                    if (txt.trim()) setIsListening(false);
                                }}
                                placeholder={activeLoc.placeholder}
                                placeholderTextColor="#64748b"
                                editable={!loading}
                                onSubmitEditing={() => handleQuerySubmit(query)}
                                onFocus={() => setIsListening(true)}
                                onBlur={() => {
                                    if (!query.trim()) setIsListening(false);
                                }}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !query.trim() && styles.sendBtnDisabled]}
                                onPress={() => handleQuerySubmit(query)}
                                disabled={loading || !query.trim()}
                            >
                                <Ionicons name={isAr ? "arrow-back" : "send"} size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    floatingButton: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#22c55e",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 9999,
    },
    badgePulse: {
        position: "absolute",
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#ef4444",
        borderWidth: 2,
        borderColor: "#fff"
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        justifyContent: "flex-end",
    },
    backdropDismiss: {
        flex: 1,
    },
    drawerCard: {
        backgroundColor: "#1e293b",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: "#334155",
        paddingTop: 10,
        paddingHorizontal: 20,
        height: "85%",
    },
    dragBar: {
        width: 40,
        height: 4,
        backgroundColor: "#475569",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 14,
    },

    drawerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    headerTitleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "800",
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#334155",
    },
    actionBtnActive: {
        backgroundColor: "#ef444415",
        borderColor: "#ef444430",
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#334155",
    },

    // RTL Helper styles
    rtlRow: {
        flexDirection: "row-reverse",
    },
    rtlText: {
        textAlign: "right",
    },
    rtlAlignSelf: {
        alignSelf: "flex-start",
    },
    rtlAlignSelfLeft: {
        alignSelf: "flex-end",
    },

    // Languages
    langBar: {
        flexDirection: "row",
        backgroundColor: "#0f172a",
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#334155",
    },
    langTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 8,
    },
    langTabActive: {
        backgroundColor: "#22c55e",
    },
    langText: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "700",
    },
    langTextActive: {
        color: "#fff",
    },

    // Sub Control Bar
    controlSubBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    detailedToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#334155",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        flex: 1,
        justifyContent: "center",
    },
    detailedToggleActive: {
        borderColor: "#22c55e",
        backgroundColor: "#22c55e10",
    },
    detailedToggleText: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "700",
    },
    detailedToggleTextActive: {
        color: "#22c55e",
    },

    // Soundwave Circle Panel
    soundwavePanel: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 10,
        gap: 12,
    },
    micCircleContainer: {
        width: 110,
        height: 110,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    pulseRing: {
        position: "absolute",
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: "#22c55e",
        backgroundColor: "#22c55e10",
    },
    micBigCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#22c55e",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 10,
    },
    micBigCircleActive: {
        backgroundColor: "#ef4444",
        shadowColor: "#ef4444",
    },
    assistantStatusText: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
        paddingHorizontal: 10,
    },

    // Suggestions quick reports
    suggestionSection: {
        marginBottom: 12,
    },
    suggestionTitle: {
        color: "#64748b",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    suggestionScroll: {
        gap: 8,
        paddingRight: 10,
    },
    suggestionPill: {
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#334155",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        marginRight: 8,
    },
    suggestionText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "600",
    },

    // Scrollable responses
    responseContainer: {
        flex: 1,
        backgroundColor: "#0f172a50",
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(51, 65, 85, 0.3)",
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: "#22c55e15",
        borderWidth: 1,
        borderColor: "#22c55e30",
        padding: 12,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        marginBottom: 12,
        maxWidth: "85%",
    },
    userQueryText: {
        color: "#22c55e",
        fontSize: 13,
        fontWeight: "600",
    },
    aiBubble: {
        alignSelf: "flex-start",
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        padding: 14,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        marginBottom: 12,
        maxWidth: "90%",
    },
    aiText: {
        color: "#f8fafc",
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "500",
    },
    aiMessageActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#33415550",
        paddingTop: 8,
    },
    aiActionMiniBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#0f172a50",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    aiActionMiniText: {
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: "600",
    },

    stopSpeakRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        backgroundColor: "#ef444410",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#ef444420",
    },
    stopSpeakText: {
        color: "#ef4444",
        fontSize: 11,
        fontWeight: "700",
    },

    // Keyboard Fallback Input Form
    inputForm: {
        flexDirection: "row",
        gap: 10,
        paddingBottom: Platform.OS === "ios" ? 30 : 16,
        alignItems: "center",
    },
    textInput: {
        flex: 1,
        backgroundColor: "#0f172a",
        borderRadius: 14,
        height: 48,
        color: "#f8fafc",
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#334155",
        fontSize: 13.5,
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#22c55e",
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtnDisabled: {
        backgroundColor: "#334155",
    },
});
