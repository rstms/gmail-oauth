/* globals console, document, fetch, URL, URLSearchParams, window */

const version = "0.0.9";

function hideElement(elementId) {
    try {
        document.getElementById(elementId).hidden = true;
    } catch (e) {
        console.error(e);
    }
}

function showElement(elementId) {
    try {
        document.getElementById(elementId).hidden = false;
    } catch (e) {
        console.error(e);
    }
}

function initElements() {
    showElement("auth_controls");
    hideElement("auth_result");
    hideElement("revoke_instructions");
}

function resetPage() {
    initElements();
    window.location.href = "https://webmail.mailcapsule.io/oauth/";
}

function showResult(result) {
    document.getElementById("auth_result_text").textContent = JSON.stringify(result, null, 2);
    hideElement("auth_controls");
    showElement("auth_result");
    if (result.Success) {
        showElement("revoke_instructions");
    } else {
        hideElement("revoke_instructions");
    }
}

async function onWindowLoad() {
    try {
        console.log("window loaded");
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
        const usernames = await response.json();
        //const usernames = [];
        console.log("usernames:", usernames);
        if (usernames.length < 1) {
            hideElement("username_select");
            selectTitle.textContent = "No eligible usernames exist";
            console.log("selectTitle:", selectTitle);
            console.log("selectElement:", selectElement);
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
document.getElementById("reset_button_select").addEventListener("click", resetPage);
document.getElementById("reset_button_result").addEventListener("click", resetPage);
document.getElementById("authenticate_button").addEventListener("click", requestAuthentication);
document.title = "gmail-oauth v" + version;
