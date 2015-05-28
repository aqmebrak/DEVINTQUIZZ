// Le serveur
var io;
// La socket du client
var clientSocket;
fs = require('fs');
var indexPlayer=0;

// Fonction appellée par server.js pour initialiser le jeu
// exports sert à pouvoir utiliser cette fonction dans un autre fichier (en l'occurence server.js ici)
exports.initGame = function (paramIO, paramSocket) {
    //on sauvegarde le serveur et la socket dans ce fichier
    io = paramIO;
    clientSocket = paramSocket;
    clientSocket.emit('connected');
    //initQuestionsFacile();
    //initQuestionsMoyen();
    //initQuestionsDifficile();

    // On écoute les évenements de l'host
    clientSocket.on('hostCreateNewRoom', hostCreateNewRoom);
    clientSocket.on('facile', facile);
    clientSocket.on('moyen', moyen);
    clientSocket.on('difficile', difficile);
    clientSocket.on('hostRoomFull', hostPrepareGame);
    clientSocket.on('hostQuizzCountdownFinished', hostStartQuizz);
    clientSocket.on('hostNextRound', hostNextRound);
    clientSocket.on('indexPlayer', goIndexPlayer);

    // On écoute les évenements du player
    clientSocket.on('playerJoinRoom', playerJoinRoom);
    clientSocket.on('playerAnswer', playerAnswer);
    clientSocket.on('playerRestart', playerRestart);
};

//quand on a rentré tous les paramètres on va sur la page classique host et cette fonction est appelée
function hostCreateNewRoom() {
    // on crée une room unique socket io
    var roomId = ( Math.random() * 100 ) | 0;

    // on envoie l'id de la room et l'id de la socket au navigateur du smartphone
    this.emit('newRoomCreated', {roomId: roomId, mySocketId: this.id});

    // on rejoint la room et on attend les autres joueurs
    this.join(roomId.toString());
};

function goIndexPlayer() {
    this.emit('ok',indexPlayer);
    indexPlayer++;
};

function facile() {
    initQuestionsFacile();
};

function moyen() {
    initQuestionsMoyen();
};
function difficile() {
    initQuestionsDifficile();
};

//tout le monde a rejoint la room, on l'indique à l'host
function hostPrepareGame(roomId) {
    var sock = this;
    var data = {
        mySocketId: sock.id,
        roomId: roomId
    };
    //in avec un room id en paramètre permet d'envoyer seulement aux participants de la room
    io.sockets.in(data.roomId).emit('beginNewGame', data);
}

//le compta a rebours est fini, on lance le jeu quizz
function hostStartQuizz(roomId) {
    sendQuestion(0, roomId);
};

//une bonne réponse a été faite, on passe à la question suivante
function hostNextRound(data) {
    if (data.round < questions.questions.length) {
        //on envoie une nouvelle question
        sendQuestion(data.round, data.roomId);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        io.sockets.in(data.gameId).emit('gameOver', data);
    }
}

//on capte ce message quand le player a cliqué sur commencer
// data contient le room id et le pseudo
function playerJoinRoom(data) {
    //on stocke la référence de la socket du player ici
    var sock = this;

    //on regarde si le room id correcpond à une room créee
    var room = clientSocket.manager.rooms["/" + data.roomId];

    //si la room existe bien
    if (room != undefined) {
        //on fixe l'id de la socket dans data
        data.mySocketId = sock.id;

        //on rejoint la room
        sock.join(data.roomId);

        // on envoie un event au client pour lui dire qu'il a bien rejoint la room
        io.sockets.in(data.roomId).emit('playerJoinedRoom', data);

    } else {
        //si la room n'existe pas, on envoie un message d'erreur
        this.emit('error', {message: "NUMERO DE JEU INCORRECT"});
    }
}

//on recoit la réponse proposée par le player
function playerAnswer(data) {
    //on va demander à l'host si c'est la bonne réponse
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    // console.log('Player: ' + data.playerName + ' ready for new game.');

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data);
}

// PARTIE GAME LOGIC

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param questionsIndex
 * @param gameId The room identifier
 */
function sendQuestion(questionsIndex, roomId) {
    var questionData = getQuestion(questionsIndex);
    io.sockets.in(roomId).emit('newQuestionData', questionData);
}

/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
function getQuestion(i) {
    // Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer
    //var question = shuffle(questions[i].question);lol
    //alert(questions.question[0]);
    //var lol=shuffle(questions.questions);
    //alert(lol[0]);
    var question = questions.questions[i].question;
    console.log("question"+question);
    var answer = questions.questions[i].answer;
    var H = questions.questions[i].H;
    var D = questions.questions[i].D;
    var B = questions.questions[i].B;
    var G = questions.questions[i].G;

    // Package the words into a single object.
    var questionData = {
        round: i,
        question: question,   //question affichée
        answer: answer, // Correct Answer
        H: H,
        D: D,
        B: B,
        G: G
    };

    return questionData;
}

/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}
var questions;
function initQuestionsFacile() {
    var file = "questionsFacile.json";
    fs.readFile(file,function (err,data) {
        questions = data.toString();
        questions = JSON.parse(questions);

    });
}

function initQuestionsMoyen() {
    var file = "questionsMoyen.json";
    fs.readFile(file,function (err,data) {
        questions = data.toString();
        questions = JSON.parse(questions);

    });
}

function initQuestionsDifficile() {
    var file = "questionsDifficile.json";
    fs.readFile(file,function (err,data) {
        questions = data.toString();
        questions = JSON.parse(questions);
    });
}