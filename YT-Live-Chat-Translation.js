// ==UserScript==
// @name         Translate YouTube Live Chat + Title (Auto Lang)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Translate YouTube live chat, banner, and video title (toggleable)
// @icon         https://raw.githubusercontent.com/nnnnnoooooeeeee/Youtube-LIve-Chat-Translation-Userscript/refs/heads/main/yt-icon.png
// @author       Nnnnnoooooeeeee
// @match        https://www.youtube.com/*
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// @downloadURL  https://raw.githubusercontent.com/nnnnnoooooeeeee/Youtube-LIve-Chat-Translation-Userscript/refs/heads/main/YT-Live-Chat-Translation.js
// @updateURL    https://raw.githubusercontent.com/nnnnnoooooeeeee/Youtube-LIve-Chat-Translation-Userscript/refs/heads/main/YT-Live-Chat-Translation.js
// ==/UserScript==

/* https://github.com/nnnnnoooooeeeee */

(function () {
    'use strict';

    /* ================= TOGGLE STATE ================= */

    const STATE_KEY = 'yt_translate_toggle';

    const state = Object.assign(
        {
            chat: true,
            banner: true,
            title: true
        },
        JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
    );

    function saveState() {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    function registerMenu() {
        GM_registerMenuCommand(
            `${state.chat ? '✅' : '❌'} Live Chat Translate`,
            () => {
                state.chat = !state.chat;
                saveState();
                location.reload();
            }
        );

        GM_registerMenuCommand(
            `${state.paid ? '✅' : '❌'} Paid Chat Translate`,
            () => {
                state.paid = !state.paid;
                saveState();
                location.reload();
            }
        );

        GM_registerMenuCommand(
            `${state.banner ? '✅' : '❌'} Banner / Pinned Translate`,
            () => {
                state.banner = !state.banner;
                saveState();
                location.reload();
            }
        );

        GM_registerMenuCommand(
            `${state.title ? '✅' : '❌'} Video Title Translate`,
            () => {
                state.title = !state.title;
                saveState();
                location.reload();
            }
        );
    }

    registerMenu();

    /* ================= LANGUAGE ================= */

    function getYouTubeLanguage() {
        try {
            const hl =
                  window.top?.ytcfg?.get('HL') ||
                  window.top?.document?.documentElement?.lang ||
                  navigator.language ||
                  'en';

            // normalize: en-US -> en
            return hl.toLowerCase().split('-')[0];
        } catch (e) {
            return 'en';
        }
    }

    /* ================= TRANSLATE ================= */

    async function translate(text) {
        const url =
            'https://translate.googleapis.com/translate_a/single' +
            '?client=gtx' +
            '&sl=auto' +
            '&tl=' + getYouTubeLanguage() +
            '&dt=t' +
            '&q=' + encodeURIComponent(text);

        const res = await fetch(url);
        const data = await res.json();

        return data[0].map(i => i[0]).join('');
    }

    /* ================= CHAT ================= */

    async function processChat(node) {
        if (!state.chat && !state.banner) return;

        const message = node.querySelector?.(
            'span#message.yt-live-chat-text-message-renderer'
        );
        if (!message || message.dataset.modified) return;

        const original = message.textContent.trim();
        if (!original) return;

        message.dataset.modified = '1';

        try {
            const translated = await translate(original);
            if (!translated || translated === original) return;

            const div = document.createElement('div');
            div.className = 'translated-chat';
            div.textContent = translated;
            div.style.color = '#aaa';

            message.parentElement.appendChild(div);
        } catch (e) {
            console.error('[YT] Chat translate failed', e);
        }
    }

    /* ================= CHAT OBSERVER ================= */

    let chatObserver = null;

    function observeChat() {
        if (!state.chat) return;

        const container = document.querySelector(
            'yt-live-chat-item-list-renderer #items'
        );
        if (!container) return;

        chatObserver?.disconnect();

        container
            .querySelectorAll('yt-live-chat-text-message-renderer')
            .forEach(processChat);

        chatObserver = new MutationObserver(m =>
            m.forEach(x => x.addedNodes.forEach(processChat))
        );

        chatObserver.observe(container, { childList: true, subtree: true });
        console.log('[YT] Chat translator ON');
    }

    /* ================= SUPER CHAT ================= */
    async function processPaidChat(node) {
        if (!state.paid) return;

        const message = node.querySelector?.(
            '#content #message.style-scope.yt-live-chat-paid-message-renderer'
        );
        if (!message) return;

        const original = message.textContent.trim();
        if (!original || message.dataset.last === original) return;
        message.dataset.last = original;

        const old = message.parentElement.querySelector('.translated-paid-chat');
        if (old) old.remove();

        try {
            const translated = await translate(original);
            if (!translated || translated === original) return;

            const div = document.createElement('div');
            div.className = 'translated-paid-chat';
            div.textContent = translated;
            div.style.color = '#aaa';
            div.style.fontSize = '12px';
            div.style.marginTop = '4px';

            message.parentElement.appendChild(div);
        } catch (e) {
            console.error('[YT] Paid chat translate failed', e);
        }
    }

    let paidChatObserver = null;

    /* ================= SUPER CHAT OBSERVER ================= */

    function observePaidChat() {
        if (!state.chat && !state.banner) return;

        const container = document.querySelector(
            'yt-live-chat-item-list-renderer #items'
        );
        if (!container) return;

        if (paidChatObserver) return;

        container
            .querySelectorAll('yt-live-chat-paid-message-renderer')
            .forEach(processPaidChat);

        paidChatObserver = new MutationObserver(mutations =>
                                                mutations.forEach(m =>
                                                                  m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches?.('yt-live-chat-paid-message-renderer')) {
                processPaidChat(node);
            }
        })
        ));

        paidChatObserver.observe(container, {
            childList: true,
            subtree: true
        });

        console.log('[YT] Paid chat translator ON');
    }

    /* ================= BANNER ================= */

    let bannerObserver = null;

    function observeBanner() {
        if (!state.banner) return;

        const banner = document.querySelector('yt-live-chat-banner-manager');
        if (!banner) return;

        bannerObserver?.disconnect();

        banner
            .querySelectorAll('yt-live-chat-text-message-renderer')
            .forEach(processChat);

        bannerObserver = new MutationObserver(m =>
            m.forEach(x =>
                x.addedNodes.forEach(n =>
                    n
                        .querySelectorAll?.('yt-live-chat-text-message-renderer')
                        .forEach(processChat)
                )
            )
        );

        bannerObserver.observe(banner, { childList: true, subtree: true });
        console.log('[YT] Banner translator ON');
    }

    /* ================= TITLE ================= */

    let titleObserver = null;
    let lastTitle = '';

    async function processTitle() {
        const titleEl = document.querySelector(
            'h1.ytd-watch-metadata yt-formatted-string'
        );
        if (!titleEl) return;

        const titleText = titleEl.textContent.trim();
        if (!titleText || titleText === lastTitle) return;
        lastTitle = titleText;

        const old = titleEl.parentElement.querySelector('.translated-title');
        if (old) old.remove();

        try {
            const translated = await translate(titleText);
            if (!translated || translated === titleText) return;

            const div = document.createElement('div');
            div.className = 'translated-title';
            div.textContent = translated;
            div.style.color = '#aaa';

            titleEl.parentElement.appendChild(div);
        } catch (e) {
            console.error('[YT] Title translate failed', e);
        }
    }

    function observeTitle() {
        if (!state.title) return;

        const meta = document.querySelector('ytd-watch-metadata');
        if (!meta) return;

        if (titleObserver) return;

        processTitle(); // run awal

        titleObserver = new MutationObserver(() => {
            processTitle();
        });

        titleObserver.observe(meta, {
            childList: true,
            subtree: true,
            characterData: true,
            paid: true
        });

        console.log('[YT] Title translator ON');
    }

    /* ================= ROOT ================= */

    const rootObserver = new MutationObserver(() => {
        observeChat();
        observeBanner();
        observeTitle();
        observePaidChat();
    });

    rootObserver.observe(document.body, { childList: true, subtree: true });

})();
