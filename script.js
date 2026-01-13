import { db } from "./config.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let lastSentAt = 0;
const COOLDOWN = 3000; // 3 seconds
const cooldownMsg = document.querySelector(".cooldown-msg");


/* ---------------------------
   Anonymous Session Identity
---------------------------- */
const sessionId =
    sessionStorage.getItem("maskr_id") ||
    (() => {
        const id = "anon_" + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("maskr_id", id);
        return id;
    })();

/* ---------------------------
   DOM Elements
---------------------------- */
const chatBox = document.querySelector(".chat-box");
const input = document.querySelector(".chat-input input");
const button = document.querySelector(".chat-input button");

/* ---------------------------
   Firestore Reference
---------------------------- */
const messagesRef = collection(db, "messages");

/* ---------------------------
   Send Message
---------------------------- */
async function sendMessage() {
    const now = Date.now();

    if (now - lastSentAt < COOLDOWN) {
        cooldownMsg.textContent = "Slow down…";
        setTimeout(() => cooldownMsg.textContent = "", 1500);
        return; // silently block spam
    }

    const text = input.value.trim();
    if (!text) return;

    lastSentAt = now;
    button.disabled = true;
    button.style.opacity = "0.6";

    try {
        await addDoc(messagesRef, {
            text,
            sender: sessionId,
            createdAt: serverTimestamp()
        });
        input.value = "";
    } catch (err) {
        console.error("Message send failed:", err);
    }

    setTimeout(() => {
        button.disabled = false;
        button.style.opacity = "1";
    }, COOLDOWN);
}


button.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});

/* ---------------------------
   Receive Messages (Realtime)
---------------------------- */
const q = query(
    messagesRef,
    orderBy("createdAt", "asc"),
    limit(50)
);

onSnapshot(q, snapshot => {
    chatBox.innerHTML = "";

    snapshot.forEach(doc => {
        const msg = doc.data();

        const wrapper = document.createElement("div");
        wrapper.classList.add("message-wrapper");
        wrapper.classList.add(
            msg.sender === sessionId ? "mine" : "theirs"
        );

        const bubble = document.createElement("div");
        bubble.classList.add("message");
        bubble.classList.add(
            msg.sender === sessionId ? "user" : "other"
        );
        bubble.textContent = msg.text;

        const label = document.createElement("div");
        label.className = "session-label";
        label.textContent = msg.sender;

        wrapper.appendChild(bubble);
        wrapper.appendChild(label);
        chatBox.appendChild(wrapper);
    });
});
