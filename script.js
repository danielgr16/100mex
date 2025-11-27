document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN ---
    const bc = new BroadcastChannel('100_mexicanos_dijeron_channel');

    let gameState = {
        team1Name: 'Equipo 1',
        team2Name: 'Equipo 2',
        team1Score: 0,
        team2Score: 0,
        questions: [],
        currentQuestionIndex: null,
        revealedAnswers: [],
        strikes: 0,
    };

    const defaultQuestions = [
        { id: Date.now() + 1, text: "Algo que te pones en la cabeza", answers: [{ text: "Sombrero", points: 35 }, { text: "Gorra", points: 28 }, { text: "Casco", points: 15 }, { text: "Peluca", points: 10 }, { text: "Diadema", points: 7 }, { text: "Lentes", points: 5 }] },
        { id: Date.now() + 2, text: "Un animal que vive en la granja", answers: [{ text: "Vaca", points: 40 }, { text: "Pollo / Gallina", points: 30 }, { text: "Cerdo", points: 20 }, { text: "Caballo", points: 5 }, { text: "Oveja", points: 5 }] },
        { id: Date.now() + 3, text: "Menciona un sabor de helado", answers: [{ text: "Chocolate", points: 42 }, { text: "Vainilla", points: 25 }, { text: "Fresa", points: 20 }, { text: "Limón", points: 8 }, { text: "Nuez", points: 5 }] },
    ];

    // Elementos de la UI
    const homeScreen = document.getElementById('home-screen');
    const controlScreen = document.getElementById('control-screen');
    const gameScreen = document.getElementById('game-screen');

    // --- LÓGICA DE ENRUTAMIENTO Y PANTALLA ---

    const urlParams = new URLSearchParams(window.location.search);
    const screenType = urlParams.get('screen');

    function openScreen(type) {
        window.open(`${window.location.pathname}?screen=${type}`, '_blank');
    }
    window.openScreen = openScreen; // Hacerla global

    if (screenType === 'control') {
        homeScreen.classList.add('hidden');
        controlScreen.classList.remove('hidden');
        initializeControlScreen();
    } else if (screenType === 'game') {
        homeScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        initializeGameScreen();
    }

    // --- LÓGICA DE COMUNICACIÓN (BROADCAST CHANNEL) ---

    function broadcastState() {
        bc.postMessage(gameState);
    }

    bc.onmessage = (event) => {
        gameState = event.data;
        if (screenType === 'game') {
            renderGameScreen();
        }
        if (screenType === 'control') {
            // Sincronizar si hay otro panel de control abierto
            renderControlScreen();
        }
    };

    // --- LÓGICA DEL PANEL DE CONTROL ---

    function initializeControlScreen() {
        loadQuestionsFromStorage();
        renderControlScreen();
        setupControlEvents();
    }

    function renderControlScreen() {
        // Renderizar nombres de equipos
        document.getElementById('team1-name-input').value = gameState.team1Name;
        document.getElementById('team2-name-input').value = gameState.team2Name;

        // Renderizar lista de preguntas
        const questionsList = document.getElementById('questions-list');
        questionsList.innerHTML = '';
        if (gameState.questions.length === 0) {
            questionsList.innerHTML = '<p class="text-slate-400">No hay preguntas. ¡Crea una!</p>';
        }
        gameState.questions.forEach((q, index) => {
            const isActive = gameState.currentQuestionIndex === index;
            const questionDiv = document.createElement('div');
            questionDiv.className = `p-2 rounded cursor-pointer flex justify-between items-center ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`;
            questionDiv.innerHTML = `
                    <span class="flex-grow">${q.text}</span>
                    <div class="flex-shrink-0 space-x-1">
                        <button class="edit-q-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-black px-2 py-1 rounded" data-index="${index}">E</button>
                        <button class="delete-q-btn text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" data-index="${index}">X</button>
                    </div>
                `;
            questionDiv.querySelector('.flex-grow').addEventListener('click', () => selectQuestion(index));
            questionsList.appendChild(questionDiv);
        });

        // Renderizar panel de juego activo
        if (gameState.currentQuestionIndex !== null) {
            document.getElementById('active-game-placeholder').classList.add('hidden');
            document.getElementById('active-game-controls').classList.remove('hidden');
            const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
            document.getElementById('active-question-title').textContent = currentQuestion.text;

            const answersList = document.getElementById('active-answers-list');
            answersList.innerHTML = '';
            currentQuestion.answers.forEach((ans, index) => {
                const isRevealed = gameState.revealedAnswers.includes(index);
                const answerBtn = document.createElement('button');
                answerBtn.className = `p-3 rounded text-left transition duration-300 ${isRevealed ? 'bg-green-700 text-white cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600'}`;
                answerBtn.disabled = isRevealed;
                answerBtn.innerHTML = `
                        <span class="font-bold">${ans.text}</span>
                        <span class="text-yellow-400 float-right">${ans.points} pts</span>
                    `;
                answerBtn.onclick = () => revealAnswer(index, ans.points);
                answersList.appendChild(answerBtn);
            });

            // Renderizar puntajes y strikes
            document.getElementById('team1-score-display').textContent = gameState.team1Name;
            document.getElementById('team2-score-display').textContent = gameState.team2Name;
            document.getElementById('team1-score').textContent = gameState.team1Score;
            document.getElementById('team2-score').textContent = gameState.team2Score;

            const strikesDisplay = document.getElementById('strikes-display');
            strikesDisplay.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                strikesDisplay.innerHTML += `<span class="${i < gameState.strikes ? 'text-red-500' : 'text-slate-600'}">X</span>`;
            }

        } else {
            document.getElementById('active-game-placeholder').classList.remove('hidden');
            document.getElementById('active-game-controls').classList.add('hidden');
        }
    }

    function setupControlEvents() {
        // Nombres de equipos
        document.getElementById('update-teams-btn').addEventListener('click', () => {
            gameState.team1Name = document.getElementById('team1-name-input').value || 'Equipo 1';
            gameState.team2Name = document.getElementById('team2-name-input').value || 'Equipo 2';
            renderControlScreen();
            broadcastState();
        });

        // Controles de ronda
        document.getElementById('incorrect-answer-btn').addEventListener('click', addStrike);
        document.getElementById('reset-round-btn').addEventListener('click', resetRound);

        // Modal de Preguntas
        document.getElementById('add-question-btn').addEventListener('click', () => openQuestionModal());
        document.getElementById('cancel-question-btn').addEventListener('click', closeQuestionModal);
        document.getElementById('save-question-btn').addEventListener('click', saveQuestion);

        // Listeners para editar y borrar preguntas (delegación de eventos)
        document.getElementById('questions-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-q-btn')) {
                const index = parseInt(e.target.dataset.index);
                openQuestionModal(gameState.questions[index], index);
            }
            if (e.target.classList.contains('delete-q-btn')) {
                if (confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
                    const index = parseInt(e.target.dataset.index);
                    deleteQuestion(index);
                }
            }
        });
    }

    function selectQuestion(index) {
        gameState.currentQuestionIndex = index;
        resetRound();
    }

    function revealAnswer(answerIndex, points) {
        if (!gameState.revealedAnswers.includes(answerIndex)) {
            gameState.revealedAnswers.push(answerIndex);

            const team = prompt(`¿Qué equipo se lleva los puntos? (1 para ${gameState.team1Name}, 2 para ${gameState.team2Name})`);
            if (team === '1') gameState.team1Score += points;
            if (team === '2') gameState.team2Score += points;

            renderControlScreen();
            broadcastState();
        }
    }

    function addStrike() {
        if (gameState.strikes < 3) {
            gameState.strikes++;
            renderControlScreen();
            broadcastState();
        }
    }

    function resetRound() {
        gameState.revealedAnswers = [];
        gameState.strikes = 0;
        renderControlScreen();
        broadcastState();
    }

    function deleteQuestion(index) {
        gameState.questions.splice(index, 1);
        if (gameState.currentQuestionIndex === index) {
            gameState.currentQuestionIndex = null;
        } else if (gameState.currentQuestionIndex > index) {
            gameState.currentQuestionIndex--;
        }
        saveQuestionsToStorage();
        renderControlScreen();
        broadcastState();
    }

    // --- LÓGICA DEL MODAL DE PREGUNTAS ---
    const questionModal = document.getElementById('question-modal');
    const modalTitle = document.getElementById('modal-title');
    const questionIdInput = document.getElementById('question-id');
    const questionTextInput = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');

    function openQuestionModal(question = null, index = -1) {
        questionIdInput.value = index; // Usamos el index como ID temporal
        if (question) {
            modalTitle.textContent = 'Editar Pregunta';
            questionTextInput.value = question.text;
            answersContainer.innerHTML = '';
            question.answers.forEach((ans, i) => addAnswerInput(ans.text, ans.points));
        } else {
            modalTitle.textContent = 'Crear Nueva Pregunta';
            questionTextInput.value = '';
            answersContainer.innerHTML = '';
            for (let i = 0; i < 5; i++) addAnswerInput(); // Empezar con 5 campos
        }
        // Añadir campo extra vacío si es necesario
        addAnswerInput();
        questionModal.classList.remove('hidden');
    }

    function addAnswerInput(text = '', points = '') {
        if (answersContainer.children.length >= 8) return;
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2';
        div.innerHTML = `
                <input type="text" class="w-2/3 bg-slate-700 rounded p-2 answer-text" placeholder="Respuesta">
                <input type="number" class="w-1/3 bg-slate-700 rounded p-2 answer-points" placeholder="Puntos">
             `;
        div.querySelector('.answer-text').value = text;
        div.querySelector('.answer-points').value = points;
        answersContainer.appendChild(div);

        // Si se escribe en el último, añadir uno nuevo
        div.querySelector('.answer-text').addEventListener('input', () => {
            if (div === answersContainer.lastElementChild) {
                addAnswerInput();
            }
        });
    }

    function closeQuestionModal() {
        questionModal.classList.add('hidden');
    }

    function saveQuestion() {
        const id = questionIdInput.value;
        const text = questionTextInput.value.trim();
        if (!text) {
            alert('La pregunta no puede estar vacía.');
            return;
        }
        const answers = [];
        const answerInputs = answersContainer.querySelectorAll('.flex');
        answerInputs.forEach(div => {
            const answerText = div.querySelector('.answer-text').value.trim();
            const answerPoints = parseInt(div.querySelector('.answer-points').value, 10);
            if (answerText && !isNaN(answerPoints) && answerPoints > 0) {
                answers.push({ text: answerText, points: answerPoints });
            }
        });

        if (answers.length === 0) {
            alert('Debes añadir al menos una respuesta válida con puntos.');
            return;
        }

        // Ordenar respuestas de mayor a menor puntaje
        answers.sort((a, b) => b.points - a.points);

        const newQuestion = { id: Date.now(), text, answers };

        if (id && id !== '-1') {
            gameState.questions[parseInt(id)] = newQuestion;
        } else {
            gameState.questions.push(newQuestion);
        }

        saveQuestionsToStorage();
        renderControlScreen();
        broadcastState();
        closeQuestionModal();
    }

    // --- LÓGICA DE ALMACENAMIENTO (LOCALSTORAGE) ---

    function saveQuestionsToStorage() {
        localStorage.setItem('100mexicanos_questions', JSON.stringify(gameState.questions));
    }

    function loadQuestionsFromStorage() {
        const savedQuestions = localStorage.getItem('100mexicanos_questions');
        if (savedQuestions) {
            gameState.questions = JSON.parse(savedQuestions);
        } else {
            // Cargar preguntas por defecto si no hay guardadas
            gameState.questions = defaultQuestions;
            saveQuestionsToStorage();
        }
    }

    // --- LÓGICA DE LA PANTALLA DE JUEGO ---

    function initializeGameScreen() {
        // Solicitar estado inicial al panel de control
        bc.postMessage('request_state');
        renderGameScreen();
    }

    function renderGameScreen() {
        // Nombres y puntajes
        document.getElementById('game-team1-name').textContent = gameState.team1Name;
        document.getElementById('game-team2-name').textContent = gameState.team2Name;
        document.getElementById('game-team1-score').textContent = gameState.team1Score;
        document.getElementById('game-team2-score').textContent = gameState.team2Score;

        const gameBoard = document.getElementById('game-board');
        if (gameState.currentQuestionIndex !== null) {
            const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
            document.getElementById('game-question-title').textContent = currentQuestion.text;

            gameBoard.innerHTML = '';
            currentQuestion.answers.forEach((ans, index) => {
                const isRevealed = gameState.revealedAnswers.includes(index);
                const answerDiv = document.createElement('div');
                answerDiv.className = 'relative h-24 perspective-1000';
                answerDiv.innerHTML = `
                        <div class="answer-card absolute w-full h-full ${isRevealed ? 'revealed' : ''}">
                            <!-- Frente (Oculto) -->
                            <div class="front absolute w-full h-full flex items-center justify-center p-2 rounded-lg text-4xl font-bold bg-blue-800 border-4 border-blue-400">
                                ${index + 1}
                            </div>
                            <!-- Dorso (Revelado) -->
                            <div class="back absolute w-full h-full flex items-center justify-between p-4 rounded-lg bg-yellow-400 text-slate-900 border-4 border-yellow-200">
                                <span class="text-xl lg:text-2xl font-semibold">${ans.text}</span>
                                <span class="text-2xl lg:text-3xl font-bold">${ans.points}</span>
                            </div>
                        </div>
                    `;
                gameBoard.appendChild(answerDiv);
            });
        } else {
            document.getElementById('game-question-title').textContent = 'Esperando pregunta...';
            gameBoard.innerHTML = '<p class="col-span-2 text-center text-slate-400">El tablero aparecerá aquí</p>';
        }

        // Strikes
        for (let i = 1; i <= 3; i++) {
            const strikeEl = document.getElementById(`strike-${i}`);
            if (i <= gameState.strikes) {
                strikeEl.classList.remove('opacity-0');
            } else {
                strikeEl.classList.add('opacity-0');
            }
        }
    }
});