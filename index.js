/* globals console, document, fetch, URL, URLSearchParams, window */

const version = "1.0.8";
var local_domain = "LOCAL_DOMAIN";

const description_text = `
    A local <b>LOCAL_DOMAIN</b> email account with a username beginning with 
    <b>'gmail.'</b> may be associated with a gmail address.
    <br />
    To make this connection, select the desired local account username then use 
    the 'Authorize with Google' button.
    <br />
    The resulting process will allow you to select a gmail account and authorize
    IMAP and SMTP connections.
    <br />
    This action grants the <b>LOCAL_DOMAIN</b> servers permission to fetch 
    incoming gmail and send outgoing gmail using a persistent authorization
    token.
`;

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
    window.location.href = window.location.origin + window.location.pathname;
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

function editedDescriptionText() {
    return description_text.replace(/LOCAL_DOMAIN/g, local_domain);
}

async function onWindowLoad() {
    try {
        console.log("window loaded");
        hideElement("result_group");
        showElement("control_group");
	local_domain = window.hostname.replace(/^[^.]*\./, "");
        document.getElementById("title_text").textContent = "Gmail Authorization v" + version;
        document.getElementById("description_text").textContent = editedDescriptionText();
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
                const endpoint = "https://webmail." + local_domain + "/oauth/authorize/";
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
        const url = "https://webmail." + local_domain + "/oauth/usernames/";
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
        const uri = "https://webmail." + local_domain + "/oauth/authenticate/";
        return await postAuthenticationRequest(uri, true);
    } catch (e) {
        console.error("requestAuthentication:", e);
    }
}

async function requestForgetToken() {
    try {
        const uri = "https://webmail." + local_domain + "/oauth/deauthenticate/";
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
        if (result.Success && enableRedirect) {
            const authUri = result.URI;
            console.log("redirecting to:", authUri);
            window.location.href = authUri;
        } else {
            showResult(result);
        }
    } catch (e) {
        console.error("postAuthenticationRequest:", e);
    }
}

window.onload = onWindowLoad;
