(function($){
    //nb de joueurs par défaut
    var nbPlayers=2;
    //indique le jeu choisi ("quizz" ou "mvt")
    var typeOfGame="";

    // Tout le code qui concerne les connections socket
    var IO = {

        //fonction lancée au  chargement de la page, lancée grâce à IO.init() en bas de la page
        init: function() {
            IO.socket = io.connect();
            IO.initListeners();

        },

        //initialise les différents listeners qui vont écouter les évènements émis par le serveur socket
        //puis lance la fonction appropriée
        initListeners : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('newRoomCreated', IO.onNewRoomCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('beginNewGame', IO.beginNewGame );
            IO.socket.on('newQuestionData', IO.onNewQuestionData);
            //IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            //IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error );
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function() {
            // Cache a copy of the client's socket.IO session ID on the App

            App.mySocketId = IO.socket.socket.sessionid;
            // console.log(data.message);
        },

        //une room a été crée avec un id de room généré
        //data est de la forme {{ roomId, mySocketId }}
        onNewRoomCreated : function(data) {
            App.Host.gameInit(data);
        },

        //un joueur (sur mobile) a rejoint la room, on va donc mettre à jour l'écran du navigateur de l'host
        //data contient le room id et le pseudo
        playerJoinedRoom : function(data) {
            //il y a 2 versions de la fonction updateWaitingScreen, 1 pour l'host et 1 pour le player
            //par ex, pour l'host ce sera App.Host.updateWaitingScreen qui sera appelé
            App[App.myRole].updateWaitingScreen(data);
        },

        //le serveur nous confirme que tout le monde a rejoint la room, on lance le compte à rebour
        // (en fonction du role cad host ou player)
        beginNewGame : function(data) {
            App[App.myRole].gameCountdown(data);
        },

        //quand le jeu envoie une nouvelle question
        onNewQuestionData : function(data) {
            //on met à jour le  numéro du round
            App.currentRound = data.round;
            //on actualise la question pour l'host et le player
            App[App.myRole].newQuestion(data);
        },

        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
        hostCheckAnswer : function(data) {
            if(App.myRole === 'Host') {
                App.Host.checkAnswer(data);
            }
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver : function(data) {
            App[App.myRole].endGame(data);
        },

        //affiche une erreur
        error : function(data) {
            alert(data.message);
        }

    };

    var App = {

        //l'id du game qui est identique à l'id de la room socket (où les players et l'host communiquent)
        roomId: 0,
        //le type du navigateur (soit Player soit Host)
        myRole: '',
        //l'id de l'objet socket io, unique pour chaque player et host.
        //il est généré quand le navigateur se connecte au serveur pour la première fois
        mySocketId: '',

        //numéro du round actuel
        currentRound: 0,

        //est appelée en bas de la page
        init: function () {
            App.initVariables();
            App.$main.html(App.$templateMenu);
            App.doTextFit('#btnScores');
            App.doTextFit('#btnJouer');
            App.initListeners();
            // Initialize the fastclick library
            //FastClick.attach(document.body);

        },

        //initialise les variables utilisées pour définir les différents templates
        initVariables: function () {
            App.$doc = $(document);
            App.$main = $('#main');
            App.$templateMenu = $('#menu').html();
            App.$templateJouer = $('#menu-jouer').html();
            App.$templateNbPlayers = $('#menu-nbPlayers').html();
            App.$templateHostGameId = $('#templateHostGameId').html();
            App.$templateJoinGame = $('#templateJoinGame').html();
            App.$templateQuizzGame = $('#templateQuizzGame').html();
        },

        //initialise les différents listeners qui vont écouter les évènements émis par le serveur socket
        //puis lance la fonction appropriée
        initListeners: function () {
            App.$doc.on('click', '#btnJouer', App.Host.onJouer);
            App.$doc.on('click', '#btnScores', App.Host.onJoinClick);
            App.$doc.on('click', '#btnMouvement', App.Host.onMouvement);
            App.$doc.on('click', '#btnQuizz', App.Host.onQuizz);
            App.$doc.on('click', '#btn1', App.Host.on1);
            App.$doc.on('click', '#btn2', App.Host.on2);
            App.$doc.on('click', '#btn3', App.Host.on3);
            App.$doc.on('click', '#btn4', App.Host.on4);
            App.$doc.on('click', '#btnCommencer',App.Player.onPlayerCommencer);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);
        },


        Host : {

            //contient les infos des différents players
            players : [],

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame : false,

            //nombre de joueurs qui ont rejoint la room
            nbPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
            currentCorrectAnswer: '',

            //Quand on clique sur jouer dans le menu
            onJouer: function () {
                App.$main.html(App.$templateJouer);
            },

            //Quand on choisit le jeu des mouvements
            onMouvement: function () {
                //on sauvegarde la décision
                typeOfGame="mvt";
                App.$main.html(App.$templateNbPlayers);
            },

            //Quand on choisit le jeu du quizz
            onQuizz: function () {
                //on sauvegarde la décision
                typeOfGame="quizz";
                App.$main.html(App.$templateNbPlayers);
            },

            on1: function () {
                nbPlayers=1;
                IO.socket.emit('hostCreateNewRoom');
            },

            on2: function () {
                nbPlayers=2;
                IO.socket.emit('hostCreateNewRoom');
            },

            on3: function () {
                nbPlayers=3;
                IO.socket.emit('hostCreateNewRoom');
            },
            on4: function () {
                nbPlayers=4;
                IO.socket.emit('hostCreateNewRoom');
            },


            //lance la room de l'host
            //data est de la forme {{ roomId, mySocketId }}
            gameInit: function (data) {
                App.roomId = data.roomId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.nbPlayersInRoom = 0;
                App.Host.displayNewGameScreen();
            },

            //affiche le template de l'host avec le lien goog gl et le room id...
            displayNewGameScreen : function() {
                App.$main.html(App.$templateHostGameId);
                $('#gameURL').text("goo.gl/wQLS6f");
                App.doTextFit('#gameURL');
                $('#spanNewGameCode').text(App.roomId);
            },

            //met à jour l'écran d'attente de l'host
            //data contient le room id et le pseudo
            updateWaitingScreen: function(data) {
                // If this is a restarted game, show the screen.
                if ( App.Host.isNewGame ) {
                    App.Host.displayNewGameScreen();
                }
                //on indique que le joueur a rejoint la room
                $('#playersWaiting')
                    .append('<p/>')
                    .text('LE JOUEUR ' + data.pseudo + ' A REJOINT LA PARTIE');

                //on stocke les informations du player
                App.Host.players.push(data);
                //on incrémente le nb de joueurs dans la room
                App.Host.nbPlayersInRoom += 1;
                //si le nb de joueur correspond au nb voulu
                if (App.Host.nbPlayersInRoom === nbPlayers) {
                    // on envoie un event au serveur avec le gameId pour lui dire que la room est full
                    IO.socket.emit('hostRoomFull',App.roomId);
                }
            },

            //affiche le compte à rebour de l'host
            gameCountdown : function() {
                // on charge le template de jeu
                App.$main.html(App.$templateQuizzGame);
                App.doTextFit('#hostWord');

                //on commence le timer
                var $secondsLeft = $('#hostWord');
                App.countDown( $secondsLeft, 5, function(){
                    //if(typeOfGame=="mvt"){
                        //IO.socket.emit('hostMvtCountdownFinished', App.roomId);
                    //}
                    //if(typeOfGame=="quizz"){
                        //IO.socket.emit('hostQuizzCountdownFinished', App.roomId);
                    //}
                    IO.socket.emit('hostQuizzCountdownFinished', App.roomId);
                });

                // Display the players' names on screen
                $('#player1Score')
                    .find('.playerName')
                    .html(App.Host.players[0].playerName);

                //$('#player2Score')
                    //.find('.playerName')
                    //.html(App.Host.players[1].playerName);

                // Set the Score section on screen to 0 for each player.
                $('#player1Score').find('.score').attr('id',App.Host.players[0].mySocketId);
                //$('#player2Score').find('.score').attr('id',App.Host.players[1].mySocketId);
            },

            //montre la question pour l'host
            newQuestion : function(data) {
                // Insert the new word into the DOM
                //$('#hostWord').text(data.question);
                $('#hostWord').text("HEY");
                App.doTextFit('#hostWord');

                // Update the data for the current round
                App.Host.currentCorrectAnswer = data.answer;
                App.Host.currentRound = data.round;
            },

            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
            checkAnswer : function(data) {
                // Verify that the answer clicked is from the current round.
                // This prevents a 'late entry' from a player whos screen has not
                // yet updated to the current round.
                if (data.round === App.currentRound){

                    // Get the player's score
                    var $pScore = $('#' + data.playerId);

                    // Advance player's score if it is correct
                    if( App.Host.currentCorrectAnswer === data.answer ) {
                        // Add 5 to the player's score
                        $pScore.text( +$pScore.text() + 5 );

                        // Advance the round
                        App.currentRound += 1;

                        // Prepare data to send to the server
                        var data = {
                            gameId : App.gameId,
                            round : App.currentRound
                        }

                        // Notify the server to start the next round.
                        IO.socket.emit('hostNextRound',data);

                    } else {
                        // A wrong answer was submitted, so decrement the player's score.
                        $pScore.text( +$pScore.text() - 3 );
                    }
                }
            },


            /**
             * All 10 rounds have played out. End the game.
             * @param data
             */
            endGame : function(data) {
                // Get the data for player 1 from the host screen
                var $p1 = $('#player1Score');
                var p1Score = +$p1.find('.score').text();
                var p1Name = $p1.find('.playerName').text();

                // Get the data for player 2 from the host screen
                var $p2 = $('#player2Score');
                var p2Score = +$p2.find('.score').text();
                var p2Name = $p2.find('.playerName').text();

                // Find the winner based on the scores
                var winner = (p1Score < p2Score) ? p2Name : p1Name;
                var tie = (p1Score === p2Score);

                // Display the winner (or tie game message)
                if(tie){
                    $('#hostWord').text("It's a Tie!");
                } else {
                    $('#hostWord').text( winner + ' Wins!!' );
                }
                App.doTextFit('#hostWord');

                // Reset game data
                App.Host.nbPlayersInRoom = 0;
                App.Host.isNewGame = true;
            },

            /**
             * A player hit the 'Start Again' button after the end of a game.
             */
            restartGame : function() {
                App.$main.html(App.$templateHostGameId);
                $('#spanNewGameCode').text(App.gameId);
            }
        },


        Player : {

            // l'id socket de l'host
            hostSocketId: '',

            // le pseudo du player
            pseudo: '',

            //quand le joueur clique sur commencer sur son mobile, après avoir rentré son pseudo et l'id de la room
            onPlayerCommencer: function() {
                //on collecte les infos à envoyer au serveur
                var data = {
                    roomId : +($('#inputRoomId').val()),
                    pseudo : $('#inputPseudo').val() || 'Anonyme'
                };

                //on envoie donc la room id et le pseudo au serveur
                IO.socket.emit('playerJoinRoom', data);

                //et on sauvegarde les infos du player
                App.myRole = 'Player';
                App.Player.pseudo = data.pseudo;
            },

            /**
             *  Click handler for the Player hitting a word in the word list.
             */
            onPlayerAnswerClick: function() {
                // console.log('Clicked Answer Button');
                var $btn = $(this);      // the tapped button
                var answer = $btn.val(); // The tapped word

                // Send the player info and tapped word to the server so
                // the host can check the answer.
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: answer,
                    round: App.currentRound
                }
                IO.socket.emit('playerAnswer',data);
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.pseudo
                }
                IO.socket.emit('playerRestart',data);
                App.currentRound = 0;
                $('#main').html("<h3>Waiting on host to start new game.</h3>");
            },

            //confirme que au joueur qu'il s'est bien connecté à la room
            updateWaitingScreen : function(data) {
                if(IO.socket.socket.sessionid === data.mySocketId){
                    App.myRole = 'Player';
                    App.roomId = data.roomId;

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('VOUS AVEZ REJOINT LE JEU NUMERO ' + data.roomId + '. ATTENDEZ QUE LE JEU COMMENCE');
                }
            },


            //affiche un message d'attente sur le mobile tant que le compteur tourne
            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                $('#main')
                    .html('<div class="gameOver">REGARDEZ L\'ORDINATEUR</div>');
            },

            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newQuestion : function(data) {
                // Create an unordered list element
                var $list = $('<ul/>').attr('id','ulAnswers');

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(data.list, function(){
                    $list                                //  <ul> </ul>
                        .append( $('<li/>')              //  <ul> <li> </li> </ul>
                            .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                                .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .val(this)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                                .html(this)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                            )
                        )
                });

                // Insert the list onto the screen.
                $('#main').html($list);
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame : function() {
                $('#main')
                    .html('<div class="gameOver">Game Over!</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>Start Again</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                    );
            }
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#hostWord');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#hostWord');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        }

    };

    IO.init();
    App.init();
    //si on est sur mobile on charge direct le template Join
    if ( (navigator.userAgent.match(/Android/i)) || (navigator.userAgent.match(/webOS/i)) || (navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPod/i)) ){
        App.$main.html(App.$templateJoinGame);
    }
    //sinon on se met on mode host
    //else{
        //IO.socket.emit('hostCreateNewGame');
    //}

}($));
