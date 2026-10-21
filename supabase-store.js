(() => {
  "use strict";

  const config = window.GLASS_CARE_SUPABASE_CONFIG;
  const authPanel = document.getElementById("authPanel");
  const appShell = document.getElementById("appShell");
  const authForm = document.getElementById("authForm");
  const authStatus = document.getElementById("authStatus");
  const signOutButton = document.getElementById("signOutButton");
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let currentUser = null;
  let readyPromise = Promise.resolve();

  function setStatus(message, isError = false) {
    authStatus.textContent = message;
    authStatus.classList.toggle("error", isError);
  }

  function showSignedIn(user) {
    currentUser = user;
    authPanel.hidden = Boolean(user);
    appShell.hidden = !user;
    signOutButton.hidden = !user;
    if (user) {
      document.getElementById("signedInAs").textContent = user.email || "Signed in";
      setStatus("");
    }
  }

  async function loadRemoteData() {
    const [docsResult, settingsResult] = await Promise.all([
      client.from("glass_care_documents").select("payload").order("created_at", { ascending: false }),
      client.from("glass_care_settings").select("payload").maybeSingle()
    ]);
    if (docsResult.error) throw docsResult.error;
    if (settingsResult.error) throw settingsResult.error;

    const remoteDocuments = (docsResult.data || []).map(row => row.payload);
    const localDocuments = readLocalJson("glassCareDocuments", []);
    const remoteIds = new Set(remoteDocuments.map(record => record.id));
    const pendingDocuments = localDocuments.filter(record => !remoteIds.has(record.id));
    for (const record of pendingDocuments) await saveDocument(record);

    const documents = [...pendingDocuments, ...remoteDocuments];
    const settings = settingsResult.data?.payload || readLocalJson("glassCareDocumentSettings", {});
    if (!settingsResult.data && Object.keys(settings).length) await saveSettings(settings);
    localStorage.setItem("glassCareDocuments", JSON.stringify(documents));
    localStorage.setItem("glassCareDocumentSettings", JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("glasscare:cloud-ready", {
      detail: { documents, settings, user: currentUser }
    }));
  }

  function readLocalJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  async function saveDocument(record) {
    const { error } = await client.from("glass_care_documents").upsert({
      id: record.id,
      document_type: record.type,
      document_number: record.number,
      source_id: record.sourceId || null,
      payload: record
    }, { onConflict: "owner_id,id" });
    if (error) throw error;
    const current = readLocalJson("glassCareDocuments", []);
    const next = [record, ...current.filter(item => item.id !== record.id)];
    localStorage.setItem("glassCareDocuments", JSON.stringify(next));
  }

  async function saveSettings(settings) {
    const { error } = await client.from("glass_care_settings").upsert({ payload: settings }, { onConflict: "owner_id" });
    if (error) throw error;
    localStorage.setItem("glassCareDocumentSettings", JSON.stringify(settings));
  }

  async function nextNumber(type) {
    const { data, error } = await client.rpc("next_glass_care_number", { p_type: type });
    if (error) throw error;
    return data;
  }

  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = authForm.querySelector("button[type=submit]");
    submitButton.disabled = true;
    setStatus("Signing in…");
    const { error } = await client.auth.signInWithPassword({
      email: document.getElementById("authEmail").value.trim(),
      password: document.getElementById("authPassword").value
    });
    submitButton.disabled = false;
    if (error) setStatus(error.message, true);
    else document.getElementById("authPassword").value = "";
  });

  signOutButton.addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) setStatus(error.message, true);
  });

  function activateSession(user) {
    if (!user) {
      showSignedIn(null);
      return;
    }
    currentUser = user;
    authPanel.hidden = false;
    appShell.hidden = true;
    signOutButton.hidden = true;
    document.getElementById("signedInAs").textContent = user.email || "Signed in";
    setStatus("Loading your shared documents…");
    readyPromise = loadRemoteData().then(() => {
      showSignedIn(user);
    }).catch(error => {
      showSignedIn(null);
      setStatus(`Cloud sync failed: ${error.message}. Check that supabase/schema.sql has been run.`, true);
    });
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    activateSession(session?.user || null);
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    activateSession(data.session?.user || null);
  }).catch(error => setStatus(error.message, true));

  window.GlassCareStore = {
    client,
    get user() { return currentUser; },
    async ready() { await readyPromise; },
    saveDocument,
    saveSettings,
    nextNumber
  };
})();
