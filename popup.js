document.addEventListener('DOMContentLoaded', () => {
    const tabList = document.getElementById('tab-list');
    const suspendSelectedBtn = document.getElementById('suspend-selected');
    const suspendAllBtn = document.getElementById('suspend-all');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const topGradient = document.querySelector('.top-gradient');
    const bottomGradient = document.querySelector('.bottom-gradient');

    let currentTabs = [];
    let selectedIndex = -1;
    let visibleItems = []; // To track currently rendered items for keyboard nav

    // Initialize
    const themeToggleBtn = document.getElementById('theme-toggle');
    const selectionToggleBtn = document.getElementById('selection-toggle');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsBtn = document.getElementById('close-settings');

    // Settings Elements
    const modeMaxTabs = document.getElementById('mode-max-tabs');
    const maxTabsCount = document.getElementById('max-tabs-count');
    const modeAutoTimer = document.getElementById('mode-auto-timer');
    const autoSuspendTimer = document.getElementById('auto-suspend-timer');
    const modeManual = document.getElementById('mode-manual');
    const ignoreAudible = document.getElementById('ignore-audible');
    const useWhitelist = document.getElementById('use-whitelist');
    const whitelistDomains = document.getElementById('whitelist-domains');

    // Default Settings
    const defaultSettings = {
        suspendMode: 'manual', // 'max-tabs', 'auto-timer', 'manual'
        maxTabs: 25,
        autoSuspendMinutes: 30,
        ignoreAudible: true,
        useWhitelist: false,
        whitelist: ''
    };

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
    }

    // Settings Logic
    settingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.remove('hidden');
        loadSettings();
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsOverlay.classList.add('hidden');
    });

    // Save settings on any change
    [modeMaxTabs, modeAutoTimer, modeManual, ignoreAudible, useWhitelist].forEach(el => {
        el.addEventListener('change', saveSettings);
    });

    [maxTabsCount, autoSuspendTimer, whitelistDomains].forEach(el => {
        el.addEventListener('input', saveSettings);
    });

    function loadSettings() {
        chrome.storage.local.get(['settings'], (result) => {
            const settings = { ...defaultSettings, ...result.settings };

            // Set values
            if (settings.suspendMode === 'max-tabs') modeMaxTabs.checked = true;
            else if (settings.suspendMode === 'auto-timer') modeAutoTimer.checked = true;
            else modeManual.checked = true;

            maxTabsCount.value = settings.maxTabs;
            autoSuspendTimer.value = settings.autoSuspendMinutes;
            ignoreAudible.checked = settings.ignoreAudible;
            useWhitelist.checked = settings.useWhitelist;
            whitelistDomains.value = settings.whitelist;
        });
    }

    function saveSettings() {
        let mode = 'manual';
        if (modeMaxTabs.checked) mode = 'max-tabs';
        if (modeAutoTimer.checked) mode = 'auto-timer';

        const settings = {
            suspendMode: mode,
            maxTabs: parseInt(maxTabsCount.value) || 25,
            autoSuspendMinutes: parseInt(autoSuspendTimer.value) || 30,
            ignoreAudible: ignoreAudible.checked,
            useWhitelist: useWhitelist.checked,
            whitelist: whitelistDomains.value
        };

        chrome.storage.local.set({ settings }, () => {
            // Notify background script if needed (optional, as background can listen to storage changes)
        });
    }

    // Initialize Settings on load (to ensure background has defaults if never set)
    chrome.storage.local.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.local.set({ settings: defaultSettings });
        }
    });

    function updateThemeIcon(theme) {
        if (theme === 'light') {
            // Show Moon icon (to switch to dark)
            themeToggleBtn.innerHTML = '<svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>';
            themeToggleBtn.title = "Switch to Dark Mode";
        } else {
            // Show Sun icon (to switch to light)
            themeToggleBtn.innerHTML = '<svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>';
            themeToggleBtn.title = "Switch to Light Mode";
        }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    fetchTabs();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchTabs);

    selectionToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('selection-mode');
        // Optional: Toggle button active state style if needed
        if (document.body.classList.contains('selection-mode')) {
            selectionToggleBtn.style.color = 'var(--primary-color)';
            selectionToggleBtn.style.backgroundColor = 'var(--icon-hover-bg)';
        } else {
            selectionToggleBtn.style.color = '';
            selectionToggleBtn.style.backgroundColor = '';
        }
    });

    searchInput.addEventListener('input', () => {
        renderTabs(filterTabs(currentTabs));
    });

    sortSelect.addEventListener('change', () => {
        renderTabs(filterTabs(currentTabs));
    });

    suspendSelectedBtn.addEventListener('click', () => {
        const selectedTabIds = getSelectedTabIds();
        suspendTabs(selectedTabIds);
    });

    suspendAllBtn.addEventListener('click', () => {
        const allSuspendableIds = currentTabs
            .filter(t => !t.active && !t.discarded)
            .map(t => t.id);

        if (confirm(`¿Estás seguro de que deseas suspender la actividad de ${allSuspendableIds.length} pestañas?\n\nNo te preocupes, no se cerrarán. Podrás reactivarlas simplemente haciendo clic en ellas cuando las necesites.`)) {
            suspendTabs(allSuspendableIds);
        }
    });

    // Scroll Gradients
    tabList.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = tabList;

        // Top gradient opacity
        const topOpacity = Math.min(scrollTop / 50, 1);
        topGradient.style.opacity = topOpacity;

        // Bottom gradient opacity
        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        const bottomOpacity = scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1);
        bottomGradient.style.opacity = bottomOpacity;
    });

    // Real-time Tab Updates
    chrome.tabs.onCreated.addListener(fetchTabs);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Update on any change (status, title, url, etc.)
        fetchTabs();
    });
    chrome.tabs.onRemoved.addListener(fetchTabs);
    chrome.tabs.onActivated.addListener(fetchTabs);
    chrome.tabs.onAttached.addListener(fetchTabs);
    chrome.tabs.onDetached.addListener(fetchTabs);

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (visibleItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, visibleItems.length - 1);
            updateSelection();
            scrollToSelected();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection();
            scrollToSelected();
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < visibleItems.length) {
                e.preventDefault();
                const selectedItem = visibleItems[selectedIndex];
                // Trigger the click action of the tab info
                const info = selectedItem.element.querySelector('.tab-info');
                if (info) info.click();
            }
        }
    });

    function updateSelection() {
        visibleItems.forEach((item, index) => {
            if (index === selectedIndex) {
                item.element.classList.add('selected');
            } else {
                item.element.classList.remove('selected');
            }
        });
    }

    function scrollToSelected() {
        if (selectedIndex < 0 || selectedIndex >= visibleItems.length) return;

        const element = visibleItems[selectedIndex].element;
        const container = tabList;

        const extraMargin = 50;
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const itemTop = element.offsetTop;
        const itemBottom = itemTop + element.offsetHeight;

        if (itemTop < containerScrollTop + extraMargin) {
            container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
        } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
            container.scrollTo({
                top: itemBottom - containerHeight + extraMargin,
                behavior: 'smooth'
            });
        }
    }

    async function fetchTabs() {
        // tabList.innerHTML = '<div class="loading">Loading tabs...</div>'; // Removed to prevent flashing
        try {
            const currentWindow = await chrome.windows.getCurrent();
            const allTabs = await chrome.tabs.query({});

            if (currentWindow.incognito) {
                // In Incognito mode, ONLY show incognito tabs
                currentTabs = allTabs.filter(tab => tab.incognito);
            } else {
                // In Normal mode, show all tabs (or filter out incognito if desired, but keeping all for now)
                currentTabs = allTabs;
            }

            renderTabs(filterTabs(currentTabs));
        } catch (error) {
            tabList.innerHTML = `<div class="error">Error loading tabs: ${error.message}</div>`;
        }
    }

    function sortTabs(tabs) {
        const sortValue = sortSelect.value;
        return [...tabs].sort((a, b) => {
            switch (sortValue) {
                case 'active':
                    if (a.active && !b.active) return -1;
                    if (!a.active && b.active) return 1;
                    if (!a.discarded && b.discarded) return -1;
                    if (a.discarded && !b.discarded) return 1;
                    if (a.windowId !== b.windowId) return a.windowId - b.windowId;
                    return a.index - b.index;
                case 'recent':
                    return (b.lastAccessed || 0) - (a.lastAccessed || 0);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'url':
                    return a.url.localeCompare(b.url);
                default:
                    return 0;
            }
        });
    }

    function filterTabs(tabs) {
        const query = searchInput.value.toLowerCase().trim();
        let filtered = tabs;
        if (query) {
            filtered = tabs.filter(tab =>
                (tab.title && tab.title.toLowerCase().includes(query)) ||
                (tab.url && tab.url.toLowerCase().includes(query))
            );
        }
        return sortTabs(filtered);
    }

    function renderTabs(tabs) {
        if (tabs.length === 0) {
            tabList.innerHTML = '<div class="empty">No tabs found.</div>';
            return;
        }

        // Remove empty/loading/error states if we have tabs
        const nonTabElements = tabList.querySelectorAll('.loading, .empty, .error');
        nonTabElements.forEach(el => el.remove());

        // Always render flat list
        reconcileTabsInContainer(tabList, tabs);

        updateSummary(tabs);
    }

    function reconcileTabsInContainer(container, tabs) {
        const existingTabs = new Map();
        Array.from(container.children).forEach(child => {
            if (child.classList.contains('item') && child.dataset.tabId) {
                existingTabs.set(parseInt(child.dataset.tabId), child);
            }
        });

        // Determine start index
        let insertIndex = 0;

        tabs.forEach((tab) => {
            let tabEl = existingTabs.get(tab.id);

            if (tabEl) {
                updateTabElement(tabEl, tab);
                existingTabs.delete(tab.id);
            } else {
                tabEl = createTabElement(tab);
            }

            const currentEl = container.children[insertIndex];
            if (currentEl !== tabEl) {
                if (currentEl) {
                    container.insertBefore(tabEl, currentEl);
                } else {
                    container.appendChild(tabEl);
                }
            }

            insertIndex++;
        });

        // Remove remaining tabs
        existingTabs.forEach(el => el.remove());
    }

    function createTabElement(tab) {
        const div = document.createElement('div');
        // Use 'item' class for the animated list style
        div.className = `item ${tab.discarded ? 'suspended' : ''} ${tab.active ? 'selected' : ''}`;
        div.dataset.tabId = tab.id;

        // Hover effect for selection tracking
        div.addEventListener('mouseenter', () => {
            // Find index in visibleItems (re-calc visible items on hover might be expensive, 
            // but for now we just rely on CSS hover. Keyboard nav needs visibleItems updated)
        });

        // Custom Radix-style Checkbox Wrapper
        const checkboxWrapper = document.createElement('label');
        checkboxWrapper.className = 'custom-checkbox-wrapper';
        checkboxWrapper.onclick = (e) => e.stopPropagation(); // Prevent row click

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tab-checkbox';
        checkbox.value = tab.id;
        checkbox.disabled = tab.discarded;
        if (tab.active) checkbox.disabled = true;

        const checkboxVisual = document.createElement('div');
        checkboxVisual.className = 'checkbox-visual';
        checkboxVisual.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(checkboxVisual);

        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon';
        favicon.src = tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTkgOCA4IDggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIvPjwvc3ZnPg==';
        favicon.onerror = () => { favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJDNi40OCAyIDIgNi404IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnpNMTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIvPjwvc3ZnPg=='; };

        const info = document.createElement('div');
        info.className = 'tab-info';

        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title;
        title.title = tab.title;

        const metaContainer = document.createElement('div');
        metaContainer.className = 'tab-meta'; // Add class for easy selection
        metaContainer.style.display = 'flex';
        metaContainer.style.alignItems = 'center';

        const url = document.createElement('div');
        url.className = 'tab-url';
        url.textContent = tab.url;

        metaContainer.appendChild(url);

        if (tab.incognito) {
            const badge = document.createElement('span');
            badge.className = 'incognito-badge';
            badge.textContent = 'Incognito';
            metaContainer.appendChild(badge);
        }

        info.appendChild(title);
        info.appendChild(metaContainer);

        // Click to switch to tab
        div.onclick = async () => {
            try {
                await chrome.tabs.update(tab.id, { active: true });
                await chrome.windows.update(tab.windowId, { focused: true });
            } catch (err) {
                console.error("Failed to switch to tab:", err);
            }
        };
        info.title = "Click to switch to this tab";

        const actions = document.createElement('div');
        actions.className = 'tab-actions';

        // Helper to render actions
        renderTabActions(actions, tab);

        div.appendChild(checkboxWrapper);
        div.appendChild(favicon);
        div.appendChild(info);
        div.appendChild(actions);

        return div;
    }

    function updateTabElement(div, tab) {
        // Update classes
        if (tab.discarded) div.classList.add('suspended');
        else div.classList.remove('suspended');

        if (tab.active) div.classList.add('selected');
        else div.classList.remove('selected');

        // Update Checkbox
        const checkbox = div.querySelector('.tab-checkbox');
        if (checkbox) {
            checkbox.disabled = tab.discarded || tab.active;
        }

        // Update Favicon
        const favicon = div.querySelector('.tab-favicon');
        if (favicon && tab.favIconUrl && favicon.src !== tab.favIconUrl) {
            favicon.src = tab.favIconUrl;
        }

        // Update Title
        const title = div.querySelector('.tab-title');
        if (title && title.textContent !== tab.title) {
            title.textContent = tab.title;
            title.title = tab.title;
        }

        // Update URL
        const url = div.querySelector('.tab-url');
        if (url && url.textContent !== tab.url) {
            url.textContent = tab.url;
        }

        // Update Actions (Suspend/Close buttons might change state)
        const actions = div.querySelector('.tab-actions');
        if (actions) {
            actions.innerHTML = ''; // Clear and re-render actions
            renderTabActions(actions, tab);
        }
    }

    function renderTabActions(container, tab) {
        if (!tab.discarded && !tab.active) {
            const suspendBtn = document.createElement('button');
            suspendBtn.className = 'btn-icon suspend-btn';
            suspendBtn.title = 'Suspend this tab';
            suspendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            suspendBtn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await chrome.tabs.discard(tab.id);
                    // fetchTabs will be triggered by onUpdated listener
                } catch (err) {
                    console.error("Failed to suspend tab:", err);
                }
            };
            container.appendChild(suspendBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-icon close-btn';
        closeBtn.title = 'Close this tab';
        closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await chrome.tabs.remove(tab.id);
                // fetchTabs will be triggered by onRemoved listener
            } catch (err) {
                console.error("Failed to close tab:", err);
            }
        };
        container.appendChild(closeBtn);
    }

    function getSelectedTabIds() {
        const checkboxes = document.querySelectorAll('.tab-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    async function suspendTabs(tabIds) {
        if (tabIds.length === 0) return;

        suspendSelectedBtn.textContent = 'Suspending...';
        suspendSelectedBtn.disabled = true;

        for (const id of tabIds) {
            try {
                await chrome.tabs.discard(id);
            } catch (e) {
                console.error(`Failed to discard tab ${id}:`, e);
            }
        }

        await fetchTabs();

        suspendSelectedBtn.textContent = 'Suspend Selected';
        suspendSelectedBtn.disabled = false;
    }

    function updateSummary(tabs) {
        // Optional summary update
    }
});
