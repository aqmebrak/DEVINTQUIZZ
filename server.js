// SERVEUR NODE JS

//On importe les modules express et path nécessaires
var express = require('express');
var path = require('path');

//On crée une instance express
var app = express();

//On importe le fichier de jeu js
var game = require('./game');

//On crée l'application express en utilisant les fichiers du répertoire racine
    app.use(express.static(__dirname));

// On crée un serveur http basé sur node js, sur le port 8080
var server = require('http').createServer(app).listen(process.env.PORT || 8080);
//var server = app.listen(process.env.PORT || 8080);

// On crée un serveur socket io et on l'attache au serveur node
var io = require('socket.io').listen(server);

// On détecte les connections au serveur.
// Quand un client se connecte on lance la fonction initGame
io.sockets.on('connection', function (socket) {
    // On envoie le serveur et la socket
    game.initGame(io, socket);
});


