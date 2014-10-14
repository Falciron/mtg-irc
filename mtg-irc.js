'use strict';

var config = require('./conf');
var irc = require('irc');
var querystring = require('querystring');
var request = require('request');

var bot = new irc.Client(
	config.server,
	config.userName,
	config);

bot.addListener('error', function(message){
	console.log('error: ', message);
});

function leaveChannel(element) {
	bot.part(element);
}

bot.addListener('registered', function(){
	config.partChannels.forEach(leaveChannel);
});

function titleCase(str){
	return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
}

function lowestPrice(cardEditions){
	var lowPrice = null;
	for (var ceCount = 0; ceCount < cardEditions.length; ceCount ++){
		if (cardEditions[ceCount].price){
			if (lowPrice === null || cardEditions[ceCount].price.low < lowPrice){
				lowPrice = cardEditions[ceCount].price.low;
			}
		}
	}
	return lowPrice ? ' ( $' + lowPrice/100 + ' )' : '';
}

function cardString(card){
	var name = card.name;
	var cost = card.cost ? ' ' + card.cost : '';
	var power = card.power ? ' ' + card.power + '/' + card.toughness : '';
	var text = card.text ? ' ' + card.text : '';
	var price = card.editions ? lowestPrice(card.editions) : '';
	return (name + cost + power + text + price);
}

function getCardInfo(element) {
	element = element.replace(/\w\S*/g, titleCase);
	var searchTerm = querystring.stringify({name: element});
	request('https://api.deckbrew.com/mtg/cards?' + searchTerm, function(err, res, body){
		if (!err && res.statusCode === 200){
			var cards = JSON.parse(body);
			var badCardInfo = 'The card "' + element + '" could not be found.';
			var cardCounter = 0;
			var exactMatchFound = false;
			var bestMatchIndex = 0;
			if (cards.length === 0){
				bot.say(config.channels[0],badCardInfo);
			} else {
				while (!exactMatchFound && cardCounter < cards.length){
					if (cards[cardCounter].name === element){
						exactMatchFound = true;
						bestMatchIndex = cardCounter;
					}
					cardCounter++;
				}
				bot.say(config.channels[0],cardString(cards[bestMatchIndex]));
			}
		}
	});
}

bot.addListener('message' + config.channels[0], function(from, message) {
	var bracketRegex = /\[(.*?)\]/g;
	var result = message.match(bracketRegex);

	var cards = null;

	if (result !== null){
		cards = result.map(function(result){
			var tempResult = result;
			tempResult = tempResult.replace(/\[|\]/g,'');
			return tempResult;
		});

		cards.forEach(getCardInfo);
	}
});
