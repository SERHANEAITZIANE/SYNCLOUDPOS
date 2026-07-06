"use client";

import { useState, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

export type HubLayoutMode = "grid" | "list" | "compact";
export type HubCardSize = "sm" | "md" | "lg";

export interface RecentlyVisited {
    href: string;
    label: string;
    color: string;
    icon: string; // icon name as string for serialization
    timestamp: number;
}

export interface HubSettings {
    // Phase 1
    quickAccessOrder: string[]; // hrefs in order
    favorites: string[]; // hrefs
    // Phase 2
    tabOrder: string[]; // tab ids in order
    hiddenTabs: string[]; // tab ids
    customTabLinks: Record<string, string[]>; // tabId -> hrefs in order
    // Phase 3
    layoutMode: HubLayoutMode;
    cardSize: HubCardSize;
    // Phase 4
    recentlyVisited: RecentlyVisited[];
    // Phase 5
    showWelcomeBanner: boolean;
}

const STORAGE_KEY = "syncloud-hub-settings";
const MAX_RECENT = 5;

const DEFAULT_SETTINGS: HubSettings = {
    quickAccessOrder: [],
    favorites: [],
    tabOrder: [],
    hiddenTabs: [],
    customTabLinks: {},
    layoutMode: "grid",
    cardSize: "md",
    recentlyVisited: [],
    showWelcomeBanner: true,
};

/* ═══════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════ */

export function useHubSettings() {
    const [settings, setSettings] = useState<HubSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<HubSettings>;
                setSettings((prev) => ({ ...prev, ...parsed }));
            }
        } catch {
            // ignore parse errors
        }
        setIsLoaded(true);
    }, []);

    // Persist to localStorage on every change (after initial load)
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // quota exceeded, ignore
        }
    }, [settings, isLoaded]);

    /* ═══════ QUICK ACCESS ═══════ */

    const setQuickAccessOrder = useCallback((order: string[]) => {
        setSettings((s) => ({ ...s, quickAccessOrder: order }));
    }, []);

    const addQuickAccess = useCallback((href: string) => {
        setSettings((s) => {
            if (s.quickAccessOrder.includes(href)) return s;
            return { ...s, quickAccessOrder: [...s.quickAccessOrder, href] };
        });
    }, []);

    const removeQuickAccess = useCallback((href: string) => {
        setSettings((s) => ({
            ...s,
            quickAccessOrder: s.quickAccessOrder.filter((h) => h !== href),
        }));
    }, []);

    /* ═══════ FAVORITES ═══════ */

    const toggleFavorite = useCallback((href: string) => {
        setSettings((s) => {
            const isFav = s.favorites.includes(href);
            return {
                ...s,
                favorites: isFav
                    ? s.favorites.filter((h) => h !== href)
                    : [...s.favorites, href],
            };
        });
    }, []);

    const isFavorite = useCallback(
        (href: string) => settings.favorites.includes(href),
        [settings.favorites]
    );

    /* ═══════ TABS ═══════ */

    const setTabOrder = useCallback((order: string[]) => {
        setSettings((s) => ({ ...s, tabOrder: order }));
    }, []);

    const toggleTabVisibility = useCallback((tabId: string) => {
        setSettings((s) => {
            const isHidden = s.hiddenTabs.includes(tabId);
            return {
                ...s,
                hiddenTabs: isHidden
                    ? s.hiddenTabs.filter((id) => id !== tabId)
                    : [...s.hiddenTabs, tabId],
            };
        });
    }, []);

    const isTabHidden = useCallback(
        (tabId: string) => settings.hiddenTabs.includes(tabId),
        [settings.hiddenTabs]
    );

    const setTabLinks = useCallback((tabId: string, hrefs: string[]) => {
        setSettings((s) => ({
            ...s,
            customTabLinks: {
                ...s.customTabLinks,
                [tabId]: hrefs,
            },
        }));
    }, []);

    const addLinkToTab = useCallback((tabId: string, href: string) => {
        setSettings((s) => {
            const current = s.customTabLinks[tabId] || [];
            if (current.includes(href)) return s;
            return {
                ...s,
                customTabLinks: {
                    ...s.customTabLinks,
                    [tabId]: [...current, href],
                },
            };
        });
    }, []);

    const removeLinkFromTab = useCallback((tabId: string, href: string) => {
        setSettings((s) => {
            const current = s.customTabLinks[tabId] || [];
            return {
                ...s,
                customTabLinks: {
                    ...s.customTabLinks,
                    [tabId]: current.filter((h) => h !== href),
                },
            };
        });
    }, []);

    /* ═══════ LAYOUT ═══════ */

    const setLayoutMode = useCallback((mode: HubLayoutMode) => {
        setSettings((s) => ({ ...s, layoutMode: mode }));
    }, []);

    const setCardSize = useCallback((size: HubCardSize) => {
        setSettings((s) => ({ ...s, cardSize: size }));
    }, []);

    /* ═══════ RECENTLY VISITED ═══════ */

    const addRecentlyVisited = useCallback(
        (item: Omit<RecentlyVisited, "timestamp">) => {
            setSettings((s) => {
                const filtered = s.recentlyVisited.filter(
                    (r) => r.href !== item.href
                );
                const newRecent: RecentlyVisited = {
                    ...item,
                    timestamp: Date.now(),
                };
                return {
                    ...s,
                    recentlyVisited: [newRecent, ...filtered].slice(0, MAX_RECENT),
                };
            });
        },
        []
    );

    /* ═══════ WELCOME BANNER ═══════ */

    const toggleWelcomeBanner = useCallback(() => {
        setSettings((s) => ({
            ...s,
            showWelcomeBanner: !s.showWelcomeBanner,
        }));
    }, []);

    /* ═══════ RESET ═══════ */

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

    return {
        settings,
        isLoaded,
        // Quick Access
        setQuickAccessOrder,
        addQuickAccess,
        removeQuickAccess,
        // Favorites
        toggleFavorite,
        isFavorite,
        // Tabs
        setTabOrder,
        toggleTabVisibility,
        isTabHidden,
        setTabLinks,
        addLinkToTab,
        removeLinkFromTab,
        // Layout
        setLayoutMode,
        setCardSize,
        // Recently Visited
        addRecentlyVisited,
        // Welcome Banner
        toggleWelcomeBanner,
        // Reset
        resetSettings,
    };
}
