
let isLogInActive = false;
let username = "";
let password = "";
let isLoggedIn = false;

const input = document.getElementById("terminal-input");
const output = document.querySelector(".terminal-output");
const intro = document.querySelector(".page-intro");
const user = "Login" + "@PC1 ~ %";

const popupsound = document.getElementById("notifypop");
const keyboard_sound = document.getElementById("keyboardsound");

let is_horror = true;

class Stack {
  constructor(maxSize = 10) {
    this.maxSize = isNaN(maxSize) ? 10 : maxSize;
    this.container = ["hi"];
  }

  display() {
    console.log(this.container);
  }

  push(element) {
    this.container.push(element);
  }

  pop() {
    return this.container.pop();
  }

  getLast(at) {
    return this.container.at(at);
  }
}

const history = new Stack(10);
let topOfStack = -1;

input.addEventListener("keydown", async function (event) {
  play_horror();
  topOfStack = (topOfStack + 1) % 10;

  if (event.key === "Enter") {
    let command = input.value.trim();
    output.innerHTML += "<br>" + user + command;
    input.value = "";

    if (!isLogInActive) {
      switch (true) {
        case command === "./profile":
          typeResponse(await makeProfileRequest(), output, 100);
          break;

          case command === "./getfriends":
            typeResponse(await makeGetFriendsRequest(), output, 100);
            break;

            case command.startsWith("./chat "):
              const chatTarget = command.split(" ")[1];
              await startChat(chatTarget);
              break;

        case command.startsWith("./taskdetails"):
          typeResponse(await makeGetTaskDetailsRequest(command.split(" ")[1]), output, 100);
          break;

        case command === "./getintro":
          getIntro();
          break;

        case command === "--help":
          typeResponse("“The world is nothing but a game of balance...” — Madara Uchiha", output, 100);
          break;

        case command === "./login":
          username = "";
          password = "";
          isLogInActive = true;
          typeResponse("Enter your username", output, 100);
          break;

        case command === "./logout":
          isLogInActive = false;
          username = "";
          password = "";
          typeResponse(await makeLogoutRequest(), output, 100);
          break;

        case command === "./contact":
          typeResponse(await makeContactRequest(), output, 100);
          break;

        case command.startsWith("./askai"):
          const aiResponse = await makeAIChatRequest(command.replace("./askai", "").trim());
          typeResponse(aiResponse, output, 50);
          break;

        default:
          typeResponse(await makeChatRequest(command), output, 100);
          break;
      }
    } else {
      if (!username) {
        if (!command) {
          isLogInActive = false;
          typeResponse("Enter a valid username", output, 100);
        } else {
          username = command;
          typeResponse("Enter your password", output, 100);
        }
      } else {
        password = command;
        if (!password) {
          isLogInActive = false;
          typeResponse("Enter a valid password", output, 100);
        } else {
          isLogInActive = false;
          typeResponse(await makeLoginRequest(username, password), output, 100);
        }
      }
    }
  }
});

function play_horror() {
  if (is_horror) {
    popupsound.play();
    is_horror = false;
  }
}

window.onload = function () {
  document.getElementById("terminal-input").autofocus = true;
  document.getElementById("login-session").innerHTML = "Last login: " + new Date() + " on ttys000";
};

function getIntro() {
  typeResponse(
    "In the year 2040, a mysterious event caused the world to be overrun by terrifying creatures...",
    intro,
    25
  );
}

async function typeResponse(response, writeAt, delay) {
  let outputLine = document.createElement("div"); // Create a new div for response
  outputLine.innerHTML = `<br><span style="color: green;">serve &gt;</span> `; // 'serve >' with green color
  writeAt.appendChild(outputLine); // Append to output area

  let index = 0;
  while (index < response.length) {
    keyboard_sound.play();
    outputLine.innerHTML += response[index++];
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  keyboard_sound.pause();
}





async function startChat(target) {
  const isGroup = target.startsWith("group_"); // Assume group names start with "group_"
  typeResponse(`Starting chat with ${target}...`, output, 100);

  const messages = await fetchChatMessages(target, isGroup);

  if (messages && messages.length) {
      messages.forEach(msg => {
          typeResponse(`${msg.sender_id}: ${msg.message_content}`, output, 50);
      });
  } else {
      typeResponse("No messages found.", output, 100);
  }

  // Allow sending messages in this chat
  await enterChatMode(target, isGroup);
}



async function fetchChatMessages(receiver, isGroup) {
  const response = await makePostRequest("/chat/fetch-messages", {
      receiver,
      isGroup
  });
  const data = JSON.parse(response);
  return data.messages || [];
}


async function enterChatMode(receiver, isGroup) {
  typeResponse("You can now send messages. Type 'exit' to leave chat.", output, 100);

  while (true) {
      const message = await waitForUserInput();

      if (message === "exit") {
          typeResponse("Leaving chat...", output, 100);
          break;
      }

      const success = await sendMessage(receiver, message, isGroup);
      if (success) {
          typeResponse(`You: ${message}`, output, 50);
      } else {
          typeResponse("Failed to send message.", output, 100);
      }
  }
}

async function sendMessage(receiver, message, isGroup) {
  const response = await makePostRequest("/chat/send-message", {
      receiver,
      message,
      isGroup
  });
  const data = JSON.parse(response);
  return data.success;
}


function waitForUserInput() {
  return new Promise(resolve => {
      const inputHandler = (event) => {
          if (event.key === "Enter") {
              const message = input.value.trim();
              input.value = "";
              input.removeEventListener("keydown", inputHandler);
              resolve(message);
          }
      };
      input.addEventListener("keydown", inputHandler);
  });
}




// Helper function for API requests
async function makePostRequest(url, data) {
  let responseText = "test";
  await $.ajax({
    url: url,
    type: "POST",
    data: data,
    success: function (data) {
      responseText = JSON.stringify(data);
    },
    error: function (xhr, status, error) {
      responseText = error;
    },
  });
  return responseText;
}

// API Request Functions
const apiRequests = {
  // makeLogoutRequest: () => makePostRequest("/logout", {}),
  // makeLoginRequest: (username, password) => makePostRequest("/login", { username, password }),
  makeContactRequest: () => makePostRequest("/contact", {}),
  makeChatRequest: (data) => makePostRequest("/chat", { data }),
  makeProfileRequest: () => makePostRequest("/chat-profile", {}),
  makeGetAssignmentRequest: () => makePostRequest("/chat-list-friends", {}),








  // makeGetResourceRequest: (data) => makePostRequest("/getresource", { data }),
  // makeGetTaskDetailsRequest: (taskid) => makePostRequest("/gettaskdetails", { taskid }),
  // makeSetTaskDetailsRequest: (data) => makePostRequest("/settaskdetails", data),
  // makeGetTaskStatusRequest: (data) => makePostRequest("/gettaskstatus", { data }),
  // makeSetTaskStatusRequest: (data) => makePostRequest("/settaskstatus", data),
  // makeGetTaskTypeRequest: (data) => makePostRequest("/getTaskType", { data }),
  // makeSetTaskTypeRequest: (data) => makePostRequest("/setTaskType", data),
  // makeGetUserStatusRequest: (data) => makePostRequest("/getuserstatus", { data }),
  // makeSetUserStatusRequest: (data) => makePostRequest("/setuserstatus", data),
  // makeRegisterRequest: (data) => makePostRequest("/register", data),
  // makeAIChatRequest: (prompt) => makePostRequest("/chatwithai", { prompt }),

};

// Attach functions to the global scope
Object.assign(window, apiRequests);