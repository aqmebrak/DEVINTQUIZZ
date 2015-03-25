// Le serveur
var io;
// La socket du client
var clientSocket;

// Fonction appellée par server.js pour initialiser le jeu
// exports sert à pouvoir utiliser cette fonction dans un autre fichier (en l'occurence server.js ici)
exports.initGame = function(paramIO, paramSocket){
    //on sauvegarde le serveur et la socket dans ce fichier
    io = paramIO;
    clientSocket = paramSocket;

    // On écoute les évenements de l'host
    clientSocket.on('hostCreateNewRoom', hostCreateNewRoom);
    clientSocket.on('hostRoomFull', hostPrepareGame);
    clientSocket.on('hostQuizzCountdownFinished', hostStartQuizz);
    clientSocket.on('hostMvtCountdownFinished', hostStartMvt);
    clientSocket.on('hostNextRound', hostNextRound);

    // On écoute les évenements du player
    clientSocket.on('playerJoinRoom', playerJoinRoom);
    clientSocket.on('playerAnswer', playerAnswer);
    clientSocket.on('playerRestart', playerRestart);
}

//quand on a rentré tous les paramètres on va sur la page classique host et cette fonction est appelée
function hostCreateNewRoom() {
    // on crée une room unique socket io
    var roomId = ( Math.random() * 100 ) | 0;

    // on envoie l'id de la room et l'id de la socket au navigateur du smartphone
    this.emit('newRoomCreated', {roomId: roomId, mySocketId: this.id});

    // on rejoint la room et on attend les autres joueurs
    this.join(roomId.toString());
};

//tout le monde a rejoint la room, on l'indique à l'host
function hostPrepareGame(roomId) {
    var sock = this;
    var data = {
        mySocketId : sock.id,
        roomId : roomId
    };
    //in avec un room id en paramètre permet d'envoyer seulement aux participants de la room
    io.sockets.in(data.roomId).emit('beginNewGame', data);
}

//le compta a rebours est fini, on lance le jeu quizz
function hostStartQuizz(roomId) {
    sendQuestion(0,roomId);
};

//le compta a rebours est fini, on lance le jeu mvt
function hostStartMvt(roomId) {
    //sendWord(0,roomId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function hostNextRound(data) {
    if(data.round < wordPool.length ){
        // Send a new set of words back to the host and players.
        sendWord(data.round, data.gameId);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        io.sockets.in(data.gameId).emit('gameOver',data);
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
    if( room != undefined ){
        //on fixe l'id de la socket dans data
        data.mySocketId = sock.id;

        //on rejoint la room
        sock.join(data.roomId);

        // on envoie un event au client pour lui dire qu'il a bien rejoint la room
        io.sockets.in(data.roomId).emit('playerJoinedRoom', data);

    } else {
        //si la room n'existe pas, on envoie un message d'erreur
        this.emit('error',{message: "NUMERO DE JEU INCORRECT"} );
    }
}

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
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
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
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
    io.sockets.in(data.gameId).emit('newQuestionData', Data);
}

/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
function getQuestion(i){
    // Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer
    //var question = shuffle(questions[i].question);
    var question = questions[i].question;
    var answer=questions[i].answer;
    var A=questions[i].A;
    var B=questions[i].B;
    var C=questions[i].C;
    var D=questions[i].D;

    // Package the words into a single object.
    var questionData = {
        round: i,
        question : question[0],   //question affichée
        answer : answer[0], // Correct Answer
        A : A[0],
        B : B[0],
        C : C[0],
        D : D[0]
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

/**
 * Each element in the array provides data for a single round in the game.
 *
 * In each round, two random "words" are chosen as the host word and the correct answer.
 * Five random "decoys" are chosen to make up the list displayed to the player.
 * The correct answer is randomly inserted into the list of chosen decoys.
 *
 * @type {Array}
 */
var questions = [
    {
        "question"  : [ "QUEL EST LE SURNOM DE JEREMY ?" ],
        "A" : [ "MICHEL" ],
        "B" : [ "JEFFREY" ],
        "C" : [ "VOMITO" ],
        "D" : [ "FDP" ],
        "answer" : [ "C" ]
    },

    {
        "question"  : [ "QUI EST LE PROF DE LFA ?" ],
        "A" : [ "Y'EN A PAS" ],
        "B" : [ "BOND" ],
        "C" : [ "MOMEGE" ],
        "D" : [ "PAPY RICARD" ],
        "answer" : [ "A" ]
    }
]