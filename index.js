/* globals console, document, fetch, URL, URLSearchParams, window */

const version = "0.0.58";

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

function resetPage() {
    console.log("resetPage");
    document.href = "https://mailcapsule.io/oauth/";
}

function showResult(result) {
    hideElement("control_group");
    if (result.Success) {
        showElement("revoke_instructions");
    } else {
        hideElement("revoke_instructions");
    }
    showElement("result_group");
    document.getElementById("auth_result_text").textContent = JSON.stringify(result, null, 2);
}

function connectEvent(id, event, func) {
    try {
        console.log("connectEvent:", { id: id, event: event, func: func });
        const element = document.getElementById(id);
        element.addEventListener(event, func);
    } catch (e) {
        console.error("onWindowLoad:", e);
    }
}

async function onWindowLoad() {
    try {
        console.log("window loaded");
        hideElement("result_group");
        showElement("control_group");
        document.getElementById("title_text").textContent = "Gmail Authorization v" + version;
        connectEvent("reset_button_control", "click", resetPage);
        connectEvent("reset_button_result", "click", resetPage);
        connectEvent("auth_button", "click", requestAuthentication);
        connectEvent("deauth_button", "click", requestForgetToken);
        connectEvent("username_select", "change", handleSelectChange);
        updateAuthButtons(false, false);
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
                console.log("passing pending authorization callback to /oauth/authorize endpoint");
                const endpoint = "https://webmail.mailcapsule.io/oauth/authorize/";
                const result = await requestAuthorization(endpoint, { state: jsonParams["state"] });
                showResult(result);
            }
        }
    } catch (e) {
        console.error("onWindowLoad:", e);
    }
}

async function handleSelectChange(event) {
    try {
        const selectElement = event.target;
        const selectedValue = selectElement.value;
        const items = selectedValue.split(",");
        const authorized = items[1].length > 0;
        document.getElementById("selected_account").value = items[0].replace(/@.*/, "");
        console.log("selectChange:", {
            selectElement: selectElement,
            selectedValue: selectedValue,
            items: items,
            authorized: authorized,
        });
        if (authorized) {
            updateAuthButtons(false, true);
        } else {
            updateAuthButtons(true, false);
        }
    } catch (e) {
        console.error("handleSelectChange:", e);
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
        // usernames = {};
        console.log("usernames:", usernames);

        let found = false;
        for (const [localAddress, gmailAddress] of Object.entries(usernames)) {
            found = true;
            const option = document.createElement("option");
            option.value = localAddress + "," + gmailAddress;
            if (gmailAddress !== "") {
                option.textContent = localAddress + " [" + gmailAddress + "]";
            } else {
                option.textContent = localAddress;
            }
            console.log("appending: ", option);
            selectElement.appendChild(option);
        }

        if (found) {
            selectTitle.textContent = "Select a local account:";
            showElement("username_select");
        } else {
            hideElement("username_select");
            selectTitle.textContent = "No local accounts have a 'gmail.' prefix";
        }
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
        const uri = "https://webmail.mailcapsule.io/oauth/authenticate/";
        return await postAuthenticationRequest(uri, true);
    } catch (e) {
        console.error("requestAuthentication:", e);
    }
}

async function requestForgetToken() {
    try {
        const uri = "https://webmail.mailcapsule.io/oauth/deauthenticate/";
        return await postAuthenticationRequest(uri, false);
    } catch (e) {
        console.error("requestForgetToken:", e);
    }
}

function updateAuthButtons(authEnable, deauthEnable) {
    try {
        const authButton = document.getElementById("auth_button");
        const deauthButton = document.getElementById("deauth_button");
        authButton.disabled = !authEnable;
        deauthButton.disabled = !deauthEnable;
    } catch (e) {
        console.error("updateAuthButtons:", e);
    }
}

async function postAuthenticationRequest(uri, enableRedirect) {
    try {
        const selectElement = document.getElementById("username_select");
        const value = selectElement.value.split(",");
        const bodyData = {
            local: value[0],
            gmail: value[1],
        };
        console.log("postAuthenticationRequest:", { uri: uri, body: bodyData });
        const response = await fetch(uri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyData),
        });
        console.log("response:", response);
        const result = await response.json();
        console.log("result:", result);
        const authUri = result.Message;
        if (result.Success && enableRedirect) {
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
