/* globals console, document, fetch, URL, URLSearchParams, window */

const version = "0.0.20";

function hideElement(elementId) {
    try {
        document.getElementById(elementId).style.display = "none";
    } catch (e) {
        console.error(e);
    }
}

function showElement(elementId) {
    try {
        document.getElementById(elementId).style.display = "block";
    } catch (e) {
        console.error(e);
    }
}

function initElements() {
    hideElement("result_group");
    showElement("control_group");
}

function resetPage() {
    initElements();
    window.location.href = "https://webmail.mailcapsule.io/oauth/";
}

function showResult(result) {
    hideElement("control_group");
    if (result.Success) {
        showElement("revoke_instructions");
        showElement("reauth_button");
    } else {
        hideElement("revoke_instructions");
        hideElement("reauth_button");
    }
    showElement("control_group");
    document.getElementById("auth_result_text").textContent = JSON.stringify(result, null, 2);
}

async function onWindowLoad() {
    try {
        console.log("window loaded");
        document.getElementById("reset_button_select").addEventListener("click", resetPage);
        document.getElementById("reset_button_result").addEventListener("click", resetPage);
        document.getElementById("authenticate_button").addEventListener("click", requestAuthentication);
        const title = "Gmail Authorization v" + version;
        document.getElementById("title_text").textContent = title;
        initElements();
        await updateUsernames();
        console.log("href:", window.location.href);
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        if (params.toString().length > 0) {
            const jsonParams = { url: window.location.href };
            params.forEach((value, key) => {
                jsonParams[key] = value;
            });
            showResult(jsonParams);
            if (jsonParams["authorization"] === "pending") {
                const endpoint = "https://webmail.mailcapsule.io/oauth/authorize/";
                const result = await requestAuthorization(endpoint, { state: jsonParams["state"] });
                showResult(result);
            }
        }
    } catch (e) {
        console.error("onWindowLoad:", e);
    }
}

async function updateUsernames() {
    try {
        console.log("updating usernames");
        const url = "https://webmail.mailcapsule.io/oauth/usernames/";
        const response = await fetch(url);
        const selectTitle = document.getElementById("username_title");
        const selectElement = document.getElementById("username_select");
        let usernames = await response.json();
        // usernames = [];
        console.log("usernames:", usernames);
        if (usernames.length < 1) {
            hideElement("username_select");
            selectTitle.textContent = "No eligible usernames exist";
        } else {
            selectTitle.textContent = "Select a local account:";
            showElement("username_select");
        }

        usernames.forEach((username) => {
            const option = document.createElement("option");
            option.value = username;
            option.textContent = username;
            selectElement.appendChild(option);
        });
    } catch (e) {
        console.error("updateUsernames:", e);
    }
}

async function requestAuthorization(url, params) {
    try {
        console.log("sending post request:", url, params);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
        });
        return response.json();
    } catch (e) {
        console.error("postAuthorizationRequest:", e);
    }
}

async function requestAuthentication() {
    try {
        const selectElement = document.getElementById("username_select");
        console.log("selectElement:", selectElement);
        const response = await fetch("https://webmail.mailcapsule.io/oauth/authenticate/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: selectElement.value }),
        });
        console.log("response:", response);
        const result = await response.json();
        console.log("result:", result);
        const authUri = result.Message;
        if (result.Success) {
            console.log("redirecting to:", authUri);
            window.location.href = authUri;
        } else {
            console.log("not redirecting to:", authUri);
            showResult(result);
        }
    } catch (e) {
        console.error("postAuthenticationRequest:", e);
    }
}

window.onload = onWindowLoad;
