import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';

// 🔥🔥 FILL THIS OUT FIRST! 🔥🔥
// Get your Gemini API key by:
// - Selecting "Add Gemini API" in the "Project IDX" panel in the sidebar
// - Or by visiting https://g.co/ai/idxGetGeminiKey
let currentChatIndex = -1; // The current active chat
let API_KEY = 'AIzaSyD__WGbiXsXPP3spsIT-Cn6SROw6rBpk_Y';

let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');
// ID elements from HTML
const bot_prompt = 'You are a bot that is to be a professional doctor. You are called "Dok", you dont have to introduce yourself every time you answer, just the first time. So, answer anything as if you were treating a patient. Ask one follow up question about what the user(patient) is asking. Once there is enough information, give advice. Also give disclaimers that any advice you give should be re-consulted to a doctor. You only do disclaimer when you give advice and you always put it in the last.'
const chatMessages = document.getElementById("chat-messages"); // The chat messages div
const userInputBox = document.getElementById("user-input"); // The chat messages div
const historyContainer = document.getElementById("history"); // The history sidebar div
const newChatButton = document.getElementById("new-chat"); // The new chat button
const clearHistoryButton = document.getElementById("clear-history"); // The clear history button
const sendButton = document.getElementById("send-button"); // The send button
const genAI = new GoogleGenerativeAI(API_KEY);
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || []; // Load chat history from local storage
let messages = []
    const model = genAI.getGenerativeModel({
      model: "gemini-pro", // or gemini-1.5-pro
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });
  

    const chat = model.startChat({
      history: messages,
      generationConfig:{
        maxOutputTokens:10000
      }
    })
// Create new chat and saving the previous one to history
function startNewChat() {
  // Clear the current chat messages
  chatMessages.innerHTML = `<div class="chatbot-message bot-message">Dok: Hello! How can I assist you today? What would you like to ask?" </div>`;

  // Create a new chat
  const newChat = {
      id: Date.now(),
      messages: [
          { sender: "bot", message: "Dok: Hello! How can I assist you today? What would you like to ask?" }
      ]
  };

  // Add the new chat to chat history
  chatHistory.push(newChat);

  // Save the updated chat history to local storage
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory));

  // Create a new chat tab in the history sidebar
  const historyItem = document.createElement("a");
  historyItem.href = "#";
  historyItem.innerText = `Chat ${chatHistory.length}`;
  historyItem.classList.add("history-item");
  historyItem.addEventListener("click", () => loadChat(chatHistory.length - 1, historyItem));
  historyContainer.appendChild(historyItem);

  // Set the current chat index to the newly created chat
  currentChatIndex = chatHistory.length - 1;

  // Change color for the active chat in the history tab
  updateActiveHistoryItem();
  // Store the current chat index
  localStorage.setItem('currentChatIndex', currentChatIndex); // Save index

  loadChat(currentChatIndex)
  userInputBox.classList.remove('disabled');
  sendButton.classList.remove('disabled');

  location.reload()
}


// Display the selected chat from history
function loadChat(index) {
  currentChatIndex = index;
  chatMessages.innerHTML = ""; // Clear current chat

  const selectedChat = chatHistory[currentChatIndex];
  // Display all of the messages for the selected chat
  selectedChat.messages.forEach(msg => {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add(`${msg.sender}-message`);
      messageDiv.innerText = msg.message;
      chatMessages.appendChild(messageDiv);
  });
  // Change color for the active chat in the sidebar (highlight the current chat)
  updateActiveHistoryItem();

  // Scroll to the bottom of the chat container
  chatMessages.scrollTop = chatMessages.scrollHeight;
  localStorage.setItem('currentChatIndex', currentChatIndex); // Save index
}

// Change color for the active chat
function updateActiveHistoryItem() {
  const allHistoryItems = document.querySelectorAll(".history-item");

  // Remove active class from all items first
  allHistoryItems.forEach(item => {
      item.classList.remove("active-chat");
  });

  // Get the history item corresponding to the current chat index
  const activeItem = allHistoryItems[currentChatIndex];

  // Add the active-chat class to the active chat
  if (activeItem) {
      activeItem.classList.add("active-chat");
  }
}


    // Send message and output bot response
    const sendMessage = async (ev) => {
      ev.preventDefault();
      // Disable inputs while bot is generating a response
      historyContainer.classList.add('disabled');
      sendButton.classList.add('disabled');
      newChatButton.classList.add('disabled');
      clearHistoryButton.classList.add('disabled');
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const userInput = promptInput.value;
      const selectedChat = chatHistory[currentChatIndex];
  // Display all of the messages for the selected chat
        selectedChat.messages.forEach(msg => {
      
          messages += msg.message;
          });

      // Save the updated chat history to local storage
      output.innerHTML += `<div class="user-message" id="user-message"><b>You:</b> ${userInput}</div>`;

      
      const userMessage = { sender: "user", message: "You: " + userInput};

      //save the user input to current chat index history
      chatHistory[currentChatIndex].messages.push(userMessage);
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
      
      // Display "Generating..." below the user input
      output.innerHTML += '<div class="generating-message">Dok is Thinking...</div>';
    
      try {

          const result = await chat.sendMessageStream(bot_prompt + 'read this previous conversation:' + messages + 'Answer this question based on the previous conversation if there is context in the previous information. If not just answer the question:' + promptInput.value + 'give a proper response');
    
        let md = new MarkdownIt({
          linkify: true,
          typographer: true,
        }).disable(['emphasis']);;
    
        // Custom Markdown rule to reduce paragraph spacing (if needed)
        md.renderer.rules.paragraph_open = function (tokens, idx) {
          return '<p style="margin-bottom: 0.5px;">';
        };    

        // Create a container div for the bot's response
        const botResponseDiv = document.createElement('div');
        botResponseDiv.classList.add('bot-message', 'bot-message-right');
    
        // Add the "Bot:" prefix
        botResponseDiv.innerHTML = '<b>Dok:</b> ';
    
        output.appendChild(botResponseDiv); // Append the div to the output
    
        let fullResponse = ''; // Store the complete response
        for await (let response of result.stream) {
          fullResponse += response.text(); // Accumulate chunks
        }

        // Gradually reveal text
        async function revealText(content) {
          for (let i = 0; i < content.length; i++) {
            botResponseDiv.innerHTML += content[i];
            await new Promise((resolve) => setTimeout(resolve, 30)); // Adjust speed here

          }
        }


        // Reveal bot response text
        await revealText(fullResponse);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        output.innerHTML += `</div>`;
        const botMessageObj = { sender: "bot", message: botResponseDiv.textContent };
        chatHistory[currentChatIndex].messages.push(botMessageObj);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));

        // Remove "Generating..." message after response is received
        const generatingMessage = document.querySelector('.generating-message');
        if (generatingMessage) {
          generatingMessage.remove();
        }
    
      } catch (e) {
        output.innerHTML += '<hr>' + e;
      }  

    
      // Re-enable the input fields after the bot response
      historyContainer.classList.remove('disabled');
      sendButton.classList.remove('disabled');
      newChatButton.classList.remove('disabled');
      clearHistoryButton.classList.remove('disabled'); 
      //empty the input   
      promptInput.value = ''; 
      location.reload()
    };


// Clear the chat history (using the clear history button)
function clearChatHistory() {
  // Clear chat messages from the chat message div
  chatMessages.innerHTML = `<div class="chatbot-message bot-message">No history available. Start a new chat!</div>`;
  
  // Clear history from the local storage
  chatHistory = [];
  localStorage.removeItem('chatHistory');
  localStorage.removeItem('currentChatIndex');
  
  
  // Remove all chat history tab from the sidebar
  historyContainer.innerHTML = '';
  
  // Update the current chat index (-1 is none)
  currentChatIndex = -1;
  userInputBox.classList.add('disabled');
  sendButton.classList.add('disabled');
  }
  

// Load the Chat history
  function loadHistory() {
    promptInput.focus(); // Set focus back to the input field

    // Check if chat history exists in local storage
    if (!Array.isArray(chatHistory)) {
        localStorage.removeItem('chatHistory');
        chatHistory = [];
    }
    // Automatically start a new chat if there is no chat when loading the chatbot
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
        startNewChat();
    } else{
    
    // Display the existing chat history tabs in the history sidebar with Chat number: first question
    chatHistory.forEach((chat, index) => {
        const historyItem = document.createElement("a");
        
        historyItem.href = "#";
        // Get the first user message if there is one
        const firstUserMessage = chat.messages.find(msg => msg.sender === "user")?.message || '';
                
        // Cut the message to the first 50 characters and add '...' if the first user message is too long
        const cutMessage = firstUserMessage.length > 50 ? firstUserMessage.substring(0, 50) + '...' : firstUserMessage;
    
        historyItem.innerHTML = `<strong>Chat ${index + 1}</strong>${cutMessage ? ': ' + cutMessage : ''}`; // Set the name of the chat history tab
        historyItem.classList.add("history-item"); // Add the class to each tab
        historyItem.addEventListener("click", () => loadChat(index, historyItem)); // Add an event listener so that each tab is clickable
        historyContainer.appendChild(historyItem); // Add each history tab to the history container
    });
    const savedChatIndex = localStorage.getItem('currentChatIndex');
    
    if (savedChatIndex !== null) {
        currentChatIndex = parseInt(savedChatIndex, 10);
        loadChat(currentChatIndex); // Automatically load the saved chat
    }
    }
    }

// Event listener for send button click
sendButton.addEventListener('click', (ev) => {
  ev.preventDefault(); 
  sendMessage(ev);
});

// Event listener for Enter key press in the input field
promptInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault(); 
    sendMessage(ev);
  }
});

newChatButton.addEventListener("click", startNewChat);

clearHistoryButton.addEventListener("click", clearChatHistory);


  // Load history when the page is loaded

loadHistory();
  
  
  
  