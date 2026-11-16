const languageSelect = document.getElementById("language");

const heading = document.getElementById("heading");
const description = document.getElementById("description");
const question = document.getElementById("question");
const pdfFile = document.getElementById("pdfFile");
const askButton = document.getElementById("askButton");
const answer = document.getElementById("answer");
const difficulty = document.getElementById("difficulty");
// Byt språk
languageSelect.addEventListener("change", function () {
    if (languageSelect.value === "en") {
        heading.textContent = "Welcome to StudyAI!";
        description.textContent = "Your personal AI study assistant.";
        question.placeholder = "Write your question here...";
        askButton.textContent = "Ask StudyAI";
    } else {
        heading.textContent = "Välkommen till StudyAI!";
        description.textContent = "Din personliga AI-studieassistent.";
        question.placeholder = "Skriv din fråga här...";
        askButton.textContent = "Fråga StudyAI";
    }
});

// Visa formaterade AI-svar
// Visa formaterade AI-svar med matematiska formler
function showAnswer(text) {
    if (typeof marked !== "undefined" &&
        typeof DOMPurify !== "undefined") {

        const html = marked.parse(text);

        const bubble = document.createElement("div");
bubble.className = "chat-bubble ai-bubble";
bubble.innerHTML = DOMPurify.sanitize(html);
answer.appendChild(bubble);

        // Visa matematiska formler med KaTeX
        if (typeof renderMathInElement !== "undefined") {
            renderMathInElement(bubble, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "\\[", right: "\\]", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\\(", right: "\\)", display: false }
                ],
                throwOnError: false
            });
        }

    } else {
        answer.textContent = text;
    }
}

// Skicka fråga till StudyAI
let tutorHistory = [];

async function askStudyAI() {
    const userQuestion = question.value.trim();
const selectedDifficulty = difficulty.value;
    if (!userQuestion) {
        alert("Skriv en fråga först!");
        return;
    }

    const userBubble = document.createElement("div");
userBubble.className = "chat-bubble user-bubble";
userBubble.textContent = userQuestion;
answer.appendChild(userBubble);

const thinkingBubble = document.createElement("div");
thinkingBubble.className = "chat-bubble ai-bubble";
thinkingBubble.textContent = "StudyAI tänker...";
answer.appendChild(thinkingBubble);
    askButton.disabled = true;

    try {
    const formData = new FormData();

formData.append(
    "question",
    `Anpassa svaret till denna svårighetsnivå: ${
        selectedDifficulty === "easy" ? "Lätt" :
        selectedDifficulty === "medium" ? "Medel" : "Svår"
    }.

Använd följande riktlinjer:
- Lätt: Förklara enkelt och använd tydliga exempel.
- Medel: Ge en balanserad och detaljerad förklaring.
- Svår: Ge en avancerad och djupgående förklaring.
VIKTIGT:
- Svara ENDAST på den valda svårighetsnivån.
- Visa aldrig de andra svårighetsnivåerna.
- Ge endast en sammanhängande förklaring.
- Anpassa ordval, detaljnivå och exempel till den valda nivån.
- Om användaren ställer en följdfråga, använd tidigare samtal för att förstå sammanhanget.
- Om användaren ber om en enklare förklaring, använd korta meningar, enkla ord och vardagliga exempel.
- Skriv alla matematiska och kemiska formler med vanlig text. Använd exempelvis H2O och CO2. Använd aldrig LaTeX, $, hakparenteser eller understreck för formler.
Tidigare samtal:
${tutorHistory.map(item => `${item.role}: ${item.text}`).join("\n")}

Användarens fråga: ${userQuestion}`
);

if (pdfFile.files.length > 0) {
    const selectedFile = pdfFile.files[0];

    if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error("PDF-filen får inte vara större än 10 MB.");
    }

    formData.append("pdfFile", selectedFile);
}

const response = await fetch("/ask", {
    method: "POST",
    body: formData
});

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Något gick fel."
            );
        }
thinkingBubble.remove();
        showAnswer(data.answer);
       tutorHistory.push(
    { role: "user", text: userQuestion },
    { role: "assistant", text: data.answer }
);

tutorHistory = tutorHistory.slice(-10); 
saveToHistory(userQuestion, data.answer);
displayHistory();
    } catch (error) {
        thinkingBubble.textContent = "Fel: " + error.message;

    } finally {
        askButton.disabled = false;
    }
}

// Klicka på knappen
askButton.addEventListener("click", askStudyAI);

// Tryck Enter för att skicka
question.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        askStudyAI();
    }
});
// Skapa quiz med StudyAI
const quizButton = document.getElementById("quizButton");

quizButton.addEventListener("click", async function () {
    const userQuestion = question.value.trim();

    if (!userQuestion) {
        alert("Skriv ett ämne eller en fråga först!");
        return;
    }

    answer.textContent = "StudyAI skapar ett quiz...";
    quizButton.disabled = true;

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
        question: `Skapa ett quiz med 5 frågor om ämnet: ${userQuestion}.

Returnera ENDAST giltig JSON utan markdown eller extra text.
Använd exakt denna struktur:
{
  "questions": [
    {
      "question": "Frågetext",
      "options": ["Alternativ A", "Alternativ B", "Alternativ C", "Alternativ D"],
      "correctAnswer": 0,
      "explanation": "Kort förklaring"
    }
  ]
}

Skapa exakt 5 frågor. Varje fråga ska ha 4 svarsalternativ.
correctAnswer ska vara indexet för rätt alternativ: 0, 1, 2 eller 3.
Inkludera en kort förklaring till varje rätt svar.`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Något gick fel.");
        }

        const quizData = JSON.parse(data.answer);
renderQuiz(quizData);

    } catch (error) {
        answer.textContent = "Fel: " + error.message;

    } finally {
        quizButton.disabled = false;
    }
});
// Visa quiz med klickbara svar
function renderQuiz(quizData) {
    answer.innerHTML = "";

    let score = 0;
    let answered = 0;

    quizData.questions.forEach((item, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "quiz-question";

        const title = document.createElement("h3");
        title.textContent = `${index + 1}. ${item.question}`;
        questionDiv.appendChild(title);

        item.options.forEach((option, optionIndex) => {
            const button = document.createElement("button");
            button.textContent = option;

            button.addEventListener("click", () => {
                if (questionDiv.dataset.answered) return;

                questionDiv.dataset.answered = "true";
                answered++;

                if (optionIndex === item.correctAnswer) {
                    score++;
                    button.style.backgroundColor = "#16a34a";
                } else {
                    button.style.backgroundColor = "#dc2626";
                }

                const explanation = document.createElement("p");
                explanation.textContent = item.explanation;
                questionDiv.appendChild(explanation);

                if (answered === quizData.questions.length) {
                    const result = document.createElement("h3");
                    result.textContent =
                        `Du fick ${score} av ${quizData.questions.length} rätt!`;
                    answer.appendChild(result);
                }
            });

            questionDiv.appendChild(button);
        });

        answer.appendChild(questionDiv);
    });
}

// Spara frågor och svar i historiken
function saveToHistory(questionText, answerText) {
    const history = JSON.parse(localStorage.getItem("studyAIHistory")) || [];

    history.unshift({
        question: questionText,
        answer: answerText,
        date: new Date().toLocaleString("sv-SE")
    });

    localStorage.setItem("studyAIHistory", JSON.stringify(history));
}
// Visa sparad frågehistorik
function displayHistory() {
    const historyDiv = document.getElementById("history");
    const history = JSON.parse(localStorage.getItem("studyAIHistory")) || [];

    historyDiv.innerHTML = "";

    history.forEach((item) => {
        const entry = document.createElement("div");
        entry.className = "history-entry";

        const date = document.createElement("small");
        date.textContent = item.date;

        const questionText = document.createElement("p");
        questionText.textContent = "Fråga: " + item.question;

        const answerText = document.createElement("p");
        answerText.textContent = "Svar: " + item.answer;

        entry.append(date, questionText, answerText);
        historyDiv.appendChild(entry);
    });
}
// Visa sparad historik när sidan öppnas
displayHistory();
// Rensa sparad frågehistorik
const clearHistoryButton = document.getElementById("clearHistoryButton");

clearHistoryButton.addEventListener("click", function () {
    localStorage.removeItem("studyAIHistory");
    displayHistory();
});