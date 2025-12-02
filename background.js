// Default Settings
const defaultSettings = {
    suspendMode: 'manual',
    maxTabs: 25,
    autoSuspendMinutes: 30,
    ignoreAudible: true,
    useWhitelist: false,
    whitelist: ''
};

let settings = { ...defaultSettings };

// Load settings on startup
chrome.storage.local.get(['settings'], (result) => {
    if (result.settings) {
        settings = { ...defaultSettings, ...result.settings };
    }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
        settings = { ...defaultSettings, ...changes.settings.newValue };
        runAutoSuspendChecks(); // Re-run checks immediately on setting change
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    chrome.contextMenus.create({
        id: "suspend-tab",
        title: "Suspend this tab",
        contexts: ["all"]
    });

    // Create alarm for auto-suspend checks
    chrome.alarms.create('checkAutoSuspend', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkAutoSuspend') {
        runAutoSuspendChecks();
    }
});

// Check Max Tabs on new tab creation
chrome.tabs.onCreated.addListener(() => {
    if (settings.suspendMode === 'max-tabs') {
        checkMaxTabsLimit();
    }
});

async function runAutoSuspendChecks() {
    if (settings.suspendMode === 'manual') return;

    if (settings.suspendMode === 'max-tabs') {
        await checkMaxTabsLimit();
    } else if (settings.suspendMode === 'auto-timer') {
        await checkAutoSuspendTimer();
    }
}

async function checkMaxTabsLimit() {
    const tabs = await chrome.tabs.query({ active: false, discarded: false, autoDiscardable: true });
    // We only care about active (non-discarded) tabs to suspend. 
    // Actually, we need to count ALL tabs to see if we are over limit, 
    // but only suspend non-active, non-discarded ones.

    const allTabs = await chrome.tabs.query({});
    if (allTabs.length <= settings.maxTabs) return;

    // We need to suspend (allTabs.length - settings.maxTabs) tabs.
    // Sort candidates by lastAccessed (oldest first)
    const candidates = tabs.filter(tab => !isExcluded(tab));
    candidates.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

    const countToSuspend = allTabs.length - settings.maxTabs;

    for (let i = 0; i < countToSuspend && i < candidates.length; i++) {
        try {
            await chrome.tabs.discard(candidates[i].id);
        } catch (e) {
            console.error(`Failed to auto-discard tab ${candidates[i].id}:`, e);
        }
    }
}

async function checkAutoSuspendTimer() {
    const tabs = await chrome.tabs.query({ active: false, discarded: false, autoDiscardable: true });
    const now = Date.now();
    const limitMs = settings.autoSuspendMinutes * 60 * 1000;

    for (const tab of tabs) {
        if (isExcluded(tab)) continue;

        if (now - (tab.lastAccessed || 0) > limitMs) {
            try {
                await chrome.tabs.discard(tab.id);
            } catch (e) {
                console.error(`Failed to timer-discard tab ${tab.id}:`, e);
            }
        }
    }
}

function isExcluded(tab) {
    if (tab.active) return true; // Never suspend active tab
    if (settings.ignoreAudible && tab.audible) return true;

    if (settings.useWhitelist && settings.whitelist) {
        const domains = settings.whitelist.split('\n').map(d => d.trim()).filter(d => d);
        try {
            const url = new URL(tab.url);
            if (domains.some(d => url.hostname.includes(d))) return true;
        } catch (e) { }
    }

    return false;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "suspend-tab") {
        if (tab && !tab.active && !tab.discarded) {
            chrome.tabs.discard(tab.id);
        } else if (tab && tab.active) {
            chrome.tabs.discard(tab.id).catch(err => console.error("Failed to discard active tab:", err));
        }
    }
});
