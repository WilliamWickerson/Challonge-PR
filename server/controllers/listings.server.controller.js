
/* Dependencies */
var mongoose = require('mongoose'),
    https = require("https"),
    Gauss = require('free-gaussian'),
    Listing = require('../models/listings.server.model.js');

/*
  In this file, you should use Mongoose queries in order to retrieve/add/remove/update listings.
  On an error you should send a 404 status code, as well as the error message. 
  On success (aka no error), you should send the listing(s) as JSON in the response.

  HINT: if you are struggling with implementing these functions, refer back to this tutorial 
  from assignment 3 https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
 */

/* Create a listing */
exports.create = function(req, res) {

  /* Instantiate a Listing */
  var listing = new Listing(req.body);

  /* Then save the listing */
  listing.save(function(err) {
    if(err) {
      console.log(err);
      res.status(400).send(err);
    } else {
      res.json(listing);
    }
  });
};

/* Show the current listing */
exports.read = function(req, res) {
  /* send back the listing as json from the request */
  res.json(req.listing);
};

/* Update a listing */
exports.update = function(req, res) {
  var listing = req.listing;

  /* Replace the article's properties with the new properties found in req.body */
  listing.name = req.body.name;

  /* save the coordinates (located in req.results if there is an address property) */
  if(req.results) {
    listing.coordinates = {
      latitude: req.results.lat, 
      longitude: req.results.lng
    };
  }

  /* Save the article */
  listing.save(function(err) {
    if(err) {
      console.log(err);
      res.status(400).send(err);
    } else {
      res.json(listing);
    }
  });
};

/* Delete a listing */
exports.delete = function(req, res) {
  var listing = req.listing;

  /* Remove the article */
  listing.remove(function(err) {
    if(err) {
      res.status(400).send(err);
    }
    else {
      res.end();
    }
  })
};

exports.login = function(req, res) {
  Listing.find({username: req.body.username.toLowerCase(), password: req.body.password.toLowerCase()}, function (err, account) {
    if (err) {
      res.status(400).send('error');
      throw err;
    }
    else if (account.length == 0)
      res.status(400).send('error');
    else
      res.send("login success");
  });
    
};

/* Retreive all the directory listings, sorted alphabetically by listing code */
exports.list = function(req, res) {
  Listing.find().sort('-score').exec(function(err, listings) {
    if(err) {
      res.status(400).send(err);
    } else {
      for (var i = 0; i < listings.length; i++) {
        listings[i].elo = Math.floor(listings[i].elo);
	listings[i].score = Math.floor(listings[i].score);
	listings[i].rank = i + 1;
	if (i === listings.length - 1)
	  res.send(listings);
      }
    }
  });
};

exports.addBracket = function(req, res) {
  var url = req.body.link;
  if (url.startsWith("http://"))
    url = url.substr(7,url.length - 1);
  var organizer = url.substr(0,url.indexOf("."));
  var event = url.substr(url.indexOf("/") + 1,url.length - 1);
  var output;
  var matches;
  var normal = Gauss(0,1);
  var beta2 = (25/6)*(25/6);
  var tao2 = (25/300)*(25/300);
  var getMatches = function(players, listings, callback3) {
    var request = https.request("https://api.challonge.com/v1/tournaments/" + organizer + "-" + event + "/matches.json?api_key=GMtg1mkDkhj1ie6Pb2I6cwRZuvFmKw72QvqnLIxY", function(res)
    {
      output = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        output += chunk;
      });
      res.on('end', function() {
        callback3(players, listings, JSON.parse(output));
      });
    });
    request.end();
  };  
  var getPlayers = function(callback1, callback2, callback3) {
    var request = https.request("https://api.challonge.com/v1/tournaments/" + organizer + "-" + event + "/participants.json?api_key=GMtg1mkDkhj1ie6Pb2I6cwRZuvFmKw72QvqnLIxY", function(res)
    {
      output = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        output += chunk;
      });
      res.on('end', function() {
	if (output.charAt(0) == "<") {
	  res.status(400).send("5");
	  return
        }
        callback1(JSON.parse(output), callback2, callback3);
      });
    });
    request.end();
  };
  var getListing = function(players, callback2, callback3) {
    Listing.find({}, function(err, listings) {
      if (err) throw err;
      callback2(players, listings, callback3);
    });
  };
/*
  var updatePlayers = function(players, callback2, callback3) {
    var i = 0;
    players.forEach(function(p) {
      var tim = new Listing({
        _id: mongoose.Types.ObjectId(),
        tag: p.participant.name || p.participant.display_name,
        wins: 0,
        losses: 0,
        elo: 1200,
        tournaments: [{
          tournyId: p.participant.tournament_id,
	  playerId: p.participant.id,
	  name: event,
	  placement: p.participant.final_rank
        }]
      });
      var name = (!p.participant.name)? p.participant.display_name : p.participant.name;
      Listing.findOneAndUpdate({tag: name}, 
        {tag: p.participant.name,
	  $push: {tournaments: 
          {tournyId: p.participant.tournament_id,
           playerId: p.participant.id,
	   name: event,
	   placement: p.participant.final_rank}}}, 
        function (err, result) {
          if (err) throw err;
	  if (!result) {
            tim.save(function (err) {
	      if (err) throw err;
	    });
          }
      });
      i += 1;
      if (i == players.length)
	callback2(organizer, event, callback3);
    });
  };
*/
  var winLose = function(players, listings, m, callback) {
    var a = -1;
    var b = -1;
    var pa;
    var pb;
    for (var i = 0; i < players.length; i++) {
      if (m.match.player1_id === players[i].participant.id) {
        pa = i;
	for (var j = 0; j < listings.length; j++)
	  if ((players[i].participant.name.toLowerCase() === listings[j].tag.toLowerCase()) || (players[i].participant.display_name.toLowerCase() === listings[j].tag.toLowerCase()))
	    a = j;
      }
      if (m.match.player2_id === players[i].participant.id) {
	pb = i;
	for (var k = 0; k < listings.length; k++)
	  if ((players[i].participant.name.toLowerCase() === listings[k].tag.toLowerCase()) || (players[i].participant.display_name.toLowerCase() === listings[k].tag.toLowerCase()))
	    b = k;
      }
      if (i === players.length - 1)
        callback(a,pa,b,pb);
    }
  };  
  getPlayers(getListing, getMatches, function(players, listings, matches) {
    var count = 0;
    matches.forEach(function(m) {
      if ((m.match.scores_csv != "") && (m.match.scores_csv != "0--1") && (m.match.scores_csv != "-1-0")) {
        winLose(players, listings, m, function(a, pa, b, pb) {
	  if (a === -1) {
	    a = listings.length;
	    var temp1 = new Listing({
	      _id: mongoose.Types.ObjectId(),
	      tag: (!players[pa].participant.name)? players[pa].participant.display_name : players[pa].participant.name,
	      wins: 0,
	      losses: 0,
	      matchWins: 0,
	      matchLosses: 0,
	      elo: 1200,
	      mean: 25,
	      sigma: 25/3,
	      tournaments: [{
		tournyId: m.match.tournament_id,
	        playerId: m.match.player1_id,
	        name: (!(req.body.name))? event : req.body.name,
	        placement: players[pa].participant.final_rank	
	      }]
            });
            listings.push(temp1);
          }
	  if (b === -1) {
	    b = listings.length;
	    var temp2 = new Listing({
	      _id: mongoose.Types.ObjectId(),
	      tag: (!players[pb].participant.name)? players[pb].participant.display_name : players[pb].participant.name,
	      wins: 0,
	      losses: 0,
	      matchWins: 0,
	      matchLosses: 0,
	      elo: 1200,
	      mean: 25,
	      sigma: 25/3,
	      tournaments: [{
	        tournyId: m.match.tournament_id,
	        playerId: m.match.player2_id,
	        name: (!(req.body.name))? event : req.body.name,
	        placement: players[pb].participant.final_rank
	      }]
            });
            listings.push(temp2);
          }
	  var newa = 1;
	  var newb = 1;
	  for (var it1 = 0; it1 < listings[a].tournaments.length; it1++) {
	    if (listings[a].tournaments[it1].tournyId === m.match.tournament_id)
	      newa = 0;
	    if (newa && (it1 == listings[a].tournaments.length - 1))
              listings[a].tournaments.push({
	        tournyId: m.match.tournament_id,
	        playerId: m.match.player1_id,
	        name: (!(req.body.name))? event : req.body.name,
	        placement: players[pa].participant.final_rank
              });
	  }
	  for (var it2 = 0; it2 < listings[b].tournaments.length; it2++) {
	    if (listings[b].tournaments[it2].tournyId === m.match.tournament_id)
	      newb = 0;
	    if (newb && (it2 == listings[b].tournaments.length - 1))
              listings[b].tournaments.push({
	        tournyId: m.match.tournament_id,
	        playerId: m.match.player2_id,
	        name: (!(req.body.name))? event : req.body.name,
	        placement: players[pb].participant.final_rank
              });
	  }
	  listings[a].wins += parseInt(m.match.scores_csv.charAt(0));
	  listings[b].losses += parseInt(m.match.scores_csv.charAt(0));
	  listings[a].losses += parseInt(m.match.scores_csv.charAt(m.match.scores_csv.length - 1));
	  listings[b].wins += parseInt(m.match.scores_csv.charAt(m.match.scores_csv.length - 1));
	  for (var i = 0; i < parseInt(m.match.scores_csv.charAt(0)); i++) {
	    r1 = Math.pow(10,listings[a].elo/400);
	    r2 = Math.pow(10,listings[b].elo/400);
	    e1 = r1 / (r1 + r2);
	    e2 = r2 / (r1 + r2);
	    listings[a].elo += 32*(1 - e1);
	    listings[b].elo += 32*(0 - e2);
          }
          for (var i = 0; i < parseInt(m.match.scores_csv.charAt(m.match.scores_csv.length - 1)); i++) {
	    r1 = Math.pow(10,listings[a].elo/400);
	    r2 = Math.pow(10,listings[b].elo/400);
	    e1 = r1 / (r1 + r2);
	    e2 = r2 / (r1 + r2);
	    listings[a].elo += 32*(0 - e1);
	    listings[b].elo += 32*(1 - e2);
	  }
	  var c = Math.sqrt(2*beta2 + listings[a].sigma*listings[a].sigma + listings[b].sigma*listings[b].sigma + 2*tao2);
	  if (m.match.winner_id === m.match.player1_id) {
	    listings[a].matchWins += 1;
	    listings[b].matchLosses += 1;
	    var t = (listings[a].mean - listings[b].mean) / c;
	    var v = normal.pdf(t) / normal.cdf(t);
	    var w = v * (v + t);
	    listings[a].mean += (listings[a].sigma*listings[a].sigma + tao2)/c*v;
	    listings[b].mean -= (listings[b].sigma*listings[b].sigma + tao2)/c*v;
	    listings[a].sigma *= Math.sqrt(1 - (listings[a].sigma*listings[a].sigma + tao2)/c/c*w);
	    listings[b].sigma *= Math.sqrt(1 - (listings[b].sigma*listings[b].sigma + tao2)/c/c*w);
	  }
	  else {
	    listings[a].matchLosses += 1;
	    listings[b].matchWins += 1;
  	    var t = (listings[b].mean - listings[a].mean) / c;
	    var v = normal.pdf(t) / normal.cdf(t);
	    var w = v * (v + t);
	    listings[a].mean -= (listings[a].sigma*listings[a].sigma + tao2)/c*v;
	    listings[b].mean += (listings[b].sigma*listings[b].sigma + tao2)/c*v;
	    listings[a].sigma *= Math.sqrt(1 - (listings[a].sigma*listings[a].sigma + tao2)/c/c*w);
	    listings[b].sigma *= Math.sqrt(1 - (listings[b].sigma*listings[b].sigma + tao2)/c/c*w);
	  }
	});
      }
      count += 1;
      if (count == matches.length) {
        for (var i = 0; i < listings.length; i++) {
	  listings[i].score = 200 * (listings[i].mean - 3 * listings[i].sigma);
	  listings[i].save(function(err) {
	    if (err) throw err;
	  });
	}
	res.send("DID IT!");
      }
    });
  });
};
/* 
  Middleware: find a listing by its ID, then pass it to the next request handler. 

  HINT: Find the listing using a mongoose query, 
        bind it to the request object as the property 'listing', 
        then finally call next
 */
exports.listingByID = function(req, res, next, id) {
  Listing.findById(id).exec(function(err, listing) {
    if(err) {
      res.status(400).send(err);
    } else {
      req.listing = listing;
      next();
    }
  });
};