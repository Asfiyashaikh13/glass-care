const chatPanel = document.getElementById("chatPanel");
const chatToggle = document.getElementById("chatToggle");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatStatus = document.getElementById("chatStatus");
const chatSendButton = chatForm.querySelector('button[type="submit"]');
const conversation = [];

function readText(selector, fallback = "") {
  return document.querySelector(selector)?.textContent.trim() || fallback;
}

function readValue(selector, fallback = "") {
  return document.querySelector(selector)?.value || fallback;
}

function getEstimateContext() {
  return {
    unit: readValue("#unitDisplay", "Sqft"),
    amount: readText("#amountDisplay", "₹0.00"),
    area: readText("#areaDisplay", "0.00"),
    rate: readValue("#rate", "0"),
    discountPercent: readValue("#discountPercent", "10"),
    quantity: readValue("#quantity", "1"),
    height: readValue("#height", "0"),
    width: readValue("#width", "0"),
    state: readValue("#customerState", "Karnataka"),
    subtotal: readText("#subtotal", "₹0.00"),
    gst1Label: readText("#gst1Label", "GST"),
    gst1: readText("#gst1", "₹0.00"),
    gst2Label: readText("#gst2Label", ""),
    gst2: readText("#gst2", "-"),
    total: readText("#grandTotal", "₹0.00")
  };
}

function addChatMessage(message, sender) {
  const row = document.createElement("div");
  row.className = `chat-message ${sender}-message`;

  const bubble = document.createElement("p");
  bubble.className = "chat-bubble";
  bubble.textContent = message;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}

async function sendChatMessage(message) {
  const trimmedMessage = message.trim();
  if (!trimmedMessage || chatSendButton.disabled) return;

  addChatMessage(trimmedMessage, "user");
  chatInput.value = "";
  conversation.push({ role: "user", content: trimmedMessage });
  const replyRow = addChatMessage("Thinking…", "assistant");
  chatSendButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation.slice(-12),
        estimate: getEstimateContext()
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The assistant request failed.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("The assistant returned an empty response.");
    }
    replyRow.querySelector(".chat-bubble").textContent = data.reply;
    conversation.push({ role: "assistant", content: data.reply });
  } catch (error) {
    replyRow.querySelector(".chat-bubble").textContent = error instanceof TypeError
      ? "I can’t reach the Glass Care server. Start it with python3 server.py, then open http://127.0.0.1:8000."
      : error.message;
    conversation.pop();
  } finally {
    chatSendButton.disabled = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.focus();
  }
}

async function checkChatService() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    if (data.configured) {
      chatStatus.textContent = `Local AI · ${data.model}`;
      chatStatus.classList.remove("chat-status-error");
      return;
    }
    chatStatus.textContent = data.running
      ? `Local model missing · run ollama pull ${data.model}`
      : "Ollama not running · start local model";
    chatStatus.classList.add("chat-status-error");
  } catch {
    chatStatus.textContent = "Local assistant unavailable · start app server";
    chatStatus.classList.add("chat-status-error");
  }
}

function setChatOpen(isOpen) {
  chatPanel.hidden = !isOpen;
  chatToggle.setAttribute("aria-expanded", String(isOpen));
  chatToggle.setAttribute("aria-label", isOpen ? "Close Glass Care Assistant" : "Open Glass Care Assistant");
  if (isOpen) chatInput.focus();
  else chatToggle.focus();
}

chatToggle.addEventListener("click", () => setChatOpen(chatPanel.hidden));
chatClose.addEventListener("click", () => setChatOpen(false));

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendChatMessage(chatInput.value);
});

chatInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatMessages.parentElement.addEventListener("click", event => {
  const promptButton = event.target.closest("[data-chat-prompt]");
  if (promptButton) sendChatMessage(promptButton.dataset.chatPrompt);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !chatPanel.hidden) setChatOpen(false);
});

checkChatService();
