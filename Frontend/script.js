/* =========================
   ELEMENTS
========================= */

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const messages =
    document.getElementById("messages");

const welcome =
    document.getElementById("welcome");

const newChatBtn =
    document.getElementById("newChatBtn");

const attachBtn =
    document.getElementById("attachBtn");

const fileInput =
    document.getElementById("fileInput");

const selectedFile =
    document.getElementById("selectedFile");

const fileName =
    document.getElementById("fileName");

const removeFile =
    document.getElementById("removeFile");

const typing =
    document.getElementById("typing");

const themeBtn =
    document.getElementById("themeBtn");


/* =========================
   STATE
========================= */

let selectedDocument = null;


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    // Hide welcome screen
    welcome.classList.add("hidden");


    // Show user message
    addUserMessage(text);


    // Clear input
    messageInput.value = "";

    autoResize();


    // Show loading
    showTyping();


    try {

        /*
            TEMPORARY RESPONSE

            This will be replaced with
            the real RAG Backend API.
        */

        const response =
            await sendMessageToBackend(text);


        hideTyping();

        addAIMessage(response);


    } catch (error) {

        hideTyping();

        addAIMessage(
            "Sorry, something went wrong. Please try again."
        );

        console.error(error);

    }

}


/* =========================
   BACKEND CONNECTION
========================= */

async function sendMessageToBackend(message) {

    /*
        LATER:

        This function will connect
        to your team's Backend.

        Example:

        const response = await fetch(
            "http://localhost:8000/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message
                })
            }
        );

        const data = await response.json();

        return data.answer;
    */


    /*
        Temporary response
        ONLY for testing the UI.
    */

    return new Promise(resolve => {

        setTimeout(() => {

            resolve(
                "Your question has been received. The RAG backend will provide the real answer here once the API is connected."
            );

        }, 1000);

    });

}


/* =========================
   ADD USER MESSAGE
========================= */

function addUserMessage(text) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message user";


    const message =
        document.createElement("div");

    message.className =
        "user-message";

    message.textContent =
        text;


    wrapper.appendChild(message);

    messages.appendChild(wrapper);


    scrollToBottom();

}


/* =========================
   ADD AI MESSAGE
========================= */

function addAIMessage(text) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message";


    const aiMessage =
        document.createElement("div");

    aiMessage.className =
        "ai-message";


    const avatar =
        document.createElement("div");

    avatar.className =
        "ai-avatar";

    avatar.textContent =
        "✦";


    const content =
        document.createElement("div");

    content.className =
        "ai-content";


    const paragraph =
        document.createElement("p");

    paragraph.textContent =
        text;


    /* Message actions */

    const actions =
        document.createElement("div");

    actions.className =
        "message-actions";


    const copyBtn =
        document.createElement("button");

    copyBtn.textContent =
        "📋";

    copyBtn.title =
        "Copy";


    copyBtn.addEventListener(
        "click",
        async function() {

            try {

                await navigator.clipboard.writeText(text);

                copyBtn.textContent =
                    "✓";


                setTimeout(() => {

                    copyBtn.textContent =
                        "📋";

                }, 1200);

            } catch (error) {

                console.error(error);

            }

        }
    );


    const likeBtn =
        document.createElement("button");

    likeBtn.textContent =
        "👍";


    const dislikeBtn =
        document.createElement("button");

    dislikeBtn.textContent =
        "👎";


    actions.appendChild(copyBtn);

    actions.appendChild(likeBtn);

    actions.appendChild(dislikeBtn);


    content.appendChild(paragraph);

    content.appendChild(actions);


    aiMessage.appendChild(avatar);

    aiMessage.appendChild(content);


    wrapper.appendChild(aiMessage);

    messages.appendChild(wrapper);


    scrollToBottom();

}


/* =========================
   NEW CHAT
========================= */

newChatBtn.addEventListener(
    "click",
    function() {

        messages.innerHTML = "";

        welcome.classList.remove(
            "hidden"
        );

        messageInput.value = "";

        autoResize();

        messageInput.focus();

    }
);


/* =========================
   TYPING
========================= */

function showTyping() {

    typing.classList.remove(
        "hidden"
    );

    scrollToBottom();

}


function hideTyping() {

    typing.classList.add(
        "hidden"
    );

}


/* =========================
   SCROLL
========================= */

function scrollToBottom() {

    setTimeout(() => {

        messages.scrollTop =
            messages.scrollHeight;

    }, 50);

}


/* =========================
   FILE UPLOAD
========================= */

attachBtn.addEventListener(
    "click",
    function() {

        fileInput.click();

    }
);


fileInput.addEventListener(
    "change",
    function() {

        const file =
            fileInput.files[0];


        if (!file) {
            return;
        }


        selectedDocument =
            file;


        fileName.textContent =
            file.name;


        selectedFile.classList.remove(
            "hidden"
        );

    }
);


/* =========================
   REMOVE FILE
========================= */

removeFile.addEventListener(
    "click",
    function() {

        selectedDocument =
            null;

        fileInput.value =
            "";

        selectedFile.classList.add(
            "hidden"
        );

    }
);


/* =========================
   SUGGESTIONS
========================= */

document
    .querySelectorAll(".suggestion")
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                const title =
                    button
                        .querySelector("strong")
                        .textContent;


                messageInput.value =
                    title;


                messageInput.focus();

                autoResize();

            }
        );

    });


/* =========================
   ENTER TO SEND
========================= */

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


/* =========================
   AUTO RESIZE
========================= */

messageInput.addEventListener(
    "input",
    autoResize
);


function autoResize() {

    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            130
        ) + "px";

}


/* =========================
   SEND BUTTON
========================= */

sendBtn.addEventListener(
    "click",
    sendMessage
);


/* =
   DARK MODE== */

themeBtn.addEventListener(
    "click",
    function() {

        document.body.classList.toggle(
            "dark"
        );


        if (
            document.body.classList.contains(
                "dark"
            )
        ) {

            themeBtn.textContent =
                "☀";

        } else {

            themeBtn.textContent =
                "☾";

        }

    }
);


/* =
   INITIALIZE
==*/

welcome.classList.remove(
    "hidden"
); 