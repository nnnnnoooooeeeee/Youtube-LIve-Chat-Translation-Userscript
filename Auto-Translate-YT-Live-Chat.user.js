// ==UserScript==
// @name         Auto Translate Youtube Live Chat
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Translate YouTube live chat, banner, and video title
// @icon         https://raw.githubusercontent.com/nnnnnoooooeeeee/Auto-Translate-Youtube-Live-Chat-Userscript/refs/heads/main/yt-icon.png
// @author       Nnnnnoooooeeeee
// @match        https://www.youtube.com/*
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// @downloadURL https://github.com/nnnnnoooooeeeee/Auto-Translate-Youtube-Live-Chat-Userscript/raw/refs/heads/main/Auto-Translate-YT-Live-Chat.user.js
// @updateURL https://github.com/nnnnnoooooeeeee/Auto-Translate-Youtube-Live-Chat-Userscript/raw/refs/heads/main/Auto-Translate-YT-Live-Chat.user.js
// ==/UserScript==

/* https://github.com/nnnnnoooooeeeee */

(function () {
'use strict';

const KEY='yt_translate_toggle';
const state={chat:1,paid:1,banner:1,title:1,...JSON.parse(localStorage.getItem(KEY)||'{}')};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const menu=(k,label)=>GM_registerMenuCommand(`${state[k]?'✅':'❌'} ${label}`,()=>{state[k]^=1;save();location.reload();});
['chat','paid','banner','title'].forEach(k=>{
    const labels={chat:'Live Chat',paid:'Paid Chat',banner:'Banner / Pinned',title:'Video Title'};
    menu(k,labels[k]);
});

const lang=()=>{try{return (window.top?.ytcfg?.get('HL')||document.documentElement.lang||navigator.language||'en').toLowerCase().split('-')[0]}catch{return'en'}};

const translate=async t=>{
    const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang()}&dt=t&q=${encodeURIComponent(t)}`);
    return (await r.json())[0].map(x=>x[0]).join('');
};

const addTranslated=async(el,txt,cls,style,mode='append')=>{
    if(!txt||el.dataset.tdone===txt) return;
    el.dataset.tdone=txt;

    const tr=await translate(txt);
    if(!tr||tr===txt) return;

    el.parentElement.querySelector('.'+cls)?.remove();

    const d=document.createElement('div');
    d.className=cls;
    d.textContent=tr;
    Object.assign(d.style,style);

    if(mode==='after') el.insertAdjacentElement('afterend',d);
    else el.parentElement.appendChild(d);
};

function processChat(n){
    const m=n.querySelector?.('span#message.yt-live-chat-text-message-renderer');
    if(!m||m.dataset.modified) return;
    m.dataset.modified=1;
    addTranslated(m,m.textContent.trim(),'translated-chat',{borderTop:'1px solid'});
}

function processPaid(n){
    const m=n.querySelector?.('#content #message.style-scope.yt-live-chat-paid-message-renderer');
    if(!m) return;
    addTranslated(m,m.textContent.trim(),'translated-paid-chat',{borderTop:'1px solid',marginTop:'4px'},'after');
}

async function processTitle(){
    const t=document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    if(!t) return;
    addTranslated(t,t.textContent.trim(),'translated-title',{borderLeft:'1px solid',paddingLeft:'10px'});
}

const observe=(sel,cb,cond=1)=>{
    if(!cond) return;
    const c=document.querySelector(sel);
    if(!c) return;
    c.querySelectorAll('*').forEach(n=>cb(n));
    new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(cb)))
        .observe(c,{childList:true,subtree:true});
};

new MutationObserver(()=>{
    observe('yt-live-chat-item-list-renderer #items',processChat,state.chat);
    observe('yt-live-chat-item-list-renderer #items',processPaid,state.paid);
    observe('yt-live-chat-banner-manager',processChat,state.banner);
    observe('ytd-watch-metadata',processTitle,state.title);
}).observe(document.body,{childList:true,subtree:true});

})();
