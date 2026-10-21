(() => {
  "use strict";

  const config = window.GLASS_CARE_SUPABASE_CONFIG;
  const authPanel = document.getElementById("authPanel");
  const appShell = document.getElementById("appShell");
  const authForm = document.getElementById("authForm");
  const authStatus = document.getElementById("authStatus");
  const authSubheading = document.getElementById("authSubheading");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const forgotEmail = document.getElementById("forgotEmail");
  const backToSignInBtn = document.getElementById("backToSignInBtn");
  const updatePasswordForm = document.getElementById("updatePasswordForm");
  const newPassword = document.getElementById("newPassword");
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
    
    // Sync any pending local documents with graceful per-document fallback
    const syncedDocuments = [];
    for (const record of pendingDocuments) {
      try {
        await saveDocument(record);
        syncedDocuments.push(record);
      } catch (e) {
        console.warn("Could not sync local document to Supabase:", record.id, e);
      }
    }

    const documents = [...syncedDocuments, ...remoteDocuments];
    const settings = settingsResult.data?.payload || readLocalJson("glassCareDocumentSettings", {});
    if (!settingsResult.data && Object.keys(settings).length) {
      try {
        await saveSettings(settings);
      } catch (e) {
        console.warn("Could not sync local settings to Supabase:", e);
      }
    }
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

  async function getAuthenticatedUserId() {
    if (currentUser?.id) return currentUser.id;
    const { data } = await client.auth.getUser();
    return data?.user?.id || null;
  }

  async function saveDocument(record) {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Authentication required to save document");
    const docType = ["Estimate", "Bill", "Invoice"].includes(record.type) ? record.type : "Estimate";
    const { error } = await client.from("glass_care_documents").upsert({
      owner_id: userId,
      id: String(record.id),
      document_type: docType,
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
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Authentication required to save settings");
    const { error } = await client.from("glass_care_settings").upsert({
      owner_id: userId,
      payload: settings
    }, { onConflict: "owner_id" });
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
    if (error) {
      setStatus(error.message, true);
    } else {
      document.getElementById("authPassword").value = "";
      try {
        localStorage.removeItem("glassCareEstimate");
        localStorage.removeItem("glassCareDraft");
      } catch (e) {}
      window.GlassCareEstimate?.reset?.(true);
    }
  });

  signOutButton.addEventListener("click", async () => {
    try {
      localStorage.removeItem("glassCareEstimate");
      localStorage.removeItem("glassCareDraft");
    } catch (e) {}
    window.GlassCareEstimate?.reset?.(true);
    const { error } = await client.auth.signOut();
    if (error) setStatus(error.message, true);
  });

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", () => {
      authForm.hidden = true;
      if (forgotPasswordForm) forgotPasswordForm.hidden = false;
      if (updatePasswordForm) updatePasswordForm.hidden = true;
      if (authSubheading) authSubheading.textContent = "Reset your password via email.";
      if (forgotEmail) {
        forgotEmail.value = document.getElementById("authEmail")?.value?.trim() || "";
        forgotEmail.focus();
      }
      setStatus("");
    });
  }

  if (backToSignInBtn) {
    backToSignInBtn.addEventListener("click", () => {
      if (forgotPasswordForm) forgotPasswordForm.hidden = true;
      if (updatePasswordForm) updatePasswordForm.hidden = true;
      authForm.hidden = false;
      if (authSubheading) authSubheading.textContent = "Sign in to access shared documents.";
      setStatus("");
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async event => {
      event.preventDefault();
      const email = forgotEmail?.value?.trim();
      if (!email) return;

      const submitBtn = forgotPasswordForm.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;
      setStatus("Sending password reset email…");

      // Ensure redirect always points to the live website so email links work everywhere (avoiding file:// or localhost)
      const isLiveSite = window.location.protocol === "https:" && !window.location.hostname.includes("localhost");
      const redirectTo = isLiveSite
        ? (window.location.origin + window.location.pathname)
        : "https://asfiyashaikh13.github.io/glass-care/";
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (submitBtn) submitBtn.disabled = false;
      if (error) {
        setStatus(error.message, true);
      } else {
        setStatus(`Password reset link sent to ${email}! Please check your email inbox.`);
      }
    });
  }

  if (updatePasswordForm) {
    updatePasswordForm.addEventListener("submit", async event => {
      event.preventDefault();
      const pwd = newPassword?.value;
      if (!pwd || pwd.length < 6) {
        setStatus("Password must be at least 6 characters.", true);
        return;
      }
      const submitBtn = updatePasswordForm.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;
      setStatus("Updating password…");

      const { error } = await client.auth.updateUser({ password: pwd });
      if (submitBtn) submitBtn.disabled = false;

      if (error) {
        setStatus(error.message, true);
      } else {
        setStatus("Password updated successfully! Please sign in with your new password.");
        updatePasswordForm.hidden = true;
        authForm.hidden = false;
        if (authSubheading) authSubheading.textContent = "Sign in to access shared documents.";
      }
    });
  }

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

  function isRecoveryMode() {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    return hash.includes("type=recovery") || search.includes("type=recovery");
  }

  function showRecoveryScreen() {
    authPanel.hidden = false;
    appShell.hidden = true;
    authForm.hidden = true;
    if (forgotPasswordForm) forgotPasswordForm.hidden = true;
    if (updatePasswordForm) updatePasswordForm.hidden = false;
    if (authSubheading) authSubheading.textContent = "Set a new password for your account.";
    setStatus("Enter your new password below.");
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    if (event === "PASSWORD_RECOVERY" || isRecoveryMode()) {
      showRecoveryScreen();
      return;
    }
    if (event === "SIGNED_IN") {
      if (isRecoveryMode()) {
        showRecoveryScreen();
        return;
      }
      try {
        localStorage.removeItem("glassCareEstimate");
        localStorage.removeItem("glassCareDraft");
      } catch (e) {}
      window.GlassCareEstimate?.reset?.(true);
    }
    activateSession(session?.user || null);
  });

  if (isRecoveryMode()) {
    showRecoveryScreen();
  } else {
    client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      activateSession(data.session?.user || null);
    }).catch(error => setStatus(error.message, true));
  }

  window.GlassCareStore = {
    client,
    get user() { return currentUser; },
    async ready() { await readyPromise; },
    saveDocument,
    saveSettings,
    nextNumber
  };
})();
